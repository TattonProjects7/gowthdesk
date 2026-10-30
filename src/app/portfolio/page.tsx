"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  ChevronRight,
  Coins,
  Flame,
  Gift,
  GraduationCap,
  Landmark,
  Layers,
  ListChecks,
  PiggyBank,
  Play,
  Plus,
  Receipt,
  Repeat,
  Scale,
  Shield,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Nav from "@/components/Nav";
import AnimatedNumber from "@/components/AnimatedNumber";
import RealPortfolio from "@/components/broker/RealPortfolio";
import { useMode } from "@/lib/broker/client";
import AllocationDonut from "@/components/AllocationDonut";
import AreaChart from "@/components/AreaChart";
import HealthCard from "@/components/HealthCard";
import DailyBrief from "@/components/DailyBrief";
import LevelRing from "@/components/learn/LevelRing";
import Onboarding from "@/components/learn/Onboarding";
import { FreeShareBanner } from "@/components/learn/FreeShare";
import { useCoach } from "@/components/coach/CoachProvider";
import { learn, useLearn } from "@/lib/learn/store";
import { levelFor, liveStreak, suggestedLesson } from "@/lib/learn/progress";
import { START_TRACK } from "@/lib/learn/content";
import Avatar from "@/components/Avatar";
import { ChangePill } from "@/components/InstrumentRow";
import { Button, Card, Empty, H2, Input, Money, Pill, Segmented, Select, Stat, fmtDateTime } from "@/components/ui";
import { useMarket, useLiveFocus } from "@/lib/useMarket";
import { getInstrument, searchInstruments, fmtGbp, fmtNative, INSTRUMENTS } from "@/lib/instruments";
import { toGbp } from "@/lib/fx";
import { makePricer, portfolio, usePortfolio } from "@/lib/portfolioStore";
import { celebrateTrade } from "@/lib/effects";
import {
  ACCOUNT_META,
  MODEL_PORTFOLIOS,
  allocation,
  incomeProjection,
  modelOcf,
  modelYield,
  nextRun,
  overlaps,
  rebalancePlan,
  smartTopUpPlan,
  summarise,
  type AccountType,
  type Dimension,
  type Frequency,
  type HoldingView,
  type Order,
  type PortfolioState,
  type Pricer,
  type Tx,
} from "@/lib/portfolio";

type Msg = { ok: boolean; text: string };

type Tab = "overview" | "holdings" | "analytics" | "orders" | "activity" | "automate" | "accounts";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "holdings", label: "Holdings" },
  { id: "analytics", label: "Analytics" },
  { id: "orders", label: "Orders" },
  { id: "activity", label: "Activity" },
  { id: "automate", label: "Automate" },
  { id: "accounts", label: "Accounts" },
];

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PortfolioInner />
    </Suspense>
  );
}

// Portfolio — interactive investor's single-screen overview with a breakdown of
// every account, IG's order management, and InvestEngine's analytics,
// look-through, Savings Plans, AutoInvest and one-click rebalance.
function PortfolioInner() {
  const search = useSearchParams();
  const router = useRouter();
  const tab = (search.get("tab") as Tab) || "overview";
  const setTab = (t: Tab) => router.replace(`/portfolio?tab=${t}`, { scroll: false });

  const { mounted, now, priceFor, closesFor } = useMarket();
  const state = usePortfolio();
  useLiveFocus([...new Set(state.holdings.map((h) => h.symbol))]);
  const pricer = useMemo(() => makePricer(now, priceFor, closesFor), [now, priceFor, closesFor]);
  const summary = useMemo(() => (mounted ? summarise(state, pricer) : null), [mounted, state, pricer]);
  const mode = useMode();

  if (mounted && mode === "real") {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 sm:px-8 py-5 sm:py-8">
          <RealPortfolio />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-5 sm:py-8">
        <Onboarding />
        {mounted && tab === "overview" && <FreeShareBanner pricer={pricer} />}
        <PortfolioHero summary={summary} closesFor={closesFor} now={now} showChart={tab === "overview"} />

        <div className="mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <Segmented options={TABS} value={tab} onChange={setTab} />
        </div>

        {!mounted || !summary ? (
          <div className="h-64 rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />
        ) : (
          <>
            {tab === "overview" && <Overview state={state} summary={summary} pricer={pricer} setTab={setTab} now={now} priceFor={priceFor} closesFor={closesFor} />}
            {tab === "holdings" && <Holdings state={state} holdings={summary.holdings} />}
            {tab === "analytics" && <Analytics state={state} pricer={pricer} />}
            {tab === "orders" && <Orders state={state} />}
            {tab === "activity" && <Activity state={state} />}
            {tab === "automate" && <Automate state={state} pricer={pricer} />}
            {tab === "accounts" && <Accounts state={state} summary={summary} />}
          </>
        )}

        <p className="mt-10 text-center text-xs text-ink-600 max-w-xl mx-auto leading-relaxed">
          Virtual funds, real prices where configured. Shortlist does not hold client money or place orders with a broker. Not investment advice.
        </p>
      </main>
    </div>
  );
}


// ---------------------------------------------------------------------------

