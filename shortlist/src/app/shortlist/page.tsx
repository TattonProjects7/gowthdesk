"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Layers,
  ListOrdered,
  Microscope,
  Newspaper,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react";
import Nav from "@/components/Nav";
import Sparkline from "@/components/Sparkline";
import { Switch } from "@/components/ui";
import { useTodaysShortlist } from "@/lib/shortlist/useTodaysShortlist";
import { STAGES, type ShortlistItem, type StageId, type TriggerSource } from "@/lib/shortlist/pipeline";
import type { BriefNote } from "@/lib/ai/claude";
import { fmtNative } from "@/lib/instruments";
import { fmtDate } from "@/lib/catalysts";
import { UNIVERSE } from "@/lib/market";
import { RISK_BUDGET } from "@/lib/shorts";
import { squeezeTone } from "@/lib/squeeze";
import { isNative } from "@/lib/platform";
import { setShortlistReminder } from "@/lib/native";

const STAGE_ICON: Record<StageId, React.ElementType> = {
  finder: Search,
  analyst: Microscope,
  signals: Zap,
  enricher: Layers,
  qualifier: ShieldCheck,
  prioritiser: ListOrdered,
};

const SOURCE_ICON: Record<TriggerSource, React.ElementType> = { chart: BarChart3, news: Newspaper, insiders: Users, analysts: TrendingDown };
const SOURCE_LABEL: Record<TriggerSource, string> = { chart: "Chart", news: "News", insiders: "Insiders", analysts: "Analysts" };
const SCANNER = new Set(UNIVERSE.map((u) => u.symbol));
const REMINDER_KEY = "shortlist.reminder";

function fmtTime(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(ms);
}

function fmtLongDay(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(ms);
}

