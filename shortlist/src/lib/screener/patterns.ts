// Chart-pattern and candlestick recognition over daily bars.
//
// Patterns: swing highs and lows (pivots) are found over the last few months,
// a trendline is fitted through each set, and the slopes classify the shape —
// channels, wedges and triangles — while repeated pivots at the same level mark
// double/multiple tops and bottoms and head-and-shoulders. Each result carries
// its trendlines so the chart can draw them, which a screener table can't.
//
// Candlesticks: the classic single-bar shapes on today's bar.

import type { Bar } from "../bars";

export type PatternId =
  | "channel_up"
  | "channel_down"
  | "channel"
  | "wedge_up"
  | "wedge_down"
  | "wedge"
  | "triangle_asc"
  | "triangle_desc"
  | "double_top"
  | "double_bottom"
  | "multiple_top"
  | "multiple_bottom"
  | "head_shoulders"
  | "head_shoulders_inv";

export const PATTERN_LABEL: Record<PatternId, string> = {
  channel_up: "Channel up",
  channel_down: "Channel down",
  channel: "Channel",
  wedge_up: "Rising wedge",
  wedge_down: "Falling wedge",
  wedge: "Wedge",
  triangle_asc: "Ascending triangle",
  triangle_desc: "Descending triangle",
  double_top: "Double top",
  double_bottom: "Double bottom",
  multiple_top: "Multiple top",
  multiple_bottom: "Multiple bottom",
  head_shoulders: "Head and shoulders",
  head_shoulders_inv: "Inverse head and shoulders",
};

// What the textbook says the shape tends to precede. Education, not a forecast.
export const PATTERN_BIAS: Record<PatternId, "bullish" | "bearish" | "neutral"> = {
  channel_up: "bullish",
  channel_down: "bearish",
  channel: "neutral",
  wedge_up: "bearish",
  wedge_down: "bullish",
  wedge: "neutral",
  triangle_asc: "bullish",
  triangle_desc: "bearish",
  double_top: "bearish",
  double_bottom: "bullish",
  multiple_top: "bearish",
  multiple_bottom: "bullish",
  head_shoulders: "bearish",
  head_shoulders_inv: "bullish",
};

export interface Line {
  x0: number; // bar index (into the bars passed in)
  y0: number;
  x1: number;
  y1: number;
}

export interface Pattern {
  id: PatternId;
  label: string;
  bias: "bullish" | "bearish" | "neutral";
  upper?: Line;
  lower?: Line;
  level?: number; // the shared top/bottom level, or the neckline
  /** Price sitting on the lower line (support) or the upper line (resistance). */
  atSupport: boolean;
  atResistance: boolean;
}

interface Pivot {
  i: number;
  p: number;
}

export function pivots(bars: Bar[], k = 4): { highs: Pivot[]; lows: Pivot[] } {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];
  for (let i = k; i < bars.length - k; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - k; j <= i + k; j++) {
      if (j === i) continue;
      if (bars[j].h >= bars[i].h) isHigh = false;
      if (bars[j].l <= bars[i].l) isLow = false;
      if (!isHigh && !isLow) break;
    }
    if (isHigh) highs.push({ i, p: bars[i].h });
    if (isLow) lows.push({ i, p: bars[i].l });
  }
  return { highs, lows };
}

