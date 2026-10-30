"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Activity, ExternalLink, GraduationCap, Newspaper, Rss, TrendingDown, TrendingUp } from "lucide-react";
import Nav from "@/components/Nav";
import MarketsTabs, { DataBadges } from "@/components/screener/MarketsTabs";
import AdSlot from "@/components/ads/AdSlot";
import { Card, Segmented } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { pulseNotes, type PulseNote } from "@/lib/screener/pulse";
import { isInstrument } from "@/lib/instruments";

type Tab = "market" | "pulse" | "stocks" | "etf" | "crypto";
type View = "time" | "source";

interface Headline {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  at: number;
  related: string[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "market", label: "Market news" },
  { id: "pulse", label: "Market pulse" },
  { id: "stocks", label: "Stocks" },
  { id: "etf", label: "ETFs" },
  { id: "crypto", label: "Crypto" },
];

const LESSONS = [
  { href: "/learn/how-markets-move", label: "Why do share prices move?" },
  { href: "/learn/moving-averages", label: "Reading moving averages" },
  { href: "/learn/rsi-momentum", label: "RSI and momentum in plain English" },
  { href: "/learn/biases", label: "The biases that cost investors money" },
];

function when(at: number, now: number): string {
  const d = new Date(at);
  if (now - at < 20 * 3600_000 && new Date(now).getDate() === d.getDate()) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function SourceMark({ source }: { source: string }) {
  const letter = source.replace(/[^A-Za-z]/g, "").slice(0, 1).toUpperCase() || "N";
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: `hsl(${hue} 45% 32%)` }} aria-hidden>
      {letter}
    </span>
  );
}

