"use client";

import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * A stat tile: one number, its label, and an optional signed delta.
 *
 * The delta always ships as arrow icon + signed number + caption, so the
 * green/red status hue never has to carry the meaning on its own.
 */
export function StatCard({
  label,
  value,
  delta,
  caption,
  loading,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  caption?: React.ReactNode;
  loading?: boolean;
  className?: string;
}) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && delta >= 0;
  const DeltaIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </div>

        {loading ? (
          <Skeleton className="mt-2 h-8 w-28" />
        ) : (
          <div className="mt-1.5 text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {value}
          </div>
        )}

        <div className="text-muted-foreground mt-2 flex min-h-5 items-center gap-1.5 text-xs">
          {loading ? (
            <Skeleton className="h-4 w-20" />
          ) : (
            <>
              {hasDelta && (
                <span
                  className="flex items-center gap-1 font-medium tabular-nums"
                  style={{ color: isUp ? "var(--gain)" : "var(--loss)" }}
                >
                  <DeltaIcon className="size-3.5" aria-hidden />
                  {`${isUp ? "+" : ""}${delta.toFixed(2)}%`}
                </span>
              )}
              {caption && <span>{caption}</span>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
