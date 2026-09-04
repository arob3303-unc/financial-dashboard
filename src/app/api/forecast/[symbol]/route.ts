import { NextResponse } from "next/server";

import { project, resolveTimeframe } from "@/lib/market";
import { CACHE_HEADERS, QuoteError, loadCloses, normalizeSymbol } from "@/lib/quotes";

export const runtime = "nodejs";

const DEFAULT_HORIZON = 30;
const MIN_HORIZON = 5;
const MAX_HORIZON = 365;

/**
 * Drift/volatility projection with a one-standard-deviation band.
 *
 * Replaces Flask's `GET /api/forecast/<symbol>`. Illustrative only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol: rawSymbol } = await params;
  const { searchParams } = new URL(request.url);
  const { timeframe, days } = resolveTimeframe(searchParams.get("time"));

  const requested = Number(searchParams.get("horizon"));
  const horizon = Number.isFinite(requested)
    ? Math.max(MIN_HORIZON, Math.min(Math.trunc(requested), MAX_HORIZON))
    : DEFAULT_HORIZON;

  try {
    const symbol = normalizeSymbol(rawSymbol);
    const points = await loadCloses(symbol, days);

    if (points.length < 3) {
      return NextResponse.json(
        { error: `Not enough history for ${symbol} to forecast.` },
        { status: 422 },
      );
    }

    const projection = project(points, horizon);
    if (!projection) {
      return NextResponse.json(
        { error: `Forecast is unstable for ${symbol}.` },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { symbol, timeframe, horizonDays: horizon, ...projection },
      { headers: CACHE_HEADERS },
    );
  } catch (error) {
    if (error instanceof QuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("forecast route failed", error);
    return NextResponse.json({ error: "Could not build a forecast." }, { status: 500 });
  }
}
