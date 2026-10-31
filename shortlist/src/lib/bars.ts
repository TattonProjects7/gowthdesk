// Daily OHLCV bars for the screener, heatmap and candlestick signals.
//
// The simulator in market.ts gives a continuous price path. A bar for day d
// closes where that path stands at the end of the day; the open gaps a little
// away from the previous close; the high and low stretch beyond the body by an
// amount that scales with the instrument's volatility. Volume follows the
// share count and turnover, rises with the size of the move, and spikes on
// news days and results days, so "unusual volume" means something.
//
// Pure functions of (symbol, time): deterministic, offline and cheap.

import { getInstrument, type Instrument } from "./instruments";
import { hash01, priceAt, shock } from "./market";
import { nextCatalyst } from "./catalysts";

const DAY = 86400_000;

export interface Bar {
  t: number; // start of the day (UTC midnight), epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number; // shares (or coins) traded
}

/** Average full-day volume the simulator aims for. */
export function baseVolume(i: Instrument): number {
  if (i.type === "crypto") return i.symbol === "BTC" ? 32_000 : i.symbol === "ETH" ? 410_000 : 2_600_000;
  if (i.type === "etf") return Math.round(180_000 + (i.seed % 7) * 60_000);
  const shares = (i.sharesM ?? 1000) * 1e6;
  const turnover = (i.exchange === "LSE" ? 0.0028 : 0.0045) * Math.min(3, Math.max(0.5, i.vol / 0.016));
  return Math.round(shares * turnover);
}

function round(n: number, base: number): number {
  if (base >= 5000) return Math.round(n);
  return Math.round(n * 100) / 100;
}

function isResultsDay(symbol: string, day: number): boolean {
  if (getInstrument(symbol)?.type !== "stock") return false;
  // nextCatalyst counts forward from a time; a results day is one where the
  // countdown seen from the day before is exactly one day.
  return nextCatalyst(symbol, (day - 1) * DAY + DAY / 2).daysUntil === 1;
}

function volumeMultiplier(i: Instrument, day: number, absRet: number): number {
  const noise = Math.exp(0.32 * shock(i.seed + 3331, day));
  const moveBoost = 0.55 + 0.45 * Math.min(4, absRet / Math.max(0.004, i.vol * 0.8));
  const news = hash01(i.seed * 7919 + day * 13) > 0.965 ? 2.6 : 1; // the odd news day
  const results = isResultsDay(i.symbol, day) ? 3.1 : 1;
  return noise * moveBoost * news * results;
}

/** The completed bar for UTC day `day` (an integer day number). */
export function barForDay(symbol: string, day: number): Bar | null {
  const i = getInstrument(symbol);
  if (!i) return null;
  const prevClose = priceAt(symbol, day * DAY);
  const close = priceAt(symbol, (day + 1) * DAY);
  const gap = i.type === "crypto" ? 0 : 0.35 * i.vol * shock(i.seed + 7771, day);
  const open = prevClose * Math.exp(gap);
  const up = Math.abs(shock(i.seed + 5551, day));
  const dn = Math.abs(shock(i.seed + 6661, day));
  const high = Math.max(open, close) * Math.exp(0.45 * i.vol * up);
  const low = Math.min(open, close) * Math.exp(-0.45 * i.vol * dn);
  const absRet = prevClose ? Math.abs(close / prevClose - 1) : 0;
  const v = Math.round(baseVolume(i) * volumeMultiplier(i, day, absRet));
  return { t: day * DAY, o: round(open, i.base), h: round(high, i.base), l: round(low, i.base), c: close, v };
}

/** Today's bar so far: open, the high and low traded since, the live price and volume to date. */
export function barToday(symbol: string, now: number): Bar | null {
  const i = getInstrument(symbol);
  if (!i) return null;
  const day = Math.floor(now / DAY);
  const start = day * DAY;
  const frac = Math.max(0.0001, (now - start) / DAY);
  const prevClose = priceAt(symbol, start);
  const price = priceAt(symbol, now);
  const gap = i.type === "crypto" ? 0 : 0.35 * i.vol * shock(i.seed + 7771, day);
  const open = prevClose * Math.exp(gap);
  // Sample the path every half hour so the high and low only ever widen.
  let hi = Math.max(open, price);
  let lo = Math.min(open, price);
  for (let t = start + 1800_000; t < now; t += 1800_000) {
    const p = priceAt(symbol, t);
    if (p > hi) hi = p;
    if (p < lo) lo = p;
  }
  const stretch = Math.sqrt(frac);
  hi *= Math.exp(0.3 * i.vol * Math.abs(shock(i.seed + 5551, day)) * stretch);
  lo *= Math.exp(-0.3 * i.vol * Math.abs(shock(i.seed + 6661, day)) * stretch);
  // Scale the move so far up to a full-day equivalent, so a quiet morning
  // doesn't read as unusually low volume.
  const absRet = prevClose ? Math.abs(price / prevClose - 1) / Math.sqrt(frac) : 0;
  const v = Math.round(baseVolume(i) * volumeMultiplier(i, day, absRet) * frac);
  return { t: start, o: round(open, i.base), h: Math.max(round(hi, i.base), price), l: Math.min(round(lo, i.base), price), c: price, v };
}

// Completed bars don't change during the day, so build them once per day.
const HISTORY = new Map<string, { day: number; bars: Bar[] }>();

/** `n` daily bars ending with today's partial bar, oldest first. */
export function simBars(symbol: string, now: number, n = 260): Bar[] {
  const day = Math.floor(now / DAY);
  let h = HISTORY.get(symbol);
  if (!h || h.day !== day || h.bars.length < n - 1) {
    const bars: Bar[] = [];
    for (let d = day - n + 1; d < day; d++) {
      const b = barForDay(symbol, d);
      if (b) bars.push(b);
    }
    h = { day, bars };
    HISTORY.set(symbol, h);
  }
  const today = barToday(symbol, now);
  const hist = h.bars.length > n - 1 ? h.bars.slice(-(n - 1)) : h.bars;
  return today ? [...hist, today] : [...hist];
}

/**
 * Re-base simulated bars onto a real last price (live quote, no candle feed),
 * and drop in the real open/high/low when the provider gave them.
 */
export function scaleBars(bars: Bar[], last: number, today?: { o?: number; h?: number; l?: number; pc?: number }): Bar[] {
  const cur = bars[bars.length - 1]?.c;
  if (!cur || !last) return bars;
  const k = last / cur;
  const out = bars.map((b) => ({ ...b, o: b.o * k, h: b.h * k, l: b.l * k, c: b.c * k }));
  const t = out[out.length - 1];
  t.c = last;
  if (today?.o) t.o = today.o;
  if (today?.h) t.h = Math.max(today.h, last);
  if (today?.l) t.l = Math.min(today.l, last);
  if (today?.pc && out.length > 1) out[out.length - 2].c = today.pc;
  return out;
}

/** Roll daily bars up into weekly (Monday-start) or monthly bars. */
export function aggregateBars(bars: Bar[], period: "W" | "M"): Bar[] {
  const out: Bar[] = [];
  let key = "";
  for (const b of bars) {
    const d = new Date(b.t);
    let k: string;
    if (period === "M") k = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    else {
      const monday = Math.floor((b.t / DAY + 3) / 7); // weeks since the first Monday after the epoch
      k = `w${monday}`;
    }
    const last = out[out.length - 1];
    if (k !== key || !last) {
      out.push({ ...b });
      key = k;
    } else {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
      last.v += b.v;
    }
  }
  return out;
}
