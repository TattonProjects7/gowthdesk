// The instrument universe — everything the app can quote, chart, hold and alert on.
//
// Shortlist started as a US-stock short-finder; this file widens it into a full
// UK investing app in the mould of IG / interactive investor / InvestEngine:
// UK shares priced in pence, UCITS ETFs with look-through holdings, and crypto.
// Every instrument carries the metadata the portfolio analytics need (sector,
// region, asset class, currency, dividend yield) plus the simulator parameters
// that keep the whole thing working with zero API keys.

import { EXTRA_STOCKS, PROFILES, type IndexCode } from "./universe";
import { search } from "./search";

export type InstrumentType = "stock" | "etf" | "crypto";
export type Currency = "USD" | "GBP" | "GBX"; // GBX = pence sterling (LSE convention)
export type Region = "US" | "UK" | "Europe" | "Asia" | "Emerging" | "Global";
export type AssetClass = "Equity" | "Bond" | "Commodity" | "Crypto" | "Cash";

export interface Weight {
  name: string;
  pct: number; // 0–100
  symbol?: string; // when the underlying is itself in our universe
}

export interface Instrument {
  symbol: string;
  name: string;
  type: InstrumentType;
  exchange: "NASDAQ" | "NYSE" | "LSE" | "CRYPTO";
  currency: Currency;
  region: Region;
  sector: string;
  assetClass: AssetClass;
  dividendYieldPct: number; // trailing yield, % per year (0 for crypto)
  shortable: boolean; // appears in the short scanner
  description: string;
  // Simulator parameters (see market.ts) — prices are a pure function of time.
  base: number;
  vol: number;
  drift: number;
  seed: number;
  // ETF look-through (InvestEngine-style): what the fund actually holds.
  holdings?: Weight[];
  sectors?: Weight[];
  regions?: Weight[];
  ocfPct?: number; // ongoing charge figure
  // Live-data symbol mapping (Finnhub). Omit when the free tier can't serve it.
  finnhub?: string;
  // Screener reference data (shares only; see universe.ts).
  industry?: string;
  indices?: IndexCode[];
  sharesM?: number; // shares outstanding, millions
  country?: string;
}

const US = (
  symbol: string,
  name: string,
  sector: string,
  yieldPct: number,
  sim: [number, number, number, number],
  description: string,
): Instrument => ({
  symbol,
  name,
  type: "stock",
  exchange: symbol === "DIS" ? "NYSE" : "NASDAQ",
  currency: "USD",
  region: "US",
  sector,
  assetClass: "Equity",
  dividendYieldPct: yieldPct,
  shortable: true,
  description,
  base: sim[0],
  vol: sim[1],
  drift: sim[2],
  seed: sim[3],
  finnhub: symbol,
});

const UK = (
  symbol: string,
  name: string,
  sector: string,
  yieldPct: number,
  sim: [number, number, number, number],
  description: string,
): Instrument => ({
  symbol,
  name,
  type: "stock",
  exchange: "LSE",
  currency: "GBX",
  region: "UK",
  sector,
  assetClass: "Equity",
  dividendYieldPct: yieldPct,
  shortable: false,
  description,
  base: sim[0],
  vol: sim[1],
  drift: sim[2],
  seed: sim[3],
  finnhub: `${symbol}.L`,
});

