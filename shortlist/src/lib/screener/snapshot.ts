// One row of market data per instrument — everything the screener, heatmap,
// groups and quote pages filter, sort and colour by. Built from daily bars
// (simulated or live) plus fundamentals (live or demo).

import type { Bar } from "../bars";
import { getInstrument, type Instrument } from "../instruments";
import type { Fundamentals } from "../fundamentals";
import { nextCatalyst } from "../catalysts";
import { rsiSeries, sma } from "../indicators";
import { gbpUsd } from "../fx";
import { detectCandle, detectPattern, horizontalLevel, type CandleId, type Pattern } from "./patterns";

const DAY = 86400_000;

// Circulating supply for crypto market caps (millions of coins).
const SUPPLY_M: Record<string, number> = { BTC: 19.9, ETH: 120.7, SOL: 545 };

export type SignalId =
  | "top_gainers"
  | "top_losers"
  | "new_high"
  | "new_low"
  | "most_volatile"
  | "most_active"
  | "unusual_volume"
  | "overbought"
  | "oversold"
  | "earnings_today"
  | "earnings_week"
  | "gap_up"
  | "gap_down"
  | "golden_cross"
  | "death_cross"
  | "breakout"
  | "pullback_uptrend"
  | "tl_support"
  | "tl_resistance"
  | "horizontal_sr"
  | `p_${string}`;

export interface Snapshot {
  i: Instrument;
  symbol: string;
  price: number;
  priceUsd: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number; // % vs previous close
  changeAbs: number;
  changeOpen: number; // % vs today's open
  gap: number; // % open vs previous close
  volume: number;
  avgVolume: number;
  relVolume: number; // today's volume vs the average for this time of day
  turnoverUsd: number;
  marketCapUsd: number | null;
  perfW: number | null;
  perfM: number | null;
  perfQ: number | null;
  perfH: number | null;
  perfYtd: number | null;
  perfY: number | null;
  volW: number; // average daily range %, last week
  volM: number; // … last month
  atr: number;
  atrPct: number;
  rsi: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  sma20Pct: number | null;
  sma50Pct: number | null;
  sma200Pct: number | null;
  high20: number;
  low20: number;
  high50: number;
  low50: number;
  high52: number;
  low52: number;
  fromHigh20: number; // % below the 20-day high (≤ 0)
  fromLow20: number; // % above the 20-day low (≥ 0)
  fromHigh50: number;
  fromLow50: number;
  fromHigh52: number;
  fromLow52: number;
  beta: number | null;
  pattern: Pattern | null;
  candle: CandleId | null;
  srLevel: number | null;
  fund: Fundamentals | null;
  earnings: { date: number; daysUntil: number; timing: "Before open" | "After close" } | null;
  signals: SignalId[];
  /** The bars the snapshot was built from (pattern lines index into these). */
  bars: Bar[];
}

/** Price in the instrument's currency → US dollars. */
export function toUsd(i: Instrument, amount: number, now: number): number {
  if (i.currency === "USD") return amount;
  const fx = gbpUsd(now);
  return i.currency === "GBX" ? (amount / 100) * fx : amount * fx;
}

function closeAtOrBefore(bars: Bar[], t: number): number | null {
  for (let k = bars.length - 1; k >= 0; k--) if (bars[k].t <= t) return bars[k].c;
  return null;
}

function last<T>(xs: (T | null)[]): T | null {
  return xs.length ? xs[xs.length - 1] : null;
}

const pct = (a: number, b: number | null) => (b ? (a / b - 1) * 100 : null);

export function beta(bars: Bar[], market: Bar[] | undefined, n = 252): number | null {
  if (!market || market.length < 30) return null;
  const mByT = new Map(market.map((b) => [b.t, b.c]));
  const r: number[] = [];
  const m: number[] = [];
  for (let k = Math.max(1, bars.length - n); k < bars.length; k++) {
    const a0 = bars[k - 1].c;
    const a1 = bars[k].c;
    const b0 = mByT.get(bars[k - 1].t);
    const b1 = mByT.get(bars[k].t);
    if (!a0 || !b0 || !b1) continue;
    r.push(a1 / a0 - 1);
    m.push(b1 / b0 - 1);
  }
  if (r.length < 20) return null;
  const mr = r.reduce((s, x) => s + x, 0) / r.length;
  const mm = m.reduce((s, x) => s + x, 0) / m.length;
  let cov = 0;
  let varm = 0;
  for (let k = 0; k < r.length; k++) {
    cov += (r[k] - mr) * (m[k] - mm);
    varm += (m[k] - mm) ** 2;
  }
  return varm ? Math.round((cov / varm) * 100) / 100 : null;
}