const RANGES = [
  { id: "1W", days: 7 },
  { id: "1M", days: 31 },
  { id: "3M", days: 92 },
  { id: "1Y", days: 365 },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

// The hero: headline value (scrub the chart to see any past day), today's and
// all-time change, the value chart with ranges, and the three numbers people check.
function PortfolioHero({ summary, closesFor, now, showChart }: { summary: ReturnType<typeof summarise> | null; closesFor: (s: string, n?: number) => number[]; now: number; showChart: boolean }) {
  const [range, setRange] = useState<RangeId>("1M");
  const [scrub, setScrub] = useState<number | null>(null);
  const days = RANGES.find((r) => r.id === range)!.days;
  const series = useMemo(() => {
    if (!summary) return { values: [] as number[], dates: [] as number[] };
    const values = new Array(days).fill(summary.cash) as number[];
    const dates = Array.from({ length: days }, (_, k) => now - (days - 1 - k) * 86400_000);
    for (const h of summary.holdings) {
      const c = closesFor(h.symbol, days);
      for (let k = 0; k < days; k++) values[k] += h.qty * toGbp(c[k] ?? c[c.length - 1], h.instrument.currency, dates[k]);
    }
    values[days - 1] = summary.totalValue;
    return { values, dates };
  }, [summary, closesFor, now, days]);

  if (!summary) {
    return <div className="mb-5 h-56 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />;
  }
  const v = series.values;
  const shown = scrub != null ? v[scrub] : summary.totalValue;
  const rangeChg = v.length > 1 && v[0] ? shown - v[0] : 0;
  const rangePct = v.length > 1 && v[0] ? (rangeChg / v[0]) * 100 : 0;

  return (
    <section className="relative mb-5 overflow-hidden rounded-[28px] border border-white/[0.08] bg-ink-900/70 p-5 shadow-card sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-rose-500/30 via-fuchsia-500/20 to-violet-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium text-ink-300">
          <Wallet className="h-3.5 w-3.5" /> Total value
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-300 ring-1 ring-white/10">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-rose-400 to-violet-400" /> Demo money
        </span>
      </div>
      <p className="relative mt-2 font-mono text-[44px] leading-none font-bold tracking-tight text-white sm:text-[54px]">{scrub != null ? fmtGbp(shown) : <AnimatedNumber value={shown} format={(x) => fmtGbp(x)} />}</p>
      <div className="relative mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {scrub != null ? (
          <span className="text-ink-300">
            {new Date(series.dates[scrub]).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · <Money v={rangeChg} sign /> since start of range
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <ChangePill v={summary.dayChangePct} size="md" />
              <Money v={summary.dayChange} sign className="text-sm" />
              <span className="text-ink-500">today</span>
            </span>
            {showChart && (
              <span className="inline-flex items-center gap-1.5 text-ink-400">
                <Money v={rangeChg} sign className="text-sm" /> <span className={rangePct >= 0 ? "text-emerald-400" : "text-rose-400"}>({rangePct >= 0 ? "+" : ""}{rangePct.toFixed(2)}%)</span> {range}
              </span>
            )}
          </>
        )}
      </div>

      {showChart && (
        <>
          <div className="relative -mx-1 mt-5">
            <AreaChart points={v} dates={series.dates} height={150} format={(x) => fmtGbp(x, { dp: 0 })} onScrub={setScrub} />
          </div>
          <div className="relative mt-3 flex items-center justify-between">
            <div className="flex gap-1 rounded-full bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${range === r.id ? "bg-white text-ink-950" : "text-ink-400 hover:text-white"}`}
                >
                  {r.id}
                </button>
              ))}
            </div>
            <span className="hidden sm:inline text-[10px] text-ink-500">Current holdings, priced over time</span>
          </div>
        </>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <HeroStat label="Invested" value={fmtGbp(summary.invested, { dp: 0 })} />
        <HeroStat label="Cash" value={fmtGbp(summary.cash, { dp: 0 })} />
        <HeroStat
          label="Return"
          value={<span className={summary.totalReturn >= 0 ? "text-emerald-300" : "text-rose-300"}>{summary.totalReturnPct >= 0 ? "+" : ""}{summary.totalReturnPct.toFixed(2)}%</span>}
        />
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-ink-800/60 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-sm sm:text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, href, primary }: { icon: React.ElementType; label: string; onClick?: () => void; href?: string; primary?: boolean }) {
  const inner = (
    <>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${primary ? "bg-brand text-white shadow-glow-rose" : "bg-ink-800 text-ink-100"} transition-transform active:scale-95`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-medium text-ink-300">{label}</span>
    </>
  );
  const cls = "flex flex-col items-center gap-1.5";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Overview({
  state,
  summary,
  pricer,
  setTab,
  now,
  priceFor,
  closesFor,
}: {
  state: PortfolioState;
  summary: ReturnType<typeof summarise>;
  pricer: Pricer;
  setTab: (t: Tab) => void;
  now: number;
  priceFor: (s: string) => number;
  closesFor: (s: string, n?: number) => number[];
}) {
  const income = incomeProjection(state, pricer);
  const coach = useCoach();
  const closes31 = useCallback((s: string) => closesFor(s), [closesFor]);

  return (
    <>
      {/* Quick actions — the round buttons every banking app opens with */}
      <div className="grid grid-cols-4 gap-2 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card px-2 py-4">
        <QuickAction icon={Plus} label="Invest" href="/markets" primary />
        <QuickAction icon={PiggyBank} label="Add funds" onClick={() => setTab("accounts")} />
        <QuickAction icon={GraduationCap} label="Learn" href="/learn" />
        <QuickAction icon={Sparkles} label="Ask coach" onClick={() => coach.open()} />
      </div>

      <LearnStrip />
      <HealthCard state={state} pricer={pricer} closesFor={closes31} />
      <DailyBrief now={now} priceFor={priceFor} closesFor={closes31} dayChange={summary.dayChange} />

      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Unrealised P&L" value={<Money v={summary.unrealised} sign />} sub={`${summary.unrealisedPct >= 0 ? "+" : ""}${summary.unrealisedPct}% on cost`} />
        <Stat label="Realised P&L" value={<Money v={summary.realised} sign />} sub="from sells" />
        <Stat label="Dividends received" value={<Money v={summary.dividends} sign />} sub="credited to cash" />
        <Stat label="Projected income" value={fmtGbp(income.annual, { dp: 0 })} sub={`${income.yieldPct}% yield · ${fmtGbp(income.monthly, { dp: 0 })}/mo`} />
      </div>

      {/* Accounts — the ii single-screen breakdown, as a swipeable row on phones */}
      <H2 right={<button onClick={() => setTab("accounts")} className="text-xs text-rose-400 hover:underline">Manage</button>}>Your accounts</H2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {summary.accounts.map((a) => (
          <div key={a.account.id} className="min-w-[78%] snap-start rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card p-4 sm:min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{a.account.name}</p>
              <Pill tone={a.account.type === "ISA" ? "emerald" : a.account.type === "SIPP" ? "violet" : "ink"}>{a.account.type}</Pill>
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold text-white">{fmtGbp(a.value)}</p>
            <p className="text-xs text-ink-400">
              {fmtGbp(a.invested, { dp: 0 })} invested · {fmtGbp(a.cash, { dp: 0 })} cash
            </p>
            <p className="mt-2 text-xs">
              <Money v={a.dayChangeGbp} sign /> <span className="text-ink-500">today</span>
            </p>
          </div>
        ))}
        {(["ISA", "SIPP"] as AccountType[])
          .filter((t) => !state.accounts.some((a) => a.type === t))
          .map((t) => (
            <button key={t} onClick={() => portfolio.openAccount(t)} className="min-w-[78%] snap-start rounded-3xl border border-dashed border-ink-700 p-4 text-left hover:border-ink-500 sm:min-w-0">
              <p className="text-sm font-semibold text-ink-200 flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Open a {ACCOUNT_META[t].name}
              </p>
              <p className="mt-1 text-xs text-ink-500">{ACCOUNT_META[t].blurb}</p>
            </button>
          ))}
      </div>

      {/* Top holdings */}
      <H2 right={<button onClick={() => setTab("holdings")} className="text-xs text-rose-400 hover:underline">All holdings</button>}>Top holdings</H2>
      {summary.holdings.length === 0 ? (
        <Empty icon={Layers} title="Nothing invested yet" body={`You have ${fmtGbp(summary.cash)} of virtual cash ready. Pick a share, ETF or coin and place your first paper trade.`} cta={{ href: "/markets", label: "Browse markets" }} />
      ) : (
        <div className="space-y-2">
          {summary.holdings.slice(0, 5).map((h) => (
            <HoldingLine key={h.id} h={h} state={state} compact />
          ))}
        </div>
      )}
    </>
  );
}

// Level, streak and the next lesson — the Academy, one tap from home.
function LearnStrip() {
  const s = useLearn();
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  const lvl = levelFor(s.xp);
  const next = suggestedLesson(s, START_TRACK[s.profile.experience ?? "beginner"]);
  const streak = now ? liveStreak(s.streak, now) : 0;
  return (
    <Link href={next ? `/learn/${next.id}` : "/learn"} className="mt-4 flex items-center gap-3 rounded-3xl border border-violet-900/60 bg-gradient-to-r from-violet-950/50 to-ink-900 p-4 transition-colors hover:border-violet-700">
      <LevelRing level={lvl.level} pct={lvl.pct} size={52} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-violet-300">
          {lvl.title}
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 text-orange-300">
              <Flame className="h-3 w-3" /> {streak}
            </span>
          )}
        </span>
        <span className="block truncate font-semibold text-white">{next ? `Next lesson: ${next.title}` : "All lessons complete 🎉"}</span>
        <span className="block text-xs text-ink-400">{next ? `${next.minutes} min · +${next.xp} XP · +£${next.reward} practice cash` : "Keep your streak with the daily question"}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-violet-300" />
    </Link>
  );
}

// ---------------------------------------------------------------------------

function HoldingLine({ h, state, compact }: { h: HoldingView; state: PortfolioState; compact?: boolean }) {
  const acc = state.accounts.find((a) => a.id === h.accountId);
  const [edit, setEdit] = useState(false);
  const [sl, setSl] = useState(h.stopLoss?.toString() ?? "");
  const [tp, setTp] = useState(h.takeProfit?.toString() ?? "");
  const [tr, setTr] = useState(h.trailingPct?.toString() ?? "");
  const hasProt = h.stopLoss != null || h.takeProfit != null || h.trailingPct != null;
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card px-3.5 py-3">
      <div className="flex items-center gap-3">
        <Link href={`/i/${h.symbol}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar symbol={h.symbol} size={38} />
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{h.symbol}</span>
            <span className="text-xs text-ink-500">{acc?.type}</span>
            {hasProt && <Shield className="h-3.5 w-3.5 text-sky-400" />}
          </div>
          <p className="truncate text-xs text-ink-400">
            {h.qty.toLocaleString(undefined, { maximumFractionDigits: 6 })} × {fmtNative(h.price, h.instrument.currency)} · avg {fmtGbp(h.avgCost)}
          </p>
          </div>
        </Link>
        <div className="hidden sm:block w-16 text-right">
          <p className="text-[10px] uppercase text-ink-500">weight</p>
          <p className="font-mono text-sm text-ink-200">{h.weightPct}%</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-white">{fmtGbp(h.valueGbp)}</p>
          <p className="text-xs">
            <Money v={h.pnlGbp} sign /> <span className="text-ink-500">({h.pnlPct >= 0 ? "+" : ""}{h.pnlPct}%)</span>
          </p>
        </div>
        {!compact && (
          <button onClick={() => setEdit((v) => !v)} className={`rounded-lg border px-2 py-1 text-xs ${hasProt ? "border-sky-900 text-sky-300" : "border-ink-700 text-ink-300"} hover:bg-ink-800`}>
            {edit ? "Close" : "Protect"}
          </button>
        )}
      </div>
      {edit && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-800 pt-3">
          <div>
            <p className="text-[10px] text-ink-500 mb-1">Stop-loss ({h.instrument.currency})</p>
            <Input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} placeholder={fmtNative(h.price * 0.9, h.instrument.currency)} />
          </div>
          <div>
            <p className="text-[10px] text-ink-500 mb-1">Take-profit</p>
            <Input type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} placeholder={fmtNative(h.price * 1.2, h.instrument.currency)} />
          </div>
          <div>
            <p className="text-[10px] text-ink-500 mb-1">Trailing stop %</p>
            <Input type="number" step="any" value={tr} onChange={(e) => setTr(e.target.value)} placeholder="10" />
          </div>
          <div className="col-span-3 flex items-center gap-2">
            <Button
              onClick={() => {
                portfolio.setProtection(h.id, { stopLoss: sl ? parseFloat(sl) : null, takeProfit: tp ? parseFloat(tp) : null, trailingPct: tr ? parseFloat(tr) : null });
                setEdit(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                portfolio.setProtection(h.id, { stopLoss: null, takeProfit: null, trailingPct: null });
                setSl("");
                setTp("");
                setTr("");
              }}
            >
              Clear
            </Button>
            <span className="text-[11px] text-ink-500">Triggers sell the whole position at market. High-water mark {fmtNative(h.highWater, h.instrument.currency)}.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Holdings({ state, holdings }: { state: PortfolioState; holdings: HoldingView[] }) {
  if (!holdings.length) return <Empty icon={Layers} title="No holdings yet" body="Buy a share, ETF or coin from the markets screen and it will appear here." cta={{ href: "/markets", label: "Browse markets" }} />;
  return (
    <div className="space-y-5">
      {state.accounts.map((a) => {
        const hs = holdings.filter((h) => h.accountId === a.id);
        if (!hs.length) return null;
        return (
          <div key={a.id}>
            <H2 right={<span className="text-xs text-ink-500">{fmtGbp(hs.reduce((x, h) => x + h.valueGbp, 0))}</span>}>{a.name}</H2>
            <div className="space-y-2">
              {hs.map((h) => (
                <HoldingLine key={h.id} h={h} state={state} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Analytics({ state, pricer }: { state: PortfolioState; pricer: Pricer }) {
  const [dim, setDim] = useState<Dimension>("asset");
  const slices = useMemo(() => allocation(state, pricer, dim), [state, pricer, dim]);
  const ov = useMemo(() => overlaps(state, pricer), [state, pricer]);
  const income = useMemo(() => incomeProjection(state, pricer), [state, pricer]);
  if (!state.holdings.length) return <Empty icon={Layers} title="Analytics need holdings" body="Once you own something, see what you really hold by asset class, sector, region and underlying company." cta={{ href: "/markets", label: "Browse markets" }} />;
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-sm font-semibold text-white">Portfolio look-through</p>
          <Segmented
            size="sm"
            value={dim}
            onChange={(d) => {
              setDim(d);
              if (d === "lookthrough") learn.flag("lookthrough");
            }}
            options={[
              { id: "asset", label: "Asset class" },
              { id: "sector", label: "Sectors" },
              { id: "region", label: "Regions" },
              { id: "holding", label: "Holdings" },
              { id: "lookthrough", label: "Underlying" },
            ]}
          />
        </div>
        <AllocationDonut slices={slices} max={dim === "lookthrough" ? 10 : 8} />
        {dim === "lookthrough" && <p className="mt-3 text-xs text-ink-500">ETFs are expanded into the companies they hold, so you can see your true exposure — several funds often lean on the same mega-caps.</p>}
      </Card>

      {ov.length > 0 && (
        <>
          <H2>Overlap check</H2>
          <Card tone="amber">
            <p className="text-sm text-amber-100 mb-2">You hold these companies through more than one route:</p>
            <ul className="space-y-1.5 text-sm">
              {ov.slice(0, 8).map((o) => (
                <li key={o.name} className="flex items-center gap-2">
                  <span className="flex-1 text-white">{o.name}</span>
                  <span className="text-xs text-ink-400">via {o.via.join(", ")}</span>
                  <span className="font-mono text-ink-200">{fmtGbp(o.valueGbp, { dp: 0 })}</span>
                  <span className="w-12 text-right font-mono text-amber-300">{o.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      <H2>Income</H2>
      <Card>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Stat label="Projected annual" value={fmtGbp(income.annual, { dp: 0 })} tone="emerald" />
          <Stat label="Per month" value={fmtGbp(income.monthly, { dp: 0 })} />
          <Stat label="Portfolio yield" value={`${income.yieldPct}%`} />
        </div>
        {income.lines.length ? (
          <ul className="divide-y divide-ink-800 text-sm">
            {income.lines.map((l) => (
              <li key={l.symbol} className="flex items-center gap-2 py-1.5">
                <Link href={`/i/${l.symbol}`} className="w-14 font-bold text-white hover:underline">
                  {l.symbol}
                </Link>
                <span className="min-w-0 flex-1 truncate text-ink-400">{l.name}</span>
                <span className="text-xs text-ink-500">{l.yieldPct}%</span>
                <span className="font-mono text-ink-200">{fmtGbp(l.annualGbp, { dp: 0 })}/yr</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-500">None of your holdings pay a dividend.</p>
        )}
        <p className="mt-2 text-xs text-ink-500">Estimates from trailing yields. Paper dividends are credited to cash quarterly.</p>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

function Orders({ state }: { state: PortfolioState }) {
  const pending = state.orders.filter((o) => o.status === "pending");
  const done = state.orders.filter((o) => o.status !== "pending");
  const acc = (id: string) => state.accounts.find((a) => a.id === id)?.type ?? "";
  if (!state.orders.length) return <Empty icon={Receipt} title="No orders yet" body="Market, limit and stop orders you place will show here — working orders can be cancelled until they fill." cta={{ href: "/markets", label: "Place an order" }} />;
  return (
    <>
      <H2 right={<span className="text-xs text-ink-500">{pending.length} working</span>}>Working orders</H2>
      {pending.length === 0 ? (
        <p className="text-sm text-ink-500">No working orders.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((o) => (
            <OrderLine key={o.id} o={o} acc={acc(o.accountId)} onCancel={() => portfolio.cancel(o.id)} />
          ))}
        </div>
      )}
      <H2>History</H2>
      <div className="space-y-2">
        {done.slice(0, 50).map((o) => (
          <OrderLine key={o.id} o={o} acc={acc(o.accountId)} />
        ))}
      </div>
    </>
  );
}

function OrderLine({ o, acc, onCancel }: { o: Order; acc: string; onCancel?: () => void }) {
  const i = getInstrument(o.symbol)!;
  const tone = o.status === "filled" ? "emerald" : o.status === "pending" ? "amber" : o.status === "rejected" ? "rose" : "ink";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-900/70 shadow-card px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase ${o.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{o.side}</span>
          <Link href={`/i/${o.symbol}`} className="font-bold text-white hover:underline">
            {o.symbol}
          </Link>
          <Pill>{o.type}</Pill>
          <Pill tone={tone}>{o.status}</Pill>
          <span className="text-xs text-ink-500">{acc}</span>
          {o.source !== "manual" && <span className="text-[10px] text-ink-500">{o.source.replace("_", " ")}</span>}
        </div>
        <p className="mt-0.5 text-xs text-ink-400">
          {o.status === "filled"
            ? `${o.fillQty?.toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${fmtNative(o.fillPrice ?? 0, i.currency)} · ${fmtGbp(o.fillValueGbp ?? 0)}${o.feeGbp ? ` + ${fmtGbp(o.feeGbp)} FX` : ""} · ${fmtDateTime(o.filledAt ?? o.createdAt)}`
            : o.status === "pending"
              ? `${o.amountGbp ? fmtGbp(o.amountGbp) : `${o.qty} units`} · fills at ${fmtNative(o.limitPrice ?? 0, i.currency)} · placed ${fmtDateTime(o.createdAt)}`
              : `${o.note ?? o.status} · ${fmtDateTime(o.createdAt)}`}
        </p>
      </div>
      {onCancel && (
        <Button variant="ghost" onClick={onCancel} className="!py-1.5 !px-3 text-xs">
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Activity({ state }: { state: PortfolioState }) {
  const [filter, setFilter] = useState<"all" | Tx["type"]>("all");
  const rows = state.transactions.filter((t) => filter === "all" || t.type === filter).slice(0, 100);
  const acc = (id: string) => state.accounts.find((a) => a.id === id)?.type ?? "";
  const icon = (t: Tx["type"]) => (t === "reward" ? Gift : t === "dividend" ? Coins : t === "buy" || t === "sell" ? Receipt : t.startsWith("transfer") ? ArrowLeftRight : Banknote);
  return (
    <>
      <div className="mb-3">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { id: "all", label: "All" },
            { id: "buy", label: "Buys" },
            { id: "sell", label: "Sells" },
            { id: "dividend", label: "Dividends" },
            { id: "deposit", label: "Deposits" },
            { id: "transfer_in", label: "Transfers" },
            { id: "reward", label: "Rewards" },
          ]}
        />
      </div>
      <Card>
        <ul className="divide-y divide-ink-800">
          {rows.map((t) => {
            const Icon = icon(t.type);
            return (
              <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon className={`h-4 w-4 shrink-0 ${t.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-200 truncate">{t.note}</p>
                  <p className="text-[11px] text-ink-500">
                    {fmtDateTime(t.at)} · {acc(t.accountId)}
                  </p>
                </div>
                <Money v={t.type === "reward" ? (t.value ?? t.amount) : t.amount} sign className="text-sm" />
              </li>
            );
          })}
          {rows.length === 0 && <li className="py-3 text-sm text-ink-500">Nothing here yet.</li>}
        </ul>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------

function Automate({ state, pricer }: { state: PortfolioState; pricer: Pricer }) {
  const [accountId, setAccountId] = useState(state.accounts[0].id);
  const account = state.accounts.find((a) => a.id === accountId) ?? state.accounts[0];
  const [targets, setTargets] = useState<Record<string, number>>(account.targets);
  const [q, setQ] = useState("");
  const [topup, setTopup] = useState("500");
  const [msg, setMsg] = useState<Msg | null>(null);
  const results = q.trim() ? searchInstruments(q, 5).filter((i) => !(i.symbol in targets)) : [];
  const total = Object.values(targets).reduce((x, y) => x + y, 0);
  const saved = JSON.stringify(targets) === JSON.stringify(account.targets);

  const switchAccount = (id: string) => {
    setAccountId(id);
    setTargets(state.accounts.find((a) => a.id === id)?.targets ?? {});
    setMsg(null);
  };

  const plan = useMemo(() => smartTopUpPlan(state, account.id, parseFloat(topup) || 0, pricer), [state, account.id, topup, pricer]);
  const rebal = useMemo(() => rebalancePlan(state, account.id, pricer), [state, account.id, pricer]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-ink-300">Automation for</span>
        <Select value={account.id} onChange={(e) => switchAccount(e.target.value)} className="!w-auto">
          {state.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {fmtGbp(a.cash)} cash
            </option>
          ))}
        </Select>
      </div>

      {/* Target weights */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
            <Scale className="h-4 w-4 text-sky-400" /> Target weights
          </p>
          <span className={`text-xs font-mono ${Math.abs(total - 100) < 0.01 ? "text-emerald-400" : "text-amber-300"}`}>{total.toFixed(1)}% allocated</span>
        </div>
        <p className="text-xs text-ink-400 mb-3">Set how you want this account split. Savings plans, AutoInvest and rebalancing all work towards these weights.</p>

        {Object.keys(targets).length === 0 && <p className="text-sm text-ink-500 mb-3">No targets yet — add instruments below or start from a model portfolio.</p>}
        <div className="space-y-2">
          {Object.entries(targets).map(([sym, pct]) => {
            const i = getInstrument(sym)!;
            return (
              <div key={sym} className="flex items-center gap-2">
                <span className="w-14 font-bold text-white text-sm">{sym}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-ink-400">{i.name}</span>
                <input type="range" min={0} max={100} step={1} value={pct} onChange={(e) => setTargets({ ...targets, [sym]: Number(e.target.value) })} className="w-24 sm:w-40 accent-rose-500" />
                <input
                  type="number"
                  value={pct}
                  onChange={(e) => setTargets({ ...targets, [sym]: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="w-16 rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-right font-mono text-sm text-white"
                />
                <span className="text-xs text-ink-500">%</span>
                <button
                  onClick={() => {
                    const n = { ...targets };
                    delete n[sym];
                    setTargets(n);
                  }}
                  className="text-ink-500 hover:text-rose-400"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative mt-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add an instrument to the mix…" />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1">
              {results.map((r) => (
                <button
                  key={r.symbol}
                  onClick={() => {
                    setTargets({ ...targets, [r.symbol]: Math.max(0, 100 - total) || 10 });
                    setQ("");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-ink-800"
                >
                  <span className="w-14 font-bold text-white text-sm">{r.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-300">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              portfolio.setTargets(account.id, targets);
              setMsg({ ok: true, text: "Targets saved." });
            }}
            disabled={saved || Object.keys(targets).length === 0}
          >
            Save targets
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const keys = Object.keys(targets);
              if (!keys.length) return;
              const t = keys.reduce((x, k) => x + targets[k], 0) || 1;
              const n: Record<string, number> = {};
              keys.forEach((k) => (n[k] = Math.round((targets[k] / t) * 1000) / 10));
              setTargets(n);
            }}
          >
            Normalise to 100%
          </Button>
        </div>
      </Card>

      {/* Model portfolios */}
      <H2>Model portfolios</H2>
      <p className="text-xs text-ink-400 -mt-2 mb-3">Ready-made ETF mixes by risk level — like InvestEngine’s LifePlans or IG’s Smart Portfolios. Applying one sets this account’s target weights; you keep full control.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MODEL_PORTFOLIOS.map((m) => (
          <Card key={m.id} className="flex flex-col">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{m.name}</p>
              <span className="text-[10px] text-ink-400">risk {m.risk}/5</span>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full">
              <div className="bg-rose-500" style={{ width: `${m.equityPct}%` }} />
              <div className="bg-sky-500" style={{ width: `${100 - m.equityPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-500">
              {m.equityPct}% shares · {100 - m.equityPct}% bonds & gold · yield {modelYield(m)}% · OCF {modelOcf(m)}%
            </p>
            <p className="mt-2 flex-1 text-xs text-ink-400">{m.blurb}</p>
            <p className="mt-2 text-[11px] text-ink-500">
              {Object.entries(m.targets)
                .map(([k, v]) => `${k} ${v}%`)
                .join(" · ")}
            </p>
            <Button
              variant="ghost"
              className="mt-3"
              onClick={() => {
                setTargets(m.targets);
                portfolio.applyModel(account.id, m.id);
                setMsg({ ok: true, text: `${m.name} applied to ${account.name}.` });
              }}
            >
              Use {m.name}
            </Button>
          </Card>
        ))}
      </div>

      {/* Smart top-up & AutoInvest */}
      <H2>Invest cash towards targets</H2>
      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
            <PiggyBank className="h-4 w-4 text-emerald-400" /> Smart top-up
          </p>
          <p className="text-xs text-ink-400 mt-1 mb-3">Invest a lump sum so your most underweight targets are filled first.</p>
          <div className="flex gap-2">
            <Input type="number" inputMode="decimal" value={topup} onChange={(e) => setTopup(e.target.value)} placeholder="Amount £" />
            <Button
              onClick={() => {
                const r = portfolio.topUp(account.id, parseFloat(topup) || 0, pricer);
                setMsg(r.errors.length ? { ok: false, text: r.errors[0] } : { ok: true, text: `Invested across ${r.count} holding${r.count === 1 ? "" : "s"}.` });
              }}
              disabled={plan.length === 0 || (parseFloat(topup) || 0) > account.cash}
            >
              Invest
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-ink-500">{fmtGbp(account.cash)} cash available{(parseFloat(topup) || 0) > account.cash ? " — top up in Accounts first" : ""}.</p>
          {plan.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs">
              {plan.map((p) => (
                <li key={p.symbol} className="flex justify-between">
                  <span className="text-ink-300">Buy {p.symbol}</span>
                  <span className="font-mono text-white">{fmtGbp(p.amountGbp)}</span>
                </li>
              ))}
            </ul>
          )}
          {Object.keys(account.targets).length === 0 && <p className="mt-2 text-xs text-amber-300">Save target weights first.</p>}
        </Card>

        <Card>
          <p className="text-sm font-semibold text-white inline-flex items-center gap-1.5">
            <Repeat className="h-4 w-4 text-violet-400" /> AutoInvest
          </p>
          <p className="text-xs text-ink-400 mt-1 mb-3">Automatically puts spare cash — deposits, dividends, savings-plan contributions — to work at your target weights, keeping a buffer back.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-ink-200">
              <input type="checkbox" checked={account.autoInvest.enabled} onChange={(e) => portfolio.setAutoInvest(account.id, e.target.checked, account.autoInvest.buffer)} className="h-4 w-4 accent-rose-500" />
              {account.autoInvest.enabled ? "On" : "Off"}
            </label>
            <span className="text-xs text-ink-400">Cash buffer</span>
            <Input type="number" inputMode="decimal" value={account.autoInvest.buffer} onChange={(e) => portfolio.setAutoInvest(account.id, account.autoInvest.enabled, parseFloat(e.target.value) || 0)} className="!w-28" />
          </div>
          {account.autoInvest.enabled && Object.keys(account.targets).length === 0 && <p className="mt-2 text-xs text-amber-300">AutoInvest needs target weights to know what to buy.</p>}
        </Card>
      </div>

      {/* Rebalance */}
      <H2>One-click rebalance</H2>
      <Card>
        {Object.keys(account.targets).length === 0 ? (
          <p className="text-sm text-ink-500">Save target weights to see the trades that would bring this account back in line.</p>
        ) : rebal.length === 0 ? (
          <p className="text-sm text-emerald-300">This account is within 0.5% of its targets — nothing to do.</p>
        ) : (
          <>
            <ul className="space-y-1 text-sm mb-3">
              {rebal.map((l) => (
                <li key={l.symbol} className="flex items-center gap-2">
                  <span className={`w-10 text-xs font-bold uppercase ${l.side === "buy" ? "text-emerald-400" : "text-rose-400"}`}>{l.side}</span>
                  <span className="w-14 font-bold text-white">{l.symbol}</span>
                  <span className="flex-1 text-xs text-ink-400">
                    {l.currentPct}% → {l.targetPct}%
                  </span>
                  <span className="font-mono text-white">{fmtGbp(l.amountGbp)}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => {
                const r = portfolio.rebalance(account.id, pricer);
                setMsg(r.errors.length ? { ok: false, text: r.errors[0] } : { ok: true, text: `Rebalanced with ${r.legs.length} trade${r.legs.length === 1 ? "" : "s"}.` });
                if (!r.errors.length && r.legs.length) celebrateTrade({ kind: "rebalance", symbol: "", account: account.name, detail: `${r.legs.length} trade${r.legs.length === 1 ? "" : "s"} placed in your ${account.name}.` });
              }}
            >
              <Scale className="h-4 w-4" /> Rebalance now
            </Button>
          </>
        )}
      </Card>

      {/* Savings plans */}
      <H2>Savings plans</H2>
      <SavingsPlans state={state} account={account} />

      {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
    </>
  );
}

function SavingsPlans({ state, account }: { state: PortfolioState; account: PortfolioState["accounts"][number] }) {
  const [amount, setAmount] = useState("100");
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [target, setTarget] = useState("portfolio");
  const plans = state.savingsPlans.filter((p) => p.accountId === account.id);
  const freqLabel: Record<Frequency, string> = { weekly: "Weekly", fortnightly: "Fortnightly", monthly: "Monthly" };
  const popular = INSTRUMENTS.filter((i) => i.type === "etf" || ["AAPL", "LLOY", "BTC"].includes(i.symbol));
  return (
    <>
      <Card>
        <p className="text-xs text-ink-400 mb-3">
          Regular investing on autopilot — weekly, fortnightly or monthly contributions into one instrument or across your target weights, like InvestEngine’s Savings Plans and ii’s free regular investing. Contributions are virtual funds.
        </p>
        <div className="grid sm:grid-cols-4 gap-2">
          <Input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="£ per contribution" />
          <Select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </Select>
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="portfolio">Target weights (whole portfolio)</option>
            {popular.map((i) => (
              <option key={i.symbol} value={i.symbol}>
                {i.symbol} — {i.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={() => {
              const a = parseFloat(amount);
              if (!(a >= 1)) return;
              portfolio.addPlan({ accountId: account.id, amount: a, frequency: freq, target: target === "portfolio" ? { kind: "portfolio" } : { kind: "symbol", symbol: target }, nextRunAt: nextRun(Date.now(), freq) });
            }}
            disabled={!(parseFloat(amount) >= 1)}
          >
            <Plus className="h-4 w-4" /> Start plan
          </Button>
        </div>
      </Card>
      {plans.length > 0 && (
        <div className="mt-3 space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.07] bg-ink-900/70 shadow-card px-3.5 py-3">
              <Repeat className={`h-4 w-4 ${p.active ? "text-violet-400" : "text-ink-600"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white">
                  {fmtGbp(p.amount)} {freqLabel[p.frequency].toLowerCase()} → {p.target.kind === "symbol" ? p.target.symbol : "target weights"}
                </p>
                <p className="text-xs text-ink-500">
                  {p.active ? `Next ${fmtDateTime(p.nextRunAt)}` : "Paused"} · {p.runs} run{p.runs === 1 ? "" : "s"}
                </p>
              </div>
              <button onClick={() => portfolio.updatePlan(p.id, { nextRunAt: Date.now() - 1, active: true })} className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:bg-ink-800" title="Run this contribution now">
                <Play className="h-3 w-3" /> Run now
              </button>
              <button onClick={() => portfolio.updatePlan(p.id, { active: !p.active })} className="rounded-md border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:bg-ink-800">
                {p.active ? "Pause" : "Resume"}
              </button>
              <button onClick={() => portfolio.removePlan(p.id)} className="text-ink-500 hover:text-rose-400" aria-label="Delete plan">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Accounts({ state, summary }: { state: PortfolioState; summary: ReturnType<typeof summarise> }) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(state.accounts[0]?.id ?? "");
  const [to, setTo] = useState(state.accounts[1]?.id ?? "");
  const [xfer, setXfer] = useState("500");
  const [msg, setMsg] = useState<Msg | null>(null);
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-3">
        {summary.accounts.map((a) => (
          <Card key={a.account.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{a.account.name}</p>
              <Pill tone={a.account.type === "ISA" ? "emerald" : a.account.type === "SIPP" ? "violet" : "ink"}>{a.account.type}</Pill>
            </div>
            <p className="mt-1 text-xs text-ink-500">{ACCOUNT_META[a.account.type].blurb}</p>
            {ACCOUNT_META[a.account.type].allowance && <p className="text-[11px] text-ink-500">Allowance {ACCOUNT_META[a.account.type].allowance}</p>}
            <p className="mt-3 font-mono text-2xl font-bold text-white">{fmtGbp(a.value)}</p>
            <p className="text-xs text-ink-400">
              {fmtGbp(a.invested, { dp: 0 })} invested · {fmtGbp(a.cash, { dp: 0 })} cash
            </p>
            <div className="mt-3 flex gap-2">
              <Input type="number" inputMode="decimal" value={amounts[a.account.id] ?? "1000"} onChange={(e) => setAmounts({ ...amounts, [a.account.id]: e.target.value })} />
              <Button
                variant="ghost"
                onClick={() => {
                  portfolio.deposit(a.account.id, parseFloat(amounts[a.account.id] ?? "1000") || 0);
                  setMsg({ ok: true, text: `Added virtual funds to ${a.account.name}.` });
                }}
              >
                Top up
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  const err = portfolio.withdraw(a.account.id, parseFloat(amounts[a.account.id] ?? "1000") || 0);
                  setMsg(err ? { ok: false, text: err } : { ok: true, text: `Withdrew from ${a.account.name}.` });
                }}
              >
                Withdraw
              </Button>
            </div>
          </Card>
        ))}
        {(["ISA", "SIPP"] as AccountType[])
          .filter((t) => !state.accounts.some((a) => a.type === t))
          .map((t) => (
            <button key={t} onClick={() => portfolio.openAccount(t)} className="rounded-2xl border border-dashed border-ink-700 p-5 text-left hover:border-ink-500">
              <p className="text-sm font-semibold text-ink-200 flex items-center gap-1.5">
                <Landmark className="h-4 w-4" /> Open a {ACCOUNT_META[t].name}
              </p>
              <p className="mt-1 text-xs text-ink-500">{ACCOUNT_META[t].blurb}</p>
              <p className="mt-2 text-xs text-rose-400">Open now →</p>
            </button>
          ))}
      </div>

      {state.accounts.length > 1 && (
        <>
          <H2>Move money between accounts</H2>
          <Card>
            <div className="grid sm:grid-cols-4 gap-2">
              <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    From {a.name} ({fmtGbp(a.cash, { dp: 0 })})
                  </option>
                ))}
              </Select>
              <Select value={to} onChange={(e) => setTo(e.target.value)}>
                {state.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    To {a.name}
                  </option>
                ))}
              </Select>
              <Input type="number" inputMode="decimal" value={xfer} onChange={(e) => setXfer(e.target.value)} />
              <Button
                onClick={() => {
                  const err = portfolio.transfer(from, to, parseFloat(xfer) || 0);
                  setMsg(err ? { ok: false, text: err } : { ok: true, text: "Transfer complete." });
                }}
              >
                <ArrowLeftRight className="h-4 w-4" /> Move
              </Button>
            </div>
          </Card>
        </>
      )}
      {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}
    </>
  );
}