export default function TodaysShortlist() {
  const { status, list, sources, notes, livePrice } = useTodaysShortlist();
  const [open, setOpen] = useState<string | null>(null);
  const [native, setNative] = useState(false);
  const [reminder, setReminder] = useState(false);

  useEffect(() => {
    setNative(isNative());
    try {
      setReminder(localStorage.getItem(REMINDER_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    if (list && open === null && list.items[0]) setOpen(list.items[0].symbol);
  }, [list, open]);

  const toggleReminder = async (on: boolean) => {
    const now = await setShortlistReminder(on);
    setReminder(now);
    try {
      localStorage.setItem(REMINDER_KEY, now ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  };

  const f = list?.funnel;
  const counts: Record<StageId, string> = {
    finder: f ? `${f.scanned} checked` : "…",
    analyst: f ? `${f.weak} look weak` : "…",
    signals: f ? `${f.triggered} triggered` : "…",
    enricher: f ? `${f.triggered} checked` : "…",
    qualifier: f ? `${f.qualified} passed` : "…",
    prioritiser: f ? `Top ${f.listed}` : "…",
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 sm:px-8 py-8 pb-28">
        <section className="mb-7">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
              {list ? `${fmtLongDay(list.builtAt)} · built ${fmtTime(list.builtAt)}` : "Building today's list…"}
            </span>
            <DataBadges sources={sources} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight">Today&apos;s Shortlist</h1>
          <p className="mt-3 max-w-2xl text-ink-300 leading-relaxed">
            Every day, six checks run across every UK and US share in the app. These are the ones that look weakest right now and have a fresh trigger,
            each with the case for a fall and the case against.
          </p>
        </section>

        <Pipeline counts={counts} />

        {native && (
          <div className="mb-6 rounded-2xl border border-white/[0.07] bg-ink-900/70 px-4 py-1 shadow-card">
            <Switch checked={reminder} onChange={toggleReminder} label="Remind me each morning" hint="A notification at 7:30 when the new list is ready" icon={<Bell className="h-4 w-4" />} />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Ranked, strongest case first</h2>
          {list && <span className="text-xs text-ink-500">Tap a share for the full case</span>}
        </div>

        <div className="space-y-3">
          {status === "loading" && [0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-28 rounded-2xl" />)}
          {list && !list.items.length && (
            <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 p-6 text-center text-ink-300">
              Nothing passed every check today. That happens on strong market days: no list is better than a weak one.
            </div>
          )}
          {list?.items.map((it) => (
            <ItemCard
              key={it.symbol}
              it={it}
              note={notes[it.symbol]}
              live={livePrice(it.symbol)}
              builtAt={list.builtAt}
              open={open === it.symbol}
              onToggle={() => setOpen(open === it.symbol ? "" : it.symbol)}
            />
          ))}
        </div>

        {list && list.skipped.length > 0 && <Skipped list={list.skipped} />}

        <HowItWorks />

        <p className="mt-8 text-center text-xs text-ink-500 max-w-2xl mx-auto leading-relaxed">
          Research and education, not advice. The list is built by fixed rules from price, company and news data; it isn&apos;t a personal recommendation to
          buy, sell or short anything. Short selling can lose more than you put in unless you use a stop or a defined-risk product such as a put. Demo
          data is labelled. Practise with virtual money first.
        </p>
      </main>
    </div>
  );
}

function DataBadges({ sources }: { sources: ReturnType<typeof useTodaysShortlist>["sources"] }) {
  const badge = (on: boolean, label: string, off: string) => (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-emerald-800 bg-emerald-950 text-emerald-300" : "border-ink-700 bg-ink-800 text-ink-400"}`}
    >
      {on ? label : off}
    </span>
  );
  return (
    <>
      {sources.prices !== "loading" && badge(sources.prices === "live", "Live prices", "Simulated prices")}
      {sources.fundamentals !== "loading" && badge(sources.fundamentals === "live", "Live company data", "Demo company data")}
      {sources.events !== "loading" && badge(sources.events === "live", "News & insiders on", "News & insiders off")}
      {sources.notes === "ai" && badge(true, "AI notes", "")}
    </>
  );
}

function Pipeline({ counts }: { counts: Record<StageId, string> }) {
  return (
    <section aria-label="How today's list was built" className="mb-6 rounded-2xl border border-white/[0.07] bg-ink-900/70 p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Six checks · every share goes through each one</p>
      </div>
      <ol className="grid grid-cols-3 sm:grid-cols-6 gap-y-4">
        {STAGES.map((s, k) => {
          const Icon = STAGE_ICON[s.id];
          return (
            <li key={s.id} className="relative flex flex-col items-center text-center px-1" title={s.job}>
              {k > 0 && <span aria-hidden className="absolute left-0 top-5 hidden sm:block h-px w-[calc(50%-22px)] bg-gradient-to-r from-transparent to-blue-500/40" />}
              {k < STAGES.length - 1 && <span aria-hidden className="absolute right-0 top-5 hidden sm:block h-px w-[calc(50%-22px)] bg-gradient-to-r from-blue-500/40 to-transparent" />}
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ring-1 ${k === STAGES.length - 1 ? "bg-brand text-white ring-red-400/40 shadow-glow-rose" : "bg-blue-500/15 text-blue-200 ring-blue-400/25"}`}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="mt-1.5 text-[11px] font-semibold text-white leading-tight">{s.name}</span>
              <span className="text-[11px] text-ink-400 num">{counts[s.id]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ItemCard({ it, note, live, builtAt, open, onToggle }: { it: ShortlistItem; note?: BriefNote; live: number | null; builtAt: number; open: boolean; onToggle: () => void }) {
  const tone = squeezeTone(it.squeeze.level);
  const since = live && it.priceAtBuild ? (live / it.priceAtBuild - 1) * 100 : null;
  const s = it.structure;
  const href = SCANNER.has(it.symbol) ? `/short/${it.symbol}` : `/i/${it.symbol}`;

  return (
    <article className={`rounded-2xl border bg-ink-900/70 shadow-card transition-colors ${open ? "border-blue-500/40" : "border-white/[0.07] hover:border-white/15"}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-sm font-bold text-white num">#{it.rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-lg font-bold text-white">{it.symbol}</span>
              <span className="truncate text-sm text-ink-400">{it.name}</span>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-ink-300">{it.region}</span>
            </div>
            <p className="mt-1 text-sm text-ink-100 leading-snug">{note?.why || it.why}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {it.triggers.slice(0, 2).map((t) => {
                const Icon = SOURCE_ICON[t.source];
                return (
                  <span key={t.label} className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/20">
                    <Icon className="h-3 w-3" /> {t.label}
                  </span>
                );
              })}
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone.text} ${tone.bg} ${tone.border}`}>Squeeze risk {it.squeeze.level}</span>
              {it.catalyst && it.catalyst.daysUntil <= 30 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-[11px] text-ink-300">
                  <CalendarClock className="h-3 w-3" /> Results in {it.catalyst.daysUntil}d
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="flex h-11 w-11 flex-col items-center justify-center rounded-full bg-red-500/10 ring-2 ring-red-400/40" title="Strength of the case, out of 100">
              <span className="text-sm font-bold text-white leading-none num">{it.score}</span>
              <span className="text-[9px] font-semibold text-red-300 leading-none mt-0.5">{it.grade}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-white num">{fmtNative(live ?? it.priceAtBuild, it.currency)}</span>
            {since !== null && Math.abs(since) >= 0.01 && (
              <span className={`text-xs num ${since < 0 ? "text-emerald-300" : "text-rose-300"}`} title="Change since the list was built (a fall is good for a short)">
                {since >= 0 ? "+" : ""}
                {since.toFixed(1)}% since {fmtTime(builtAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400">
              Reward <span className="font-semibold text-white num">{s.rewardRisk.toFixed(1)}:1</span>
            </span>
            <Sparkline points={it.closes} width={72} height={24} stroke="#34d399" downStroke="#fb7185" />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] px-4 sm:px-5 pb-5 pt-4 space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">The case for a fall</h3>
            {note?.thesis && (
              <p className="mb-2.5 flex gap-2 text-sm text-ink-100 leading-relaxed">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-label="AI-written" /> {note.thesis}
              </p>
            )}
            <ul className="space-y-1.5">
              {it.bear.map((p) => (
                <li key={p.label} className="text-sm text-ink-300 leading-snug">
                  <span className="font-semibold text-white">{p.label}.</span> {p.detail}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">What triggered it</h3>
            <ul className="space-y-1.5">
              {it.triggers.map((t) => {
                const Icon = SOURCE_ICON[t.source];
                return (
                  <li key={t.label} className="flex gap-2 text-sm text-ink-300 leading-snug">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-red-300" aria-label={SOURCE_LABEL[t.source]} />
                    <span>
                      <span className="font-semibold text-white">{t.label}.</span> {t.detail}
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-blue-300 hover:underline">
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-300">The case against</h3>
            {note?.against && <p className="mb-2 text-sm text-ink-100 leading-relaxed">{note.against}</p>}
            <ul className="space-y-1.5">
              {it.against.map((a) => (
                <li key={a} className="text-sm text-ink-200 leading-snug">
                  • {a}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">A practice plan with defined risk</h3>
            <div className="grid grid-cols-3 gap-2">
              <PlanStat label="Short at" value={fmtNative(s.entry, it.currency)} />
              <PlanStat label={`Stop (+${(s.stopPct * 100).toFixed(1)}%)`} value={fmtNative(s.stop, it.currency)} tone="rose" />
              <PlanStat label={`Target (−${(s.targetPct * 100).toFixed(0)}%)`} value={fmtNative(s.target, it.currency)} tone="emerald" />
            </div>
            <p className="mt-2 text-xs text-ink-400 leading-relaxed">
              Risking £{RISK_BUDGET} to make about £{Math.round(s.maxGain).toLocaleString()} if the target is reached ({s.rewardRisk.toFixed(1)} to 1). Levels were
              set from the price when the list was built at {fmtTime(builtAt)}.{" "}
              {it.squeeze.level === "low" ? `Lightly shorted (${it.squeeze.shortInterestPctFloat.toFixed(1)}% of shares), so squeeze risk is low.` : it.squeeze.verdict}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={href} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow-rose hover:brightness-110">
              {SCANNER.has(it.symbol) ? "Full short setup" : "Chart and details"} <ArrowRight className="h-4 w-4" />
            </Link>
            {it.catalyst && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-ink-800 px-3 py-2.5 text-xs text-ink-300">
                <CalendarClock className="h-4 w-4" /> Results {fmtDate(it.catalyst.date)}, {it.catalyst.timing.toLowerCase()}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function PlanStat({ label, value, tone = "white" }: { label: string; value: string; tone?: "white" | "rose" | "emerald" }) {
  const c = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl bg-ink-800/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`text-sm font-semibold num ${c}`}>{value}</p>
    </div>
  );
}

const STAGE_SHORT: Record<StageId, string> = { finder: "Finder", analyst: "Analyst", signals: "Signal hunter", enricher: "Enricher", qualifier: "Qualifier", prioritiser: "Prioritiser" };

function Skipped({ list }: { list: { symbol: string; name: string; stage: StageId; reason: string }[] }) {
  const [show, setShow] = useState(false);
  return (
    <section className="mt-8">
      <button type="button" onClick={() => setShow(!show)} aria-expanded={show} className="flex w-full items-center justify-between rounded-2xl border border-white/[0.07] bg-ink-900/70 px-4 py-3 text-left shadow-card">
        <span>
          <span className="block text-sm font-semibold text-white">Near misses ({list.length})</span>
          <span className="block text-xs text-ink-400">Weak-looking shares that were left out, and why</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-ink-500 transition-transform ${show ? "rotate-180" : ""}`} />
      </button>
      {show && (
        <ul className="mt-2 divide-y divide-white/[0.05] rounded-2xl border border-white/[0.07] bg-ink-900/70">
          {list.map((s) => (
            <li key={s.symbol} className="flex items-start gap-3 px-4 py-3">
              <Link href={`/i/${s.symbol}`} className="w-16 shrink-0 font-semibold text-white hover:underline">
                {s.symbol}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-200 leading-snug">{s.reason}</p>
                <p className="text-xs text-ink-500 truncate">
                  {s.name} · stopped by the {STAGE_SHORT[s.stage]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="mt-8 rounded-2xl border border-white/[0.07] bg-ink-900/70 p-5 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <Radar className="h-4 w-4 text-blue-300" /> How the list is built
      </h2>
      <ol className="space-y-2">
        {STAGES.map((s, k) => (
          <li key={s.id} className="flex gap-3 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-800 text-[11px] font-bold text-ink-200">{k + 1}</span>
            <span className="text-ink-300">
              <span className="font-semibold text-white">{s.name}:</span> {s.job}.
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-ink-400 leading-relaxed">
        The list is built once a day and stays the same until tomorrow; prices on the page stay live. News, insider filings and analyst ratings come from a
        live data feed when one is connected. Without one, the list runs on the chart and company figures alone. Want every share ranked instead?{" "}
        <Link href="/scan" className="text-blue-300 hover:underline">
          Open the full scanner
        </Link>
        .
      </p>
    </section>
  );
}
