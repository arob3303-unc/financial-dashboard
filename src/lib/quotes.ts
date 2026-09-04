import "server-only";

import YahooFinance from "yahoo-finance2";

import type { PricePoint } from "@/lib/market";

/**
 * Yahoo Finance access for the route handlers.
 *
 * yahoo-finance2 v4 must be instantiated (v2's bare default export throws), and the
 * survey notice it prints on first use is noise in server logs.
 */
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export class QuoteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

/** Yahoo symbols: letters, digits, and the punctuation used by classes and indices. */
const SYMBOL_PATTERN = /^[A-Za-z0-9.\-^=]{1,12}$/;

export function normalizeSymbol(raw: string): string {
  const symbol = decodeURIComponent(raw).trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new QuoteError(`"${raw}" is not a valid ticker symbol.`, 400);
  }
  return symbol;
}

/**
 * Daily closes for `symbol`, cleaned.
 *
 * Holiday and partial rows come back with a null close — the JavaScript form of the
 * `NaN` that used to poison the Flask response and crash Recharts. They are dropped
 * here so nothing downstream has to defend against a non-finite price, and so
 * `JSON.stringify` can never emit a `null` where a number is expected.
 *
 * Adjusted closes are preferred to match the Python's `auto_adjust=True`.
 */
export async function loadCloses(symbol: string, days: number): Promise<PricePoint[]> {
  const period2 = new Date();
  const period1 = new Date(period2.getTime() - days * 86_400_000);

  let quotes;
  try {
    const result = await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: "1d",
    });
    quotes = result.quotes;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A symbol Yahoo does not know is a client mistake; anything else is upstream.
    if (/not found|No data found|Invalid|404/i.test(message)) {
      throw new QuoteError(`No data found for ${symbol}.`, 404);
    }
    throw new QuoteError(`Could not load data for ${symbol}: ${message}`, 502);
  }

  if (!Array.isArray(quotes)) return [];

  return quotes.flatMap((quote) => {
    const close = quote.adjclose ?? quote.close;
    if (typeof close !== "number" || !Number.isFinite(close)) return [];
    if (!(quote.date instanceof Date) || Number.isNaN(quote.date.getTime())) return [];
    return [
      {
        date: quote.date.toISOString().slice(0, 10),
        price: Math.round(close * 100) / 100,
      },
    ];
  });
}

/**
 * Let Vercel's CDN absorb repeat traffic. Yahoo rate-limits by IP and every visitor to a
 * Vercel deployment shares the same egress addresses, so without this a popular ticker
 * would be one upstream request per page view.
 */
export const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
} as const;
