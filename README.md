# Shortlist 📉

**Investing that's actually fun.**

Shortlist is an investing app for the web, iPhone and Android. You practise with
£10,000 of virtual money across UK and US shares, ETFs and crypto, using the
tools the leading UK platforms offer (IG, interactive investor, InvestEngine).
A built-in Academy and an AI coach make it a fun way to learn, and an
asymmetric short-finder sits on top that none of them has.

It has two modes. **Demo** is a free £10,000 practice portfolio. **Real**
connects the user's own Trading 212 account and sends the orders they confirm
there. Shortlist is not a broker: it never holds client money, and Trading 212
executes and holds everything.

**Going live?** Follow **[GO-LIVE.md](./GO-LIVE.md)**: web, real trading,
Android and iPhone, step by step.

See **[docs/COMPETITOR-FEATURES.md](./docs/COMPETITOR-FEATURES.md)** for the
competitor study and how each feature maps to this app.

---

## Features

**Investing**

- **Portfolio** — total value with a scrubbable chart, practice GIA / ISA / SIPP
  accounts, P&L, dividends and projected income on one screen.
- **Markets** — 154 instruments: 143 US and UK shares across all 11
  sectors (LSE priced in pence), UCITS ETFs and crypto. A Finviz-style front
  page with index tiles, market breadth and live signal tables, plus risers and
  fallers and a quick-quote search.
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

**Market tools (Finviz-style)**

- **Screener** — 54 Descriptive, Fundamental and Technical filters (468
  options), each with a plain-English explainer, plus 34 signals: gainers and losers, new
  highs, unusual volume, overbought and oversold, gaps, golden crosses,
  breakouts and auto-detected chart patterns. Seven views (overview, valuation,
  financial, ownership, performance, technical, charts), sorting, CSV export,
  shareable URLs and eight starter screens.
- **Plain-English screens** — type "cheap UK dividend payers near their lows"
  and Claude builds the filters (with an offline keyword fallback).
- **Saved screens with alerts** — get an alert, and a phone notification, when
  a share newly enters a screen.
- **Heatmap** — squarified treemap by sector, sized by market cap, coloured by
  1D–1Y performance, relative volume, P/E, yield, RSI or distance from the
  52-week high. US, UK, ETFs, crypto, your watchlist, or your own portfolio
  (real broker positions in real mode).
- **Groups** — cap-weighted performance by sector, industry, country, size and
  index, with drill-down into the screener.
- **Calendar** — results (before open / after close) and economic releases for
  the next two weeks, filterable to what you own or watch.
- **Quote snapshot** — ~50 key stats, the detected chart pattern drawn with its
  trendlines, today's candlestick, and an industry peer table.
- **Real-time prices** — crypto streams trade by trade from Coinbase with no
  setup; US shares stream from Finnhub with a free key (50 at a time, the ones
  on screen first) and the rest show delayed quotes. Every price is labelled
  Real-time, Delayed, Market closed or Simulated, with US and London market
  hours and holidays built in. Real daily candles come from Coinbase and
  Twelve Data. See GO-LIVE.md step 3.
- **Search from anywhere** — ⌘K / Ctrl+K or "/": typo-tolerant, knows
  nicknames and brands ("google", "footsie", "primark"), group words ("banks",
  "ai") and hands anything else to the screener.
- Fundamentals for US companies are live from Finnhub when `FINNHUB_API_KEY`
  is set. Everything else uses sector-shaped demo figures, labelled as demo
  wherever they appear.

- **News** — market, stocks, ETF and crypto headlines (live from Finnhub, never
  invented), by time or source, plus a **Market Pulse** written from today's
  data: breadth, leading sectors, big movers with their volume and levels.
- **Charts** — one, two or four candlestick charts side by side, daily, weekly
  or monthly, with volume, 20/50/200-day averages, auto-drawn trendlines and a
  crosshair readout. Layouts live in the URL.
- **Screener extras** — tickers box, order by with asc/desc, numbered pages,
  compare up to five shares (with a rebased performance chart), live/paused
  results, investment **themes** (AI, obesity drugs, defence…), and Tickers,
  Stats, TA and Custom-column views.

**Adverts and the ad-free plan**

- Google AdSense on the web and an AdMob banner in the iOS and Android apps,
  only on research and learning screens. Never on trading, account or legal
  screens, never in real-money mode. Google's consent form and Apple's tracking
  prompt are handled in the apps.
