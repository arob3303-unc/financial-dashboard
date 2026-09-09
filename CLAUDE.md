# CLAUDE.md — Extro (Financial Dashboard)

Guidance for Claude Code when working in this repository.

## What this is

**Extro** is a *fictional* stock forecaster and portfolio simulator. Users sign in, set a make-believe
balance, pick a ticker and a timeframe, and see the historical price chart, a projected forecast band, the
hypothetical profit on their balance, and an AI-written recommendation.

Nothing here is real financial advice. Prices are real (pulled from `yfinance`), but balances, profits,
and forecasts are simulated for demonstration.

## Architecture

```
financial-dashboard/            <- the git repo / npm project; this is the whole app
├── src/
│   ├── proxy.ts                Clerk request context (Next 16 renamed `middleware.ts`)
│   ├── app/                    Next.js App Router
│   │   ├── layout.tsx          ClerkProvider + ThemeProvider + app shell header
│   │   ├── page.tsx            Home / landing page
│   │   ├── long-term/          The forecaster dashboard
│   │   ├── black-swan/         The book + 19 gated chapter quizzes
│   │   ├── options/            Section page (stub content)
│   │   ├── globals.css         Tailwind v4 + shadcn theme tokens + chart palette
│   │   └── api/
│   │       ├── stocks/[symbol]/     price history        (public)
│   │       ├── forecast/[symbol]/   drift/vol projection (public)
│   │       ├── balance/             GET/POST balance     (auth)
│   │       ├── black-swan/progress/ quiz progress+grading (auth)
│   │       └── recommendation/      Claude outlook       (auth)
│   ├── components/             StockChart, AiRecommendation, StatCard, AppHeader,
│   │   │                       SiteNav, HeroVisual, SectionStub
│   │   ├── black-swan/         ChapterList, QuizDialog
│   │   └── ui/                 shadcn/ui primitives — generated, avoid hand-editing
│   ├── hooks/use-stock-data.ts Loads price history + forecast for one ticker
│   └── lib/
│       ├── nav.ts              SECTIONS — the three areas, defined once
│       ├── black-swan.ts       server-only: chapters, questions, answer key, grading
│       ├── market.ts           Timeframes, summarize(), project() — pure, isomorphic
│       ├── quotes.ts           Yahoo Finance access (server-only)
│       ├── api.ts              Typed, shape-validating client for /api/*
│       └── utils.ts            cn()
└── CLAUDE.md                   this file
```

**One process.** Everything is the Next.js app; there is no separate backend to start.
Price data comes from Yahoo Finance through the `yahoo-finance2` package, called from
`src/lib/quotes.ts` inside the route handlers — never from the browser, so there is no
CORS and no API base URL to configure. Anything needing a secret (Claude, Clerk server
calls) lives in a route handler.

**Pages.** `/` is the landing page; `/long-term` is the forecaster dashboard; `/black-swan`
and `/options` are section pages whose written content is still a stub. The three
non-home sections are defined once in `src/lib/nav.ts` (`SECTIONS`) and rendered by both
the header menu (`SiteNav`) and the home page's cards, so a section cannot be described
one way in the nav and another way on the landing page. Add a section there, not in two
places.

The hero image slot on `/` points at `public/hero.webp`, which does not exist yet;
`HeroVisual` falls back to a labelled placeholder until that file is added. Note that
Next's dev image cache (`.next/dev/cache/images`) keeps serving a previously optimized
copy after the file changes on disk — clear it if the hero looks stale in development.

> There used to be a Flask API at `src/flask-api/stockdata.py`. It was ported to
> `src/lib/market.ts` plus the two route handlers so the app deploys to Vercel as a single
> unit. The TypeScript port reproduces the NumPy original exactly — verified by running
> both over an identical series and diffing every meta field, every forecast scalar, and
> all 60 projected points. The Python remains in git history at `d8706f8`.

## Deploying to Vercel

