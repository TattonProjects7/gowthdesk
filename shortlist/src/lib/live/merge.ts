// Blending real prices into price history. Pure, so the hook stays thin and
// the rules are tested:
//
//   • With real daily candles: use them, put the live price on today's bar
//     (adding today's bar if the feed hasn't yet), and pad any older history
//     the chart asks for with the simulated shape, joined without a jump.
//   • Without candles: keep the simulated shape, but re-base it so yesterday's
//     close is the real previous close and today's is the live price. Every
//     "change today" figure in the app is then the real one.

import type { Bar } from "@/lib/bars";

const DAY = 86400_000;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export interface Today {
  o?: number;
  h?: number;
  l?: number;
  pc?: number;
}

/** Simulated closes re-based onto a real last price and previous close. */
export function anchorCloses(series: number[], last?: number, pc?: number): number[] {
  if (!last || series.length === 0) return series;
  const out = series.slice();
  const n = out.length;
  const ref = pc && n >= 2 ? out[n - 2] : out[n - 1];
  const k = (pc && n >= 2 ? pc : last) / (ref || 1);
  for (let j = 0; j < n - 1; j++) out[j] = r4(out[j] * k);
  out[n - 1] = last;
  return out;
}

/** Simulated bars re-based the same way, with today's real open/high/low. */
export function anchorBars(bars: Bar[], last?: number, today?: Today): Bar[] {
  if (!last || bars.length === 0) return bars;
  const n = bars.length;
  const pc = today?.pc && n >= 2 ? today.pc : undefined;
  const k = pc ? pc / (bars[n - 2].c || 1) : last / (bars[n - 1].c || 1);
  const out = bars.map((b) => ({ ...b, o: r4(b.o * k), h: r4(b.h * k), l: r4(b.l * k), c: r4(b.c * k) }));
  const t = out[n - 1];
  if (pc) t.o = today?.o ?? r4(bars[n - 1].o * (last / (bars[n - 1].c || 1)));
  else if (today?.o) t.o = today.o;
  t.c = last;
  t.h = Math.max(today?.h ?? 0, t.o, last, pc ? 0 : t.h);
  t.l = Math.min(today?.l ?? Infinity, t.o, last, pc ? Infinity : t.l);
  return out;
}

/** Real candles with the live price on today's bar. */
export function withLiveBar(bars: Bar[], last: number | undefined, lastT: number | undefined, now: number, today?: Today): Bar[] {
  if (!bars.length || !last) return bars;
  const day = Math.floor(now / DAY) * DAY;
  const out = bars.slice();
  const b = out[out.length - 1];
  if (b.t >= day) {
    out[out.length - 1] = { ...b, c: last, h: Math.max(b.h, last), l: Math.min(b.l, last) };
  } else if (lastT && lastT >= day) {
    const o = today?.o ?? b.c;
    out.push({ t: day, o, h: Math.max(today?.h ?? 0, o, last), l: Math.min(today?.l ?? Infinity, o, last), c: last, v: 0 });
  }
  return out;
}

/** Extend real history backwards with simulated history, joined smoothly. */
export function padBars(real: Bar[], sim: Bar[], n: number): Bar[] {
  if (real.length >= n) return real.slice(-n);
  const first = real[0];
  const older = sim.filter((b) => b.t < first.t);
  if (!older.length) return real;
  const k = first.o / (older[older.length - 1].c || 1);
  const scaled = older.map((b) => ({ ...b, o: r4(b.o * k), h: r4(b.h * k), l: r4(b.l * k), c: r4(b.c * k) }));
  return [...scaled, ...real].slice(-n);
}