- **Ad-free for £6.99/month**: Stripe on the web, App Store / Google Play in the
  apps (RevenueCat). One purchase removes ads everywhere the person signs in.
  Pro includes it.
- Until the ad networks are set up, the spaces show Shortlist promos.

**Demo and real modes**

- **Demo / Real switch** in the top bar. Demo is the practice portfolio. Real
  shows the connected Trading 212 account, with a banner so it's always clear.
- **Connect Trading 212** with an API key, practice or live server. The key is
  encrypted into an httpOnly cookie and never stored in a database.
- **Real deal ticket** with market, limit and stop orders, a review screen
  before every order, and a real-money warning on live accounts.
- **Real portfolio** with cash, positions and working orders straight from the
  broker, refreshed every 15 seconds, plus cancel.

**Celebrations and design**

- **Confetti and fireworks** when you buy, **cash bundles and coins** when you
  sell, and a sparkle for working orders. There's an order-filled card with an
  animated tick, sounds and haptics, and a switch in Settings to turn it all
  off. Reduced-motion settings are respected.
- **Modern look**: Geist type, glass surfaces, brand gradients, a glowing chart
  that draws itself in, rolling numbers and smooth page transitions.

**Learn and AI coach**

- **Shortlist Academy** — 19 bite-sized lessons in six paths (basics, funds, UK
  tax wrappers, charts, risk, shorting). Story-style cards, interactive
  calculators, live charts and a three-question quiz each.
- **Learn & Earn** — finishing a lesson pays XP and practice cash into your GIA.
  Levels from Curious to Market Master, daily streaks, badges and a daily
  question.
- **Missions** — real tasks (first buy, open an ISA holding, set a stop, start a
  savings plan) that tick themselves off when you actually do them in the app.
- **Free practice share** — pick one of three cards to reveal a free share for
  your practice portfolio, inspired by Robinhood's claim-stock flow.
- **AI coach** — ask anything from any screen. It sees what you are looking at
  (the instrument, your portfolio, the lesson) and answers in plain English with
  links to the right lesson. It explains, it never tells you what to buy.
- **Why it's moving** — a daily AI digest on every instrument page, plus a
  60-second brief on the portfolio.
- **Portfolio health check** — a score out of 100 across diversification,
  concentration, mix, costs, cash, protection and tax wrappers, each with a
  lesson that fixes it.
- **Tap-to-explain** — tap jargon like RSI or OCF for a one-line definition.

Celebrations reward learning and good habits, never trading more often.

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
npm test           # unit tests
```

The AI coach and digests run on Claude when `ANTHROPIC_API_KEY` is set. They
use Claude Opus 5.5 by default, overridable with `AI_MODEL`. Without a key, a
deterministic offline coach answers from the same app data.

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
Anthropic Claude (coach, digests) · OpenAI (short thesis) · Trading 212
Public API (real mode) · Geist.

## Project layout

```
src/
  app/                  / (landing), /portfolio, /markets, /screener, /maps,
                        /groups, /calendar, /i/[symbol],
                        /watchlist, /settings, /scan, /short/[symbol],
                        /tracker, /learn, /learn/[id], /pricing, /login,
                        /api/* (incl. /api/coach, /api/digest,
                        /api/fundamentals, /api/screener/ai)
  components/           Nav, DealTicket, PriceChart, AreaChart, Avatar,
                        AllocationDonut, InstrumentRow, PortfolioEngine,
                        AlertEngine, AppLock, CloudSync, NativeBridge,
                        HealthCard, DailyBrief, DigestCard, ExplainTerm,
                        Celebrations, MissionEngine, coach/, learn/,
                        broker/ (real mode UI), effects/ (confetti, fireworks,
                        cash rain, sounds)
  lib/
    learn/              lessons, glossary, XP / levels / streaks / badges,
                        missions, free share (pure, unit-tested)
    ai/                 Claude coach + digest (server), offline coach,
                        rate limiter, coach context
    health.ts           portfolio health score
    broker/             Trading 212 client, ticker mapping, encrypted session
                        cookie (server) and demo/real mode store (client)
    effects.ts          trade celebration bus and preferences
    instruments.ts      instrument universe + ETF look-through data
    universe.ts         the wider screener universe: industry, index, shares
    market.ts           deterministic price simulator (factor-model walk)
    bars.ts             daily OHLCV bars and the volume model
    fundamentals.ts     live (Finnhub) and labelled demo fundamentals
    screener/           snapshots, filters, signals, chart-pattern and
                        candlestick detection, treemap, plain-English parser,
                        saved screens (pure parts unit-tested)
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