Set these in **Settings → Environment Variables** (Production, Preview, Development):
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ANTHROPIC_API_KEY`.

**The Clerk publishable key is needed at *build* time, not just runtime.** `/` is statically
prerendered, `<ClerkProvider>` renders during that prerender, and `@clerk/nextjs` resolves
the key as `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""` then throws
`Missing publishableKey`. Locally you never hit this because Clerk v6 has a
development-only "keyless" fallback that auto-provisions a key; production builds have no
such fallback. A deploy failing with `Error occurred prerendering page "/"` is this.
Vercel does not rebuild when you add variables — redeploy with the build cache off.

Use the `pk_live_…` / `sk_live_…` pair for Production and add the deployment domain in the
Clerk dashboard; `pk_test_…` will build but sign-in will misbehave.

## Commands

```bash
npm run dev       # everything, on :3000
npm run build     # production build; must pass before committing
npm run lint      # `eslint .` -- `next lint` was removed in Next 16
```

## Environment variables

`.env.local` (Next.js, gitignored):

| Name | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk, browser-side |
| `CLERK_SECRET_KEY` | Clerk, server-side |
| `ANTHROPIC_API_KEY` | Claude API, used only by `src/app/api/recommendation` |

There is deliberately **no** `NEXT_PUBLIC_API_BASE_URL`. It used to default to
`http://127.0.0.1:5000`, and because `NEXT_PUBLIC_*` values are inlined into the browser
bundle at build time, a deploy that forgot to set it shipped a site telling every
visitor's browser to call its own machine on port 5000. The API is same-origin now.

## API contract (internal, same-origin)

`GET /api/stocks/<symbol>?time=<label>` where `<label>` is one of
`1 Month | 3 Months | 6 Months | 1 Year | 3 Years | 5 Years`:

```json
{
  "symbol": "NVDA",
  "timeframe": "1 Month",
  "points": [{ "date": "2026-08-04", "price": 178.42 }],
  "meta": { "startPrice": 0, "endPrice": 0, "changePct": 0,
            "high": 0, "low": 0, "volatility": 0, "count": 0 }
}
```

`GET /api/forecast/<symbol>?time=<label>&horizon=<days>`:

```json
{
  "symbol": "NVDA", "horizonDays": 30,
  "points": [{ "date": "2026-09-05", "projected": 0, "lower": 0, "upper": 0 }],
  "expectedReturnPct": 0, "annualDrift": 0, "annualVolatility": 0, "lastPrice": 0
}
```

Every response is an **object**, never a bare array, and never carries a non-finite price:
`loadCloses()` drops null/NaN closes before anything downstream sees them.

Errors: `{"error": "..."}` with a 4xx/5xx status. Successful responses carry
`Cache-Control: s-maxage=300, stale-while-revalidate=600` — Yahoo rate-limits by IP and
every visitor to a Vercel deployment shares the same egress addresses, so edge caching is
what stops a popular ticker becoming one upstream call per page view.

`/api/stocks` and `/api/forecast` are **public**; `/api/balance` and `/api/recommendation`
require a signed-in user. The dashboard shows charts to signed-out visitors, so gating all
of `/api/*` would break them.

## Conventions

- **Imports use the `@/` alias** (`@/components/...`, `@/lib/api`), configured in `tsconfig.json`.
- `src/components/ui/*` is generated by `npx shadcn@latest add <name>` — regenerate rather than hand-edit.
- **Never hand Recharts an unvalidated value.** All API responses go through `src/lib/api.ts`, which
  validates shape and throws `ApiError` otherwise. See the work log entry for 2026-09-04.
- Chart colors come from the `ChartConfig` / CSS variables so they work in both themes; don't hardcode hex.
- Tailwind v4: `globals.css` uses `@import "tailwindcss"`, **not** the v3 `@tailwind` directives.
- **Clerk is Core 3 (v7).** `<SignedIn>` / `<SignedOut>` / `<Protect>` no longer exist — use
  `<Show when="signed-in" | "signed-out" | {role|permission|feature|plan} | (has) => boolean>`,
  with `fallback` for the other branch. The removed names are still *exported* as stubs that
  throw at render, so **TypeScript will not catch them** — grep, don't rely on `tsc`.
