# Extro — Financial Dashboard

A full-stack **fictional stock forecaster**. Sign in, set a make-believe balance, pick a ticker and a
time window, and Extro shows the real price history, a projected forecast band, what your balance would
have done, and an AI-written outlook on the name.

- **Frontend** — Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn/ui + Recharts
- **Backend** — Flask + yfinance + NumPy (price history and the drift/volatility projection)
- **Auth** — Clerk (the simulated balance is stored in the user's Clerk `publicMetadata`)
- **AI** — Claude (`claude-opus-5`) via a server-side Next.js route handler

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
../.venv/Scripts/python -m pip install -r src/flask-api/requirements.txt

npm run dev:all      # Next.js on :3000 and Flask on :5000
```

`npm run dev` and `npm run dev:api` start each half on its own.

### Environment

Create `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
ANTHROPIC_API_KEY=...
# Optional; defaults to http://127.0.0.1:5000
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
```

## Layout

```
src/
├── app/
│   ├── api/balance/          GET + POST the simulated balance (Clerk publicMetadata)
│   ├── api/recommendation/   Claude-powered stock outlook
│   ├── layout.tsx page.tsx globals.css
├── components/               StockChart, AiRecommendation, StatCard, AppHeader
│   └── ui/                   shadcn/ui primitives
├── hooks/use-stock-data.ts   Loads price history + forecast for one ticker
├── lib/api.ts                Typed, shape-validating client for the Flask API
└── flask-api/stockdata.py    The price + forecast API
```

See `CLAUDE.md` for the API contract and project conventions.