// Finviz's news page, Shortlist-style: live headlines by tab, view by time or
// source, and a Market Pulse written from today's data.
export default function NewsPage() {
  const { mounted, source, now, snaps } = useScreener();
  const [tab, setTab] = useState<Tab>("market");
  const [view, setView] = useState<View>("time");
  const [feed, setFeed] = useState<{ source: "live" | "none" | "loading"; items: Headline[] }>({ source: "loading", items: [] });

  useEffect(() => {
    if (tab === "pulse") return;
    let alive = true;
    setFeed((f) => ({ ...f, source: "loading" }));
    fetch(`/api/market-news?tab=${tab}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { source: "live" | "none"; items: Headline[] }) => alive && setFeed({ source: j.source, items: j.items ?? [] }))
      .catch(() => alive && setFeed({ source: "none", items: [] }));
    return () => {
      alive = false;
    };
  }, [tab]);

  const pulse = useMemo(() => (mounted ? pulseNotes(snaps, 16) : []), [mounted, snaps]);

  const grouped = useMemo(() => {
    if (view === "time") return [{ key: "all", items: feed.items }];
    const m = new Map<string, Headline[]>();
    for (const n of feed.items) m.set(n.source, [...(m.get(n.source) ?? []), n]);
    return [...m].sort((a, b) => b[1].length - a[1].length).map(([key, items]) => ({ key, items }));
  }, [feed.items, view]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-5 pb-28 sm:px-8 sm:py-8">
        <MarketsTabs />
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">News</h1>
            <p className="mt-1 text-sm text-ink-400">The headlines moving markets, and what today&apos;s numbers say.</p>
          </div>
          <DataBadges source={source} />
        </div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmented size="sm" value={tab} onChange={setTab} options={TABS} />
          {tab !== "pulse" && <Segmented size="sm" value={view} onChange={setView} options={[{ id: "time", label: "By time" }, { id: "source", label: "By source" }]} />}
        </div>

        {(tab === "pulse" || feed.items.length > 0) && <AdSlot placement="news-top" className="!mt-0" />}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section aria-label={TABS.find((t) => t.id === tab)?.label} className="min-w-0">
            {tab === "pulse" ? (
              <PulseList notes={pulse} mounted={mounted} />
            ) : feed.source === "loading" ? (
              <div className="skeleton h-96 rounded-3xl" />
            ) : feed.source === "none" || feed.items.length === 0 ? (
              <Card>
                <div className="flex items-start gap-3">
                  <Rss className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
                  <div>
                    <p className="font-semibold text-white">{feed.source === "none" ? "Live headlines are switched off" : "No headlines right now"}</p>
                    <p className="mt-1 text-sm text-ink-400">
                      {feed.source === "none"
                        ? "Headlines from Reuters, Bloomberg, CNBC and other publishers appear here once the app's news feed is connected. Until then, Market Pulse shows what today's market data says."
                        : "Check back shortly — the feed refreshes every few minutes."}
                    </p>
                    <button onClick={() => setTab("pulse")} className="mt-3 rounded-full bg-white/[0.08] px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.12]">
                      Open Market Pulse
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {grouped.map((g) => (
                  <Card key={g.key} className="!p-0">
                    {view === "source" && (
                      <p className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white">
                        <SourceMark source={g.key} /> {g.key} <span className="text-xs font-normal text-ink-500">{g.items.length}</span>
                      </p>
                    )}
                    <ul className="divide-y divide-white/[0.05]">
                      {g.items.map((n, k) => (
                        <Fragment key={n.id}>
                          {view === "time" && k > 0 && k % 12 === 0 && (
                            <li className="px-3">
                              <AdSlot placement={`news-feed-${k}`} kind="infeed" className="!my-3" />
                            </li>
                          )}
                          <li className="flex gap-3 px-4 py-2.5">
                            <span className="num w-12 shrink-0 pt-0.5 font-mono text-[11px] text-ink-500">{when(n.at, now || Date.now())}</span>
                            {view === "time" && <SourceMark source={n.source} />}
                            <div className="min-w-0 flex-1">
                              <a href={n.url} target="_blank" rel="noopener noreferrer" className="group text-sm text-ink-100 hover:text-white">
                                {n.headline} <ExternalLink className="inline h-3 w-3 text-ink-600 group-hover:text-ink-300" />
                              </a>
                              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                                {view === "time" && <span>{n.source}</span>}
                                {n.related
                                  .filter((r) => isInstrument(r))
                                  .map((r) => (
                                    <Link key={r} href={`/i/${r}`} className="rounded bg-white/[0.06] px-1.5 py-0.5 font-semibold text-ink-200 hover:bg-white/[0.12]">
                                      {r}
                                    </Link>
                                  ))}
                              </p>
                            </div>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                  </Card>
                ))}
                <p className="text-xs text-ink-500">Headlines link to the publisher&apos;s site. Shortlist doesn&apos;t write or check third-party news.</p>
              </div>
            )}
          </section>

          <aside className="min-w-0 space-y-4">
            {tab !== "pulse" && (
              <Card className="!p-0">
                <p className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white">
                  <Activity className="h-4 w-4 text-violet-300" /> Market pulse
                </p>
                <PulseList notes={pulse.slice(0, 6)} mounted={mounted} compact />
                <button onClick={() => setTab("pulse")} className="w-full border-t border-white/[0.06] px-4 py-2 text-left text-xs font-semibold text-violet-300 hover:bg-white/[0.03]">
                  See the full pulse
                </button>
              </Card>
            )}
            <Card>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                <GraduationCap className="h-4 w-4 text-amber-300" /> Make sense of the news
              </p>
              <ul className="space-y-1.5 text-sm">
                {LESSONS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-ink-300 hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
            <AdSlot placement="news-side" />
          </aside>
        </div>
      </main>
    </div>
  );
}

function PulseList({ notes, mounted, compact = false }: { notes: PulseNote[]; mounted: boolean; compact?: boolean }) {
  if (!mounted) return <div className="skeleton m-4 h-40 rounded-2xl" />;
  if (!notes.length) return <p className="p-4 text-sm text-ink-500">Nothing notable yet today.</p>;
  const body = (
    <ul className="divide-y divide-white/[0.05]">
      {notes.map((n) => {
        const Icon = n.tone === "up" ? TrendingUp : n.tone === "down" ? TrendingDown : Newspaper;
        const inner = (
          <>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${n.tone === "up" ? "text-emerald-300" : n.tone === "down" ? "text-rose-300" : "text-ink-400"}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-100">{n.headline}</p>
              {!compact && <p className="mt-0.5 text-xs text-ink-400">{n.detail}</p>}
            </div>
          </>
        );
        return (
          <li key={n.id}>
            {n.symbol ? (
              <Link href={`/i/${n.symbol}`} className="flex gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
                {inner}
              </Link>
            ) : (
              <div className="flex gap-3 px-4 py-2.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
  if (compact) return body;
  return (
    <Card className="!p-0">
      {body}
      <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-ink-500">Written automatically from today&apos;s prices, volumes and signals. It describes the data; it doesn&apos;t explain why.</p>
    </Card>
  );
}
