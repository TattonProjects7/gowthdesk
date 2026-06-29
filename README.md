# Shortlist 📉

**Find the best stocks to short. Risk small, win big.**

Shortlist is a short-selling research tool. It scans the market for stretched,
overbought, rolling-over stocks, structures each idea with **defined,
asymmetric risk** (a small fixed loss vs a multiple-of-risk target), and flags
the crowded names that could **squeeze** you — the trap most screeners sell as
an opportunity.

It is a research/alerts/paper-trading product. It does **not** execute trades.

---

## Features

- **Live scanner** — the whole market scored and ranked best-short-first from
  RSI, z-score, momentum, volatility and trend.
- **Squeeze-risk radar** — scores crowding from short interest % float,
  days-to-cover and borrow fee, and warns instead of tempting.
- **Defined-risk structuring** — every idea risks a fixed amount with a tight
  stop and a far target; reward:risk shown up front.
- **Defined-risk put alternative** — Black–Scholes-priced put expressing the
  same view with loss capped at the premium.
- **AI dual thesis** — a bear case *and* a steel-manned bull case (OpenAI, with
  a deterministic fallback).
- **Catalyst countdown** — the next earnings/event as the trade's clock.
- **Alerts** — target/stop hits and fresh A-grade setups, with optional browser
  notifications.
- **Tracker + expectancy** — watch the asymmetry play out and measure your edge
  in R-multiples.

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Supabase
(Postgres + Auth) · Stripe · Finnhub / Alpha Vantage · OpenAI.

## Runs with zero config

Every backend is gated on its environment variables, so the app runs fully
standalone — a deterministic simulated market, browser-local storage, and all
Pro features unlocked. Add keys to turn each piece on.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Going live

See **[SETUP.md](./SETUP.md)** for the ~20-minute path to a deployed product
with real data, accounts, subscriptions and hosting (Supabase → Stripe →
Vercel). The database schema is in `supabase/migrations/0001_init.sql`.

## Project layout

```
src/
  app/                 routes: / (landing), /scan, /short/[symbol], /tracker,
                       /pricing, /login, /auth, /api/*
  components/          Nav, Sparkline, ThesisPanel, AlertEngine
  lib/
    market.ts          deterministic price simulator (offline fallback)
    signals.ts         technical indicators from a closes array
    shorts.ts          short scoring + asymmetric trade structuring
    squeeze.ts         squeeze-risk radar
    options.ts         Black–Scholes put alternative
    catalysts.ts       next-catalyst countdown
    store.ts           tracked shorts (Supabase or localStorage) + expectancy
    alerts.ts          alert feed
    marketdata.ts      live providers (server-only)
    supabase/          auth + db clients
    stripe.ts          billing client
```

> Educational tool, not investment advice. Short selling carries uncapped risk
> unless a hard stop or defined-risk instrument is used.
