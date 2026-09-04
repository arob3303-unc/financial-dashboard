"use client";

import * as React from "react";
import {
  AlertCircle,
  Minus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  type Forecast,
  type SeriesMeta,
  type Timeframe,
} from "@/lib/api";

type Stance = "bullish" | "neutral" | "bearish";
type Relevance = "high" | "medium" | "low";

type Point = { title: string; detail: string };

export type Recommendation = {
  stance: Stance;
  confidence: number;
  headline: string;
  thesis: string;
  drivers: Point[];
  risks: Point[];
  sectorTrends: { theme: string; relevance: Relevance; note: string }[];
  timeframeVerdict: string;
  projectedProfit: { low: number; base: number; high: number; note: string };
};

const STANCE_STYLE: Record<
  Stance,
  { label: string; icon: typeof TrendingUp; color: string }
> = {
  bullish: { label: "Bullish", icon: TrendingUp, color: "var(--gain)" },
  neutral: { label: "Neutral", icon: Minus, color: "var(--muted-foreground)" },
  bearish: { label: "Bearish", icon: TrendingDown, color: "var(--loss)" },
};

const RELEVANCE_LABEL: Record<Relevance, string> = {
  high: "Direct",
  medium: "Partial",
  low: "Indirect",
};

function PointList({
  title,
  icon: Icon,
  points,
}: {
  title: string;
  icon: typeof Zap;
  points: Point[];
}) {
  if (points.length === 0) return null;

  return (
    <div>
      <h4 className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </h4>
      <ul className="mt-2.5 space-y-2.5">
        {points.map((point) => (
          <li key={point.title} className="text-sm leading-snug">
            <span className="font-medium">{point.title}.</span>{" "}
            <span className="text-muted-foreground">{point.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {[0, 1].map((column) => (
          <div key={column} className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiRecommendation({
  symbol,
  timeframe,
  balance,
  meta,
  forecast,
  ready,
}: {
  symbol: string;
  timeframe: Timeframe;
  balance: number;
  meta: SeriesMeta | null;
  forecast: Forecast | null;
  /** Gate the request until the chart data it reasons over has actually landed. */
  ready: boolean;
}) {
  const [data, setData] = React.useState<Recommendation | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  // Same render-time reset as `useStockData`: drop the previous ticker's recommendation
  // before paint, so NVDA's outlook is never shown under AAPL's heading while the new
  // request is in flight. The key mirrors the effect's dependencies exactly.
  const requestKey = `${ready}|${symbol}|${timeframe}|${balance}|${meta?.endPrice}|${forecast?.expectedReturnPct}|${nonce}`;
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  if (activeKey !== requestKey) {
    setActiveKey(requestKey);
    setData(null);
    setError(null);
    setLoading(ready && !!meta);
  }

  React.useEffect(() => {
    if (!ready || !meta) return;

    const controller = new AbortController();

    const horizonDays = forecast?.horizonDays ?? 30;
    const body = {
      ticker: symbol,
      timeframe,
      horizonDays,
      balance,
      startPrice: meta.startPrice,
      endPrice: meta.endPrice,
      changePct: meta.changePct,
      volatility: meta.volatility,
      forecast: forecast
        ? {
            expectedReturnPct: forecast.expectedReturnPct,
            annualDrift: forecast.annualDrift,
            annualVolatility: forecast.annualVolatility,
            low: forecast.points[forecast.points.length - 1].lower,
            base: forecast.points[forecast.points.length - 1].projected,
            high: forecast.points[forecast.points.length - 1].upper,
          }
        : null,
    };

    (async () => {
      try {
        const response = await fetch("/api/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.error ?? `The recommendation service returned ${response.status}.`,
          );
        }
        if (!controller.signal.aborted) setData(payload as Recommendation);
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof Error ? failure.message : "Could not reach Claude.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // `meta` and `forecast` are refetched together with the symbol/timeframe pair,
    // so keying on the identifying values keeps this to one request per selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, symbol, timeframe, balance, meta?.endPrice, forecast?.expectedReturnPct, nonce]);

  const stance = data ? STANCE_STYLE[data.stance] : null;
  const StanceIcon = stance?.icon ?? Sparkles;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4" aria-hidden />
          AI outlook
        </CardTitle>
        <CardDescription>
          Claude reads {symbol}&rsquo;s {timeframe.toLowerCase()} price action, the
          projection, and global market trends. Simulated — not financial advice.
        </CardDescription>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || !ready}
            onClick={() => setNonce((value) => value + 1)}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Regenerate
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {!ready && !error && (
          <p className="text-muted-foreground text-sm">
            Waiting for {symbol} price data…
          </p>
        )}

        {loading && <Loading />}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>No recommendation</AlertTitle>
            <AlertDescription className="gap-3">
              <span>{error}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNonce((value) => value + 1)}
              >
                <RefreshCw /> Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {data && !loading && stance && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: stance.color }}
                  >
                    <StanceIcon className="size-4" aria-hidden />
                    {stance.label}
                  </span>
                  <Separator orientation="vertical" className="!h-4" />
                  <span className="text-muted-foreground text-xs">
                    {Math.round(data.confidence)}% confidence
                  </span>
                </div>
                <p className="mt-1.5 text-lg leading-snug font-medium text-balance">
                  {data.headline}
                </p>
              </div>

              <div className="w-full sm:w-40">
                <Progress value={Math.max(0, Math.min(100, data.confidence))} />
                <p className="text-muted-foreground mt-1.5 text-xs">
                  Confidence scales with how much the volatility supports the call.
                </p>
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              {data.thesis}
            </p>

            <div className="bg-muted/50 grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
              {(
                [
                  ["Downside", data.projectedProfit.low, "var(--loss)"],
                  ["Central", data.projectedProfit.base, undefined],
                  ["Upside", data.projectedProfit.high, "var(--gain)"],
                ] as const
              ).map(([label, value, color]) => (
                <div key={label}>
                  <div className="text-muted-foreground text-xs tracking-wide uppercase">
                    {label}
                  </div>
                  <div
                    className="mt-1 text-lg font-semibold tabular-nums"
                    style={color ? { color } : undefined}
                  >
                    {value >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(value))}
                  </div>
                </div>
              ))}
              <p className="text-muted-foreground text-xs sm:col-span-3">
                {data.projectedProfit.note}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <PointList title="Drivers" icon={Zap} points={data.drivers} />
              <PointList title="Risks" icon={ShieldAlert} points={data.risks} />
            </div>

            {data.sectorTrends.length > 0 && (
              <div>
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Global trends in play
                </h4>
                <div className="mt-2.5 space-y-2.5">
                  {data.sectorTrends.map((trend) => (
                    <div key={trend.theme} className="flex flex-wrap gap-x-2 text-sm">
                      <Badge
                        variant={trend.relevance === "high" ? "default" : "secondary"}
                        className="font-normal"
                      >
                        {RELEVANCE_LABEL[trend.relevance]}
                      </Badge>
                      <span className="font-medium">{trend.theme}</span>
                      <span className="text-muted-foreground w-full sm:w-auto sm:flex-1">
                        {trend.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <p className="text-muted-foreground text-xs leading-relaxed">
              <span className="font-medium">On your {timeframe.toLowerCase()} window:</span>{" "}
              {data.timeframeVerdict}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
