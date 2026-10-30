"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import Heatmap, { HeatLegend, type HeatTile } from "@/components/screener/Heatmap";
import MiniCandles from "@/components/screener/MiniCandles";
import { Card, Empty, Segmented } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { usePortfolio } from "@/lib/portfolioStore";
import { useWatchlists } from "@/lib/watchlists";
import { useBroker, useMode } from "@/lib/broker/client";
import { fmtNative } from "@/lib/instruments";
import { fmtBig, fmtP } from "@/lib/screener/columns";
import type { Snapshot } from "@/lib/screener/snapshot";

type Universe = "us" | "uk" | "all" | "etf" | "crypto" | "mine" | "watch";
type Frame = "1d" | "1w" | "1m" | "3m" | "6m" | "ytd" | "1y";
type ColourBy = "perf" | "relvol" | "pe" | "div" | "rsi" | "high";
type SizeBy = "cap" | "equal";

const UNIVERSES: { id: Universe; label: string }[] = [
  { id: "us", label: "US" },
  { id: "uk", label: "UK" },
  { id: "all", label: "All shares" },
  { id: "etf", label: "ETFs" },
  { id: "crypto", label: "Crypto" },
  { id: "mine", label: "My portfolio" },
  { id: "watch", label: "Watchlist" },
];

const FRAMES: { id: Frame; label: string; get: (s: Snapshot) => number | null; span: number }[] = [
  { id: "1d", label: "1D", get: (s) => s.change, span: 3 },
  { id: "1w", label: "1W", get: (s) => s.perfW, span: 6 },
  { id: "1m", label: "1M", get: (s) => s.perfM, span: 10 },
  { id: "3m", label: "3M", get: (s) => s.perfQ, span: 15 },
  { id: "6m", label: "6M", get: (s) => s.perfH, span: 20 },
  { id: "ytd", label: "YTD", get: (s) => s.perfYtd, span: 25 },
  { id: "1y", label: "1Y", get: (s) => s.perfY, span: 30 },
];

// Every colouring is expressed as "distance from neutral", so one diverging scale serves all.
const COLOURS: { id: ColourBy; label: string; help: string }[] = [
  { id: "perf", label: "Performance", help: "Green rose, red fell, over the period you pick." },
  { id: "relvol", label: "Relative volume", help: "Green is busier than usual for this time of day." },
  { id: "pe", label: "P/E (value)", help: "Green is cheaper than a P/E of 20, red dearer. Grey has no profit." },
  { id: "div", label: "Dividend yield", help: "Brighter green pays a higher yield." },
  { id: "rsi", label: "RSI momentum", help: "Green has strong momentum, red is weak. Extremes may be overbought or oversold." },
  { id: "high", label: "Near 52-week high", help: "Green is close to its yearly high, red far below it." },
];

