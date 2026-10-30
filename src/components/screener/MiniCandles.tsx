"use client";

import { useId } from "react";
import type { Bar } from "@/lib/bars";
import { sma } from "@/lib/indicators";
import type { Pattern } from "@/lib/screener/patterns";

// A compact candlestick chart with 20/50-day averages and the detected pattern's
// trendlines drawn on — the Finviz chart thumbnail, plus the lines it only
// shows to paying users.
export default function MiniCandles({
  bars,
  pattern,
  level,
  width = 260,
  height = 120,
  count = 60,
  showSma = true,
}: {
  bars: Bar[];
  pattern?: Pattern | null;
  level?: number | null;
  width?: number;
  height?: number;
  count?: number;
  showSma?: boolean;
}) {
  const clip = useId();
  if (bars.length < 5) return <svg width={width} height={height} aria-hidden />;
  const start = Math.max(0, bars.length - count);
  const view = bars.slice(start);
  const closes = bars.map((b) => b.c);
  const s20 = sma(closes, 20).slice(start);
  const s50 = sma(closes, 50).slice(start);
  const lo = Math.min(...view.map((b) => b.l));
  const hi = Math.max(...view.map((b) => b.h));
  const pad = (hi - lo) * 0.06 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  const H = height - 2;
  const y = (p: number) => 1 + H - ((p - yMin) / (yMax - yMin)) * H;
  const step = width / view.length;
  const bw = Math.max(1.2, step * 0.62);
  const x = (k: number) => k * step + step / 2;

  const path = (series: (number | null)[]) =>
    series
      .map((v, k) => (v == null ? null : `${x(k).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .map((pt, k) => `${k === 0 ? "M" : "L"}${pt}`)
      .join(" ");

  const line = (l?: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!l) return null;
    // Pattern lines index into the full bar array; shift into this window.
    const k0 = Math.max(l.x0, start) - start;
    const k1 = l.x1 - start;
    if (k1 <= 0) return null;
    const slope = (l.y1 - l.y0) / (l.x1 - l.x0 || 1);
    const y0 = l.y0 + slope * (Math.max(l.x0, start) - l.x0);
    return <line x1={x(k0)} y1={y(y0)} x2={x(k1)} y2={y(l.y1)} />;
  };

  const tone = pattern?.bias === "bullish" ? "#34d399" : pattern?.bias === "bearish" ? "#fb7185" : "#fbbf24";

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block" style={{ height }} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {view.map((b, k) => {
          const up = b.c >= b.o;
          const c = up ? "#34d399" : "#fb7185";
          const top = y(Math.max(b.o, b.c));
          const bot = y(Math.min(b.o, b.c));
          return (
            <g key={b.t}>
              <line x1={x(k)} x2={x(k)} y1={y(b.h)} y2={y(b.l)} stroke={c} strokeWidth={0.8} opacity={0.75} />
              <rect x={x(k) - bw / 2} y={top} width={bw} height={Math.max(0.8, bot - top)} fill={up ? c : c} opacity={up ? 0.9 : 0.85} rx={0.4} />
            </g>
          );
        })}
        {showSma && <path d={path(s20)} fill="none" stroke="#a78bfa" strokeWidth={1} opacity={0.9} />}
        {showSma && <path d={path(s50)} fill="none" stroke="#38bdf8" strokeWidth={1} opacity={0.8} />}
        <g stroke={tone} strokeWidth={1.4} strokeDasharray="4 3" opacity={0.95}>
          {line(pattern?.upper)}
          {line(pattern?.lower)}
          {pattern?.level != null && <line x1={0} x2={width} y1={y(pattern.level)} y2={y(pattern.level)} />}
          {level != null && pattern?.level == null && <line x1={0} x2={width} y1={y(level)} y2={y(level)} stroke="#fbbf24" />}
        </g>
      </g>
    </svg>
  );
}