const BASE: Instrument[] = [
  // --- US shares (the original short-scanner universe) ------------------------
  US("AAPL", "Apple", "Technology", 0.5, [212.4, 0.018, 0.05, 1], "Consumer electronics, services and the world's most valuable brand."),
  US("NVDA", "NVIDIA", "Technology", 0.03, [124.8, 0.034, 0.18, 2], "Accelerated computing and AI data-centre chips."),
  US("TSLA", "Tesla", "Consumer Discretionary", 0, [248.1, 0.041, -0.04, 3], "Electric vehicles, energy storage and autonomy."),
  US("MSFT", "Microsoft", "Technology", 0.7, [449.2, 0.015, 0.07, 4], "Cloud (Azure), productivity software and AI."),
  US("AMZN", "Amazon", "Consumer Discretionary", 0, [198.6, 0.022, 0.06, 5], "E-commerce, AWS cloud and advertising."),
  US("META", "Meta Platforms", "Communication Services", 0.4, [564.9, 0.026, 0.09, 6], "Facebook, Instagram, WhatsApp and Reality Labs."),
  US("GOOGL", "Alphabet", "Communication Services", 0.5, [176.3, 0.019, 0.04, 7], "Google Search, YouTube, Cloud and Waymo."),
  US("AMD", "AMD", "Technology", 0, [138.7, 0.038, 0.02, 8], "CPUs, GPUs and adaptive computing."),
  US("COIN", "Coinbase", "Financials", 0, [241.5, 0.052, -0.08, 9], "Crypto exchange and custody — trades like a levered bitcoin proxy."),
  US("PLTR", "Palantir", "Technology", 0, [27.9, 0.045, 0.12, 10], "Data analytics platforms for government and enterprise."),
  US("SHOP", "Shopify", "Technology", 0, [78.4, 0.033, 0.03, 11], "Commerce platform for merchants."),
  US("DIS", "Disney", "Communication Services", 1.0, [96.2, 0.021, -0.02, 12], "Parks, studios, Disney+ and ESPN."),

  // --- UK shares (LSE, priced in pence) -----------------------------------------
  UK("LLOY", "Lloyds Banking Group", "Financials", 4.6, [58.4, 0.014, 0.03, 21], "UK retail and commercial bank; the FTSE's most-traded share."),
  UK("BP", "BP", "Energy", 5.1, [412.3, 0.017, -0.01, 22], "Integrated oil, gas and transition energy."),
  UK("SHEL", "Shell", "Energy", 3.9, [2612.0, 0.015, 0.02, 23], "Integrated energy major; large buyback programme."),
  UK("AZN", "AstraZeneca", "Healthcare", 2.0, [11890.0, 0.013, 0.05, 24], "Oncology-led pharmaceuticals."),
  UK("HSBA", "HSBC Holdings", "Financials", 6.8, [689.0, 0.014, 0.04, 25], "Global bank with an Asia-heavy earnings mix."),
  UK("VOD", "Vodafone", "Communication Services", 5.3, [72.9, 0.019, -0.03, 26], "Telecoms across Europe and Africa."),
  UK("RR", "Rolls-Royce Holdings", "Industrials", 0.6, [498.0, 0.024, 0.11, 27], "Civil aerospace engines, defence and power systems."),
  UK("BARC", "Barclays", "Financials", 3.4, [231.0, 0.019, 0.04, 28], "UK and US consumer banking plus investment bank."),
  UK("TSCO", "Tesco", "Consumer Staples", 3.6, [345.0, 0.012, 0.02, 29], "The UK's largest grocer."),
  UK("GSK", "GSK", "Healthcare", 3.7, [1562.0, 0.014, -0.01, 30], "Vaccines and specialty medicines."),

  // --- ETFs (UCITS, LSE-listed, GBP) --------------------------------------------
  {
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "US",
    sector: "Diversified",
    assetClass: "Equity",
    dividendYieldPct: 1.2,
    shortable: false,
    description: "The 500 largest US companies in one fund. The default core holding for most UK DIY investors.",
    base: 82.1,
    vol: 0.011,
    drift: 0.06,
    seed: 41,
    ocfPct: 0.07,
    holdings: [
      { name: "Apple", symbol: "AAPL", pct: 6.8 },
      { name: "Microsoft", symbol: "MSFT", pct: 6.5 },
      { name: "NVIDIA", symbol: "NVDA", pct: 6.1 },
      { name: "Amazon", symbol: "AMZN", pct: 3.6 },
      { name: "Meta Platforms", symbol: "META", pct: 2.4 },
      { name: "Alphabet", symbol: "GOOGL", pct: 2.1 },
      { name: "Tesla", symbol: "TSLA", pct: 1.4 },
      { name: "Berkshire Hathaway", pct: 1.7 },
      { name: "Broadcom", pct: 1.5 },
      { name: "Eli Lilly", pct: 1.3 },
    ],
    sectors: [
      { name: "Technology", pct: 32 },
      { name: "Financials", pct: 13 },
      { name: "Healthcare", pct: 12 },
      { name: "Consumer Discretionary", pct: 10 },
      { name: "Communication Services", pct: 9 },
      { name: "Industrials", pct: 8 },
      { name: "Consumer Staples", pct: 6 },
      { name: "Energy", pct: 4 },
      { name: "Other", pct: 6 },
    ],
    regions: [{ name: "US", pct: 100 }],
    finnhub: "VUSA.L",
  },
  {
    symbol: "VWRL",
    name: "Vanguard FTSE All-World UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "Global",
    sector: "Diversified",
    assetClass: "Equity",
    dividendYieldPct: 1.7,
    shortable: false,
    description: "3,600+ companies across developed and emerging markets — the whole world in one trade.",
    base: 108.6,
    vol: 0.009,
    drift: 0.05,
    seed: 42,
    ocfPct: 0.22,
    holdings: [
      { name: "Apple", symbol: "AAPL", pct: 4.1 },
      { name: "Microsoft", symbol: "MSFT", pct: 3.9 },
      { name: "NVIDIA", symbol: "NVDA", pct: 3.6 },
      { name: "Amazon", symbol: "AMZN", pct: 2.2 },
      { name: "Meta Platforms", symbol: "META", pct: 1.4 },
      { name: "Alphabet", symbol: "GOOGL", pct: 1.3 },
      { name: "Taiwan Semiconductor", pct: 1.1 },
      { name: "Broadcom", pct: 0.9 },
      { name: "Tesla", symbol: "TSLA", pct: 0.8 },
      { name: "AstraZeneca", symbol: "AZN", pct: 0.3 },
    ],
    sectors: [
      { name: "Technology", pct: 26 },
      { name: "Financials", pct: 16 },
      { name: "Healthcare", pct: 10 },
      { name: "Consumer Discretionary", pct: 10 },
      { name: "Industrials", pct: 10 },
      { name: "Communication Services", pct: 8 },
      { name: "Consumer Staples", pct: 6 },
      { name: "Energy", pct: 4 },
      { name: "Other", pct: 10 },
    ],
    regions: [
      { name: "US", pct: 62 },
      { name: "Europe", pct: 15 },
      { name: "Asia", pct: 9 },
      { name: "Emerging", pct: 10 },
      { name: "UK", pct: 4 },
    ],
    finnhub: "VWRL.L",
  },
  {
    symbol: "ISF",
    name: "iShares Core FTSE 100 UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "UK",
    sector: "Diversified",
    assetClass: "Equity",
    dividendYieldPct: 3.6,
    shortable: false,
    description: "The UK's 100 largest listed companies. High dividend yield, heavy in banks, energy and pharma.",
    base: 8.14,
    vol: 0.009,
    drift: 0.02,
    seed: 43,
    ocfPct: 0.07,
    holdings: [
      { name: "AstraZeneca", symbol: "AZN", pct: 8.0 },
      { name: "Shell", symbol: "SHEL", pct: 7.9 },
      { name: "HSBC Holdings", symbol: "HSBA", pct: 6.9 },
      { name: "Unilever", pct: 5.2 },
      { name: "BP", symbol: "BP", pct: 3.6 },
      { name: "GSK", symbol: "GSK", pct: 3.1 },
      { name: "Rolls-Royce Holdings", symbol: "RR", pct: 2.8 },
      { name: "Lloyds Banking Group", symbol: "LLOY", pct: 2.2 },
      { name: "Barclays", symbol: "BARC", pct: 1.9 },
      { name: "Tesco", symbol: "TSCO", pct: 1.3 },
    ],
    sectors: [
      { name: "Financials", pct: 22 },
      { name: "Consumer Staples", pct: 16 },
      { name: "Energy", pct: 12 },
      { name: "Healthcare", pct: 12 },
      { name: "Industrials", pct: 12 },
      { name: "Materials", pct: 8 },
      { name: "Consumer Discretionary", pct: 7 },
      { name: "Communication Services", pct: 3 },
      { name: "Other", pct: 8 },
    ],
    regions: [{ name: "UK", pct: 100 }],
    finnhub: "ISF.L",
  },
  {
    symbol: "EQQQ",
    name: "Invesco Nasdaq-100 UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "US",
    sector: "Technology",
    assetClass: "Equity",
    dividendYieldPct: 0.4,
    shortable: false,
    description: "The 100 largest non-financial Nasdaq stocks — a concentrated bet on US big tech.",
    base: 402.0,
    vol: 0.014,
    drift: 0.08,
    seed: 44,
    ocfPct: 0.3,
    holdings: [
      { name: "Apple", symbol: "AAPL", pct: 8.9 },
      { name: "Microsoft", symbol: "MSFT", pct: 8.4 },
      { name: "NVIDIA", symbol: "NVDA", pct: 7.9 },
      { name: "Amazon", symbol: "AMZN", pct: 5.3 },
      { name: "Meta Platforms", symbol: "META", pct: 4.6 },
      { name: "Alphabet", symbol: "GOOGL", pct: 4.6 },
      { name: "Tesla", symbol: "TSLA", pct: 2.8 },
      { name: "Broadcom", pct: 4.4 },
      { name: "Costco", pct: 2.5 },
      { name: "AMD", symbol: "AMD", pct: 1.6 },
    ],
    sectors: [
      { name: "Technology", pct: 51 },
      { name: "Communication Services", pct: 15 },
      { name: "Consumer Discretionary", pct: 13 },
      { name: "Healthcare", pct: 6 },
      { name: "Consumer Staples", pct: 6 },
      { name: "Industrials", pct: 5 },
      { name: "Other", pct: 4 },
    ],
    regions: [{ name: "US", pct: 97 }, { name: "Europe", pct: 3 }],
    finnhub: "EQQQ.L",
  },
  {
    symbol: "VFEM",
    name: "Vanguard FTSE Emerging Markets UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "Emerging",
    sector: "Diversified",
    assetClass: "Equity",
    dividendYieldPct: 2.9,
    shortable: false,
    description: "China, India, Taiwan, Brazil and more — the growth-market sleeve of a global portfolio.",
    base: 56.3,
    vol: 0.012,
    drift: 0.03,
    seed: 45,
    ocfPct: 0.22,
    holdings: [
      { name: "Taiwan Semiconductor", pct: 9.1 },
      { name: "Tencent", pct: 4.3 },
      { name: "Alibaba", pct: 2.6 },
      { name: "Reliance Industries", pct: 1.4 },
      { name: "HDFC Bank", pct: 1.3 },
    ],
    sectors: [
      { name: "Technology", pct: 24 },
      { name: "Financials", pct: 22 },
      { name: "Consumer Discretionary", pct: 13 },
      { name: "Communication Services", pct: 9 },
      { name: "Industrials", pct: 7 },
      { name: "Energy", pct: 5 },
      { name: "Other", pct: 20 },
    ],
    regions: [{ name: "Emerging", pct: 92 }, { name: "Asia", pct: 8 }],
    finnhub: "VFEM.L",
  },
  {
    symbol: "IGLT",
    name: "iShares Core UK Gilts UCITS ETF",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "UK",
    sector: "Government Bonds",
    assetClass: "Bond",
    dividendYieldPct: 3.9,
    shortable: false,
    description: "UK government bonds across all maturities — the ballast in a balanced portfolio.",
    base: 10.42,
    vol: 0.005,
    drift: 0.0,
    seed: 46,
    ocfPct: 0.07,
    holdings: [{ name: "UK Treasury gilts (all maturities)", pct: 100 }],
    sectors: [{ name: "Government Bonds", pct: 100 }],
    regions: [{ name: "UK", pct: 100 }],
    finnhub: "IGLT.L",
  },
  {
    symbol: "AGBP",
    name: "iShares Core Global Aggregate Bond UCITS ETF (GBP Hedged)",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "Global",
    sector: "Bonds",
    assetClass: "Bond",
    dividendYieldPct: 3.2,
    shortable: false,
    description: "Investment-grade government and corporate bonds worldwide, hedged back to sterling.",
    base: 4.71,
    vol: 0.003,
    drift: 0.0,
    seed: 47,
    ocfPct: 0.1,
    holdings: [
      { name: "US Treasuries", pct: 38 },
      { name: "Japanese government bonds", pct: 11 },
      { name: "European sovereigns", pct: 21 },
      { name: "Investment-grade corporates", pct: 30 },
    ],
    sectors: [{ name: "Government Bonds", pct: 60 }, { name: "Corporate Bonds", pct: 40 }],
    regions: [{ name: "US", pct: 42 }, { name: "Europe", pct: 28 }, { name: "Asia", pct: 18 }, { name: "UK", pct: 5 }, { name: "Emerging", pct: 7 }],
    finnhub: "AGBP.L",
  },
  {
    symbol: "SGLN",
    name: "iShares Physical Gold ETC",
    type: "etf",
    exchange: "LSE",
    currency: "GBP",
    region: "Global",
    sector: "Precious Metals",
    assetClass: "Commodity",
    dividendYieldPct: 0,
    shortable: false,
    description: "Physically-backed gold, held in London vaults. The classic inflation and crisis hedge.",
    base: 39.8,
    vol: 0.010,
    drift: 0.04,
    seed: 48,
    ocfPct: 0.12,
    holdings: [{ name: "Allocated gold bullion", pct: 100 }],
    sectors: [{ name: "Precious Metals", pct: 100 }],
    regions: [{ name: "Global", pct: 100 }],
    finnhub: "SGLN.L",
  },

  // --- Crypto (24/7, USD) ------------------------------------------------------
  {
    symbol: "BTC",
    name: "Bitcoin",
    type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    region: "Global",
    sector: "Crypto",
    assetClass: "Crypto",
    dividendYieldPct: 0,
    shortable: false,
    description: "The first and largest cryptocurrency. Trades 24/7 — expect large swings.",
    base: 67420,
    vol: 0.035,
    drift: 0.05,
    seed: 61,
    finnhub: "BINANCE:BTCUSDT",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    region: "Global",
    sector: "Crypto",
    assetClass: "Crypto",
    dividendYieldPct: 0,
    shortable: false,
    description: "Smart-contract platform behind most DeFi and NFTs.",
    base: 3480,
    vol: 0.042,
    drift: 0.02,
    seed: 62,
    finnhub: "BINANCE:ETHUSDT",
  },
  {
    symbol: "SOL",
    name: "Solana",
    type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    region: "Global",
    sector: "Crypto",
    assetClass: "Crypto",
    dividendYieldPct: 0,
    shortable: false,
    description: "High-throughput blockchain; higher beta than bitcoin.",
    base: 162,
    vol: 0.055,
    drift: 0.0,
    seed: 63,
    finnhub: "BINANCE:SOLUSDT",
  },
  {
    symbol: "XRP",
    name: "XRP",
    type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    region: "Global",
    sector: "Crypto",
    assetClass: "Crypto",
    dividendYieldPct: 0,
    shortable: false,
    description: "Payments-focused token linked to Ripple. Trades 24/7 and swings hard on legal and ETF news.",
    base: 2.4,
    vol: 0.05,
    drift: 0.0,
    seed: 64,
    finnhub: "BINANCE:XRPUSDT",
  },
  {
    symbol: "DOGE",
    name: "Dogecoin",
    type: "crypto",
    exchange: "CRYPTO",
    currency: "USD",
    region: "Global",
    sector: "Crypto",
    assetClass: "Crypto",
    dividendYieldPct: 0,
    shortable: false,
    description: "The original meme coin. Very volatile and driven largely by sentiment.",
    base: 0.2,
    vol: 0.065,
    drift: -0.02,
    seed: 65,
    finnhub: "BINANCE:DOGEUSDT",
  },
];

