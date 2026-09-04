"""
Extro price + forecast API.

Serves historical closes and a simple geometric-Brownian-motion projection to the
Next.js dashboard. Everything here is illustrative: the forecast is a drift/volatility
extrapolation, not a real financial model.

Every response is a JSON *object* (never a bare array), and `app.json.allow_nan` is off
so a NaN can never be serialized into a body that looks like valid JSON but isn't.
"""

import re
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import yfinance as yf
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)

# Only local dev origins need access. The port is left open because Next.js falls
# back to 3001+ whenever 3000 is already taken.
CORS(app, origins=[re.compile(r"^http://(localhost|127\.0\.0\.1)(:\d+)?$")])

# Bare `NaN` / `Infinity` are not valid JSON. Python's json module happily emits them
# unless told otherwise, and a browser client that swallows parse errors then receives a
# raw string instead of an array. Fail loudly instead.
app.json.allow_nan = False

TRADING_DAYS_PER_YEAR = 252

# Timeframe label -> calendar days of history.
TIMEFRAMES = {
    "1 Month": 30,
    "3 Months": 90,
    "6 Months": 180,
    "1 Year": 365,
    "3 Years": 3 * 365,
    "5 Years": 5 * 365,
}
DEFAULT_TIMEFRAME = "1 Month"


def resolve_timeframe(label):
    """Map a timeframe label to (canonical_label, days). Unknown labels fall back."""
    if label not in TIMEFRAMES:
        label = DEFAULT_TIMEFRAME
    return label, TIMEFRAMES[label]


def load_closes(symbol, days):
    """Download closes for `symbol` and return a clean, NaN-free Series indexed by date.

    yfinance returns MultiIndex columns (field, ticker) for `download`, so the level has
    to be flattened before `Close` can be read as a plain column.
    """
    end = datetime.today()
    start = end - timedelta(days=days)

    df = yf.download(
        symbol,
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        progress=False,
        auto_adjust=True,
    )

    if df is None or df.empty or "Close" not in df.columns:
        return pd.Series(dtype="float64")

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    closes = pd.to_numeric(df["Close"], errors="coerce")
    # Partial / holiday rows carry a NaN close. Drop them here so nothing downstream has
    # to defend against a non-finite price.
    closes = closes[np.isfinite(closes)]
    return closes


def summarize(closes):
    """Descriptive stats for a close series. Assumes `closes` is non-empty and finite."""
    start_price = float(closes.iloc[0])
    end_price = float(closes.iloc[-1])
    change_pct = ((end_price - start_price) / start_price * 100.0) if start_price else 0.0

    volatility = 0.0
    if len(closes) > 2:
        log_returns = np.diff(np.log(closes.to_numpy(dtype="float64")))
        daily_sigma = float(np.std(log_returns, ddof=1))
        if np.isfinite(daily_sigma):
            volatility = daily_sigma * np.sqrt(TRADING_DAYS_PER_YEAR) * 100.0

    return {
        "startPrice": round(start_price, 2),
        "endPrice": round(end_price, 2),
        "changePct": round(change_pct, 2),
        "high": round(float(closes.max()), 2),
        "low": round(float(closes.min()), 2),
        "volatility": round(volatility, 2),
        "count": int(len(closes)),
    }


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "service": "extro-price-api"})


@app.route("/api/stocks/<symbol>")
def get_stock(symbol):
    """Historical closes plus summary stats for the window."""
    timeframe, days = resolve_timeframe(request.args.get("time"))

    try:
        closes = load_closes(symbol, days)
    except Exception as exc:  # network / yfinance failures
        return jsonify({"error": f"Could not load data for {symbol}: {exc}"}), 502

    if closes.empty:
        return jsonify(
            {
                "symbol": symbol.upper(),
                "timeframe": timeframe,
                "points": [],
                "meta": None,
            }
        )

    points = [
        {"date": idx.strftime("%Y-%m-%d"), "price": round(float(value), 2)}
        for idx, value in closes.items()
    ]

    return jsonify(
        {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "points": points,
            "meta": summarize(closes),
        }
    )


@app.route("/api/forecast/<symbol>")
def get_forecast(symbol):
    """Project the price forward with a drift/volatility (GBM) extrapolation.

    Central path is `last * exp(mu * t)`; the band is one standard deviation of the
    accumulated log return, `last * exp(mu * t +/- sigma * sqrt(t))`. Illustrative only.
    """
    timeframe, days = resolve_timeframe(request.args.get("time"))

    try:
        horizon = int(request.args.get("horizon", 30))
    except (TypeError, ValueError):
        horizon = 30
    horizon = max(5, min(horizon, 365))

    try:
        closes = load_closes(symbol, days)
    except Exception as exc:
        return jsonify({"error": f"Could not load data for {symbol}: {exc}"}), 502

    if len(closes) < 3:
        return jsonify({"error": f"Not enough history for {symbol} to forecast."}), 422

    prices = closes.to_numpy(dtype="float64")
    log_returns = np.diff(np.log(prices))
    mu = float(np.mean(log_returns))
    sigma = float(np.std(log_returns, ddof=1))

    if not np.isfinite(mu) or not np.isfinite(sigma):
        return jsonify({"error": f"Forecast is unstable for {symbol}."}), 422

    last_price = float(prices[-1])
    last_date = closes.index[-1]
    future_dates = pd.bdate_range(start=last_date, periods=horizon + 1, freq="B")[1:]

    points = []
    for step, date in enumerate(future_dates, start=1):
        drift = mu * step
        spread = sigma * np.sqrt(step)
        points.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "projected": round(last_price * float(np.exp(drift)), 2),
                "lower": round(last_price * float(np.exp(drift - spread)), 2),
                "upper": round(last_price * float(np.exp(drift + spread)), 2),
            }
        )

    expected_return_pct = (float(np.exp(mu * horizon)) - 1.0) * 100.0

    return jsonify(
        {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "horizonDays": horizon,
            "anchorDate": last_date.strftime("%Y-%m-%d"),
            "lastPrice": round(last_price, 2),
            "points": points,
            "expectedReturnPct": round(expected_return_pct, 2),
            "annualDrift": round(mu * TRADING_DAYS_PER_YEAR * 100.0, 2),
            "annualVolatility": round(sigma * np.sqrt(TRADING_DAYS_PER_YEAR) * 100.0, 2),
        }
    )


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