- **Authorization lives in the route handler, not in `proxy.ts`.** Clerk Core 3 deprecates
  `createRouteMatcher`: path matching can diverge from how Next actually routes a request and
  leave a "protected" resource reachable. Every route that reads a balance or spends money on a
  Claude call does its own `const { userId } = await auth()` check and answers 401 itself.
- **Next 16 renamed `middleware.ts` to `proxy.ts`.** Never have both — Next errors when it sees
  the two together.
- Next 16 appends a `nextjs-agent-rules` block to this file on every `next dev`. Commit it; it
  regenerates otherwise. It points at bundled docs in `node_modules/next/dist/docs/`.
- **`src/lib/black-swan.ts` is `server-only` and must stay that way.** It holds the quiz answer
  key. Client code gets `toPublicChapters()` (answers stripped) and the server grades every
  attempt in `src/app/api/black-swan/progress/route.ts`. If a client component ever imports it
  the build fails — that is the guard working, not a bug to route around.
- **`updateUserMetadata` deep-merges**, so `/api/balance` and the quiz route can both write
  `publicMetadata` without clobbering each other. Use `replaceUserMetadata` only to wipe.
- The simulated balance in the header only renders on `/long-term` (`BALANCE_ROUTE` in
  `AppHeader`); `BalanceProvider` still wraps the whole app because that page reads it.
- Forecast and summary maths lives in `src/lib/market.ts` and is pure — no Node or browser
  APIs — so the routes and the client share it and it can be exercised directly.
- Claude API calls use `claude-opus-5` with `thinking: {type: "adaptive"}`. `budget_tokens` is rejected
  with a 400 on this model.

## Work log

### 2026-09-04 — Chart crash fix, shadcn/ui, Claude recommendations

**Fixed the `displayedData.map is not a function` crash.** Root cause was a two-sided
failure, so both sides were fixed:

- *Backend:* `round(float(row["Close"]), 2)` produced `nan` on any holiday or partial row.
  Flask's JSON provider leaves `allow_nan=True`, so the body carried a bare `NaN` token,
  which is not valid JSON. `df.empty` did not catch it.
- *Client:* axios 1.x has `silentJSONParsing: true`, so the `JSON.parse` failure was
  swallowed and the **raw string body** was returned with a 200. `ChartComponent` called
  `setData(res.data)` unchecked, and its only guard was `data.length === 0` — which a
  non-empty string passes. A string has `.length` and `.slice()` but no `.map()`, which is
  exactly the error Recharts threw. (An object payload would have rendered a blank chart
  instead — only a string crashes.)

The fixes: drop NaN rows at the source and set `app.json.allow_nan = False` so a bad value
is a loud 500 rather than a silent 200; set `silentJSONParsing: false` on the axios
instance; and route every response through `src/lib/api.ts`, which validates shape and
filters non-finite points before anything reaches a chart.

**Other backend changes** (`src/flask-api/stockdata.py`, rewritten):
- The timeframe branch was six sequential `if`s, each with a *different* default. An absent
  `time` fell through all of them and returned 5 years instead of 1 month; an unrecognized
  value left `start` unbound and 500'd. Replaced with a `TIMEFRAMES` dict lookup.
- `yf.download` returns MultiIndex columns on yfinance 0.2.63 + pandas 2.3, so `row["Close"]`
  was a one-element Series coerced by a `float()` path that pandas 3 removes. Columns are
  flattened first now.
- Responses are objects (`{symbol, timeframe, points, meta}`), never bare arrays, and carry
  the summary stats the client used to recompute itself.
- New `GET /api/forecast/<symbol>` — drift and volatility from the window's log returns,
  extrapolated as a GBM path with a ±1σ band. No new Python dependencies.
- Deleted a commented-out `psycopg2` block containing a **hardcoded plaintext password**,
  the unused `psycopg2` import, and the dead balance handlers.