function fit(points: Pivot[]): { slope: number; intercept: number } {
  const n = points.length;
  const mx = points.reduce((a, p) => a + p.i, 0) / n;
  const my = points.reduce((a, p) => a + p.p, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.i - mx) * (p.p - my);
    den += (p.i - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) / Math.max(a, b) <= tol;

/** Detect the dominant pattern over the last `window` bars. */
export function detectPattern(bars: Bar[], window = 90): Pattern | null {
  if (bars.length < 40) return null;
  const off = Math.max(0, bars.length - window);
  const w = bars.slice(off);
  const { highs, lows } = pivots(w);
  const last = w[w.length - 1];
  const lastI = w.length - 1;
  const price = last.c;
  const mean = w.reduce((a, b) => a + b.c, 0) / w.length;
  const pct = (slope: number) => (slope / mean) * 100; // % of price per bar

  const mk = (id: PatternId, extra: Partial<Pattern> = {}): Pattern => {
    const p: Pattern = { id, label: PATTERN_LABEL[id], bias: PATTERN_BIAS[id], atSupport: false, atResistance: false, ...extra };
    const shift = (l?: Line) => (l ? { x0: l.x0 + off, y0: l.y0, x1: l.x1 + off, y1: l.y1 } : undefined);
    p.upper = shift(p.upper);
    p.lower = shift(p.lower);
    return p;
  };

  const lineAt = (f: { slope: number; intercept: number }, x: number) => f.slope * x + f.intercept;
  const line = (f: { slope: number; intercept: number }, from: number): Line => ({ x0: from, y0: lineAt(f, from), x1: lastI, y1: lineAt(f, lastI) });

  // Head and shoulders (and inverse): three most recent pivots, the middle one extreme.
  if (highs.length >= 3) {
    const [a, b, c] = highs.slice(-3);
    const neck = Math.min(...w.slice(a.i, c.i + 1).map((x) => x.l));
    if (b.p > Math.max(a.p, c.p) * 1.03 && near(a.p, c.p, 0.04) && c.i - a.i >= 15 && price < c.p) {
      return mk("head_shoulders", { level: neck, atSupport: near(price, neck, 0.015) });
    }
  }
  if (lows.length >= 3) {
    const [a, b, c] = lows.slice(-3);
    const neck = Math.max(...w.slice(a.i, c.i + 1).map((x) => x.h));
    if (b.p < Math.min(a.p, c.p) * 0.97 && near(a.p, c.p, 0.04) && c.i - a.i >= 15 && price > c.p) {
      return mk("head_shoulders_inv", { level: neck, atResistance: near(price, neck, 0.015) });
    }
  }

  // Multiple and double tops/bottoms: recent pivots sharing a level.
  const sameLevel = (ps: Pivot[], tol: number) => {
    const recent = ps.slice(-4);
    for (let n = recent.length; n >= 2; n--) {
      const g = recent.slice(-n);
      const lvl = g.reduce((s, p) => s + p.p, 0) / n;
      const hi = Math.max(...g.map((p) => p.p));
      const lo = Math.min(...g.map((p) => p.p));
      // The whole group must sit inside one narrow band, so a steadily rising
      // channel's highs (each a little above the last) don't read as a top.
      if ((hi - lo) / hi <= tol && g[g.length - 1].i - g[0].i >= 10) return { n, lvl, g };
    }
    return null;
  };
  const tops = sameLevel(highs, 0.012);
  if (tops) {
    const trough = Math.min(...w.slice(tops.g[0].i, tops.g[tops.g.length - 1].i + 1).map((x) => x.l));
    if (trough < tops.lvl * 0.95 && price < tops.lvl * 0.99) {
      return mk(tops.n >= 3 ? "multiple_top" : "double_top", { level: tops.lvl, atResistance: near(price, tops.lvl, 0.015) });
    }
  }
  const bottoms = sameLevel(lows, 0.012);
  if (bottoms) {
    const peak = Math.max(...w.slice(bottoms.g[0].i, bottoms.g[bottoms.g.length - 1].i + 1).map((x) => x.h));
    if (peak > bottoms.lvl * 1.05 && price > bottoms.lvl * 1.01) {
      return mk(bottoms.n >= 3 ? "multiple_bottom" : "double_bottom", { level: bottoms.lvl, atSupport: near(price, bottoms.lvl, 0.015) });
    }
  }

  // Trendline shapes: fit the last few swing highs and lows.
  const hs = highs.slice(-4);
  const ls = lows.slice(-4);
  if (hs.length < 2 || ls.length < 2) return null;
  const fh = fit(hs);
  const fl = fit(ls);
  const sh = pct(fh.slope);
  const sl = pct(fl.slope);
  const upNow = lineAt(fh, lastI);
  const loNow = lineAt(fl, lastI);
  // The price should still be trading roughly inside the lines.
  if (price > upNow * 1.03 || price < loNow * 0.97 || upNow <= loNow) return null;
  const from = Math.min(hs[0].i, ls[0].i);
  const extra = {
    upper: line(fh, from),
    lower: line(fl, from),
    atSupport: near(price, loNow, 0.015),
    atResistance: near(price, upNow, 0.015),
  };
  const FLAT = 0.04;
  const flat = (s: number) => Math.abs(s) < FLAT;
  const startGap = lineAt(fh, from) - lineAt(fl, from);
  const endGap = upNow - loNow;
  const converging = endGap < startGap * 0.7;

  if (flat(sh) && flat(sl)) return mk("channel", extra);
  if (flat(sh) && sl > FLAT) return mk("triangle_asc", extra);
  if (sh < -FLAT && flat(sl)) return mk("triangle_desc", extra);
  if (sh < -FLAT && sl > FLAT) return mk("wedge", extra);
  if (sh > FLAT && sl > FLAT) return mk(converging && sl > sh ? "wedge_up" : "channel_up", extra);
  if (sh < -FLAT && sl < -FLAT) return mk(converging && sh < sl ? "wedge_down" : "channel_down", extra);
  return null;
}

/** A level the price turned at three or more times, and is sitting on now. */
export function horizontalLevel(bars: Bar[], window = 120): number | null {
  if (bars.length < 30) return null;
  const w = bars.slice(-window);
  const { highs, lows } = pivots(w, 3);
  const price = w[w.length - 1].c;
  // Only pivots that are at least a couple of weeks old count as tested levels.
  const all = [...highs, ...lows].filter((p) => p.i < w.length - 10).map((p) => p.p);
  for (const lvl of all) {
    const touches = all.filter((x) => near(x, lvl, 0.008)).length;
    if (touches >= 3 && near(price, lvl, 0.006)) return lvl;
  }
  return null;
}

export type CandleId =
  | "long_lower_shadow"
  | "long_upper_shadow"
  | "hammer"
  | "inverted_hammer"
  | "spinning_top_white"
  | "spinning_top_black"
  | "doji"
  | "dragonfly_doji"
  | "gravestone_doji"
  | "marubozu_white"
  | "marubozu_black"
  | "bullish_engulfing"
  | "bearish_engulfing";

export const CANDLE_LABEL: Record<CandleId, string> = {
  long_lower_shadow: "Long lower shadow",
  long_upper_shadow: "Long upper shadow",
  hammer: "Hammer",
  inverted_hammer: "Inverted hammer",
  spinning_top_white: "Spinning top (white)",
  spinning_top_black: "Spinning top (black)",
  doji: "Doji",
  dragonfly_doji: "Dragonfly doji",
  gravestone_doji: "Gravestone doji",
  marubozu_white: "Marubozu (white)",
  marubozu_black: "Marubozu (black)",
  bullish_engulfing: "Bullish engulfing",
  bearish_engulfing: "Bearish engulfing",
};

/** Classify today's candle against yesterday's. Returns the most specific match. */
export function detectCandle(prev: Bar | undefined, b: Bar): CandleId | null {
  const range = b.h - b.l;
  if (range <= 0) return null;
  const body = Math.abs(b.c - b.o);
  const upper = b.h - Math.max(b.o, b.c);
  const lower = Math.min(b.o, b.c) - b.l;
  const white = b.c >= b.o;

  if (prev) {
    const pBody = Math.abs(prev.c - prev.o);
    const prevWhite = prev.c >= prev.o;
    if (pBody > 0 && body > pBody * 1.1 && body > range * 0.5) {
      if (white && !prevWhite && b.c >= prev.o && b.o <= prev.c) return "bullish_engulfing";
      if (!white && prevWhite && b.o >= prev.c && b.c <= prev.o) return "bearish_engulfing";
    }
  }
  if (body <= range * 0.08) {
    if (lower >= range * 0.7) return "dragonfly_doji";
    if (upper >= range * 0.7) return "gravestone_doji";
    return "doji";
  }
  if (body >= range * 0.9) return white ? "marubozu_white" : "marubozu_black";
  if (lower >= body * 2 && upper <= body * 0.5) return "hammer";
  if (upper >= body * 2 && lower <= body * 0.5) return "inverted_hammer";
  if (body <= range * 0.3 && upper > body && lower > body) return white ? "spinning_top_white" : "spinning_top_black";
  if (lower >= range * 0.5) return "long_lower_shadow";
  if (upper >= range * 0.5) return "long_upper_shadow";
  return null;
}
