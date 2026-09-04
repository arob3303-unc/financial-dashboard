"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCompactCurrency,
  formatCurrency,
  formatAxisDate,
  formatFullDate,
  formatPercent,
  type Forecast,
  type StockSeries,
  type Timeframe,
} from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * One entity over time. Historical closes are a solid line under a gradient fill;
 * the projection continues the same hue as a dashed line inside a translucent
 * one-standard-deviation band. Colour follows the ticker, never its rank, so the
 * comparison chart keeps slot 2 whether it is above or below the primary.
 */
export type ChartSlot = "chart-1" | "chart-2";

type Row = {
  date: string;
  price?: number;
  projected?: number;
  band?: [number, number];
};

/** Stitch history and forecast into one row set, joined at the anchor point. */
function buildRows(series: StockSeries, forecast: Forecast | null): Row[] {
  const rows: Row[] = series.points.map((point) => ({
    date: point.date,
    price: point.price,
  }));

  if (!forecast || rows.length === 0) return rows;

  // Anchor the dashed line to the last real close so the two halves meet.
  const last = rows[rows.length - 1];
  last.projected = last.price;
  last.band = [last.price!, last.price!];

  for (const point of forecast.points) {
    rows.push({
      date: point.date,
      projected: point.projected,
      band: [point.lower, point.upper],
    });
  }

  return rows;
}

/**
 * A padded domain snapped to a 1/2/5 x 10^n step, plus the ticks that land on it.
 * Recharts will happily label a raw padded domain with values like $189.1 -- readable
 * axes need round numbers, so the step is chosen first and the domain follows it.
 */
function yScale(rows: Row[]): { domain: [number, number]; ticks: number[] } {
  const values = rows.flatMap((row) =>
    [row.price, row.band?.[0], row.band?.[1]].filter(
      (value): value is number => typeof value === "number",
    ),
  );
  if (values.length === 0) return { domain: [0, 1], ticks: [0, 1] };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min || Math.abs(max) || 1) * 0.08;

  const rawStep = (max + pad - (min - pad)) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const low = Math.floor((min - pad) / step) * step;
  const high = Math.ceil((max + pad) / step) * step;

  const ticks: number[] = [];
  for (let tick = low; tick <= high + step / 2; tick += step) {
    ticks.push(Number(tick.toFixed(6)));
  }

  return { domain: [low, high], ticks };
}

type TooltipPayload = {
  payload: Row;
}[];

function SeriesTooltip({
  active,
  payload,
  symbol,
  startPrice,
  color,
}: {
  active?: boolean;
  payload?: TooltipPayload;
  symbol: string;
  startPrice: number;
  color: string;
}) {
  if (!active || !payload?.length) return null;

  const row = payload[0].payload;
  const isForecast = row.price === undefined;
  const value = row.price ?? row.projected;
  if (typeof value !== "number") return null;

  const delta = startPrice ? ((value - startPrice) / startPrice) * 100 : 0;

  return (
    <div className="bg-popover text-popover-foreground grid gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{formatFullDate(row.date)}</div>
      <div className="flex items-center gap-2 font-medium">
        <span
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <span>{symbol}</span>
        <span className="ml-auto tabular-nums">{formatCurrency(value)}</span>
      </div>
      {isForecast && row.band ? (
        <div className="text-muted-foreground tabular-nums">
          Range {formatCurrency(row.band[0])} – {formatCurrency(row.band[1])}
        </div>
      ) : (
        <div className="text-muted-foreground tabular-nums">
          {formatPercent(delta)} from window start
        </div>
      )}
      {isForecast && (
        <div className="text-muted-foreground">Projected · simulated</div>
      )}
    </div>
  );
}

export function StockChartSkeleton({ height = 340 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="w-full rounded-lg" style={{ height }} />
    </div>
  );
}

export function StockChartError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Could not load this chart</AlertTitle>
      <AlertDescription className="gap-3">
        <span>{message}</span>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw /> Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function StockChart({
  series,
  forecast,
  timeframe,
  slot = "chart-1",
  height = 340,
  className,
}: {
  series: StockSeries;
  forecast: Forecast | null;
  timeframe: Timeframe;
  slot?: ChartSlot;
  height?: number;
  className?: string;
}) {
  const rows = React.useMemo(
    () => buildRows(series, forecast),
    [series, forecast],
  );
  const { domain, ticks } = React.useMemo(() => yScale(rows), [rows]);

  const color = `var(--${slot})`;
  const gradientId = React.useId();

  const meta = series.meta;
  const startPrice = meta?.startPrice ?? 0;
  const isUp = (meta?.changePct ?? 0) >= 0;
  const DirectionIcon = isUp ? TrendingUp : TrendingDown;

  const config = {
    price: { label: `${series.symbol} close`, color },
    projected: { label: "Projection", color },
  } satisfies ChartConfig;

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <span
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {series.symbol}
            <span className="text-muted-foreground/70">· {timeframe}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tracking-tight">
              {meta ? formatCurrency(meta.endPrice) : "—"}
            </span>
            {meta && (
              <span
                className="flex items-center gap-1 text-sm font-medium tabular-nums"
                style={{ color: isUp ? "var(--gain)" : "var(--loss)" }}
              >
                <DirectionIcon className="size-4" aria-hidden />
                {formatPercent(meta.changePct)}
              </span>
            )}
          </div>
        </div>

        {/* Two marks are on screen, so identity is never carried by colour alone. */}
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-5 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            Actual
          </span>
          {forecast && (
            <span className="flex items-center gap-1.5">
              <span
                className="h-0.5 w-5 rounded-full"
                style={{
                  backgroundImage: `repeating-linear-gradient(to right, ${
                    "currentColor"
                  } 0 4px, transparent 4px 8px)`,
                  color,
                }}
                aria-hidden
              />
              Projected ±1σ
            </span>
          )}
        </div>
      </div>

      <ChartContainer config={config} className="w-full min-w-0" style={{ height }}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={36}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: string) => formatAxisDate(value, timeframe)}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            width={64}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            tickFormatter={(value: number) => formatCompactCurrency(value)}
          />

          {startPrice > 0 && (
            <ReferenceLine
              y={startPrice}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
              strokeOpacity={0.5}
            />
          )}

          <ChartTooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={
              <SeriesTooltip
                symbol={series.symbol}
                startPrice={startPrice}
                color={color}
              />
            }
          />

          {/* Confidence band first so the lines sit on top of it. */}
          {forecast && (
            <Area
              dataKey="band"
              type="monotone"
              stroke="none"
              fill={color}
              fillOpacity={0.14}
              isAnimationActive={false}
              connectNulls
            />
          )}

          <Area
            dataKey="price"
            type="monotone"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
            isAnimationActive={false}
          />

          {forecast && (
            <Line
              dataKey="projected"
              type="monotone"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeOpacity={0.85}
              dot={false}
              activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ChartContainer>

      {forecast && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Badge variant="secondary" className="font-normal">
            {forecast.horizonDays}-day projection
          </Badge>
          <span className="tabular-nums">
            Expected {formatPercent(forecast.expectedReturnPct)}
          </span>
          <span className="tabular-nums">
            Annualized volatility {forecast.annualVolatility.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
