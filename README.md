# Shortlist 📉

**Invest smarter. Short with defined risk.**

Shortlist is an investing app for the web, iPhone and Android. You practise with
£10,000 of virtual money across UK and US shares, ETFs and crypto, using the
tools the leading UK platforms offer (IG, interactive investor, InvestEngine).
On top of that sits an asymmetric short-finder none of them has.

It is a research, education and paper-trading product. It does **not** execute
trades or hold client money.

See **[docs/COMPETITOR-FEATURES.md](./docs/COMPETITOR-FEATURES.md)** for the
competitor study and how each feature maps to this app.

---

## Features

**Investing**

- **Portfolio** — total value with a scrubbable chart, practice GIA / ISA / SIPP
  accounts, P&L, dividends and projected income on one screen.
- **Markets** — 33 instruments: US and UK shares (LSE, priced in pence), UCITS
  ETFs and crypto. Risers and fallers, sortable lists and a quick-quote search.
- **Instrument pages** — 1W–1Y charts with MA 10/30, Bollinger Bands, RSI and
  MACD. Key stats, client sentiment, results date, news and research, plus fund
  look-through for ETFs.
- **Deal ticket** — account picker, market / limit / stop orders, fractional
  from £1, stop-loss / take-profit / trailing stops, a full cost preview with FX,
  and in-ticket top-up or transfer when cash is short.
- **Automation** — savings plans (weekly / fortnightly / monthly), AutoInvest
  with a cash buffer, Smart Top-Up, one-click rebalance and five model ETF
  portfolios.
- **Analytics** — allocation by asset class, sector, region, holding or
  underlying company, an overlap check, and income by holding.
- **Watchlists and price alerts** — up to 50 lists. Alerts fire above, below or
  on a % move, in-app and as phone notifications.
- **Security** — Face ID / Touch ID / fingerprint app lock in the apps, with a
  PIN fallback.

**Short-finder**

- **Live scanner** — the market ranked best-short-first from RSI, z-score,
  momentum, volatility and trend.
- **Squeeze-risk radar** — short interest, days-to-cover and borrow fee, framed
  as a warning rather than an opportunity.
- **Defined-risk structuring** and a **Black–Scholes put alternative**.
- **AI dual thesis** — bear case and steel-manned bull case.
- **Catalyst countdown**, **alerts**, and a **tracker** with expectancy in R.

## Runs with zero config

Every backend is gated on its environment variables. With none set you get a
deterministic simulated market, on-device storage and all Pro features
unlocked. Add keys to turn each piece on.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 55 unit tests
```

## Going live

- **Web**: [SETUP.md](./SETUP.md) — Supabase, Stripe, market data, Vercel.
  Run both migrations in `supabase/migrations/`.
- **iPhone and Android**: [MOBILE.md](./MOBILE.md). The native projects are in
  `ios/` and `android/`.
- **Store listings**: [store/LISTING.md](./store/LISTING.md) and
  `store/screenshots/`.
- **Step by step**: [RUNBOOK.md](./RUNBOOK.md).

## Tech

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind · Capacitor 8 ·
Supabase (Postgres + Auth) · Stripe · RevenueCat · Finnhub / Alpha Vantage ·
OpenAI.

## Project layout

```
src/
  app/                  / (landing), /portfolio, /markets, /i/[symbol],
                        /watchlist, /settings, /scan, /short/[symbol],
                        /tracker, /pricing, /login, /api/*
  components/           Nav, DealTicket, PriceChart, AreaChart, Avatar,
                        AllocationDonut, InstrumentRow, PortfolioEngine,
                        AlertEngine, AppLock, CloudSync, NativeBridge
  lib/
    instruments.ts      instrument universe + ETF look-through data
    market.ts           deterministic price simulator (random walk)
    portfolio.ts        paper-trading engine: accounts, orders, protections,
                        savings plans, AutoInvest, rebalance, dividends,
                        analytics, model portfolios (pure, unit-tested)
    portfolioStore.ts   portfolio document + actions
    docstore.ts         offline-first JSON documents, synced to Supabase
    indicators.ts       SMA, EMA, Bollinger, RSI, MACD, drawdown
    watchlists.ts       watchlists
    pricealerts.ts      price alerts
    applock.ts          Face ID / Touch ID / PIN app lock
    native.ts           haptics, notifications, biometrics (Capacitor)
    fx.ts               GBP/USD, pence, FX fee
    events.ts, news.ts, sentiment.ts
    shorts.ts, signals.ts, squeeze.ts, options.ts, catalysts.ts, store.ts
    marketdata.ts       live providers (server-only)
ios/, android/          Capacitor native projects
mobile/www/             bundled fallback and offline screens for the apps
store/                  store listing copy and screenshots
supabase/migrations/    0001_init.sql, 0002_user_state.sql
```

> Educational tool, not investment advice. Investing involves risk. Short selling
> carries uncapped risk unless a hard stop or defined-risk instrument is used.
