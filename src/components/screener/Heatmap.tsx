"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { heatColor, squarify, type Rect } from "@/lib/screener/treemap";
import type { Snapshot } from "@/lib/screener/snapshot";

export interface HeatTile {
  s: Snapshot;
  size: number;
  value: number | null;
  label: string;
}

// A Finviz-style market map: one block per sector, one tile per instrument,
// tile area by size, colour by the chosen value. Tap or hover a tile to inspect it.
export default function Heatmap({
  tiles,
  groupOf,
  span,
  invert = false,
  selected,
  onSelect,
}: {
  tiles: HeatTile[];
  groupOf: (s: Snapshot) => string;
  span: number;
  invert?: boolean;
  selected?: string | null;
  onSelect: (symbol: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const h = w < 640 ? Math.max(560, Math.round(w * 1.55)) : Math.min(700, Math.round(w * 0.56));

  const layout = useMemo(() => {
    if (!w) return [];
    const groups = new Map<string, HeatTile[]>();
    for (const t of tiles) {
      const g = groupOf(t.s);
      groups.set(g, [...(groups.get(g) ?? []), t]);
    }
    const sectors = squarify(
      [...groups].map(([name, ts]) => ({ value: ts.reduce((a, t) => a + t.size, 0), item: { name, ts } })),
      { x: 0, y: 0, w, h },
    );
    return sectors.map(({ item, rect }) => {
      const head = rect.h > 46 && rect.w > 60 ? 16 : 0;
      const inner: Rect = { x: rect.x + 1, y: rect.y + head + 1, w: Math.max(0, rect.w - 2), h: Math.max(0, rect.h - head - 2) };
      return { name: item.name, rect, head, tiles: squarify(item.ts.map((t) => ({ value: t.size, item: t })), inner) };
    });
  }, [tiles, groupOf, w, h]);

  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl bg-ink-950" style={{ height: h || 560 }} role="img" aria-label="Market heatmap">
      {layout.map((g) => (
        <div key={g.name}>
          <div className="pointer-events-none absolute border border-ink-950" style={{ left: g.rect.x, top: g.rect.y, width: g.rect.w, height: g.rect.h }} />
          {g.head > 0 && (
            <div className="pointer-events-none absolute truncate px-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-300" style={{ left: g.rect.x, top: g.rect.y + 2, width: g.rect.w, height: g.head }}>
              {g.name}
            </div>
          )}
          {g.tiles.map(({ item: t, rect: r }) => {
            const big = r.w > 44 && r.h > 26;
            const fs = Math.max(9, Math.min(22, Math.min(r.w / 4.2, r.h / 2.6)));
            const sel = selected === t.s.symbol;
            return (
              <button
                key={t.s.symbol}
                onClick={() => onSelect(t.s.symbol)}
                onMouseEnter={() => onSelect(t.s.symbol)}
                aria-label={`${t.s.i.name}: ${t.label}`}
                className={`absolute flex flex-col items-center justify-center overflow-hidden border border-ink-950/80 text-white transition-[filter] hover:brightness-125 focus:outline-none ${sel ? "z-10 ring-2 ring-white" : ""}`}
                style={{ left: r.x, top: r.y, width: r.w, height: r.h, background: heatColor(t.value, span, invert) }}
              >
                {big && (
                  <>
                    <span className="font-bold leading-none tracking-tight drop-shadow" style={{ fontSize: fs }}>
                      {t.s.symbol}
                    </span>
                    {r.h > 40 && (
                      <span className="num mt-0.5 font-mono leading-none opacity-90 drop-shadow" style={{ fontSize: Math.max(9, fs * 0.62) }}>
                        {t.label}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function HeatLegend({ span, invert, fmt }: { span: number; invert?: boolean; fmt: (v: number) => string }) {
  const steps = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1];
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {steps.map((k) => (
        <span key={k} className="num flex h-6 min-w-[44px] items-center justify-center rounded font-mono text-[10px] font-semibold text-white" style={{ background: heatColor(k * span, span, invert) }}>
          {fmt(k * span)}
        </span>
      ))}
    </div>
  );
}