export default function Maps() {
  const { mounted, source, fund, coverage, snaps } = useScreener();
  const [uni, setUni] = useState<Universe>("us");
  const [frame, setFrame] = useState<Frame>("1d");
  const [colour, setColour] = useState<ColourBy>("perf");
  const [sizeBy, setSizeBy] = useState<SizeBy>("cap");
  const [sel, setSel] = useState<string | null>(null);

  const portfolio = usePortfolio();
  const lists = useWatchlists();
  const mode = useMode();
  const { account } = useBroker();

  // What you own, sized by position value (real broker positions in real mode).
  const owned = useMemo(() => {
    const m = new Map<string, number>();
    if (mode === "real" && account) {
      for (const p of account.positions) if (p.symbol) m.set(p.symbol, (m.get(p.symbol) ?? 0) + p.quantity);
    } else {
      for (const h of portfolio.holdings ?? []) m.set(h.symbol, (m.get(h.symbol) ?? 0) + h.qty);
    }
    return m;
  }, [mode, account, portfolio.holdings]);

  const f = FRAMES.find((x) => x.id === frame)!;

  const tiles: HeatTile[] = useMemo(() => {
    const watch = new Set(lists.flatMap((l) => l.symbols));
    const pick = snaps.filter((s) => {
      switch (uni) {
        case "us":
          return s.i.type === "stock" && s.i.exchange !== "LSE";
        case "uk":
          return s.i.type === "stock" && s.i.exchange === "LSE";
        case "all":
          return s.i.type === "stock";
        case "etf":
          return s.i.type === "etf";
        case "crypto":
          return s.i.type === "crypto";
        case "mine":
          return owned.has(s.symbol);
        case "watch":
          return watch.has(s.symbol);
      }
    });
    return pick.map((s) => {
      let value: number | null;
      let label: string;
      switch (colour) {
        case "relvol":
          value = s.relVolume - 1;
          label = `${s.relVolume.toFixed(2)}×`;
          break;
        case "pe":
          value = s.fund?.pe ? 20 - s.fund.pe : null;
          label = s.fund?.pe ? s.fund.pe.toFixed(1) : "—";
          break;
        case "div": {
          const y = s.fund?.dividendYield ?? s.i.dividendYieldPct;
          value = y ? y : -0.0001;
          label = fmtP(y, 1);
          break;
        }
        case "rsi":
          value = s.rsi - 50;
          label = s.rsi.toFixed(0);
          break;
        case "high":
          value = s.fromHigh52 + 10;
          label = fmtP(s.fromHigh52, 1);
          break;
        default:
          value = f.get(s);
          label = fmtP(value, 2, true);
      }
      const size = uni === "mine" ? (owned.get(s.symbol) ?? 0) * s.priceUsd : sizeBy === "equal" || !s.marketCapUsd ? 1 : s.marketCapUsd;
      return { s, size, value, label };
    });
  }, [snaps, uni, colour, sizeBy, f, owned, lists]);

  const span = colour === "perf" ? f.span : colour === "relvol" ? 1.5 : colour === "pe" ? 15 : colour === "div" ? 6 : colour === "rsi" ? 25 : 12;
  const legendFmt = (v: number) =>
    colour === "perf" ? `${v > 0 ? "+" : ""}${v.toFixed(Math.abs(v) < 10 ? 1 : 0)}%` : colour === "relvol" ? `${(v + 1).toFixed(1)}×` : colour === "pe" ? (20 - v).toFixed(0) : colour === "div" ? `${Math.max(0, v).toFixed(0)}%` : colour === "rsi" ? (v + 50).toFixed(0) : `${(v - 10).toFixed(0)}%`;

  const groupOf = useCallback((s: Snapshot) => (uni === "etf" || uni === "crypto" ? (s.i.type === "etf" ? s.i.assetClass : "Crypto") : s.i.type === "stock" ? s.i.sector : s.i.type === "etf" ? "ETFs" : "Crypto"), [uni]);

  // Default the side panel to the biggest mover in view.
  const selected = useMemo(() => {
    const inView = tiles.find((t) => t.s.symbol === sel)?.s;
    if (inView) return inView;
    return [...tiles].sort((a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0))[0]?.s ?? null;
  }, [tiles, sel]);

  // Sector averages (cap-weighted) for the strip under the map.
  const sectors = useMemo(() => {
    const m = new Map<string, { w: number; v: number; n: number; up: number }>();
    for (const t of tiles) {
      const g = groupOf(t.s);
      const v = f.get(t.s);
      if (v == null) continue;
      const e = m.get(g) ?? { w: 0, v: 0, n: 0, up: 0 };
      e.w += t.size;
      e.v += v * t.size;
      e.n += 1;
      e.up += v > 0 ? 1 : 0;
      m.set(g, e);
    }
    return [...m].map(([name, e]) => ({ name, avg: e.w ? e.v / e.w : 0, n: e.n, up: e.up })).sort((a, b) => b.avg - a.avg);
  }, [tiles, f, groupOf]);

  const up = tiles.filter((t) => (f.get(t.s) ?? 0) > 0).length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Heatmap</h1>
            <p className="mt-1 text-sm text-ink-400">The whole market at a glance: size is company value, colour is {COLOURS.find((c) => c.id === colour)?.label.toLowerCase()}.</p>
          </div>
          <DataBadges source={source} fund={colour === "pe" || colour === "div" ? fund : undefined} coverage={coverage} />
        </div>

        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Segmented size="sm" value={uni} onChange={(v) => (setUni(v), setSel(null))} options={UNIVERSES} />
          <div className="flex flex-wrap items-center gap-2">
            {colour === "perf" && <Segmented size="sm" value={frame} onChange={setFrame} options={FRAMES.map((x) => ({ id: x.id, label: x.label }))} />}
            <label className="sr-only" htmlFor="colour">
              Colour by
            </label>
            <select id="colour" value={colour} onChange={(e) => setColour(e.target.value as ColourBy)} className="rounded-full border border-white/10 bg-ink-950/60 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none">
              {COLOURS.map((c) => (
                <option key={c.id} value={c.id}>
                  Colour: {c.label}
                </option>
              ))}
            </select>
            {uni !== "mine" && (
              <>
                <label className="sr-only" htmlFor="size">
                  Size by
                </label>
                <select id="size" value={sizeBy} onChange={(e) => setSizeBy(e.target.value as SizeBy)} className="rounded-full border border-white/10 bg-ink-950/60 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none">
                  <option value="cap">Size: Market cap</option>
                  <option value="equal">Size: Equal</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="min-w-0">
            {!mounted ? (
              <div className="skeleton h-[560px] rounded-2xl" />
            ) : tiles.length === 0 ? (
              <Empty icon={LayoutGrid} title={uni === "mine" ? "You don't own anything yet" : "Nothing on your watchlist"} body={uni === "mine" ? "Buy a share or fund in demo mode and it'll appear here, sized by how much you hold." : "Add shares to a watchlist and see them mapped here."} cta={{ href: "/markets", label: "Browse markets" }} />
            ) : (
              <Heatmap tiles={tiles} groupOf={groupOf} span={span} selected={selected?.symbol} onSelect={setSel} />
            )}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <HeatLegend span={span} fmt={legendFmt} />
              <p className="text-xs text-ink-400">{COLOURS.find((c) => c.id === colour)?.help}</p>
            </div>
          </div>

          <aside className="space-y-3">
            {selected && <Inspector s={selected} />}
            <Card className="!p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Breadth · {f.label}</p>
              <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-ink-800">
                <div className="bg-emerald-500" style={{ width: `${tiles.length ? (up / tiles.length) * 100 : 0}%` }} />
                <div className="bg-rose-500" style={{ width: `${tiles.length ? ((tiles.length - up) / tiles.length) * 100 : 0}%` }} />
              </div>
              <p className="mt-1.5 flex justify-between text-xs">
                <span className="text-emerald-300">{up} up</span>
                <span className="text-rose-300">{tiles.length - up} down</span>
              </p>
              <div className="mt-3 space-y-1">
                {sectors.slice(0, 11).map((g) => (
                  <div key={g.name} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-ink-300">{g.name}</span>
                    <span className={`num font-mono ${g.avg >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(g.avg, 2, true)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Inspector({ s }: { s: Snapshot }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2.5">
        <Avatar symbol={s.symbol} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{s.i.name}</p>
          <p className="truncate text-xs text-ink-400">{s.i.industry ?? s.i.sector}</p>
        </div>
        <div className="text-right">
          <p className="num font-mono text-sm text-white">{fmtNative(s.price, s.i.currency)}</p>
          <p className={`num font-mono text-xs ${s.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(s.change, 2, true)}</p>
        </div>
      </div>
      <div className="mt-2">
        <MiniCandles bars={s.bars} pattern={s.pattern} level={s.srLevel} height={96} count={50} />
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1.5 text-[11px]">
        {[
          ["Week", fmtP(s.perfW, 1, true), s.perfW],
          ["Month", fmtP(s.perfM, 1, true), s.perfM],
          ["Year", fmtP(s.perfY, 1, true), s.perfY],
          ["Mkt cap", fmtBig(s.marketCapUsd, "$"), null],
          ["P/E", s.fund?.pe ? s.fund.pe.toFixed(1) : "—", null],
          ["RSI", s.rsi.toFixed(0), null],
        ].map(([k, v, n]) => (
          <div key={k as string}>
            <dt className="text-ink-500">{k}</dt>
            <dd className={`num font-mono ${typeof n === "number" ? (n >= 0 ? "text-emerald-300" : "text-rose-300") : "text-ink-200"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <Link href={`/i/${s.symbol}`} className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2 text-sm font-semibold text-white hover:bg-white/10">
        Open {s.symbol} <ArrowUpRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
