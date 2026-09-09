"use client";

import * as React from "react";
import { Show, SignInButton } from "@clerk/nextjs";
import { Info } from "lucide-react";

import { AiRecommendation } from "@/components/AiRecommendation";
import { StatCard } from "@/components/StatCard";
import {
  StockChart,
  StockChartError,
  StockChartSkeleton,
  type ChartSlot,
} from "@/components/StockChart";
import { useBalance } from "@/components/BalanceProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockData } from "@/hooks/use-stock-data";
import {
  formatCurrency,
  TICKERS,
  TIMEFRAMES,
  type Timeframe,
} from "@/lib/api";

function TickerSelect({
  label,
  value,
  onChange,
  slot,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  slot: ChartSlot;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[9.5rem]">
          <span
            className="size-2.5 shrink-0 rounded-[2px]"
            style={{ backgroundColor: `var(--${slot})` }}
            aria-hidden
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TICKERS.map((ticker) => (
            <SelectItem key={ticker} value={ticker}>
              {ticker}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** The chart card, with its own loading, error and empty states. */
function ChartPanel({
  symbol,
  timeframe,
  slot,
}: {
  symbol: string;
  timeframe: Timeframe;
  slot: ChartSlot;
}) {
  const { series, forecast, forecastError, loading, error, reload } = useStockData(
    symbol,
    timeframe,
  );

  return (
    <Card className="min-w-0">
      <CardContent className="min-w-0">
        {loading && <StockChartSkeleton />}

        {!loading && error && <StockChartError message={error} onRetry={reload} />}

        {!loading && !error && series && series.points.length === 0 && (
          <div className="text-muted-foreground flex h-[22rem] flex-col items-center justify-center gap-2 text-sm">
            <Info className="size-5" aria-hidden />
            <span>No price data for {symbol} over {timeframe.toLowerCase()}.</span>
            <Button size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && series && series.points.length > 0 && (
          <>
            <StockChart
              series={series}
              forecast={forecast}
              timeframe={timeframe}
              slot={slot}
            />
            {forecastError && (
              <p className="text-muted-foreground mt-3 text-xs">
                Projection unavailable: {forecastError}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [primary, setPrimary] = React.useState("NVDA");
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1 Year");

  const { balance } = useBalance();

  // The KPI row and the AI panel both reason about the primary ticker, so they
  // share one fetch rather than each starting their own.
  const primaryData = useStockData(primary, timeframe);
  const meta = primaryData.series?.meta ?? null;
  const forecast = primaryData.forecast;

  // Totals, not gains: what the position is worth, having started at `balance`.
  // The projection compounds on top of today's value rather than on the original
  // stake, so the four tiles read as one chain: you put in X, it is worth Y now,
  // and the trend points at Z.
  const valueToday = meta ? balance * (1 + meta.changePct / 100) : null;
  const projectedValue =
    valueToday !== null && forecast
      ? valueToday * (1 + forecast.expectedReturnPct / 100)
      : null;
  const projectedGain =
    valueToday !== null && projectedValue !== null
      ? projectedValue - valueToday
      : null;

  return (
    <div className="mx-auto min-w-0 max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
          <p className="text-muted-foreground text-sm">
            Real prices, simulated money. Pick a ticker and a window to see what
            {" "}{formatCurrency(balance, 0)} would have done, and where the trend points.
          </p>
        </div>

        <TickerSelect
          label="Ticker"
          value={primary}
          onChange={setPrimary}
          slot="chart-1"
        />
      </div>

      {/* The six timeframes are wider than a phone, so the strip can still be swiped
          sideways there rather than pushing the page into a horizontal scroll. The
          scrollbar itself is hidden; `mx-auto` centres the list whenever it fits, and
          collapses to zero when it does not, so nothing is clipped off the left. */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <Tabs
          value={timeframe}
          onValueChange={(value) => setTimeframe(value as Timeframe)}
        >
          <TabsList className="mx-auto w-max">
            {TIMEFRAMES.map((option) => (
              <TabsTrigger key={option} value={option}>
                {option}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <section
        className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={`${primary} summary`}
      >
        <StatCard
          label={`${primary} price`}
          value={meta ? formatCurrency(meta.endPrice) : "—"}
          delta={meta?.changePct}
          caption={`over ${timeframe.toLowerCase()}`}
          loading={primaryData.loading}
        />
        <StatCard
          label={`Projected ${primary} price`}
          value={
            forecast
              ? formatCurrency(
                  forecast.points[forecast.points.length - 1].projected,
                )
              : "—"
          }
          delta={forecast?.expectedReturnPct}
          caption={forecast ? `in ${forecast.horizonDays} trading days` : "—"}
          loading={primaryData.loading}
        />
        <StatCard
          label="Your value today"
          value={valueToday === null ? "—" : formatCurrency(valueToday)}
          delta={meta?.changePct}
          caption={`from ${formatCurrency(balance, 0)} over ${timeframe.toLowerCase()}`}
          loading={primaryData.loading}
        />
        <StatCard
          label="Projected value"
          value={projectedValue === null ? "—" : formatCurrency(projectedValue)}
          delta={forecast?.expectedReturnPct}
          caption={
            forecast && projectedGain !== null
              ? `${formatCurrency(projectedGain)} in ${forecast.horizonDays} trading days`
              : "—"
          }
          loading={primaryData.loading}
        />
      </section>

      <section className="min-w-0" aria-label="Price chart">
        <ChartPanel symbol={primary} timeframe={timeframe} slot="chart-1" />
      </section>

      <Show when="signed-in">
        <AiRecommendation
          symbol={primary}
          timeframe={timeframe}
          balance={balance}
          meta={meta}
          forecast={forecast}
          ready={!primaryData.loading && !!meta}
        />
      </Show>

      <Show when="signed-out">
        <Card>
          <CardHeader>
            <CardTitle>AI outlook</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info />
              <AlertTitle>Sign in to generate a recommendation</AlertTitle>
              <AlertDescription className="gap-3">
                <span>
                  Claude reads the price action, the projection, and current market
                  trends to explain what the scenario implies.
                </span>
                <SignInButton mode="modal">
                  <Button size="sm">Sign in</Button>
                </SignInButton>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </Show>

      <p className="text-muted-foreground text-xs">
        Extro is a simulation. Prices are real market data; balances, profits and
        projections are fictional and are not financial advice.
      </p>
    </div>
  );
}