// The original list plus the wider screener universe, each share carrying its
// industry, index membership and share count.
export const INSTRUMENTS: Instrument[] = [
  ...BASE.map((i) => {
    const p = PROFILES[i.symbol];
    return p ? { ...i, ...p, exchange: p.exchange ?? i.exchange } : i;
  }),
  ...EXTRA_STOCKS,
];

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function isInstrument(symbol: string): boolean {
  return BY_SYMBOL.has(symbol.toUpperCase());
}

// Ranked, typo-tolerant search for every search box (see search.ts).
export function searchInstruments(q: string, limit = 8): Instrument[] {
  return search(INSTRUMENTS, q, limit).map((h) => h.i);
}

// Human label for a market segment (used by the Markets tabs).
export type MarketTab = "all" | "uk" | "us" | "etf" | "crypto";
export const MARKET_TABS: { id: MarketTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "uk", label: "UK shares" },
  { id: "us", label: "US shares" },
  { id: "etf", label: "ETFs" },
  { id: "crypto", label: "Crypto" },
];

export function instrumentsFor(tab: MarketTab): Instrument[] {
  switch (tab) {
    case "uk":
      return INSTRUMENTS.filter((i) => i.type === "stock" && i.exchange === "LSE");
    case "us":
      return INSTRUMENTS.filter((i) => i.type === "stock" && i.exchange !== "LSE");
    case "etf":
      return INSTRUMENTS.filter((i) => i.type === "etf");
    case "crypto":
      return INSTRUMENTS.filter((i) => i.type === "crypto");
    default:
      return INSTRUMENTS;
  }
}

// Format a native price in the instrument's own currency convention.
export function fmtNative(price: number, currency: Currency): string {
  if (currency === "GBX") return `${price.toFixed(2)}p`;
  if (currency === "GBP") return `£${price.toFixed(2)}`;
  return `$${price >= 1000 ? Math.round(price).toLocaleString() : price.toFixed(2)}`;
}

export function fmtGbp(n: number, opts: { sign?: boolean; dp?: number } = {}): string {
  const dp = opts.dp ?? 2;
  const abs = Math.abs(n);
  const body = abs >= 10000 ? Math.round(abs).toLocaleString() : abs.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const sign = n < 0 ? "−" : opts.sign && n > 0 ? "+" : "";
  return `${sign}£${body}`;
}