- Removed `/explain` and the `openai` import. Its only caller (`LLMTextBox`) is gone, and
  `OpenAI(api_key=None)` raises at construction, so a missing key would have broken the
  whole API for anyone without one. `OPENAI_API_KEY` in `src/flask-api/.env` is now unused.
- CORS is restricted to localhost, but with **any port** — Next.js falls back to 3001+ when
  3000 is taken, and a fixed-port allowlist silently breaks the charts when that happens.
- Added `requirements.txt`; there was no Python dependency manifest at all.

**UI rebuilt on shadcn/ui.** Tailwind v4 was installed but `globals.css` still used the v3
`@tailwind` directives, which `@tailwindcss/postcss` no longer compiles — every Tailwind
class in the codebase was dead. Fixed to `@import "tailwindcss"`, then `shadcn init` (radix
base, nova preset). `ChartComponent`, `LLMTextBox`, `Navbar` and `SettingsModal` were
replaced by `StockChart`, `AiRecommendation`, `AppHeader`, `StatCard` and `BalanceProvider`.
Note that `shadcn init` upgraded **recharts 2.15.3 → 3.8.0**, which also settles the React 19
peer warning.

**Chart palette** follows the dataviz method: blue (slot 1) for the primary ticker, orange
(slot 2) for the comparison, assigned by entity rather than rank. Validated with the palette
validator against both surfaces — lightness band, chroma floor, CVD separation, normal-vision
floor and contrast all pass in light and dark. Green/red are reserved for status deltas and
always ship with an arrow icon plus a signed number, so hue never carries meaning alone.
The Y axis snaps to a 1/2/5×10ⁿ step so ticks are round numbers rather than `$189.1`.

**Claude recommendation** (`src/app/api/recommendation/route.ts`): `claude-opus-5`,
`thinking: {type: "adaptive"}` (`budget_tokens` is rejected with a 400 on this model),
`output_config.effort: "medium"`, and structured outputs via `zodOutputFormat`. The system
prompt carries a curated global-trend map (AI/datacenter buildout, hyperscaler capex, the
power constraint, custom silicon, rate sensitivity, index concentration) and is marked
`cache_control: ephemeral` so repeated requests hit the prompt cache.

> **`stance` and `relevance` are `z.string()`, not `z.enum`, on purpose.** The SDK's
> structured-output transform does not carry `enum` into the grammar — it folds the allowed
> values into the field *description*. With `z.enum`, one off-list word from the model would
> fail zod parsing and blank the entire panel. They are parsed as strings and normalized
> server-side instead, so a near miss like `"Bullish"` still renders.

**Balance is now real.** `Navbar` called `/api/balance/${user.id}` and `/api/balance` as
*relative* URLs, so they hit Next.js on :3000 — where no `src/app/api` directory existed and
the Flask counterparts were commented out. Both 404'd unconditionally, which is why the
balance always displayed `$0`. There is now a real `src/app/api/balance/route.ts` storing the
amount in Clerk `publicMetadata`, and it feeds the profit KPIs and the Claude payload
(replacing the hardcoded `amount: 5000`).

**Middleware** was bare `clerkMiddleware()` with no protection at all. It now gates `/api/*`.
It does *not* use `auth.protect()`, which answers an unauthenticated API request with a bare
404 that is indistinguishable from a typo'd route; it returns a JSON 401 instead.

**Removed junk deps:** `fastapi@0.0.8` (an unrelated npm package, not Python FastAPI),
`@clerk/clerk-react` (redundant with `@clerk/nextjs`), and the unused frontend `openai`.

**Verified:** clean `npm run build` and `npm run lint`; both endpoints return strict-parseable
JSON with NaN rows dropped; charts render in light and dark and at a narrow viewport; the
error state (Flask stopped) shows an Alert with Retry instead of crashing; unauthenticated
`/api/*` returns a JSON 401.

**Not verified end-to-end:** the live Claude call. No `ANTHROPIC_API_KEY` was available in
this environment, and `yfinance` could not reach Yahoo (TLS trust failure in this shell), so
the charts were exercised against the real Flask code path with `yf.download` stubbed.

