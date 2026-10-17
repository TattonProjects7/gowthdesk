# Competitor feature study → what Shortlist ships

The four App Store listings studied (October 2026):

| App | Listing | What it's known for |
| --- | --- | --- |
| IG Trading (id406492428) | `apps.apple.com/gb/app/ig-trading-investing-crypto/id406492428` | The long-standing trading app: CFDs/spread bets, deep charts, alerts, sentiment |
| IG: Stock Investing & Crypto (id6702015912) | `apps.apple.com/gb/app/ig-trade-invest-crypto/id6702015912` | The new all-in-one IG app (renamed IG Invest): GIA / ISA / JISA / SIPP, crypto, account picker in the deal ticket |
| interactive investor (id434714838) | `apps.apple.com/gb/app/interactive-investor-ii/id434714838` | Flat-fee platform: single-screen portfolio across accounts, quick quotes, risers & fallers, research articles, free regular investing |
| InvestEngine (id1394442225) | `apps.apple.com/gb/app/investengine-etf-investing/id1394442225` | ETF specialist: fractional from £1, Savings Plans, AutoInvest, Smart Top-Ups, one-click rebalance, portfolio look-through, LifePlans |

> The App Store pages themselves were not reachable from the build environment,
> so the feature list below was assembled from the providers' own help and
> product pages and current (2026) independent reviews.

## Feature map

| Feature (who has it) | Shortlist | Where |
| --- | --- | --- |
| **Accounts** — GIA, Stocks & Shares ISA, SIPP (IG, ii, InvestEngine) | ✅ Paper GIA, ISA and SIPP with allowances shown | Portfolio → Accounts |
| **Account selector in the deal ticket** + top up / move funds without leaving it (new IG app) | ✅ | Deal ticket |
| **Single-screen portfolio** with a breakdown of every account (ii) | ✅ Value hero, accounts strip, P&L, dividends, income | Portfolio → Overview |
| **Fractional dealing from £1** (IG, InvestEngine) | ✅ £ or units, 6-dp quantities | Deal ticket |
| **Market, limit and stop orders**; view / cancel pending orders (IG, ii) | ✅ | Deal ticket · Portfolio → Orders |
| **Stop-loss, take-profit, trailing stops** (IG) | ✅ Per order or per holding | Deal ticket · Holdings → Protect |
| **Charts with technical indicators** (IG: 28 indicators) | ✅ 1W–1Y, MA 10/30, Bollinger, RSI, MACD, crosshair | Instrument page |
| **Price alerts** with push (IG) | ✅ Above / below / % move, phone notifications | Instrument page · Watchlist |
| **Watchlists** — up to 50 (IG) | ✅ 50 named lists, reorder, alert badges | Watchlist |
| **Quick quote** without logging in (ii) | ✅ Search box, no account needed | Markets |
| **Risers & fallers**, UK / US / international (ii) | ✅ Swipeable movers + sortable lists | Markets |
| **Client sentiment** (IG) | ✅ Long/short gauge (modelled) | Instrument page |
| **Economic calendar / results diary** (IG, ii) | ✅ BoE, Fed, CPI, payrolls, company results | Markets → Coming up |
| **News and research articles** (ii, InvestEngine) | ✅ Finnhub headlines when keyed + auto research notes | Instrument page |
| **Savings Plans / regular investing** — weekly, fortnightly, monthly (InvestEngine, ii) | ✅ Into one instrument or target weights | Portfolio → Automate |
| **AutoInvest** spare cash with a buffer (InvestEngine) | ✅ | Portfolio → Automate |
| **Smart Top-Up** to underweight holdings (InvestEngine) | ✅ | Portfolio → Automate |
| **One-click rebalance** (InvestEngine) | ✅ Sells first, buys scaled to proceeds | Portfolio → Automate |
| **Portfolio look-through** — companies, sectors, regions (InvestEngine) | ✅ Plus an overlap check | Portfolio → Analytics |
| **Ready-made portfolios** — LifePlans (InvestEngine), Smart Portfolios (IG) | ✅ Five risk-graded ETF models | Portfolio → Automate |
| **Dividends & income** | ✅ Quarterly paper dividends, projected income | Portfolio → Overview / Analytics |
| **Crypto** (IG) | ✅ BTC, ETH, SOL | Markets → Crypto |
| **UK shares in pence, FX fee on US shares** | ✅ GBX pricing, 0.5% FX fee shown up front | Everywhere |
| **Face ID / fingerprint login** (IG, ii) | ✅ Native biometrics in the apps, PIN fallback | Settings → App lock |
| **Demo / practice account** (IG — missing in the new app) | ✅ The whole app is a £10,000 practice account | — |
| **iPhone + Android apps** | ✅ Capacitor projects in `ios/` and `android/` | MOBILE.md |

## Where Shortlist goes further

- **Asymmetric short-finder** — scanner, squeeze-risk radar, defined-risk structuring, Black–Scholes put alternative, AI bear/bull thesis and R-multiple expectancy. None of the four apps offers this.
- **Overlap check** on top of look-through, flagging companies held through several funds.
- **Practice-first**: every feature works with virtual money, so it doubles as an education product.

## Deliberately not built

- **Real-money dealing, client money, KYC.** These need FCA authorisation and a custody/broker partner. The engine is source-agnostic, so a broker API could replace the paper fills later.
- **CFDs and spread betting** (IG). These are high-risk, heavily regulated derivatives.