export interface SnapshotInput {
  symbol: string;
  bars: Bar[]; // oldest first, last = today (possibly partial)
  now: number;
  market?: Bar[]; // benchmark bars for beta
  fund?: Fundamentals | null;
}

export function buildSnapshot({ symbol, bars, now, market, fund = null }: SnapshotInput): Snapshot | null {
  const i = getInstrument(symbol);
  if (!i || bars.length < 2) return null;
  const today = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const closes = bars.map((b) => b.c);
  const price = today.c;
  const prevClose = prev.c;

  const completed = bars.slice(0, -1);
  const avgWin = completed.slice(-63);
  const avgVolume = avgWin.length ? avgWin.reduce((s, b) => s + b.v, 0) / avgWin.length : today.v;
  const frac = Math.min(1, Math.max(0.02, (now - today.t) / DAY));
  const relVolume = avgVolume ? today.v / (avgVolume * frac) : 1;

  const range = (n: number) => {
    const w = bars.slice(-n);
    return (w.reduce((s, b) => s + (b.h - b.l) / (b.c || 1), 0) / w.length) * 100;
  };

  // Wilder ATR(14)
  let atr = 0;
  {
    const trs: number[] = [];
    for (let k = 1; k < bars.length; k++) {
      const b = bars[k];
      const pc = bars[k - 1].c;
      trs.push(Math.max(b.h - b.l, Math.abs(b.h - pc), Math.abs(b.l - pc)));
    }
    const n = 14;
    if (trs.length >= n) {
      atr = trs.slice(0, n).reduce((s, x) => s + x, 0) / n;
      for (let k = n; k < trs.length; k++) atr = (atr * (n - 1) + trs[k]) / n;
    }
  }

  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const sma20v = last(s20);
  const sma50v = last(s50);
  const sma200v = last(s200);

  const hiLo = (from: number) => {
    const w = bars.filter((b) => b.t >= from);
    const list = w.length ? w : bars;
    return { h: Math.max(...list.map((b) => b.h)), l: Math.min(...list.map((b) => b.l)) };
  };
  const d20 = hiLo(today.t - 19 * DAY);
  const d50 = hiLo(today.t - 49 * DAY);
  const d52 = hiLo(today.t - 364 * DAY);
  const before52 = bars.filter((b) => b.t >= today.t - 364 * DAY && b.t < today.t);
  const prior52High = before52.length ? Math.max(...before52.map((b) => b.h)) : Infinity;
  const prior52Low = before52.length ? Math.min(...before52.map((b) => b.l)) : -Infinity;
  const prior20High = Math.max(...bars.slice(-21, -1).map((b) => b.h));

  const yearStart = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
  const perfYtdBase = closeAtOrBefore(bars, yearStart - 1) ?? closeAtOrBefore(bars, yearStart);

  const shares = i.sharesM ? i.sharesM * 1e6 : i.type === "crypto" && SUPPLY_M[i.symbol] ? SUPPLY_M[i.symbol] * 1e6 : null;
  const marketCapUsd = shares ? toUsd(i, price, now) * shares : null;

  const rsi = last(rsiSeries(closes, 14)) ?? 50;
  const pattern = detectPattern(bars);
  const candle = detectCandle(prev, today);
  const srLevel = horizontalLevel(bars);

  let earnings: Snapshot["earnings"] = null;
  if (i.type === "stock") {
    // The catalyst clock reports a full cycle on the day itself; call that 0.
    const c = nextCatalyst(symbol, now);
    const todayIs = c.daysUntil >= 91;
    earnings = { date: todayIs ? today.t : c.date, daysUntil: todayIs ? 0 : c.daysUntil, timing: i.seed % 2 ? "After close" : "Before open" };
  }

  const snap: Snapshot = {
    i,
    symbol,
    price,
    priceUsd: toUsd(i, price, now),
    prevClose,
    open: today.o,
    high: today.h,
    low: today.l,
    change: pct(price, prevClose) ?? 0,
    changeAbs: price - prevClose,
    changeOpen: pct(price, today.o) ?? 0,
    gap: pct(today.o, prevClose) ?? 0,
    volume: today.v,
    avgVolume,
    relVolume,
    turnoverUsd: toUsd(i, price, now) * today.v,
    marketCapUsd,
    perfW: pct(price, closeAtOrBefore(bars, today.t - 7 * DAY)),
    perfM: pct(price, closeAtOrBefore(bars, today.t - 30 * DAY)),
    perfQ: pct(price, closeAtOrBefore(bars, today.t - 91 * DAY)),
    perfH: pct(price, closeAtOrBefore(bars, today.t - 182 * DAY)),
    perfYtd: pct(price, perfYtdBase),
    perfY: pct(price, closeAtOrBefore(bars, today.t - 365 * DAY)),
    volW: range(7),
    volM: range(30),
    atr,
    atrPct: price ? (atr / price) * 100 : 0,
    rsi,
    sma20: sma20v,
    sma50: sma50v,
    sma200: sma200v,
    sma20Pct: pct(price, sma20v),
    sma50Pct: pct(price, sma50v),
    sma200Pct: pct(price, sma200v),
    high20: d20.h,
    low20: d20.l,
    high50: d50.h,
    low50: d50.l,
    high52: d52.h,
    low52: d52.l,
    fromHigh20: (price / d20.h - 1) * 100,
    fromLow20: (price / d20.l - 1) * 100,
    fromHigh50: (price / d50.h - 1) * 100,
    fromLow50: (price / d50.l - 1) * 100,
    fromHigh52: (price / d52.h - 1) * 100,
    fromLow52: (price / d52.l - 1) * 100,
    beta: beta(bars, market),
    pattern,
    candle,
    srLevel,
    fund,
    earnings,
    signals: [],
    bars,
  };

  // Threshold signals. The ranked ones (most active, most volatile) are added
  // across the whole universe in rankSignals().
  const sig: SignalId[] = [];
  if (today.h >= prior52High) sig.push("new_high");
  if (today.l <= prior52Low) sig.push("new_low");
  if (relVolume >= 2) sig.push("unusual_volume");
  if (rsi >= 70) sig.push("overbought");
  if (rsi <= 30) sig.push("oversold");
  if (earnings && earnings.daysUntil === 0) sig.push("earnings_today");
  if (earnings && earnings.daysUntil <= 7) sig.push("earnings_week");
  if (snap.gap >= 2) sig.push("gap_up");
  if (snap.gap <= -2) sig.push("gap_down");
  const crossed = (dir: 1 | -1) => {
    for (let k = s50.length - 1; k >= Math.max(1, s50.length - 10); k--) {
      const a = s50[k];
      const b = s200[k];
      const a0 = s50[k - 1];
      const b0 = s200[k - 1];
      if (a == null || b == null || a0 == null || b0 == null) return false;
      if (dir === 1 ? a > b && a0 <= b0 : a < b && a0 >= b0) return true;
    }
    return false;
  };
  if (crossed(1)) sig.push("golden_cross");
  if (crossed(-1)) sig.push("death_cross");
  if (price > prior20High && relVolume >= 1.5) sig.push("breakout");
  if (sma200v && sma50v && price > sma200v && sma50v > sma200v && rsi >= 38 && rsi <= 50 && Math.abs(snap.sma50Pct ?? 99) <= 2) sig.push("pullback_uptrend");
  if (pattern?.atSupport) sig.push("tl_support");
  if (pattern?.atResistance) sig.push("tl_resistance");
  if (srLevel != null) sig.push("horizontal_sr");
  if (pattern) sig.push(`p_${pattern.id}`);
  snap.signals = sig;
  return snap;
}

/** Add the signals that depend on ranking the whole universe. */
export function rankSignals(snaps: Snapshot[], top = 12): void {
  const gainers = [...snaps].filter((s) => s.change > 0).sort((a, b) => b.change - a.change).slice(0, top);
  for (const s of gainers) s.signals.push("top_gainers");
  const losers = [...snaps].filter((s) => s.change < 0).sort((a, b) => a.change - b.change).slice(0, top);
  for (const s of losers) s.signals.push("top_losers");
  const byTurnover = [...snaps].sort((a, b) => b.turnoverUsd - a.turnoverUsd).slice(0, top);
  for (const s of byTurnover) s.signals.push("most_active");
  const byVol = [...snaps].sort((a, b) => b.volW - a.volW).slice(0, top);
  for (const s of byVol) s.signals.push("most_volatile");
}

/** Benchmark used for beta: the S&P 500 tracker for US names, the FTSE 100 tracker for UK names. */
export function benchmarkFor(i: Instrument): string {
  if (i.type === "crypto") return "BTC";
  if (i.exchange === "LSE") return "ISF";
  return "VUSA";
}
