/**
 * Price statistics and the forward projection.
 *
 * Ported from the retired `src/flask-api/stockdata.py` so the whole app can run as a
 * single Next.js deployment. The maths is deliberately identical to the NumPy version:
 * log returns, drift and volatility, then a geometric Brownian motion path with a
 * one-standard-deviation band. Illustrative only — this is a simulator.
 *
 * Pure and isomorphic: no Node or browser APIs, so the route handlers and the client
 * can share the constants without dragging server code into the browser bundle.
 */

export const TRADING_DAYS_PER_YEAR = 252;

/** Timeframe label -> calendar days of history. */
export const TIMEFRAME_DAYS = {
  "1 Month": 30,
  "3 Months": 90,
  "6 Months": 180,
  "1 Year": 365,
  "3 Years": 3 * 365,
  "5 Years": 5 * 365,
} as const;

export type Timeframe = keyof typeof TIMEFRAME_DAYS;

export const TIMEFRAMES = Object.keys(TIMEFRAME_DAYS) as Timeframe[];

export const DEFAULT_TIMEFRAME: Timeframe = "1 Month";

/** Forecast horizon in trading days, scaled to the lookback window. */
export const HORIZON_BY_TIMEFRAME: Record<Timeframe, number> = {
  "1 Month": 15,
  "3 Months": 30,
  "6 Months": 45,
  "1 Year": 60,
  "3 Years": 120,
  "5 Years": 180,
};

/**
 * Map a timeframe label to its window.
 *
 * The Python this replaces used six sequential `if`s, each with a *different* default,
 * so an absent `time` fell through all of them and returned five years instead of one
 * month, and an unrecognized value left the start date unbound and raised. A lookup
 * with one fallback removes both.
 */
export function resolveTimeframe(label: string | null | undefined): {
  timeframe: Timeframe;
  days: number;
} {
  const timeframe =
    label && label in TIMEFRAME_DAYS ? (label as Timeframe) : DEFAULT_TIMEFRAME;
  return { timeframe, days: TIMEFRAME_DAYS[timeframe] };
}

export type PricePoint = { date: string; price: number };

export type SeriesMeta = {
  startPrice: number;
  endPrice: number;
  changePct: number;
  high: number;
  low: number;
  volatility: number;
  count: number;
};

export type ForecastPoint = {
  date: string;
  projected: number;
  lower: number;
  upper: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Sample standard deviation (ddof=1), matching `np.std(x, ddof=1)`. */
function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function logReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i += 1) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
}

export function summarize(points: PricePoint[]): SeriesMeta {
  const prices = points.map((point) => point.price);
  const startPrice = prices[0];
  const endPrice = prices[prices.length - 1];
  const changePct = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0;

  let volatility = 0;
  if (prices.length > 2) {
    const daily = stdev(logReturns(prices));
    if (Number.isFinite(daily)) {
      volatility = daily * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
    }
  }

  return {
    startPrice: round2(startPrice),
    endPrice: round2(endPrice),
    changePct: round2(changePct),
    high: round2(Math.max(...prices)),
    low: round2(Math.min(...prices)),
    volatility: round2(volatility),
    count: prices.length,
  };
}

/**
 * Weekdays after `fromIso`, matching `pandas.bdate_range` — no holiday calendar, same
 * as the Python this replaces. Dates are handled in UTC throughout; Yahoo timestamps
 * land at 13:30 UTC (09:30 ET), so the UTC calendar day is the trading day.
 */
export function nextBusinessDays(fromIso: string, count: number): string[] {
  const days: string[] = [];
  const cursor = new Date(`${fromIso}T00:00:00Z`);

  while (days.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(cursor.toISOString().slice(0, 10));
    }
  }

  return days;
}

export type Projection = {
  anchorDate: string;
  lastPrice: number;
  points: ForecastPoint[];
  expectedReturnPct: number;
  annualDrift: number;
  annualVolatility: number;
};

/**
 * Project `horizon` trading days forward. Central path is `last * exp(mu * t)`; the band
 * is one standard deviation of the accumulated log return, `last * exp(mu*t ± sigma*sqrt(t))`.
 *
 * Returns null when the history is too short or the estimates are not finite, so the
 * caller can answer with a real status code instead of serializing a NaN.
 */
export function project(points: PricePoint[], horizon: number): Projection | null {
  if (points.length < 3) return null;

  const prices = points.map((point) => point.price);
  const returns = logReturns(prices);
  const mu = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const sigma = stdev(returns);

  if (!Number.isFinite(mu) || !Number.isFinite(sigma)) return null;

  const lastPrice = prices[prices.length - 1];
  const anchorDate = points[points.length - 1].date;

  const forecastPoints = nextBusinessDays(anchorDate, horizon).map((date, index) => {
    const step = index + 1;
    const drift = mu * step;
    const spread = sigma * Math.sqrt(step);
    return {
      date,
      projected: round2(lastPrice * Math.exp(drift)),
      lower: round2(lastPrice * Math.exp(drift - spread)),
      upper: round2(lastPrice * Math.exp(drift + spread)),
    };
  });

  return {
    anchorDate,
    lastPrice: round2(lastPrice),
    points: forecastPoints,
    expectedReturnPct: round2((Math.exp(mu * horizon) - 1) * 100),
    annualDrift: round2(mu * TRADING_DAYS_PER_YEAR * 100),
    annualVolatility: round2(sigma * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100),
  };
}