### 2026-09-04 (later) — Vercel deployment: Clerk build key + Flask ported to route handlers

**The deploy failure was `Missing publishableKey`, at build time.** Reproduced locally with
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="" npm run build`:

```
Error occurred prerendering page "/". 
Error: @clerk/nextjs: Missing publishableKey.
Export encountered an error on /page: /, exiting the build.
```

No environment variables were set in the Vercel project. `/` is statically prerendered, so
`<ClerkProvider>` runs during the build; `@clerk/nextjs` reads
`process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""` and `assertKey` throws on empty. It
never reproduces locally because Clerk v6 auto-provisions a "keyless" dev key — a
development-only path with no production equivalent. Fix is configuration, not code: see
**Deploying to Vercel** above.

**Ported the Flask API to Next.js route handlers.** Vercel deploys only the Next.js app, so
`src/flask-api/stockdata.py` could never have run there — and `src/lib/api.ts` fell back to
`http://127.0.0.1:5000`, which for a `NEXT_PUBLIC_*` value is inlined into the browser
bundle at build time. Even with a green build, every visitor's browser would have called
its own machine on port 5000 and every chart would have shown the error state.

- `src/lib/market.ts` — timeframes, `summarize()` and `project()` ported from NumPy to
  plain TypeScript. Pure and isomorphic, so the routes and the client share the constants.
- `src/lib/quotes.ts` — Yahoo access via `yahoo-finance2`, `server-only`. Note v4 **must** be
  instantiated (`new YahooFinance()`); the v2-style bare default export throws. Null closes
  (the JS form of the old `NaN` problem) are dropped here. Symbols are validated against a
  character allowlist — `/api/stocks/..%2Fetc` returns 400, not a path traversal.
- `src/app/api/stocks/[symbol]/` and `src/app/api/forecast/[symbol]/` — same JSON contract
  as the Flask endpoints, so the client barely changed.
- Responses carry `s-maxage=300, stale-while-revalidate=600`. This is not incidental: Yahoo
  rate-limits by IP and all Vercel traffic shares egress addresses, so without edge caching
  a popular ticker is one upstream call per page view.
- `src/lib/api.ts` is same-origin; `API_BASE_URL` and the localhost fallback are **deleted**
  rather than defaulted, so a misconfigured deploy fails loudly instead of shipping silently.
- `src/middleware.ts` now protects only `/api/balance` and `/api/recommendation`. Gating all
  of `/api/*` — as it did — would have 401'd the charts for signed-out visitors, who can see
  them today.
- `src/flask-api/`, the `dev:api` / `dev:all` scripts and `concurrently` are removed.
  `npm run dev` now runs the whole app.

**The port is exact, not approximate.** Both implementations were run over an identical
260-point series and diffed: every `meta` field, every forecast scalar, and all 60 projected
points match to the cent, including the business-day date sequence.

**Verified:** clean `npm run build` and `npm run lint`; `?time=` omitted gives 1 month (not
5 years), `?time=zzz` does not 500, a bogus symbol returns a clean 404, horizon clamps at
365; `Cache-Control` present; signed out, `/api/stocks` and `/api/forecast` are 200 while
`/api/balance` and `/api/recommendation` are JSON 401; charts render with live data (NVDA
+34.38% over 1 year); and `grep -r "127.0.0.1:5000" .next/static/` is clean.

**Still not verified end-to-end:** the live Claude call — no `ANTHROPIC_API_KEY` in this
environment.

### 2026-09-04 (later still) — Clerk Core 3 + Next 16

Dependencies were bumped to Next **16.3.4** and `@clerk/nextjs` **7.9.1**, and the Vercel build
failed at prerender with `<SignedIn> is not available in @clerk/nextjs Core 3`.

**Core 3 removed `<SignedIn>`, `<SignedOut>` and `<Protect>`**, replacing all three with
`<Show when={...}>`. They are still exported — as stubs typed to return `never` that throw when
rendered — which is exactly why the build reported *"Finished TypeScript"* and then died several
steps later during static generation. **A passing `tsc` proves nothing here; grep is the only
reliable check.** Two files used them: `src/app/page.tsx` and `src/components/AppHeader.tsx`.

