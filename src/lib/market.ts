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
// The instrument list itself lives in instruments.ts (US + UK shares, ETFs and
// crypto). `UNIVERSE` is kept as the *shortable* subset so the short scanner,
// squeeze radar and catalyst engine keep working exactly as before.

import { INSTRUMENTS, getInstrument, type Instrument } from "./instruments";

export type Ticker = Pick<Instrument, "symbol" | "name" | "base" | "vol" | "drift" | "seed">;

// Shortable US stocks — the short-scanner universe.
export const UNIVERSE: Ticker[] = INSTRUMENTS.filter((i) => i.shortable);

const DAY = 86400_000;
const PHI = 0.97; // daily persistence of the walk (half-life ≈ 23 trading days)
const SHOCK_SCALE = 1.2; // offsets the dampening from mean reversion so realised daily moves ≈ vol
const LIMIT = 0.26; // soft cap on |log move| from the anchor → price stays within ~0.77×–1.30×
const ANCHOR_DAY = Math.floor(Date.UTC(2019, 0, 1) / DAY);

// Integer hash → uniform [0, 1). Pure integer maths, identical on every JS engine.
function hash01(a: number): number {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Roughly standard-normal daily shock for (instrument, day): sum of three uniforms.
function shock(seed: number, day: number): number {
  const k = seed * 1_000_003 + day * 3;
  return (hash01(k) + hash01(k + 1) + hash01(k + 2) - 1.5) * 2;
}

// Per-instrument cache of daily walk levels, filled forward from the anchor.
const LEVELS = new Map<number, number[]>();

function dailyLevel(t: Ticker, day: number): number {
  if (day < ANCHOR_DAY) {
    // Before the cache anchor (only very old timestamps): truncated direct sum.
    let x = 0;
    let w = 1;
    for (let j = 0; j < 220; j++) {
      x += w * t.vol * SHOCK_SCALE * shock(t.seed, day - j);
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
    arr.push(arr[i - 1] * PHI + t.vol * SHOCK_SCALE * shock(t.seed, ANCHOR_DAY + i));
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
