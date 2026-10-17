"use client";

import { useEffect, useRef, useState } from "react";

// Responsive, touch-friendly area chart for headline values (portfolio value,
// account value). Smooth line, soft gradient fill, dashed baseline at the
// starting value, and a drag-to-scrub readout — the hero chart every broker
// app opens with. Pure SVG; fills its container's width.
export default function AreaChart({
  points,
  height = 160,
  format,
  dates,
  onScrub,
}: {
  points: number[];
  height?: number;
  format: (v: number) => string;
  dates?: number[]; // epoch ms per point, for the scrub label
  onScrub?: (i: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const n = points.length;
  const ok = n >= 2 && width > 0;
  const min = ok ? Math.min(...points) : 0;
  const max = ok ? Math.max(...points) : 1;
  const pad = (max - min) * 0.12 || Math.abs(max) * 0.01 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => (i * width) / Math.max(1, n - 1);
  const y = (v: number) => 6 + ((hi - v) / (hi - lo)) * (height - 12);

  const up = ok ? points[n - 1] >= points[0] : true;
  const color = up ? "#34d399" : "#fb7185";

  // Catmull–Rom → cubic Bézier for a smooth line.
  let line = "";
  if (ok) {
    line = `M${x(0)},${y(points[0])}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = i > 0 ? i - 1 : i;
      const p3 = i + 2 < n ? i + 2 : i + 1;
      const c1x = x(i) + (x(i + 1) - x(p0)) / 6;
      const c1y = y(points[i]) + (y(points[i + 1]) - y(points[p0])) / 6;
      const c2x = x(i + 1) - (x(p3) - x(i)) / 6;
      const c2y = y(points[i + 1]) - (y(points[p3]) - y(points[i])) / 6;
      line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x(i + 1).toFixed(1)},${y(points[i + 1]).toFixed(1)}`;
    }
  }
  const area = ok ? `${line} L${x(n - 1)},${height} L0,${height} Z` : "";

  const scrub = (clientX: number) => {
    if (!ref.current || !ok) return;
    const r = ref.current.getBoundingClientRect();
    const i = Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1))));
    setHover(i);
    onScrub?.(i);
  };
  const end = () => {
    setHover(null);
    onScrub?.(null);
  };

  const gid = `ag-${up ? "u" : "d"}`;

  return (
    <div
      ref={ref}
      className="relative w-full select-none touch-pan-y"
      style={{ height }}
      onMouseMove={(e) => scrub(e.clientX)}
      onMouseLeave={end}
      onTouchStart={(e) => scrub(e.touches[0].clientX)}
      onTouchMove={(e) => scrub(e.touches[0].clientX)}
      onTouchEnd={end}
    >
      {ok && (
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.38" />
              <stop offset="55%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id={`${gid}-glow`} x="-10%" y="-40%" width="120%" height="180%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <line x1={0} x2={width} y1={y(points[0])} y2={y(points[0])} stroke="#929ab3" strokeOpacity="0.3" strokeDasharray="2 5" />
          <path d={area} fill={`url(#${gid})`} className="chart-fade" />
          <path d={line} fill="none" stroke={color} strokeOpacity="0.55" strokeWidth="5" filter={`url(#${gid}-glow)`} className="chart-fade" />
          <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="chart-draw" />
          {hover == null ? (
            <g>
              <circle cx={x(n - 1)} cy={y(points[n - 1])} r="9" fill={color} className="chart-pulse" />
              <circle cx={x(n - 1)} cy={y(points[n - 1])} r="4" fill={color} stroke="#07080d" strokeWidth="2" />
            </g>
          ) : (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="#d6dae6" strokeOpacity="0.45" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(points[hover])} r="5" fill={color} stroke="#07080d" strokeWidth="2.5" />
            </g>
          )}
        </svg>
      )}
      {ok && hover != null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-xl border border-white/10 bg-ink-900/95 px-2 py-1 text-[11px] shadow-xl backdrop-blur"
          style={{ left: Math.min(Math.max(0, x(hover) - 50), width - 100), width: 100 }}
        >
          <p className="font-mono font-semibold text-white text-center">{format(points[hover])}</p>
          {dates?.[hover] && <p className="text-center text-ink-400">{new Date(dates[hover]).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" })}</p>}
        </div>
      )}
    </div>
  );
}
