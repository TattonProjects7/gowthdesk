// A self-contained, deterministic market simulator.
//
// No API keys, no network. Prices are a pure function of (ticker, time), so the
// whole app runs offline yet still "moves" on a tick — and never produces a
// React hydration mismatch as long as we only read prices after mount.
//
// Shape: each instrument follows a mean-reverting random walk in log-price
// (an AR(1) with a ~3-week half-life, driven by deterministic daily shocks
// sized to the instrument's daily volatility). That gives charts that trend,
// pull back and wander like real shares — no zigzag noise — while staying
// bounded around the anchor price. Within a day the price glides from one
// day's level to the next, with small fast waves so live prices tick.
//
// Shocks follow a simple factor model, as real returns do: each day's move is
// part market, part region, part sector and part company-specific. That makes
// green days and red days, sectors that move together, and breadth figures and
// heatmaps that look like a real tape instead of independent coin flips.
//
// The instrument list itself lives in instruments.ts (US + UK shares, ETFs and
// crypto). `UNIVERSE` is kept as the *shortable* subset so the short scanner,
// squeeze radar and catalyst engine keep working exactly as before.

import { INSTRUMENTS, getInstrument, type Instrument } from "./instruments";

export type Ticker = Pick<Instrument, "symbol" | "name" | "base" | "vol" | "drift" | "seed"> & Partial<Pick<Instrument, "type" | "sector" | "exchange" | "assetClass">>;

// Shortable US stocks — the short-scanner universe.
export const UNIVERSE: Ticker[] = INSTRUMENTS.filter((i) => i.shortable);

const DAY = 86400_000;
const PHI = 0.97; // daily persistence of the walk (half-life ≈ 23 trading days)
const SHOCK_SCALE = 1.2; // offsets the dampening from mean reversion so realised daily moves ≈ vol
const LIMIT = 0.26; // soft cap on |log move| from the anchor → price stays within ~0.77×–1.30×
const ANCHOR_DAY = Math.floor(Date.UTC(2019, 0, 1) / DAY);

