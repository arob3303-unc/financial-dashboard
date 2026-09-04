"use client";

import * as React from "react";

import {
  ApiError,
  getForecast,
  getStockSeries,
  HORIZON_BY_TIMEFRAME,
  type Forecast,
  type StockSeries,
  type Timeframe,
} from "@/lib/api";

export type StockDataState = {
  series: StockSeries | null;
  forecast: Forecast | null;
  /** Set when the forecast alone failed but the price history loaded fine. */
  forecastError: string | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Loads price history and its projection for one ticker.
 *
 * `loading` is reset on every symbol/timeframe change so the previous ticker's
 * data can never be shown under the new ticker's heading, and in-flight requests
 * are aborted so a slow response cannot overwrite a newer one.
 */
export function useStockData(symbol: string, timeframe: Timeframe): StockDataState {
  const [series, setSeries] = React.useState<StockSeries | null>(null);
  const [forecast, setForecast] = React.useState<Forecast | null>(null);
  const [forecastError, setForecastError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  const reload = React.useCallback(() => setNonce((value) => value + 1), []);

  React.useEffect(() => {
    if (!symbol || !timeframe) return;

    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setForecastError(null);
    setSeries(null);
    setForecast(null);

    (async () => {
      try {
        const loaded = await getStockSeries(symbol, timeframe, controller.signal);
        if (controller.signal.aborted) return;
        setSeries(loaded);

        if (loaded.points.length < 3) {
          setLoading(false);
          return;
        }

        // A missing forecast is not fatal -- the price chart still stands on its own.
        try {
          const projection = await getForecast(
            symbol,
            timeframe,
            HORIZON_BY_TIMEFRAME[timeframe],
            controller.signal,
          );
          if (!controller.signal.aborted) setForecast(projection);
        } catch (forecastFailure) {
          if (!controller.signal.aborted) {
            setForecastError(
              forecastFailure instanceof ApiError
                ? forecastFailure.message
                : "The projection could not be computed.",
            );
          }
        }
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof ApiError ? failure.message : "Something went wrong.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [symbol, timeframe, nonce]);

  return { series, forecast, forecastError, loading, error, reload };
}