Both are `"use client"`, which needs no special handling: `@clerk/nextjs` resolves `Show` through a
`react-server` export condition, so client components get the synchronous client component and
server components get the async one, with identical props.

In `AppHeader` the adjacent `<SignedOut><SignInButton/></SignedOut>` +
`<SignedIn><UserButton/></SignedIn>` pair collapsed into one `<Show when="signed-in" fallback={…}>`.

Two pieces of widely-repeated Core 3 upgrade advice did **not** apply: there is no `<Protect>` here,
and no `setActive()` (so no `finalize()` migration). `useAuth()` is unchanged.

**Next 16 fallout, none of which had surfaced in the build log yet:**

- `next lint` was removed. `npm run lint` was silently broken; it is now `eslint .`, with
  `eslint-config-next` bumped 15.3.3 → 16 and `eslint.config.mjs` rewritten to that package's
  native flat config (the `FlatCompat` shim is gone). `next lint`'s implicit ignores had to be
  declared by hand.
- `middleware.ts` → **`proxy.ts`** (deprecated filename). Contents unchanged; verified the build
  still reports `ƒ Proxy (Middleware)` and that auth still holds.
- Next rewrote `tsconfig.json` (`jsx: preserve` → `react-jsx`, plus `.next/dev/types`). Mandatory.
- eslint-config-next 16 enables `react-hooks/set-state-in-effect`, which flagged 5 pre-existing
  spots. Fixed properly rather than suppressed: the dialog re-seed became a `key` remount; the
  theme toggle picks its icon in CSS (which also removes the wrong-icon flash the mount guard
  caused); and the three "reset then fetch" hooks now reset **during render** via a request-key
  comparison — React's documented "adjusting state when a prop changes" pattern, which avoids
  committing the stale frame at all.

**Also removed the deprecated `createRouteMatcher`** from `proxy.ts` — see Conventions. Behaviour is
unchanged because each protected route already did its own check; re-verified after the change.

**Verified:** `grep -rn "SignedIn\|SignedOut\|Protect" src/` is clean; `npm run build` passes with
`/` prerendered and `ƒ Proxy (Middleware)` present; `npm run lint` exits 0; a *genuinely* fresh dev
boot serves requests with no deprecation warnings; signed out, `/api/stocks` and `/api/forecast`
return 200 while `GET`/`POST /api/balance` and `POST /api/recommendation` return JSON 401; and the
signed-out page renders charts, the header Sign in button (the `Show` fallback) and the "Sign in to
generate a recommendation" card (`when="signed-out"`).

**Still not verified end-to-end:** the live Claude call — no `ANTHROPIC_API_KEY` in this environment.

### 2026-09-08 — Home page and site navigation

`/` used to be the forecaster dashboard, so anyone landing on the domain got charts with no
explanation. Added a real landing page and moved the dashboard to **`/long-term`**, which becomes
the long-term investing area. Every import in that file was `@/`-aliased and there were no internal
links anywhere in `src/`, so the move was a pure `git mv` with no code edits.

Four routes now: `/`, `/black-swan`, `/options`, `/long-term`. The two new section pages are stubs —
real framing text plus an "in progress" badge — so that clicking through from the home page lands
somewhere deliberate rather than on a 404.

**`src/lib/nav.ts` is the single source for the three sections.** The header menu and the home
page's cards both render from `SECTIONS`; that was the point of extracting it.

The home page is: hero (headline + image slot), a mission section, then the three cards. The 60/40
savings rule gets a proportion bar rather than a sentence, coloured from the existing validated
`--chart-1` / `--chart-2` tokens so it stays theme-correct alongside the charts. The card blurbs are
written as one argument rather than three summaries — the Black Swan card explicitly frames itself
as the caveat on the site's own forecast, which is more honest than selling the projection as
certainty.