// Integer hash → uniform [0, 1). Pure integer maths, identical on every JS engine.
export function hash01(a: number): number {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Roughly standard-normal daily shock for (seed, day): sum of three uniforms.
export function shock(seed: number, day: number): number {
  const k = seed * 1_000_003 + day * 3;
  return (hash01(k) + hash01(k + 1) + hash01(k + 2) - 1.5) * 2;
}

// Factor seeds: one global equity factor, one per region, one per sector, and
// separate drivers for crypto, gilts and gold.
const F_WORLD = 9001;
const F_CRYPTO = 9002;
const F_BONDS = 9003;
const F_GOLD = 9004;
const F_REGION: Record<string, number> = { LSE: 9011, US: 9012 };

function strSeed(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return 9100 + (Math.abs(h) % 800);
}

interface Loadings {
  world: number;
  region: number;
  sector: number;
  regionSeed: number;
  sectorSeed: number;
  idio: number;
  other?: { seed: number; w: number };
}

const LOADINGS = new Map<number, Loadings>();

function loadingsFor(t: Ticker): Loadings {
  const hit = LOADINGS.get(t.seed);
  if (hit) return hit;
  const regionSeed = F_REGION[t.exchange === "LSE" ? "LSE" : "US"];
  const sectorSeed = strSeed(t.sector ?? "Other");
  let l: Loadings;
  if (t.type === "crypto") {
    l = { world: 0.2, region: 0, sector: 0, regionSeed, sectorSeed, idio: 0.42, other: { seed: F_CRYPTO, w: 0.88 } };
  } else if (t.assetClass === "Bond") {
    l = { world: -0.1, region: 0, sector: 0, regionSeed, sectorSeed, idio: 0.3, other: { seed: F_BONDS, w: 0.95 } };
  } else if (t.assetClass === "Commodity") {
    l = { world: 0.1, region: 0, sector: 0, regionSeed, sectorSeed, idio: 0.35, other: { seed: F_GOLD, w: 0.93 } };
  } else if (t.type === "etf") {
    l = { world: 0.85, region: 0.45, sector: 0, regionSeed, sectorSeed, idio: 0.27 };
  } else {
    l = { world: 0.6, region: 0.3, sector: 0.38, regionSeed, sectorSeed, idio: 0.64 };
  }
  LOADINGS.set(t.seed, l);
  return l;
}

// The instrument's standardised shock for a day (unit variance, factor-mixed).
export function instrumentShock(t: Ticker, day: number): number {
  const l = loadingsFor(t);
  let z = l.idio * shock(t.seed, day) + l.world * shock(F_WORLD, day);
  if (l.region) z += l.region * shock(l.regionSeed, day);
  if (l.sector) z += l.sector * shock(l.sectorSeed, day);
  if (l.other) z += l.other.w * shock(l.other.seed, day);
  return z;
}

// Per-instrument cache of daily walk levels, filled forward from the anchor.
const LEVELS = new Map<number, number[]>();

function dailyLevel(t: Ticker, day: number): number {
  if (day < ANCHOR_DAY) {
    // Before the cache anchor (only very old timestamps): truncated direct sum.
    let x = 0;
    let w = 1;
    for (let j = 0; j < 220; j++) {
      x += w * t.vol * SHOCK_SCALE * instrumentShock(t, day - j);
      w *= PHI;
    }
    return x;
  }
  let arr = LEVELS.get(t.seed);
  if (!arr) {
    arr = [0];
    LEVELS.set(t.seed, arr);
  }
  for (let i = arr.length; i <= day - ANCHOR_DAY; i++) {
    arr.push(arr[i - 1] * PHI + t.vol * SHOCK_SCALE * instrumentShock(t, ANCHOR_DAY + i));
  }
  return arr[day - ANCHOR_DAY];
}

// Deterministic step-noise in [-1, 1] for the intraday shimmer.
function stepNoise(n: number, seed: number): number {
  return hash01(n * 7919 + seed * 104729) * 2 - 1;
}

// Price of a symbol at an absolute time.
export function priceAt(symbol: string, tMs: number): number {
  const t = getInstrument(symbol);
  if (!t) return 0;
  const day = Math.floor(tMs / DAY);
  const frac = (tMs - day * DAY) / DAY;
  const a = dailyLevel(t, day);
  const b = dailyLevel(t, day + 1);
  const walk = a + (b - a) * frac;

  // A gentle seasonal tilt so some names trend over the year (drift = amplitude).
  const tilt = t.drift * 0.5 * Math.sin((2 * Math.PI * tMs) / (365 * DAY) + t.seed);

  // Intraday shimmer: small enough not to swamp the daily walk, big enough to tick.
  const s = tMs / 1000;
  const wave = Math.sin(s / 41 + t.seed) * 0.6 + Math.sin(s / 11 + t.seed * 2.3) * 0.3 + Math.sin(s / 2.7 + t.seed * 4.1) * 0.1;
  const shimmer = t.vol * (0.16 * wave + 0.06 * stepNoise(Math.floor(s / 3), t.seed));

  const raw = walk + tilt + shimmer;
  const logMove = LIMIT * Math.tanh(raw / LIMIT);
  return roundPrice(t.base * Math.exp(logMove), t.base);
}

// Percent change vs ~24h ago, for a "today" badge.
export function dayChangePct(symbol: string, tMs: number): number {
  const now = priceAt(symbol, tMs);
  const prev = priceAt(symbol, tMs - DAY);
  if (prev === 0) return 0;
  return ((now - prev) / prev) * 100;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Crypto and other high-priced lines need a coarser tick to look right.
function roundPrice(n: number, base: number): number {
  if (base >= 5000) return Math.round(n);
  return round2(n);
}

export function getTicker(symbol: string): Ticker | undefined {
  return getInstrument(symbol);
}
