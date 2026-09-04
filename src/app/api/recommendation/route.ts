import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

// The Anthropic SDK needs the Node runtime, not Edge.
export const runtime = "nodejs";

const STANCES = ["bullish", "neutral", "bearish"] as const;
const RELEVANCES = ["high", "medium", "low"] as const;

type Stance = (typeof STANCES)[number];
type Relevance = (typeof RELEVANCES)[number];

/**
 * `stance` and `relevance` are typed as plain strings rather than `z.enum`.
 * The SDK's structured-output transform does not carry `enum` through to the
 * grammar -- it folds the allowed values into the field description -- so the
 * enum steers the model without binding it. Declaring `z.enum` here would make a
 * single off-list word fail parsing and blank the whole panel; instead the value
 * is normalized below and a near miss ("Bullish") still renders.
 */
const RecommendationSchema = z.object({
  stance: z.string().describe(`One of: ${STANCES.join(", ")}.`),
  confidence: z
    .number()
    .describe("0-100. How strongly the evidence supports the stance."),
  headline: z.string().describe("One punchy sentence, under 90 characters."),
  thesis: z
    .string()
    .describe(
      "2-4 sentences tying the price action, the forecast, and the sector story together.",
    ),
  drivers: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("2-4 forces that could push this name up over the horizon."),
  risks: z
    .array(z.object({ title: z.string(), detail: z.string() }))
    .describe("2-4 things that could break the thesis."),
  sectorTrends: z
    .array(
      z.object({
        theme: z.string(),
        relevance: z.string().describe(`One of: ${RELEVANCES.join(", ")}.`),
        note: z.string(),
      }),
    )
    .describe(
      "2-4 global market trends and how directly each one touches this ticker.",
    ),
  timeframeVerdict: z
    .string()
    .describe(
      "Whether the selected timeframe is well matched to this thesis, and why.",
    ),
  projectedProfit: z.object({
    low: z.number(),
    base: z.number(),
    high: z.number(),
    note: z.string(),
  }),
});

type RawRecommendation = z.infer<typeof RecommendationSchema>;

export type Recommendation = Omit<RawRecommendation, "stance" | "sectorTrends"> & {
  stance: Stance;
  sectorTrends: { theme: string; relevance: Relevance; note: string }[];
};

function oneOf<T extends string>(options: readonly T[], value: string, fallback: T): T {
  const normalized = value.trim().toLowerCase();
  return options.find((option) => option === normalized) ?? fallback;
}

/** Pin the free-text discriminators back onto the union the UI switches on. */
function normalize(raw: RawRecommendation): Recommendation {
  return {
    ...raw,
    stance: oneOf(STANCES, raw.stance, "neutral"),
    confidence: Math.max(0, Math.min(100, raw.confidence)),
    sectorTrends: raw.sectorTrends.map((trend) => ({
      ...trend,
      relevance: oneOf(RELEVANCES, trend.relevance, "medium"),
    })),
  };
}

const RequestSchema = z.object({
  ticker: z.string().min(1).max(12),
  timeframe: z.string().min(1).max(32),
  horizonDays: z.number().int().positive().max(365),
  balance: z.number().nonnegative(),
  startPrice: z.number(),
  endPrice: z.number(),
  changePct: z.number(),
  volatility: z.number(),
  forecast: z
    .object({
      expectedReturnPct: z.number(),
      annualDrift: z.number(),
      annualVolatility: z.number(),
      low: z.number(),
      base: z.number(),
      high: z.number(),
    })
    .nullable(),
});

