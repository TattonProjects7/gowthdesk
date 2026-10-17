"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bollinger, macd as macdOf, rsiSeries, sma } from "@/lib/indicators";
import { fmtNative, type Currency } from "@/lib/instruments";

// Interactive price chart with the indicators serious trading apps ship (IG
// lists 28; we start with the ones people actually use): 10/30-day moving
// averages, Bollinger Bands, RSI and MACD. Pure SVG, no chart library, so it
// works offline and in the native shell. Hover/touch for a crosshair readout.

export type Timeframe = "1W" | "1M" | "3M" | "6M" | "1Y";
export const TIMEFRAMES: { id: Timeframe; days: number }[] = [
  { id: "1W", days: 7 },
  { id: "1M", days: 31 },
  { id: "3M", days: 92 },
  { id: "6M", days: 183 },
  { id: "1Y", days: 365 },
];

interface Props {
  closes: number[];
  currency: Currency;
  now: number;
  height?: number;
}

const DAY = 86400_000;

export default function PriceChart({ closes, currency, now, height = 220 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  const [show, setShow] = useState({ ma: true, bb: false, rsi: false, macd: false });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const n = closes.length;
  const ind = useMemo(
    () => ({
      ma10: sma(closes, 10),
      ma30: sma(closes, 30),
      bb: bollinger(closes, 20, 2),
      rsi: rsiSeries(closes, 14),
      macd: macdOf(closes),
    }),
    [closes],
  );

  if (n < 2) return <div ref={ref} className="h-40 rounded-xl border border-ink-800 bg-ink-900 animate-pulse" />;

  const padL = 8;
  const padR = 56;
  const padY = 10;
  const plotW = width - padL - padR;
  const x = (i: number) => padL + (i * plotW) / (n - 1);

  const vals = [...closes];
  if (show.bb) for (let i = 0; i < n; i++) if (ind.bb.upper[i] != null) vals.push(ind.bb.upper[i] as number, ind.bb.lower[i] as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const y = (v: number) => padY + ((max - v) / span) * (height - padY * 2);

  const path = (series: (number | null)[]) => {
    let d = "";
    let pen = false;
    series.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const up = closes[n - 1] >= closes[0];
  const color = up ? "#34d399" : "#fb7185";
  const area = `${path(closes)} L${x(n - 1).toFixed(1)},${height - padY} L${padL},${height - padY} Z`;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + (span * i) / ticks);
  const dateAt = (i: number) => new Date(now - (n - 1 - i) * DAY);
  const fmtD = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const h = hover;

  const onMove = (clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = clientX - rect.left - padL;
    const i = Math.round((px / plotW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const bbPath =
    show.bb &&
    (() => {
      const upper: string[] = [];
      const lower: string[] = [];
      for (let i = 0; i < n; i++) {
        if (ind.bb.upper[i] == null) continue;
        upper.push(`${x(i).toFixed(1)},${y(ind.bb.upper[i] as number).toFixed(1)}`);
        lower.push(`${x(i).toFixed(1)},${y(ind.bb.lower[i] as number).toFixed(1)}`);
      }
      if (!upper.length) return null;
      return `M${upper.join(" L")} L${lower.reverse().join(" L")} Z`;
    })();

  const subH = 64;

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        {(
          [
            ["ma", "MA 10/30"],
            ["bb", "Bollinger"],
            ["rsi", "RSI"],
            ["macd", "MACD"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}
            className={`rounded-md border px-2 py-0.5 font-semibold ${show[k] ? "border-ink-600 bg-ink-700 text-white" : "border-ink-800 text-ink-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-ink-500">
          {h != null ? `${fmtD(dateAt(h))} · ${fmtNative(closes[h], currency)}` : `${fmtD(dateAt(0))} → ${fmtD(dateAt(n - 1))}`}
        </span>
      </div>

      <div
        ref={ref}
        className="relative select-none touch-pan-y"
        onMouseMove={(e) => onMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => onMove(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={() => setHover(null)}
      >
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR + 4} y1={y(t)} y2={y(t)} stroke="#252a47" strokeDasharray="3 4" />
              <text x={width - padR + 8} y={y(t) + 3} fontSize="10" fill="#7b86b5" className="num">
                {fmtNative(t, currency)}
              </text>
            </g>
          ))}
          {bbPath && <path d={bbPath} fill="#7c3aed" fillOpacity="0.12" stroke="none" />}
          {show.bb && <path d={path(ind.bb.middle)} fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="2 3" />}
          <path d={area} fill="url(#area)" />
          <path d={path(closes)} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
          {show.ma && <path d={path(ind.ma10)} fill="none" stroke="#38bdf8" strokeWidth="1.2" />}
          {show.ma && <path d={path(ind.ma30)} fill="none" stroke="#fbbf24" strokeWidth="1.2" />}
          {h != null && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={padY} y2={height - padY} stroke="#a0a9cc" strokeDasharray="2 3" />
              <circle cx={x(h)} cy={y(closes[h])} r="3.5" fill={color} stroke="#0d0f1a" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {show.rsi && (
          <SubPanel title="RSI (14)" width={width} height={subH} padL={padL} padR={padR}>
            {(w, hh) => {
              const yy = (v: number) => 4 + ((100 - v) / 100) * (hh - 8);
              return (
                <>
                  <line x1={padL} x2={w - padR} y1={yy(70)} y2={yy(70)} stroke="#7f1d1d" strokeDasharray="2 3" />
                  <line x1={padL} x2={w - padR} y1={yy(30)} y2={yy(30)} stroke="#065f46" strokeDasharray="2 3" />
                  <text x={w - padR + 8} y={yy(70) + 3} fontSize="9" fill="#7b86b5">70</text>
                  <text x={w - padR + 8} y={yy(30) + 3} fontSize="9" fill="#7b86b5">30</text>
                  <path d={ind.rsi.map((v, i) => (v == null ? "" : `${i === 0 || ind.rsi[i - 1] == null ? "M" : "L"}${x(i).toFixed(1)},${yy(v).toFixed(1)}`)).join(" ")} fill="none" stroke="#c084fc" strokeWidth="1.3" />
                  {h != null && ind.rsi[h] != null && <text x={padL + 2} y={10} fontSize="10" fill="#e8eaf4" className="num">{(ind.rsi[h] as number).toFixed(0)}</text>}
                </>
              );
            }}
          </SubPanel>
        )}

        {show.macd && (
          <SubPanel title="MACD (12, 26, 9)" width={width} height={subH} padL={padL} padR={padR}>
            {(w, hh) => {
              const all = [...ind.macd.macd, ...ind.macd.signal, ...ind.macd.histogram].filter((v): v is number => v != null);
              const m = Math.max(0.0001, ...all.map((v) => Math.abs(v)));
              const yy = (v: number) => hh / 2 - (v / m) * (hh / 2 - 4);
              const bw = Math.max(1, plotW / n - 1);
              return (
                <>
                  <line x1={padL} x2={w - padR} y1={hh / 2} y2={hh / 2} stroke="#252a47" />
                  {ind.macd.histogram.map((v, i) =>
                    v == null ? null : <rect key={i} x={x(i) - bw / 2} y={Math.min(yy(v), hh / 2)} width={bw} height={Math.abs(yy(v) - hh / 2)} fill={v >= 0 ? "#34d399" : "#fb7185"} fillOpacity="0.6" />,
                  )}
                  <path d={seriesPath(ind.macd.macd, x, yy)} fill="none" stroke="#38bdf8" strokeWidth="1.2" />
                  <path d={seriesPath(ind.macd.signal, x, yy)} fill="none" stroke="#fbbf24" strokeWidth="1.2" />
                </>
              );
            }}
          </SubPanel>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-500">
        <span>{fmtD(dateAt(0))}</span>
        <span>{fmtD(dateAt(Math.floor((n - 1) / 2)))}</span>
        <span>{fmtD(dateAt(n - 1))}</span>
      </div>
      {(show.ma || show.bb) && (
        <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-ink-500">
          {show.ma && (
            <>
              <span><i className="inline-block h-0.5 w-3 bg-sky-400 align-middle mr-1" />MA10</span>
              <span><i className="inline-block h-0.5 w-3 bg-amber-400 align-middle mr-1" />MA30</span>
            </>
          )}
          {show.bb && <span><i className="inline-block h-2 w-3 bg-violet-500/40 align-middle mr-1" />Bollinger 20, 2σ</span>}
        </div>
      )}
    </div>
  );
}

function seriesPath(series: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let d = "";
  let pen = false;
  series.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  return d;
}

function SubPanel({ title, width, height, padL, padR, children }: { title: string; width: number; height: number; padL: number; padR: number; children: (w: number, h: number) => React.ReactNode }) {
  return (
    <div className="mt-1 border-t border-ink-800 pt-1">
      <p className="text-[10px] font-semibold text-ink-500 px-1">{title}</p>
      <svg width={width} height={height} className="block">
        {children(width, height)}
        <line x1={padL} x2={width - padR} y1={height - 1} y2={height - 1} stroke="#1c2038" />
      </svg>
    </div>
  );
}
