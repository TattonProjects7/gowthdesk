"use client";

import type { Slice } from "@/lib/portfolio";
import { fmtGbp } from "@/lib/instruments";

// Donut + legend for the portfolio analytics (asset class / sector / region /
// look-through). Pure SVG.
const COLORS = ["#fb7185", "#38bdf8", "#34d399", "#fbbf24", "#a78bfa", "#f472b6", "#2dd4bf", "#fb923c", "#818cf8", "#a3e635", "#7b86b5"];

export default function AllocationDonut({ slices, max = 8, size = 160 }: { slices: Slice[]; max?: number; size?: number }) {
  if (!slices.length) return null;
  const top = slices.slice(0, max);
  const rest = slices.slice(max);
  const shown: Slice[] = rest.length ? [...top, { name: `Other (${rest.length})`, valueGbp: rest.reduce((x, s) => x + s.valueGbp, 0), pct: rest.reduce((x, s) => x + s.pct, 0), via: [] }] : top;

  const r = size / 2;
  const stroke = size * 0.17;
  const rr = r - stroke / 2;
  const C = 2 * Math.PI * rr;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={r} cy={r} r={rr} fill="none" stroke="#1c2038" strokeWidth={stroke} />
        {shown.map((s, i) => {
          const len = (Math.max(0, s.pct) / 100) * C;
          const el = <circle key={s.name} cx={r} cy={r} r={rr} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={stroke} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <ul className="w-full space-y-1.5 text-sm">
        {shown.map((s, i) => (
          <li key={s.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-ink-200">{s.name}</span>
            <span className="font-mono text-ink-400 text-xs">{fmtGbp(s.valueGbp, { dp: 0 })}</span>
            <span className="w-12 text-right font-mono text-white">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
