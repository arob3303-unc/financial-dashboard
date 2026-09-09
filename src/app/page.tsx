import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HeroVisual } from "@/components/HeroVisual";
import { Card, CardContent } from "@/components/ui/card";
import { SECTIONS } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Extro | Learn about risk.",
  description:
    "A fictional market simulator for learning to take calculated risk: tail events, options, and compounding over decades on real price data.",
};

/** The one actionable number on the page, so it gets a visual rather than a sentence. */
function SplitBar() {
  return (
    <div className="mt-6">
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label="Live on 60 percent of your income, invest 40 percent"
      >
        <div style={{ width: "60%", backgroundColor: "var(--chart-1)" }} />
        {/* A 2px gap so the two segments read as separate quantities, not one bar. */}
        <div className="bg-background w-0.5 shrink-0" />
        <div style={{ width: "40%", backgroundColor: "var(--chart-2)" }} />
      </div>

      <div className="mt-2 flex justify-between text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: "var(--chart-1)" }}
            aria-hidden
          />
          <span className="font-medium">60% to live on</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: "var(--chart-2)" }}
            aria-hidden
          />
          <span className="font-medium">40% to invest</span>
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      {/* Hero */}
      <section>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Learn risk.
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-lg text-pretty">
          Extro is a learning platform and a market simulator for people who want to get comfortable with
          calculated risk. <br></br>&quot;real prices, fictional money, and nothing to lose while you
          learn&quot;
        </p>

        <div className="mt-8 max-w-3xl">
          <HeroVisual />
        </div>
      </section>

      {/* What this is and what it is for */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">What this is for</h2>
        <div className="text-muted-foreground mt-4 grid gap-4 text-pretty sm:grid-cols-2 sm:gap-8">
          <p>
            Most people avoid investing because the downside feels unbounded and the
            vocabulary is confusing. Extro is built to fix the first problem by fixing the
            second: understand where the real risk lives, learn the instruments that put a
            floor under it, and practise on live market data without any money on the line.
          </p>
          <p>
            The goal is concrete, financial independence inside twenty years! That is not
            a trading target, it is a savings rate problem. The lever that matters most is
            how much of your income you never spend, which is why the whole site is
            organised around one rule.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent>
            <p className="text-lg font-medium text-balance">
              Live on 60% of your income. Invest the other 40%.
            </p>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              Wherever that is possible for you. A high savings rate compounds hardm and it is 
              the one input you fully control. The simulator exists to show you what that 40% 
              does over a long horizon. It is important to live below your means.
            </p>
            <SplitBar />
          </CardContent>
        </Card>
      </section>

      {/* The three sections */}
      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">Start here</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;

            return (
              <Link
                key={section.href}
                href={section.href}
                className="group focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {/* Card is a plain div here -- the ring, not a border, is its edge. */}
                <Card className="hover:ring-foreground/25 hover:bg-accent/40 h-full transition-colors">
                  <CardContent className="flex h-full flex-col">
                    <Icon className="text-muted-foreground size-5" aria-hidden />
                    <h3 className="mt-3 font-semibold">{section.title}</h3>
                    <p className="text-muted-foreground mt-2 flex-1 text-sm text-pretty">
                      {section.blurb}
                    </p>
                    <span className="mt-4 flex items-center gap-1.5 text-sm font-medium">
                      {section.tagline}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="text-muted-foreground mt-14 text-xs">
        Extro is a simulation. Prices are real market data; balances, profits and
        projections are fictional and are not financial advice.
      </p>
    </div>
  );
}