// Identical on every request, so it earns a prompt-cache hit.
const SYSTEM_PROMPT = `You are the analyst engine behind Extro, a fictional stock-market simulator.

A user has picked one ticker, one lookback window, and a forecast horizon. You are handed the real
price statistics for that window plus a drift/volatility projection. Write the recommendation panel.

## How to reason

1. Start from the numbers you were given. Quote them. If the realized move and the projected move
   disagree, say so plainly rather than splitting the difference.
2. Then layer in what you know about the company's actual business and the structural trends below.
   The numbers say what happened; the trends say whether it should keep happening.
3. Judge the selected timeframe. A 1-month window on a name whose thesis plays out over years is
   mostly noise, and you should say that.
4. Volatility is the honest input to confidence. High annualized volatility over a thin lookback
   window means low confidence, no matter how clean the trend line looks.

## Structural trends to draw on (from your own knowledge; note that they may have moved since)

- AI training and inference buildout. Frontier-model training plus inference at scale drives demand for
  GPUs and accelerators (NVDA, AMD), advanced foundry capacity (TSM), and high-bandwidth memory (MU, SK
  Hynix, Samsung). HBM is the tightest link in that chain; conventional DRAM and NAND pricing rides the
  same capex wave with a lag.
- Hyperscaler datacenter capex. MSFT, GOOGL, AMZN and META capex guidance is the best leading indicator
  for the semis complex. Watch capex against cloud revenue growth: capex that outruns monetization is
  what eventually breaks the trade.
- Power and cooling as the real constraint. Datacenter growth is increasingly gated by grid
  interconnect, transformers and cooling rather than chip supply. That pulls in utilities and
  electrical equipment, and it caps how fast the AI story can compound.
- Custom silicon substitution. Hyperscaler in-house accelerators (TPU, Trainium, MTIA) are a slow
  structural headwind to merchant GPU share even while the total pie grows.
- The non-AI half of tech is a different market. Consumer devices, PCs and handsets follow the
  replacement cycle and consumer credit, not the AI capex cycle. Do not apply the AI narrative to a
  ticker whose revenue does not touch it.
- Rates and multiple compression. Long-duration, high-multiple growth names carry rate sensitivity that
  is independent of their operating results.
- Index concentration. SPY and VOO are heavily weighted toward the same megacap names, so rotating from
  a megacap into the index diversifies far less than it appears to.

## Rules

- Extro is a simulation. Never present this as financial advice, and never tell the user to buy or sell.
  Frame everything as what the simulated scenario implies.
- Be specific to the ticker in front of you. A recommendation that would read identically for any symbol
  is a failed recommendation. Name the actual business, its actual customers, its actual cycle.
- No hedging mush. If the evidence is genuinely mixed, say it is mixed and say what would break the tie.
- Compute projectedProfit from the supplied balance and the forecast band. If no forecast was supplied,
  project from the realized return instead and say so in the note.
- Keep every string tight. Detail fields are one or two sentences, not paragraphs.`;

function buildUserMessage(input: z.infer<typeof RequestSchema>) {
  const sign = input.changePct >= 0 ? "+" : "";
  const lines = [
    `Ticker: ${input.ticker}`,
    `Lookback window: ${input.timeframe}`,
    `Forecast horizon: ${input.horizonDays} trading days`,
    `Simulated balance to deploy: $${input.balance.toLocaleString()}`,
    "",
    "Realized over the lookback window:",
    `  start $${input.startPrice} -> end $${input.endPrice} (${sign}${input.changePct}%)`,
    `  annualized volatility: ${input.volatility}%`,
  ];

  if (input.forecast) {
    lines.push(
      "",
      `Drift/volatility projection over ${input.horizonDays} trading days:`,
      `  expected return: ${input.forecast.expectedReturnPct}%`,
      `  annualized drift: ${input.forecast.annualDrift}%`,
      `  annualized volatility: ${input.forecast.annualVolatility}%`,
      `  price band at horizon: $${input.forecast.low} low / $${input.forecast.base} central / $${input.forecast.high} high (one standard deviation)`,
    );
  } else {
    lines.push("", "No forward projection was available for this window.");
  }

  return lines.join("\n");
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sign in to generate a recommendation." },
      { status: 401 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsedBody = RequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Malformed request.", issues: parsedBody.error.issues },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(RecommendationSchema),
      },
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: buildUserMessage(parsedBody.data) }],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "The model returned a response that did not match the expected shape." },
        { status: 502 },
      );
    }

    return NextResponse.json(normalize(response.parsed_output));
  } catch (error) {
    // Most specific first: a rate limit is retryable, a bad key is not.
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Claude is rate limited right now. Try again in a moment." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY was rejected." },
        { status: 401 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error ${error.status}: ${error.message}` },
        { status: 502 },
      );
    }
    console.error("recommendation route failed", error);
    return NextResponse.json(
      { error: "Could not generate a recommendation." },
      { status: 500 },
    );
  }
}
