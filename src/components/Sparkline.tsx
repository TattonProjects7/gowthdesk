"use client";

// A tiny inline price chart from a series of closes (real or simulated).
export default function Sparkline({
  points,
  width = 120,
  height = 34,
  stroke = "#fb7185",
}: {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!points || points.length < 2) return <svg width={width} height={height} aria-hidden />;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);

  const d = points
    .map((p, i) => {
      const x = i * stepX;
      const y = height - ((p - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const up = points[points.length - 1] >= points[0];

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={up ? stroke : "#34d399"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
