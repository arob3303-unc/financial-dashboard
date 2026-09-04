# Extro — Financial Dashboard

A full-stack **fictional stock forecaster**. Sign in, set a make-believe balance, pick a ticker and a
time window, and Extro shows the real price history, a projected forecast band, what your balance would
have done, and an AI-written outlook on the name.

- **Stack** — Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn/ui + Recharts
- **Market data** — Yahoo Finance via `yahoo-finance2`, called from server route handlers
- **Auth** — Clerk (the simulated balance is stored in the user's Clerk `publicMetadata`)
- **AI** — Claude (`claude-opus-5`) via a server-side Next.js route handler
- **Deploys to Vercel as a single app** — no separate backend process

> Prices are real market data. Balances, profits and projections are simulated. Nothing here is
> financial advice.

## Features

- **Price charts** — historical closes with a gradient area fill, a dashed forward projection, and a
  ±1σ confidence band, in a colorblind-safe palette validated for both light and dark themes.
- **Forecast** — drift and volatility are estimated from the window's log returns and extrapolated
  forward as a geometric Brownian motion path with a one-standard-deviation band.
- **KPI row** — current price, realized return on your balance, projected value, projected profit.
- **AI outlook** — Claude reads the price action, the projection and global market trends (AI and
  datacenter demand for chip and memory names, hyperscaler capex, the power constraint, rate
  sensitivity) and returns a structured stance, thesis, drivers, risks and a profit band.
- **Ticker comparison** — two charts side by side over the same window.
- **Dark and light themes.**

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

### Environment

Create `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
ANTHROPIC_API_KEY=...
```

Deploying to Vercel? Set the same three in **Settings → Environment Variables**. The Clerk
publishable key is required at *build* time — the home page is statically prerendered, so a
missing key fails the build with `Missing publishableKey` rather than only breaking sign-in.

## Layout

```
src/
├── app/
│   ├── api/stocks/[symbol]/       Price history            (public)
│   ├── api/forecast/[symbol]/     Drift/volatility band    (public)
│   ├── api/balance/               The simulated balance    (auth)
│   ├── api/recommendation/        Claude-powered outlook   (auth)
│   └── layout.tsx page.tsx globals.css
├── components/               StockChart, AiRecommendation, StatCard, AppHeader
│   └── ui/                   shadcn/ui primitives
├── hooks/use-stock-data.ts   Loads price history + forecast for one ticker
└── lib/
    ├── market.ts             Timeframes, summary stats, the projection
    ├── quotes.ts             Yahoo Finance access (server-only)
    └── api.ts                Typed, shape-validating client for /api/*
```

See `CLAUDE.md` for the API contract and project conventions.
