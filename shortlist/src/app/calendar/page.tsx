"use client";

import AdSlot from "@/components/ads/AdSlot";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Landmark, Moon, Sun } from "lucide-react";
import Nav from "@/components/Nav";
import Avatar from "@/components/Avatar";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import { Card, Pill, Segmented, Switch } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { upcomingEvents, fmtEventDate, type MarketEvent } from "@/lib/events";
import { usePortfolio } from "@/lib/portfolioStore";
import { useWatchlists } from "@/lib/watchlists";
import { fmtBig, fmtP } from "@/lib/screener/columns";
import type { Snapshot } from "@/lib/screener/snapshot";

const DAY = 86400_000;

type Item = { kind: "earnings"; date: number; s: Snapshot } | { kind: "macro"; date: number; e: MarketEvent };

// Earnings and economic calendar for the next two weeks, Finviz-style, with a
// switch to show only the companies you own or watch.
export default function Calendar() {
  const { mounted, source, now, snaps } = useScreener();
  const [show, setShow] = useState<"all" | "earnings" | "macro">("all");
  const [mine, setMine] = useState(false);
  const portfolio = usePortfolio();
  const lists = useWatchlists();

  const days = useMemo(() => {
    if (!mounted || !now) return [];
    const yours = new Set([...(portfolio.holdings ?? []).map((h) => h.symbol), ...lists.flatMap((l) => l.symbols)]);
    const today = Math.floor(now / DAY) * DAY;
    const end = today + 15 * DAY;
    const items: Item[] = [];
    if (show !== "macro") {
      for (const s of snaps) {
        if (!s.earnings || s.earnings.date >= end) continue;
        if (mine && !yours.has(s.symbol)) continue;
        items.push({ kind: "earnings", date: Math.floor(s.earnings.date / DAY) * DAY, s });
      }
    }
    if (show !== "earnings") {
      for (const e of upcomingEvents(now, 15)) if (e.type === "macro") items.push({ kind: "macro", date: Math.floor(e.date / DAY) * DAY, e });
    }
    const byDay = new Map<number, Item[]>();
    for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
    return [...byDay]
      .sort((a, b) => a[0] - b[0])
      .map(([date, list]) => ({
        date,
        // Macro first, then the biggest companies.
        list: list.sort((a, b) => (a.kind === "macro" ? -1 : b.kind === "macro" ? 1 : (b.s.marketCapUsd ?? 0) - (a.s.marketCapUsd ?? 0))),
      }));
  }, [mounted, now, snaps, show, mine, portfolio.holdings, lists]);

  const today = Math.floor(now / DAY) * DAY;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Calendar</h1>
            <p className="mt-1 text-sm text-ink-400">Results and economic releases for the next two weeks. Prices often move most on these days.</p>
          </div>
          <DataBadges source={source} />
        </div>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Segmented size="sm" value={show} onChange={setShow} options={[{ id: "all", label: "Everything" }, { id: "earnings", label: "Earnings" }, { id: "macro", label: "Economy" }]} />
          <div className="sm:w-72">
            <Switch checked={mine} onChange={setMine} label="Only what I own or watch" />
          </div>
        </div>

        {!mounted ? (
          <div className="skeleton h-96 rounded-3xl" />
        ) : days.length === 0 ? (
          <Card className="text-center text-sm text-ink-400">Nothing scheduled for {mine ? "your holdings and watchlists" : "this view"} in the next two weeks.</Card>
        ) : (
          <div className="space-y-4">
            {days.map(({ date, list }, k) => (
              <section key={date}>
                {k === 2 && <AdSlot placement="calendar-inline" />}
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  {fmtEventDate(date)}
                  {date === today && <Pill tone="violet">Today</Pill>}
                  {date === today + DAY && <Pill>Tomorrow</Pill>}
                </h2>
                <Card className="!p-0">
                  <ul className="divide-y divide-white/[0.05]">
                    {list.map((it) =>
                      it.kind === "macro" ? (
                        <li key={it.e.id} className="flex items-start gap-3 px-4 py-3">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300">
                            <Landmark className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">{it.e.title}</p>
                            <p className="text-xs text-ink-400">{it.e.detail}</p>
                          </div>
                          <Pill tone={it.e.impact === "high" ? "rose" : it.e.impact === "medium" ? "amber" : "ink"}>{it.e.impact}</Pill>
                        </li>
                      ) : (
                        <li key={it.s.symbol}>
                          <Link href={`/i/${it.s.symbol}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
                            <Avatar symbol={it.s.symbol} size={32} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-white">
                                {it.s.symbol} <span className="font-normal text-ink-400">{it.s.i.name}</span>
                              </p>
                              <p className="flex items-center gap-1 text-xs text-ink-400">
                                {it.s.earnings?.timing === "Before open" ? <Sun className="h-3 w-3 text-amber-300" /> : <Moon className="h-3 w-3 text-blue-300" />}
                                {it.s.earnings?.timing} · {fmtBig(it.s.marketCapUsd, "$")} · moves ±{it.s.atrPct.toFixed(1)}% on a normal day
                              </p>
                            </div>
                            <span className={`num font-mono text-xs ${it.s.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(it.s.change, 2, true)}</span>
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        )}
        <p className="mt-6 text-xs text-ink-500">Dates follow each company&apos;s usual quarterly cycle and the regular release schedule of each economic report. Confirm exact dates with the company before trading around them.</p>
      </main>
    </div>
  );
}
