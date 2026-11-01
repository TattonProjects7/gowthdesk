"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { COLUMNS, fmtBig, fmtP, fmtX } from "@/lib/screener/columns";
import type { Snapshot } from "@/lib/screener/snapshot";
import { fmtNative } from "@/lib/instruments";

// Extra screener views and tools, Finviz-style: ticker cloud, summary stats,
// side-by-side compare, numbered pages and a column picker.

export function TickerCloud({ rows }: { rows: Snapshot[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-3xl border border-white/[0.07] bg-ink-900/70 p-4 shadow-card">
      {rows.map((s) => (
        <Link
          key={s.symbol}
          href={`/i/${s.symbol}`}
          title={`${s.i.name} ${fmtP(s.change, 2, true)}`}
          className={`num rounded-lg px-2 py-1 font-mono text-xs font-semibold ring-1 ring-inset ${s.change > 0 ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/20" : s.change < 0 ? "bg-rose-500/10 text-rose-200 ring-rose-400/20" : "bg-white/[0.04] text-ink-200 ring-white/10"}`}
        >
          {s.symbol} <span className="opacity-80">{fmtP(s.change, 1, true)}</span>
        </Link>
      ))}
    </div>
  );
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Summary statistics of the screen's results: what kind of shares you've found. */
export function StatsPanel({ rows }: { rows: Snapshot[] }) {
  const st = useMemo(() => {
    const nums = (get: (s: Snapshot) => number | null | undefined) => rows.map(get).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const ch = nums((s) => s.change);
    const sectors = new Map<string, number>();
    for (const s of rows) sectors.set(s.i.sector, (sectors.get(s.i.sector) ?? 0) + 1);
    const best = [...rows].sort((a, b) => (b.perfY ?? -999) - (a.perfY ?? -999))[0];
    const worst = [...rows].sort((a, b) => (a.perfY ?? 999) - (b.perfY ?? 999))[0];
    return {
      n: rows.length,
      up: rows.filter((s) => s.change > 0).length,
      avgChange: ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : 0,
      medPe: median(nums((s) => (s.fund?.pe && s.fund.pe > 0 ? s.fund.pe : null))),
      medDiv: median(nums((s) => s.fund?.dividendYield ?? s.i.dividendYieldPct)),
      medPerfY: median(nums((s) => s.perfY)),
      medRsi: median(nums((s) => s.rsi)),
      medBeta: median(nums((s) => s.beta)),
      cap: rows.reduce((a, s) => a + (s.marketCapUsd ?? 0), 0),
      sectors: [...sectors].sort((a, b) => b[1] - a[1]),
      best,
      worst,
    };
  }, [rows]);
  const tiles: [string, string][] = [
    ["Matches", String(st.n)],
    ["Up today", `${st.up} of ${st.n}`],
    ["Average change", fmtP(st.avgChange, 2, true)],
    ["Total market cap", fmtBig(st.cap, "$")],
    ["Median P/E", fmtX(st.medPe, 1)],
    ["Median dividend", fmtP(st.medDiv)],
    ["Median 1-year return", fmtP(st.medPerfY, 1, true)],
    ["Median RSI", fmtX(st.medRsi, 0)],
    ["Median beta", fmtX(st.medBeta)],
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-[11px] text-ink-400">{k}</p>
            <p className="num mt-1 font-mono text-[15px] font-bold text-white">{v}</p>
          </div>
        ))}
        {st.best && (
          <Link href={`/i/${st.best.symbol}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 hover:border-white/15">
            <p className="text-[11px] text-ink-400">Best over a year</p>
            <p className="num mt-1 font-mono text-[15px] font-bold text-emerald-300">
              {st.best.symbol} {fmtP(st.best.perfY, 1, true)}
            </p>
          </Link>
        )}
      </div>
      <div className="rounded-3xl border border-white/[0.07] bg-ink-900/70 p-4 shadow-card">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Sector mix</p>
        <div className="space-y-1.5">
          {st.sectors.map(([k, n]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="truncate text-ink-300">{k}</span>
              <span className="h-2 overflow-hidden rounded-full bg-ink-800">
                <span className="block h-full rounded-full bg-gradient-to-r from-blue-400 to-sky-400" style={{ width: `${(n / st.n) * 100}%` }} />
              </span>
              <span className="num text-right font-mono text-ink-400">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | "…")[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center justify-center gap-1">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="rounded-lg p-1.5 text-ink-300 hover:bg-white/[0.06] disabled:opacity-30">
        <ChevronLeft className="h-4 w-4" />
      </button>
      {nums.map((n, k) =>
        n === "…" ? (
          <span key={`e${k}`} className="px-1 text-ink-500">
            …
          </span>
        ) : (
          <button key={n} onClick={() => onPage(n)} aria-current={n === page ? "page" : undefined} className={`num min-w-8 rounded-lg px-2 py-1 font-mono text-sm ${n === page ? "bg-white text-ink-950" : "text-ink-300 hover:bg-white/[0.06]"}`}>
            {n}
          </button>
        ),
      )}
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page" className="rounded-lg p-1.5 text-ink-300 hover:bg-white/[0.06] disabled:opacity-30">
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export function ColumnPicker({ value, onChange }: { value: string[]; onChange: (cols: string[]) => void }) {
  const choices = COLUMNS.filter((c) => c.id !== "ticker");
  return (
    <details className="mb-3 rounded-2xl border border-white/[0.07] bg-ink-900/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-white">Choose columns ({value.length})</summary>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {choices.map((c) => (
          <label key={c.id} className="flex items-center gap-2 text-xs text-ink-200">
            <input type="checkbox" checked={value.includes(c.id)} onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((x) => x !== c.id))} className="accent-blue-400" />
            {c.label}
          </label>
        ))}
      </div>
    </details>
  );
}

const COMPARE_ROWS: [string, (s: Snapshot) => string, ((s: Snapshot) => number | null | undefined)?][] = [
  ["Price", (s) => fmtNative(s.price, s.i.currency)],
  ["Today", (s) => fmtP(s.change, 2, true), (s) => s.change],
  ["Market cap", (s) => fmtBig(s.marketCapUsd, "$")],
  ["Sector", (s) => s.i.sector],
  ["P/E", (s) => fmtX(s.fund?.pe, 1)],
  ["Forward P/E", (s) => fmtX(s.fund?.fwdPe, 1)],
  ["Dividend", (s) => fmtP(s.fund?.dividendYield ?? s.i.dividendYieldPct)],
  ["Profit margin", (s) => fmtP(s.fund?.netMargin, 1), (s) => s.fund?.netMargin],
  ["ROE", (s) => fmtP(s.fund?.roe, 1)],
  ["Sales growth", (s) => fmtP(s.fund?.salesGrowth, 1, true), (s) => s.fund?.salesGrowth],
  ["Debt/Eq", (s) => fmtX(s.fund?.debtEq)],
  ["Perf month", (s) => fmtP(s.perfM, 1, true), (s) => s.perfM],
  ["Perf YTD", (s) => fmtP(s.perfYtd, 1, true), (s) => s.perfYtd],
  ["Perf year", (s) => fmtP(s.perfY, 1, true), (s) => s.perfY],
  ["Volatility (month)", (s) => fmtP(s.volM)],
  ["Beta", (s) => fmtX(s.beta)],
  ["RSI", (s) => s.rsi.toFixed(0)],
  ["52W high", (s) => fmtP(s.fromHigh52, 1), (s) => s.fromHigh52],
  ["Pattern", (s) => s.pattern?.label ?? "—"],
];

const LINE_COLOURS = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];

/** Side-by-side comparison of up to five shares, with their six-month paths rebased to 100. */
export function CompareSheet({ rows, onClose }: { rows: Snapshot[]; onClose: () => void }) {
  const W = 640;
  const H = 180;
  const series = rows.map((s) => {
    const cut = s.bars[s.bars.length - 1].t - 182 * 86400_000;
    const pts = s.bars.filter((b) => b.t >= cut).map((b) => b.c);
    return pts.map((p) => (p / pts[0]) * 100);
  });
  const all = series.flat();
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const y = (v: number) => H - 6 - ((v - lo) / (hi - lo || 1)) * (H - 12);
  return (
    <div role="dialog" aria-modal="true" aria-label="Compare" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="sheet-up max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 p-4 shadow-card sm:rounded-3xl sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Compare</h2>
          <button onClick={onClose} aria-label="Close compare" className="rounded-full p-1.5 text-ink-400 hover:bg-white/[0.06] hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-1 text-xs text-ink-400">Six months, rebased to 100</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="mb-2 w-full" role="img" aria-label="Six-month performance comparison">
          <line x1={0} x2={W} y1={y(100)} y2={y(100)} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
          {series.map((pts, k) => (
            <path key={rows[k].symbol} d={pts.map((v, j) => `${j ? "L" : "M"}${((j / (pts.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke={LINE_COLOURS[k]} strokeWidth={2} />
          ))}
        </svg>
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {rows.map((s, k) => (
            <span key={s.symbol} className="flex items-center gap-1.5 text-ink-200">
              <span className="inline-block h-2 w-4 rounded-full" style={{ background: LINE_COLOURS[k] }} />
              {s.symbol} <span className={`num font-mono ${series[k][series[k].length - 1] >= 100 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(series[k][series[k].length - 1] - 100, 1, true)}</span>
            </span>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th scope="col" className="py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  &nbsp;
                </th>
                {rows.map((s) => (
                  <th key={s.symbol} scope="col" className="py-2 text-right">
                    <Link href={`/i/${s.symbol}`} className="inline-flex items-center gap-1.5 font-bold text-white hover:underline">
                      <Avatar symbol={s.symbol} size={20} /> {s.symbol}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map(([label, fmt, num]) => (
                <tr key={label} className="border-b border-white/[0.04] last:border-0">
                  <th scope="row" className="py-1.5 text-left text-xs font-medium text-ink-400">
                    {label}
                  </th>
                  {rows.map((s) => {
                    const n = num?.(s);
                    return (
                      <td key={s.symbol} className={`num py-1.5 text-right font-mono text-xs ${typeof n === "number" ? (n > 0 ? "text-emerald-300" : n < 0 ? "text-rose-300" : "text-ink-200") : "text-ink-200"}`}>
                        {fmt(s)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
