"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Bar } from "@/lib/bars";
import { sma } from "@/lib/indicators";
import { detectPattern } from "@/lib/screener/patterns";
import { fmtBig } from "@/lib/screener/columns";

export interface ChartOptions {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  trendlines: boolean;
  volume: boolean;
}

const MA = [
  { key: "sma20" as const, n: 20, color: "#a78bfa" },
  { key: "sma50" as const, n: 50, color: "#38bdf8" },
  { key: "sma200" as const, n: 200, color: "#f59e0b" },
];

function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 1) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
  return out;
}

const fmtPrice = (v: number) => (v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(v >= 100 ? 1 : 2));

/**
 * A full candlestick chart: price with moving averages and auto-drawn pattern
 * trendlines, volume underneath, price axis, date labels and a crosshair that
 * reads out each bar. Pure SVG, sized to its container.
 */
export default function CandleChart({ bars, visible = 120, height = 360, opts, period = "D" }: { bars: Bar[]; visible?: number; height?: number; opts: ChartOptions; period?: "D" | "W" | "M" }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(200, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, bars.length - visible);
  const view = bars.slice(start);
  const closes = useMemo(() => bars.map((b) => b.c), [bars]);
  const mas = useMemo(() => MA.map((m) => ({ ...m, s: sma(closes, m.n).slice(start) })), [closes, start]);
  const pattern = useMemo(() => (opts.trendlines ? detectPattern(bars, Math.min(90, visible)) : null), [bars, opts.trendlines, visible]);

  if (view.length < 2) return <div ref={box} style={{ height }} className="skeleton rounded-2xl" />;

  const AXIS = 58;
  const plotW = w - AXIS;
  const volH = opts.volume ? Math.round(height * 0.18) : 0;
  const dateH = 18;
  const priceH = height - volH - dateH - 6;
  const shown = mas.filter((m) => opts[m.key]);
  const lo = Math.min(...view.map((b) => b.l), ...shown.flatMap((m) => m.s.filter((v): v is number => v != null)));
  const hi = Math.max(...view.map((b) => b.h), ...shown.flatMap((m) => m.s.filter((v): v is number => v != null)));
  const pad = (hi - lo) * 0.05 || 1;
  const yMin = lo - pad;
  const yMax = hi + pad;
  // Leave a strip at the top for the OHLC readout.
  const TOP = 18;
  const y = (p: number) => TOP + (1 - (p - yMin) / (yMax - yMin)) * (priceH - TOP - 4);
  const step = plotW / view.length;
  const x = (k: number) => k * step + step / 2;
  const bw = Math.max(1, Math.min(14, step * 0.68));
  const vMax = Math.max(...view.map((b) => b.v)) || 1;
  const vy = (v: number) => priceH + 6 + volH - (v / vMax) * (volH - 2);

  const path = (s: (number | null)[]) =>
    s
      .map((v, k) => (v == null ? null : `${x(k).toFixed(1)},${y(v).toFixed(1)}`))
      .filter(Boolean)
      .map((pt, k) => `${k ? "L" : "M"}${pt}`)
      .join(" ");

  const line = (l?: { x0: number; y0: number; x1: number; y1: number }) => {
    if (!l) return null;
    const k1 = l.x1 - start;
    if (k1 <= 0) return null;
    const x0 = Math.max(l.x0, start);
    const slope = (l.y1 - l.y0) / (l.x1 - l.x0 || 1);
    return <line x1={x(x0 - start)} y1={y(l.y0 + slope * (x0 - l.x0))} x2={x(k1)} y2={y(l.y1)} />;
  };

  const last = view[view.length - 1];
  const hb = hover != null ? view[hover] : last;
  const prev = hover != null ? view[hover - 1] : view[view.length - 2];
  const chg = prev ? (hb.c / prev.c - 1) * 100 : 0;

  // Date labels: about one every 110px.
  const every = Math.max(1, Math.round(110 / step));
  const fmtDate = (t: number) => {
    const d = new Date(t);
    return period === "M" ? d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const onMove = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const k = Math.floor((clientX - r.left) / step);
    setHover(k >= 0 && k < view.length ? k : null);
  };

  const tone = pattern?.bias === "bullish" ? "#34d399" : pattern?.bias === "bearish" ? "#fb7185" : "#fbbf24";

  return (
    <div ref={box} className="relative select-none" style={{ height }} onMouseLeave={() => setHover(null)} onMouseMove={(e) => onMove(e.clientX)} onTouchMove={(e) => onMove(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <div className="pointer-events-none absolute left-1 top-0 z-10 flex flex-wrap gap-x-2 font-mono text-[10px] text-ink-300">
        <span>{fmtDate(hb.t)}</span>
        <span>O {fmtPrice(hb.o)}</span>
        <span>H {fmtPrice(hb.h)}</span>
        <span>L {fmtPrice(hb.l)}</span>
        <span>C {fmtPrice(hb.c)}</span>
        <span className={chg >= 0 ? "text-emerald-300" : "text-rose-300"}>
          {chg >= 0 ? "+" : ""}
          {chg.toFixed(2)}%
        </span>
        {opts.volume && <span>Vol {fmtBig(hb.v)}</span>}
      </div>
      <svg width={w} height={height} className="block" role="img" aria-label="Candlestick chart">
        {niceTicks(yMin, yMax).map((t) => (
          <g key={t}>
            <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.05)" />
            <text x={plotW + 6} y={y(t) + 3} fontSize={10} fill="#7d849d" fontFamily="ui-monospace, monospace">
              {fmtPrice(t)}
            </text>
          </g>
        ))}
        {opts.volume &&
          view.map((b, k) => <rect key={`v${b.t}`} x={x(k) - bw / 2} y={vy(b.v)} width={bw} height={priceH + 6 + volH - vy(b.v)} fill={b.c >= b.o ? "rgba(52,211,153,0.35)" : "rgba(251,113,133,0.35)"} />)}
        {view.map((b, k) => {
          const up = b.c >= b.o;
          const c = up ? "#34d399" : "#fb7185";
          const top = y(Math.max(b.o, b.c));
          const bot = y(Math.min(b.o, b.c));
          return (
            <g key={b.t}>
              <line x1={x(k)} x2={x(k)} y1={y(b.h)} y2={y(b.l)} stroke={c} strokeWidth={1} />
              <rect x={x(k) - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={c} />
            </g>
          );
        })}
        {shown.map((m) => (
          <path key={m.key} d={path(m.s)} fill="none" stroke={m.color} strokeWidth={1.3} />
        ))}
        {pattern && (
          <g stroke={tone} strokeWidth={1.5} strokeDasharray="5 4">
            {line(pattern.upper)}
            {line(pattern.lower)}
            {pattern.level != null && <line x1={0} x2={plotW} y1={y(pattern.level)} y2={y(pattern.level)} />}
          </g>
        )}
        {/* last price tag */}
        <g>
          <line x1={0} x2={plotW} y1={y(last.c)} y2={y(last.c)} stroke={last.c >= view[0].c ? "#34d399" : "#fb7185"} strokeDasharray="2 3" opacity={0.6} />
          <rect x={plotW + 1} y={y(last.c) - 8} width={AXIS - 2} height={16} rx={3} fill={last.c >= (view[view.length - 2]?.c ?? last.o) ? "#059669" : "#e11d48"} />
          <text x={plotW + 6} y={y(last.c) + 4} fontSize={10} fill="#fff" fontFamily="ui-monospace, monospace" fontWeight={600}>
            {fmtPrice(last.c)}
          </text>
        </g>
        {view.map((b, k) =>
          k % every === Math.floor(every / 2) ? (
            <text key={`d${b.t}`} x={x(k)} y={height - 4} fontSize={10} fill="#7d849d" textAnchor="middle">
              {fmtDate(b.t)}
            </text>
          ) : null,
        )}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={height - dateH} stroke="rgba(255,255,255,0.25)" />}
      </svg>
      {pattern && (
        <span className="pointer-events-none absolute bottom-6 left-1 rounded bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: tone }}>
          {pattern.label}
        </span>
      )}
    </div>
  );
}
