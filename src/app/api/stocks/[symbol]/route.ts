import { NextResponse } from "next/server";

import { resolveTimeframe, summarize } from "@/lib/market";
import { CACHE_HEADERS, QuoteError, loadCloses, normalizeSymbol } from "@/lib/quotes";

// yahoo-finance2 needs the Node runtime.
export const runtime = "nodejs";

/**
 * Historical closes plus summary statistics for the window.
 *
 * Replaces Flask's `GET /api/stocks/<symbol>`. The response is always an object with a
 * `points` array -- never a bare array, and never containing a non-finite price.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await params;
  const { searchParams } = new URL(request.url);
  const { timeframe, days } = resolveTimeframe(searchParams.get("time"));

  try {
    const symbol = normalizeSymbol(rawSymbol);
    const points = await loadCloses(symbol, days);

    return NextResponse.json(
      {
        symbol,
        timeframe,
        points,
        meta: points.length > 0 ? summarize(points) : null,
      },
      { headers: points.length > 0 ? CACHE_HEADERS : undefined },
    );
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("stocks route failed", error);
    return NextResponse.json({ error: "Could not load price data." }, { status: 500 });
  }
}
