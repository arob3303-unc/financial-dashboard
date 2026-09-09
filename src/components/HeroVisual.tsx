"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

/**
 * The hero image slot.
 *
 * Points at `/hero.webp`. If the file is missing this tracks the load failure and falls
 * back to a styled empty state naming the exact path, so the layout never breaks and
 * swapping the artwork is a file drop rather than a code change.
 */
export function HeroVisual() {
  const [failed, setFailed] = React.useState(false);

  return (
    // 16:9 is the artwork's native ratio, so it displays wide and uncropped.
    <div className="bg-muted/40 relative aspect-[16/9] w-full overflow-hidden rounded-xl border">
      {failed ? (
        <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <ImageIcon className="size-8 opacity-60" aria-hidden />
          <p className="text-sm font-medium">Hero image goes here</p>
          <p className="text-xs">
            Add your image at{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-[0.7rem]">
              public/hero.webp
            </code>{" "}
            and it will appear here automatically.
          </p>
        </div>
      ) : (
        <Image
          src="/hero.webp"
          alt="Abstract candlestick chart representing market price movement"
          fill
          priority
          sizes="(min-width: 1024px) 60rem, 100vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
