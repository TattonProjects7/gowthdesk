"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowUpRight, Columns2, Grid2x2, Square } from "lucide-react";
import Nav from "@/components/Nav";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import CandleChart, { type ChartOptions } from "@/components/charts/CandleChart";
import AdSlot from "@/components/ads/AdSlot";
import { Segmented } from "@/components/ui";
import { useMarket } from "@/lib/useMarket";
import { aggregateBars } from "@/lib/bars";
import { INSTRUMENTS, getInstrument, fmtNative } from "@/lib/instruments";

type Layout = "1" | "2" | "4";
type Tf = "d" | "w" | "m";

const DEFAULTS = ["VUSA", "AAPL", "NVDA", "LLOY"];
const TF: { id: Tf; label: string; days: number; visible: number; period: "D" | "W" | "M" }[] = [
  { id: "d", label: "Daily", days: 400, visible: 130, period: "D" },
  { id: "w", label: "Weekly", days: 1100, visible: 104, period: "W" },
  { id: "m", label: "Monthly", days: 1100, visible: 36, period: "M" },
];
const IND: { id: keyof ChartOptions; label: string }[] = [
  { id: "sma20", label: "SMA 20" },
  { id: "sma50", label: "SMA 50" },
  { id: "sma200", label: "SMA 200" },
  { id: "trendlines", label: "Trendlines" },
  { id: "volume", label: "Volume" },
];

// Multi-layout charts: one, two or four instruments side by side, each with
// candles, volume, moving averages and auto-drawn trendlines. Everything lives
// in the URL, so a layout can be bookmarked or shared.
export default function ChartsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { mounted, source, barsFor, priceFor } = useMarket();

  const layout = (["1", "2", "4"].includes(params.get("l") ?? "") ? params.get("l") : "4") as Layout;
  const tf = (["d", "w", "m"].includes(params.get("tf") ?? "") ? params.get("tf") : "d") as Tf;
  const given = (params.get("s") ?? "").split(",").filter((s) => getInstrument(s));
  const symbols = [...given, ...DEFAULTS.filter((d) => !given.includes(d))].slice(0, Number(layout));
  const off = new Set((params.get("off") ?? "").split(","));
  const opts: ChartOptions = { sma20: !off.has("sma20"), sma50: !off.has("sma50"), sma200: !off.has("sma200"), trendlines: !off.has("trendlines"), volume: !off.has("volume") };
  const tfDef = TF.find((t) => t.id === tf)!;

  const push = (next: { l?: string; tf?: string; s?: string[]; off?: string[] }) => {
    const p = new URLSearchParams();
    p.set("l", next.l ?? layout);
    p.set("tf", next.tf ?? tf);
    p.set("s", (next.s ?? symbols).join(","));
    const o = next.off ?? [...off].filter(Boolean);
    if (o.length) p.set("off", o.join(","));
    router.replace(`/charts?${p.toString()}`, { scroll: false });
  };

  const height = layout === "1" ? 460 : layout === "2" ? 400 : 300;
  const options = useMemo(() => [...INSTRUMENTS].sort((a, b) => a.symbol.localeCompare(b.symbol)), []);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Charts</h1>
            <p className="mt-1 text-sm text-ink-400">Compare up to four charts at once, with trendlines drawn for you.</p>
          </div>
          <DataBadges source={source} />
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1" role="group" aria-label="Layout">
            {(
              [
                ["1", Square, "One chart"],
                ["2", Columns2, "Two charts"],
                ["4", Grid2x2, "Four charts"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button key={id} onClick={() => push({ l: id })} aria-label={label} aria-pressed={layout === id} className={`rounded-full p-1.5 ${layout === id ? "bg-white text-ink-950" : "text-ink-400 hover:text-white"}`}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <Segmented size="sm" value={tf} onChange={(v) => push({ tf: v })} options={TF.map((t) => ({ id: t.id, label: t.label }))} />
          <div className="flex flex-wrap gap-1">
            {IND.map((d) => (
              <button
                key={d.id}
                aria-pressed={opts[d.id]}
                onClick={() => push({ off: opts[d.id] ? [...[...off].filter(Boolean), d.id] : [...off].filter((x) => x && x !== d.id) })}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${opts[d.id] ? "bg-white/[0.08] text-white ring-white/15" : "text-ink-500 ring-white/[0.06]"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid gap-3 ${layout === "1" ? "grid-cols-1" : layout === "2" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
          {symbols.map((sym, k) => {
            const i = getInstrument(sym)!;
            const daily = mounted ? barsFor(sym, tfDef.days) : [];
            const bars = tf === "d" ? daily : aggregateBars(daily, tfDef.period as "W" | "M");
            const price = mounted ? priceFor(sym) : 0;
            const prev = daily[daily.length - 2]?.c;
            const chg = prev ? (price / prev - 1) * 100 : 0;
            return (
              <div key={`${k}:${sym}`} className="min-w-0 rounded-3xl border border-white/[0.07] bg-ink-900/70 p-3 shadow-card">
                <div className="mb-1.5 flex items-center gap-2">
                  <label className="sr-only" htmlFor={`sym-${k}`}>
                    Chart {k + 1} instrument
                  </label>
                  <select
                    id={`sym-${k}`}
                    value={sym}
                    onChange={(e) => push({ s: symbols.map((s, j) => (j === k ? e.target.value : s)) })}
                    className="max-w-[9.5rem] rounded-lg border border-white/10 bg-ink-950/60 px-2 py-1 text-sm font-bold text-white focus:outline-none"
                  >
                    {options.map((o) => (
                      <option key={o.symbol} value={o.symbol}>
                        {o.symbol} — {o.name}
                      </option>
                    ))}
                  </select>
                  <span className="hidden truncate text-xs text-ink-400 sm:inline">{i.name}</span>
                  <span className="ml-auto text-right">
                    <span className="num block font-mono text-sm text-white">{mounted ? fmtNative(price, i.currency) : "…"}</span>
                    <span className={`num block font-mono text-[11px] ${chg >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {chg >= 0 ? "+" : ""}
                      {chg.toFixed(2)}%
                    </span>
                  </span>
                  <Link href={`/i/${sym}`} aria-label={`Open ${sym}`} className="rounded-lg p-1 text-ink-400 hover:bg-white/[0.06] hover:text-white">
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                {mounted ? <CandleChart bars={bars} visible={tfDef.visible} height={height} opts={opts} period={tfDef.period} /> : <div className="skeleton rounded-2xl" style={{ height }} />}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-500">
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-violet-400 align-middle" />
            SMA 20
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-sky-400 align-middle" />
            SMA 50
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-amber-500 align-middle" />
            SMA 200
          </span>
          <span>Dashed lines: auto-detected pattern. Hover or drag across a chart to read each bar.</span>
        </div>
        <AdSlot placement="charts-bottom" />
      </main>
    </div>
  );
}
