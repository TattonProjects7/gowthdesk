"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Flame, Globe, Radar, Search } from "lucide-react";
import Nav from "@/components/Nav";
import InstrumentRow, { ChangePill } from "@/components/InstrumentRow";
import Avatar from "@/components/Avatar";
import { Card, H2, Pill, Segmented } from "@/components/ui";
import { useMarket } from "@/lib/useMarket";
import { INSTRUMENTS, MARKET_TABS, instrumentsFor, searchInstruments, fmtNative, type Instrument, type MarketTab } from "@/lib/instruments";
import { upcomingEvents, fmtEventDate } from "@/lib/events";
import { gbpUsd } from "@/lib/fx";

// Markets — interactive investor's risers & fallers across UK, US and
// international markets, IG's instrument browse and a quick quote search that
// works without signing in.
export default function Markets() {
  const { mounted, source, now, priceFor, closesFor } = useMarket();
  const [tab, setTab] = useState<MarketTab>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"name" | "risers" | "fallers">("name");

  const rows = useMemo(() => {
    if (!mounted) return [];
    const list = (q.trim() ? searchInstruments(q, 50) : instrumentsFor(tab)).map((i) => {
      const closes = closesFor(i.symbol);
      const price = priceFor(i.symbol);
      const prev = closes[closes.length - 2] || price;
      return { i, price, closes, chg: prev ? (price / prev - 1) * 100 : 0 };
    });
    if (sort === "risers") list.sort((a, b) => b.chg - a.chg);
    else if (sort === "fallers") list.sort((a, b) => a.chg - b.chg);
    return list;
  }, [mounted, q, tab, sort, priceFor, closesFor]);

  const movers = useMemo(() => {
    if (!mounted) return { up: [], down: [] };
    const all = INSTRUMENTS.map((i) => {
      const closes = closesFor(i.symbol);
      const price = priceFor(i.symbol);
      const prev = closes[closes.length - 2] || price;
      return { i, price, chg: prev ? (price / prev - 1) * 100 : 0 };
    }).sort((a, b) => b.chg - a.chg);
    return { up: all.slice(0, 4), down: all.slice(-4).reverse() };
  }, [mounted, priceFor, closesFor]);

  const events = useMemo(() => (mounted ? upcomingEvents(now, 21).slice(0, 6) : []), [mounted, now]);

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-5 sm:py-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="h-6 w-6 text-rose-400" /> Markets
          </h1>
          <span className={`ml-auto rounded-full border px-2.5 py-1 text-xs font-semibold ${source === "live" ? "border-emerald-800 bg-emerald-950 text-emerald-300" : "border-ink-700 bg-ink-800 text-ink-400"}`}>
            {source === "live" ? "LIVE data" : source === "loading" ? "…" : "SIM data"}
          </span>
          {mounted && <span className="text-xs text-ink-500 font-mono">GBP/USD {gbpUsd(now).toFixed(4)}</span>}
        </div>

        {/* Quick quote */}
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Quick quote — search shares, ETFs or crypto (e.g. Lloyds, VUSA, BTC)"
            className="w-full rounded-2xl border border-ink-700 bg-ink-900 pl-10 pr-3 py-3 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
          />
        </div>

        {!q && (
          <>
            {/* Movers — swipeable cards with logos */}
            <MoverStrip title="Top risers today" tone="up" rows={movers.up} />
            <MoverStrip title="Top fallers today" tone="down" rows={movers.down} />

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <Segmented options={MARKET_TABS} value={tab} onChange={setTab} />
              <Segmented size="sm" value={sort} onChange={setSort} options={[{ id: "name", label: "A–Z" }, { id: "risers", label: "Risers" }, { id: "fallers", label: "Fallers" }]} />
            </div>
          </>
        )}

        <div className="space-y-2">
          {!mounted && Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[62px] rounded-xl border border-ink-800 bg-ink-900 animate-pulse" />)}
          {mounted && rows.length === 0 && <p className="py-8 text-center text-sm text-ink-500">Nothing matches “{q}”.</p>}
          {mounted && rows.map((r, idx) => <InstrumentRow key={r.i.symbol} i={r.i} price={r.price} closes={r.closes} rank={sort === "name" ? undefined : idx + 1} />)}
        </div>

        {!q && (
          <>
            <H2
              right={
                <Link href="/scan" className="inline-flex items-center gap-1 text-xs text-rose-400 hover:underline">
                  <Radar className="h-3.5 w-3.5" /> Short scanner
                </Link>
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Coming up
              </span>
            </H2>
            <Card>
              <ul className="divide-y divide-ink-800">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="w-20 shrink-0 text-xs text-ink-400">{fmtEventDate(e.date)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        {e.symbol ? (
                          <Link href={`/i/${e.symbol}`} className="hover:underline">
                            {e.title}
                          </Link>
                        ) : (
                          e.title
                        )}
                      </p>
                      <p className="text-xs text-ink-500">{e.detail}</p>
                    </div>
                    <Pill tone={e.impact === "high" ? "rose" : e.impact === "medium" ? "amber" : "ink"}>{e.impact === "high" ? <Flame className="h-3 w-3 inline" /> : null} {e.impact}</Pill>
                  </li>
                ))}
                {mounted && events.length === 0 && <li className="py-3 text-sm text-ink-500">No scheduled events in the next three weeks.</li>}
              </ul>
            </Card>
          </>
        )}

        <p className="mt-10 text-center text-xs text-ink-600 max-w-xl mx-auto leading-relaxed">
          Prices are {source === "live" ? "live from the configured data provider" : "simulated"}. Shortlist is a research and paper-trading app — it does not place real orders and this is not investment advice.
        </p>
      </main>
    </div>
  );
}

function MoverStrip({ title, tone, rows }: { title: string; tone: "up" | "down"; rows: { i: Instrument; price: number; chg: number }[] }) {
  return (
    <div className="mb-5">
      <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${tone === "up" ? "text-emerald-300" : "text-rose-300"}`}>
        {tone === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} {title}
      </p>
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
        {rows.length === 0 && Array.from({ length: 4 }).map((_, k) => <div key={k} className="h-[118px] min-w-[150px] rounded-2xl bg-ink-900 animate-pulse" />)}
        {rows.map((r) => (
          <Link key={r.i.symbol} href={`/i/${r.i.symbol}`} className="min-w-[150px] snap-start rounded-2xl border border-ink-800 bg-ink-900 p-3.5 transition-colors hover:border-ink-600 active:bg-ink-800/60">
            <div className="flex items-center gap-2">
              <Avatar symbol={r.i.symbol} size={30} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">{r.i.symbol}</p>
                <p className="truncate text-[11px] text-ink-500">{r.i.name}</p>
              </div>
            </div>
            <p className="mt-3 font-mono text-base font-semibold text-white">{fmtNative(r.price, r.i.currency)}</p>
            <ChangePill v={r.chg} />
          </Link>
        ))}
      </div>
    </div>
  );
}
