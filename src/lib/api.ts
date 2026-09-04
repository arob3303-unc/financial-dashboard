/**
 * Typed client for the Flask price/forecast API.
 *
 * Everything the charts render passes through here first. The original crash
 * (`displayedData.map is not a function`) happened because a malformed body was handed
 * straight to Recharts: Flask emitted a bare `NaN`, axios silently swallowed the
 * `JSON.parse` failure and returned the raw string, and the component called
 * `setData(res.data)` with no check. Two defences below, both deliberate:
 *
 *   1. `silentJSONParsing: false` -- a body that is not valid JSON throws instead of
 *      arriving as a string.
 *   2. Every response is shape-checked before it is returned. Anything unexpected
 *      becomes an `ApiError` the UI can render, never a value a chart tries to map over.
 */
import axios, { AxiosError } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5000";

export const TIMEFRAMES = [
  "1 Month",
  "3 Months",
  "6 Months",
  "1 Year",
  "3 Years",
  "5 Years",
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number];

/** Forecast horizon in trading days, scaled to the lookback window. */
export const HORIZON_BY_TIMEFRAME: Record<Timeframe, number> = {
  "1 Month": 15,
  "3 Months": 30,
  "6 Months": 45,
  "1 Year": 60,
  "3 Years": 120,
  "5 Years": 180,
};

export const TICKERS = [
  "AAPL",
  "MSFT",
  "TSLA",
  "GOOGL",
  "AMZN",
  "AMD",
  "ZM",
  "SPY",
  "VOO",
  "NVDA",
  "MU",
  "TSM",
] as const;

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

export type StockSeries = {
  symbol: string;
  timeframe: string;
  points: PricePoint[];
  meta: SeriesMeta | null;
};

export type ForecastPoint = {
  date: string;
  projected: number;
  lower: number;
  upper: number;
};

export type Forecast = {
  symbol: string;
  timeframe: string;
  horizonDays: number;
  anchorDate: string;
  lastPrice: number;
  points: ForecastPoint[];
  expectedReturnPct: number;
  annualDrift: number;
  annualVolatility: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  // Do NOT let axios hand back a raw string when the body fails to parse.
  transitional: { silentJSONParsing: false, forcedJSONParsing: true, clarifyTimeoutError: true },
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function describeAxiosError(error: unknown, what: string): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const serverMessage = (error.response?.data as { error?: string } | undefined)?.error;

    if (serverMessage) return new ApiError(serverMessage, status);
    if (error.code === "ECONNABORTED") {
      return new ApiError(`${what} timed out. Is the price API still running?`, status);
    }
    if (!error.response) {
      return new ApiError(
        `Could not reach the price API at ${API_BASE_URL}. Start it with "npm run dev:api".`,
      );
    }
    if (error.message.includes("JSON")) {
      return new ApiError(`${what} returned a malformed response.`, status);
    }
    return new ApiError(`${what} failed (HTTP ${status ?? "?"}).`, status);
  }

  return new ApiError(`${what} failed.`);
}

export async function getStockSeries(
  symbol: string,
  timeframe: Timeframe,
  signal?: AbortSignal,
): Promise<StockSeries> {
  let payload: unknown;
  try {
    const response = await http.get(`/api/stocks/${encodeURIComponent(symbol)}`, {
      params: { time: timeframe },
      signal,
    });
    payload = response.data;
  } catch (error) {
    throw describeAxiosError(error, `Loading ${symbol}`);
  }

  const body = payload as Partial<StockSeries> | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.points)) {
    throw new ApiError(`The price API returned an unexpected shape for ${symbol}.`);
  }

  // Drop anything that is not a plottable point rather than trusting the server.
  const points = body.points.filter(
    (point): point is PricePoint =>
      !!point &&
      typeof point === "object" &&
      typeof (point as PricePoint).date === "string" &&
      isFiniteNumber((point as PricePoint).price),
  );

  const meta =
    body.meta && isFiniteNumber(body.meta.endPrice) ? (body.meta as SeriesMeta) : null;

  return {
    symbol: typeof body.symbol === "string" ? body.symbol : symbol.toUpperCase(),
    timeframe: typeof body.timeframe === "string" ? body.timeframe : timeframe,
    points,
    meta,
  };
}

export async function getForecast(
  symbol: string,
  timeframe: Timeframe,
  horizonDays: number,
  signal?: AbortSignal,
): Promise<Forecast> {
  let payload: unknown;
  try {
    const response = await http.get(`/api/forecast/${encodeURIComponent(symbol)}`, {
      params: { time: timeframe, horizon: horizonDays },
      signal,
    });
    payload = response.data;
  } catch (error) {
    throw describeAxiosError(error, `Forecasting ${symbol}`);
  }

  const body = payload as Partial<Forecast> | null;
  if (!body || typeof body !== "object" || !Array.isArray(body.points)) {
    throw new ApiError(`The forecast API returned an unexpected shape for ${symbol}.`);
  }

  const points = body.points.filter(
    (point): point is ForecastPoint =>
      !!point &&
      typeof point === "object" &&
      typeof (point as ForecastPoint).date === "string" &&
      isFiniteNumber((point as ForecastPoint).projected) &&
      isFiniteNumber((point as ForecastPoint).lower) &&
      isFiniteNumber((point as ForecastPoint).upper),
  );

  if (points.length === 0) {
    throw new ApiError(`No forecast is available for ${symbol}.`);
  }

  return {
    symbol: body.symbol ?? symbol.toUpperCase(),
    timeframe: body.timeframe ?? timeframe,
    horizonDays: isFiniteNumber(body.horizonDays) ? body.horizonDays : horizonDays,
    anchorDate: body.anchorDate ?? points[0].date,
    lastPrice: isFiniteNumber(body.lastPrice) ? body.lastPrice : points[0].projected,
    points,
    expectedReturnPct: isFiniteNumber(body.expectedReturnPct) ? body.expectedReturnPct : 0,
    annualDrift: isFiniteNumber(body.annualDrift) ? body.annualDrift : 0,
    annualVolatility: isFiniteNumber(body.annualVolatility) ? body.annualVolatility : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers shared by the dashboard                                  */
/* -------------------------------------------------------------------------- */

export function formatCurrency(value: number, maximumFractionDigits = 2) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  });
}

export function formatCompactCurrency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatAxisDate(date: string, timeframe: Timeframe) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  const longWindow = timeframe === "1 Year" || timeframe === "3 Years" || timeframe === "5 Years";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    ...(longWindow ? { year: "2-digit" } : { day: "numeric" }),
  });
}

export function formatFullDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
