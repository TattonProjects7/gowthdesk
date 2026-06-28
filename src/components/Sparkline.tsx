"use client";

import { priceAt } from "@/lib/market";

const DAY = 86400_000;

// A tiny inline price chart sampled from the simulated engine.
export default function Sparkline({
  symbol,
  now,
  days = 30,
  width = 120,
  height = 34,
  stroke = "#fb7185",
}: {
  symbol: string;
  now: number;
  days?: number;
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const pts: number[] = [];
  for (let i = days - 1; i >= 0; i--) pts.push(priceAt(symbol, now - i * DAY));
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1);

  const d = pts
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = pts[pts.length - 1] >= pts[0];

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={up ? stroke : "#34d399"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
