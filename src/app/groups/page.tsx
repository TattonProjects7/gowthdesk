"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import Nav from "@/components/Nav";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import { Card, Segmented } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { fmtBig, fmtP, fmtX } from "@/lib/screener/columns";
import { INDEX_LABEL, type IndexCode } from "@/lib/universe";
import type { Snapshot } from "@/lib/screener/snapshot";

type GroupBy = "sector" | "industry" | "country" | "cap" | "index";
type Period = "change" | "perfW" | "perfM" | "perfQ" | "perfH" | "perfYtd" | "perfY";

const GROUP_BY: { id: GroupBy; label: string }[] = [
  { id: "sector", label: "Sector" },
  { id: "industry", label: "Industry" },
  { id: "country", label: "Country" },
  { id: "cap", label: "Size" },
  { id: "index", label: "Index" },
];

const PERIODS: { id: Period; label: string }[] = [
  { id: "change", label: "Today" },
  { id: "perfW", label: "Week" },
  { id: "perfM", label: "Month" },
  { id: "perfQ", label: "Quarter" },
  { id: "perfH", label: "Half" },
  { id: "perfYtd", label: "YTD" },
  { id: "perfY", label: "Year" },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function capBucket(s: Snapshot): { name: string; token: string } {
  const c = s.marketCapUsd ?? 0;
  if (c > 200e9) return { name: "Mega (over $200bn)", token: "cap:mega" };
  if (c > 10e9) return { name: "Large ($10bn–$200bn)", token: "cap:large" };
  if (c > 2e9) return { name: "Mid ($2bn–$10bn)", token: "cap:mid" };
  return { name: "Small (under $2bn)", token: "cap:small" };
}

// Each stock belongs to one or more groups; each group links to the screener filtered to it.
function groupsOf(s: Snapshot, by: GroupBy): { name: string; token: string }[] {
  switch (by) {
    case "sector":
      return [{ name: s.i.sector, token: `sector:${slug(s.i.sector)}` }];
    case "industry":
      return s.i.industry ? [{ name: s.i.industry, token: `ind:${slug(s.i.industry)}` }] : [];
    case "country": {
      if (s.i.region === "UK") return [{ name: "United Kingdom", token: "geo:uk" }];
      if (s.i.region === "Europe") return [{ name: "Europe (ex-UK)", token: "geo:europe" }];
      if (s.i.country) return [{ name: s.i.country, token: "geo:foreign" }];
      return [{ name: "USA", token: "geo:us" }];
    }
    case "cap":
      return [capBucket(s)];
    case "index":
      return (s.i.indices ?? []).map((k: IndexCode) => ({ name: INDEX_LABEL[k], token: `idx:${k.toLowerCase()}` }));
  }
}

interface Row {
  name: string;
  token: string;
  n: number;
  cap: number;
  pe: number | null;
  fpe: number | null;
  div: number;
  perf: Record<Period, number>;
  relVol: number;
  up: number;
  best: Snapshot;
  worst: Snapshot;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function Groups() {
  const { mounted, source, fund, coverage, snaps } = useScreener();
  const [by, setBy] = useState<GroupBy>("sector");
  const [period, setPeriod] = useState<Period>("change");
  const [table, setTable] = useState<"performance" | "valuation">("performance");

  const rows = useMemo(() => {
    const m = new Map<string, { token: string; ss: Snapshot[] }>();
    for (const s of snaps) {
      if (s.i.type !== "stock") continue;
      for (const g of groupsOf(s, by)) {
        const e = m.get(g.name) ?? { token: g.token, ss: [] };
        e.ss.push(s);
        m.set(g.name, e);
      }
    }
    const out: Row[] = [];
    for (const [name, { token, ss }] of m) {
      const cap = ss.reduce((a, s) => a + (s.marketCapUsd ?? 0), 0) || 1;
      // Cap-weighted performance, as index providers compute it.
      const w = (get: (s: Snapshot) => number | null) => ss.reduce((a, s) => a + (get(s) ?? 0) * (s.marketCapUsd ?? 0), 0) / cap;
      const perf = Object.fromEntries(PERIODS.map((p) => [p.id, w((s) => s[p.id] as number | null)])) as Record<Period, number>;
      const byPerf = [...ss].sort((a, b) => ((b[period] as number) ?? 0) - ((a[period] as number) ?? 0));
      out.push({
        name,
        token,
        n: ss.length,
        cap,
        pe: median(ss.map((s) => s.fund?.pe).filter((x): x is number => x != null && x > 0)),
        fpe: median(ss.map((s) => s.fund?.fwdPe).filter((x): x is number => x != null && x > 0)),
        div: w((s) => s.fund?.dividendYield ?? s.i.dividendYieldPct),
        perf,
        relVol: ss.reduce((a, s) => a + s.relVolume, 0) / ss.length,
        up: ss.filter((s) => s.change > 0).length,
        best: byPerf[0],
        worst: byPerf[byPerf.length - 1],
      });
    }
    return out.sort((a, b) => b.perf[period] - a.perf[period]);
  }, [snaps, by, period]);

  const maxAbs = Math.max(0.5, ...rows.map((r) => Math.abs(r.perf[period])));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Groups</h1>
            <p className="mt-1 text-sm text-ink-400">Which parts of the market are leading and lagging. Tap a group to screen it.</p>
          </div>
          <DataBadges source={source} fund={table === "valuation" ? fund : undefined} coverage={coverage} />
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmented size="sm" value={by} onChange={setBy} options={GROUP_BY} />
          <Segmented size="sm" value={period} onChange={setPeriod} options={PERIODS} />
        </div>

        <Card>
          {!mounted ? (
            <div className="skeleton h-80 rounded-2xl" />
          ) : (
            <ul className="space-y-1.5">
              {rows.slice(0, by === "industry" ? 40 : 20).map((r) => {
                const v = r.perf[period];
                const pct = (Math.abs(v) / maxAbs) * 50;
                return (
                  <li key={r.name}>
                    <Link href={`/screener?f=${encodeURIComponent(r.token)}`} className="group grid grid-cols-[minmax(0,9rem)_1fr_4.5rem] items-center gap-3 rounded-xl px-1 py-1 hover:bg-white/[0.03] sm:grid-cols-[14rem_1fr_5rem]">
                      <span className="truncate text-sm text-ink-200 group-hover:text-white">
                        {r.name} <span className="text-xs text-ink-500">{r.n}</span>
                      </span>
                      <span className="relative h-5">
                        <span className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                        <span className={`absolute inset-y-0.5 rounded ${v >= 0 ? "left-1/2 bg-gradient-to-r from-emerald-500/80 to-emerald-400" : "right-1/2 bg-gradient-to-l from-rose-500/80 to-rose-400"}`} style={{ width: `${pct}%` }} />
                      </span>
                      <span className={`num text-right font-mono text-sm ${v >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(v, 2, true)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="mb-3 mt-8 flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-400">Group table</h2>
          <Segmented size="sm" value={table} onChange={setTable} options={[{ id: "performance", label: "Performance" }, { id: "valuation", label: "Valuation" }]} />
        </div>
        <div className="overflow-x-auto rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-ink-400">
                <th scope="col" className="sticky left-0 z-10 bg-ink-900 px-3 py-2.5 text-left font-semibold">
                  Name
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Stocks
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Market cap
                </th>
                {table === "performance" ? (
                  <>
                    {PERIODS.map((p) => (
                      <th key={p.id} scope="col" className="px-3 py-2.5 text-right font-semibold">
                        {p.label}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Up/down
                    </th>
                  </>
                ) : (
                  <>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      P/E (median)
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Fwd P/E
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Dividend
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Rel volume
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-left font-semibold">
                      Best / worst
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03]">
                  <td className="sticky left-0 z-10 max-w-[200px] truncate bg-ink-900 px-3 py-2">
                    <Link href={`/screener?f=${encodeURIComponent(r.token)}`} className="inline-flex items-center gap-1 font-semibold text-white hover:underline">
                      {r.name} <ArrowRight className="h-3 w-3 text-ink-500" />
                    </Link>
                  </td>
                  <td className="num px-3 py-2 text-right font-mono text-ink-300">{r.n}</td>
                  <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtBig(r.cap, "$")}</td>
                  {table === "performance" ? (
                    <>
                      {PERIODS.map((p) => (
                        <td key={p.id} className={`num px-3 py-2 text-right font-mono ${r.perf[p.id] >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                          {fmtP(r.perf[p.id], 2, true)}
                        </td>
                      ))}
                      <td className="num px-3 py-2 text-right font-mono text-ink-300">
                        <span className="text-emerald-300">{r.up}</span>/<span className="text-rose-300">{r.n - r.up}</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtX(r.pe, 1)}</td>
                      <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtX(r.fpe, 1)}</td>
                      <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtP(r.div)}</td>
                      <td className="num px-3 py-2 text-right font-mono text-ink-200">{r.relVol.toFixed(2)}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        <Link href={`/i/${r.best.symbol}`} className="text-emerald-300 hover:underline">
                          {r.best.symbol}
                        </Link>
                        <span className="text-ink-600"> / </span>
                        <Link href={`/i/${r.worst.symbol}`} className="text-rose-300 hover:underline">
                          {r.worst.symbol}
                        </Link>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