`SiteNav` is a dropdown menu pinned last in the header so the trigger sits in the true top-right
corner, collapsed at every breakpoint by request. `Card` is a plain `div` with no `asChild` and uses
a **ring**, not a border, as its edge — so the cards are wrapped in the `Link` rather than the other
way round, and the hover state adjusts `ring`.

**No mockup image was ever received** for this page; it was built from the written description.

**Verified:** build lists all four routes and lint is clean; every route returns 200 and the price
APIs still work after the move; the dashboard renders with live data at `/long-term`; the hero slot
was tested in *both* states — placeholder with no file, and a temporary throwaway PNG dropped in to
confirm the real image displays, then deleted; home page checked in dark, light and at a narrow
viewport with no horizontal overflow.

**Left alone deliberately:** the header still reads "Extro · stock forecaster", which is now narrow
for a site that also covers tail risk and options — worth renaming, but that is the user's call.

### 2026-09-08 (later) — Hero image, page-scoped balance, The Black Swan quiz path

**Hero.** The supplied 1536×1024 collage is now `public/hero.webp` and `HeroVisual` moved from
`aspect-[16/9]` to `aspect-[3/2]`. That was not cosmetic: the Buffett quote is printed *inside* the
artwork, so a 16:9 crop would have shaved a composition meant to be seen whole.

**Balance is page-scoped.** It rendered in the header everywhere but only drives numbers on the
dashboard, so it is now gated on `usePathname() === "/long-term"`. It already sat beside the theme
toggle, so nothing moved — only where it appears.

**`/black-swan` is now real:** an overview of the book's argument, a buy-the-book card, a progress
bar, and 19 chapter quizzes gated at ≥ 80%.

The load-bearing design decision is that **`src/lib/black-swan.ts` is `server-only` and the server
grades every attempt.** The client posts chosen answer indexes, never a score. Had the client graded
itself, the answer key would sit in the browser bundle and the gate would be decoration. The gate is
also re-checked server-side (`chapter > 1` requires the previous chapter passed), so it cannot be
skipped by posting out of order.

Pass mark is `>= 80`. "Above 80%" is ambiguous at six questions — 5/6 is 83%, 4/6 is 67%, nothing
lands on 80 — so the inclusive reading costs nothing and avoids a surprise at counts where exactly
80% is reachable.

Chapter 1 carries six `SAMPLE —` questions purely so the flow can be exercised; chapters 2–19 have
empty arrays and render as "Questions coming soon". An empty chapter can never be passed, which is
deliberate: it means partially-filled content degrades instead of bricking the path.

Chapter titles were transcribed from memory and **should be checked against a copy of the book**.

The Amazon link uses the canonical `https://www.amazon.com/dp/081297381X` rather than the supplied
`/ref=sr_1_1?crid=…` search URL, whose tail is single-session tracking that rots and leaks the
search context.

The React Compiler lint rules caught two things worth keeping in mind for this codebase: mutating a
variable across a `.map()` during render (fixed by grouping chapters by part up front) and calling
`setState` in an effect body (fixed with the same render-time reset key pattern used in
`useStockData`).

**The quiz never reveals answers.** Submitting closes the dialog; the score, the pass/fail state and
whether the next chapter opened are read off the chapter row instead. The API returns only the score
and the derived flags — no per-question breakdown — so the key is not in the network tab either, and
`Question.explanation` is currently unused on purpose. Reopening a quiz always starts blank, so a
retake never shows the previous attempt's selections.

**Verified:** build lists all routes and lint is clean; the answer key and explanations are absent
from `.next/static/` while the prompts are present, proving the server-only split held; signed out,
`GET`/`POST /api/black-swan/progress` both return JSON 401 and the page shows a sign-in prompt with
every chapter locked; grading was unit-tested directly (100/83/67/0%, pass boundary, and an empty
chapter never passing).

**Not verified — needs a real session:** the signed-in click-through (fail → still locked, pass →
unlocks, persists across reload) and the balance appearing on `/long-term` but not elsewhere. Both
are gated behind Clerk sign-in, which cannot be driven headlessly here.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
