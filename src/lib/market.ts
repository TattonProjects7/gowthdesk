// A self-contained, deterministic market simulator.
//
// No API keys, no network. Prices are a pure function of (ticker, time), so the
// whole app runs offline yet still "moves" on a tick — and never produces a
// React hydration mismatch as long as we only read prices after mount.

export interface Ticker {
  symbol: string;
  name: string;
  base: number; // anchor price
  vol: number; // intraday amplitude as a fraction of base
  drift: number; // gentle daily trend as a fraction of base
  seed: number; // decorrelates each symbol's wave
}

export const UNIVERSE: Ticker[] = [
  { symbol: "AAPL", name: "Apple", base: 212.4, vol: 0.018, drift: 0.05, seed: 1 },
  { symbol: "NVDA", name: "NVIDIA", base: 124.8, vol: 0.034, drift: 0.18, seed: 2 },
  { symbol: "TSLA", name: "Tesla", base: 248.1, vol: 0.041, drift: -0.04, seed: 3 },
  { symbol: "MSFT", name: "Microsoft", base: 449.2, vol: 0.015, drift: 0.07, seed: 4 },
  { symbol: "AMZN", name: "Amazon", base: 198.6, vol: 0.022, drift: 0.06, seed: 5 },
  { symbol: "META", name: "Meta", base: 564.9, vol: 0.026, drift: 0.09, seed: 6 },
  { symbol: "GOOGL", name: "Alphabet", base: 176.3, vol: 0.019, drift: 0.04, seed: 7 },
  { symbol: "AMD", name: "AMD", base: 138.7, vol: 0.038, drift: 0.02, seed: 8 },
  { symbol: "COIN", name: "Coinbase", base: 241.5, vol: 0.052, drift: -0.08, seed: 9 },
  { symbol: "PLTR", name: "Palantir", base: 27.9, vol: 0.045, drift: 0.12, seed: 10 },
  { symbol: "SHOP", name: "Shopify", base: 78.4, vol: 0.033, drift: 0.03, seed: 11 },
  { symbol: "DIS", name: "Disney", base: 96.2, vol: 0.021, drift: -0.02, seed: 12 },
];

const BY_SYMBOL = new Map(UNIVERSE.map((t) => [t.symbol, t]));

// Deterministic step-noise in [-1, 1] from an integer — no Math.random so the
// curve is stable and reproducible across renders.
function hashNoise(n: number): number {
  let x = Math.sin(n * 12.9898) * 43758.5453;
  x = x - Math.floor(x); // fractional part in [0,1)
  return x * 2 - 1;
}

// Price of a symbol at an absolute time. Layered sine waves + stepped noise
// give organic, bounded movement around the anchor price.
export function priceAt(symbol: string, tMs: number): number {
  const t = BY_SYMBOL.get(symbol);
  if (!t) return 0;
  const s = tMs / 1000; // seconds
  const wave =
    Math.sin(s / 41 + t.seed) * 0.6 +
    Math.sin(s / 11 + t.seed * 2.3) * 0.3 +
    Math.sin(s / 2.7 + t.seed * 4.1) * 0.1;
  const noise = hashNoise(Math.floor(s / 3) + t.seed * 100);
  const dayFraction = (s % 86400) / 86400;
  const pct = t.drift * dayFraction + t.vol * wave + t.vol * 0.5 * noise;
  return round2(t.base * (1 + pct));
}

// Percent change vs ~24h ago, for a "today" badge.
export function dayChangePct(symbol: string, tMs: number): number {
  const now = priceAt(symbol, tMs);
  const prev = priceAt(symbol, tMs - 86400_000);
  if (prev === 0) return 0;
  return ((now - prev) / prev) * 100;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function getTicker(symbol: string): Ticker | undefined {
  return BY_SYMBOL.get(symbol);
}
