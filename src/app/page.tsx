"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Check, ShieldCheck, Target, Zap } from "lucide-react";
import Nav from "@/components/Nav";
import Sparkline from "@/components/Sparkline";
import { useNow } from "@/lib/useNow";
import { scanMarket, RISK_BUDGET, type ShortCandidate } from "@/lib/shorts";
import { useTakenShorts } from "@/lib/store";
import { dayChangePct } from "@/lib/market";

export default function Scanner() {
  const { now, mounted } = useNow();
  const { take, has } = useTakenShorts();

  const candidates = useMemo(() => (mounted ? scanMarket(now) : []), [now, mounted]);
  const best = candidates[0];

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />

      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-10">
        {/* Hero */}
        <section className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-900 bg-rose-950 px-3 py-1 text-xs font-semibold text-rose-300 mb-5">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-rose-400" /> Live market scan
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight max-w-2xl">
            Find the best stocks to short. Risk a little, win big.
          </h1>
          <p className="mt-3 text-ink-300 max-w-2xl leading-relaxed">
            Shortlist scans the market for stocks that are stretched, overbought and rolling over — then structures
            each idea so a wrong call loses a small, fixed amount and a right call pays a multiple of it.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, title: "Defined risk", body: `Every idea risks a fixed £${RISK_BUDGET}. The stop caps the loss — that's the "lose small".` },
              { icon: Target, title: "Asymmetric payoff", body: "Targets are 3–8× the risk. One winner pays for several stops." },
              { icon: Zap, title: "Ranked for you", body: "The whole market scored and sorted, best short setup first." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-ink-800 bg-ink-900 p-4">
                <Icon className="h-5 w-5 text-rose-400 mb-2" />
                <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                <p className="text-xs text-ink-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Top pick spotlight */}
        {mounted && best && (
          <Link
            href={`/short/${best.symbol}`}
            className="group block mb-8 rounded-2xl border border-rose-900 bg-gradient-to-br from-rose-950/60 to-ink-900 p-5 sm:p-6 hover:border-rose-700 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-300 mb-3">
              <span className="rounded-full bg-rose-900 px-2 py-0.5">TOP SETUP</span>
              <span className="text-ink-400">Highest-conviction short right now</span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{best.headline}</p>
                <p className="mt-1 text-sm text-ink-300">
                  {best.name} · reward:risk {best.structure.rewardRisk.toFixed(1)}:1 · short score {best.score}/100
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white group-hover:bg-rose-500 transition-colors">
                See the setup <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        )}

        {/* Ranked list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">Ranked short candidates</h2>
          <span className="text-xs text-ink-500">{mounted ? `${candidates.length} scanned` : "scanning…"}</span>
        </div>

        <div className="space-y-3">
          {!mounted && <SkeletonRows />}
          {mounted &&
            candidates.map((c, i) => (
              <CandidateRow
                key={c.symbol}
                rank={i + 1}
                c={c}
                now={now}
                tracked={has(c.symbol)}
                onTake={() =>
                  take({
                    symbol: c.symbol,
                    name: c.name,
                    entry: c.structure.entry,
                    stop: c.structure.stop,
                    target: c.structure.target,
                    shares: c.structure.shares,
                    maxLoss: c.structure.maxLoss,
                    maxGain: c.structure.maxGain,
                    rewardRisk: c.structure.rewardRisk,
                  })
                }
              />
            ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-600 max-w-xl mx-auto leading-relaxed">
          Educational simulation on a synthetic market — not investment advice. Real short selling carries uncapped risk
          unless a hard stop or defined-risk instrument is used.
        </p>
      </main>
    </div>
  );
}

function CandidateRow({
  rank,
  c,
  now,
  tracked,
  onTake,
}: {
  rank: number;
  c: ShortCandidate;
  now: number;
  tracked: boolean;
  onTake: () => void;
}) {
  const chg = dayChangePct(c.symbol, now);
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4 hover:border-ink-600 transition-colors">
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-800 text-xs font-bold text-ink-400">
          {rank}
        </div>

        <Link href={`/short/${c.symbol}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{c.symbol}</span>
            <span className="truncate text-sm text-ink-400">{c.name}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className="font-mono text-ink-300">${c.structure.entry.toFixed(2)}</span>
            <span className={chg >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {chg >= 0 ? "+" : ""}
              {chg.toFixed(2)}%
            </span>
          </div>
        </Link>

        <div className="hidden md:block">
          <Sparkline symbol={c.symbol} now={now} />
        </div>

        <div className="hidden lg:block text-right w-40">
          <p className="text-xs text-ink-500">Risk → Reward</p>
          <p className="text-sm font-semibold text-white">
            <span className="text-rose-400">£{c.structure.maxLoss}</span> →{" "}
            <span className="text-emerald-400">£{c.structure.maxGain.toLocaleString()}</span>
          </p>
          <p className="text-xs text-ink-500">{c.structure.rewardRisk.toFixed(1)}:1</p>
        </div>

        <ScoreBadge score={c.score} grade={c.grade} />

        <button
          onClick={onTake}
          disabled={tracked}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            tracked ? "bg-ink-800 text-ink-500 cursor-default" : "bg-rose-600 text-white hover:bg-rose-500"
          }`}
        >
          {tracked ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-4 w-4" /> Tracking
            </span>
          ) : (
            "Track"
          )}
        </button>
      </div>
    </div>
  );
}

function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  const tone =
    score >= 70
      ? "text-rose-300 border-rose-800 bg-rose-950"
      : score >= 50
        ? "text-amber-300 border-amber-800 bg-amber-950"
        : "text-ink-400 border-ink-700 bg-ink-800";
  return (
    <div className={`shrink-0 w-12 text-center rounded-lg border px-1 py-1.5 ${tone}`}>
      <p className="text-base font-bold leading-none">{score}</p>
      <p className="text-[10px] mt-0.5 opacity-80">{grade}</p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[68px] rounded-xl border border-ink-800 bg-ink-900 animate-pulse" />
      ))}
    </>
  );
}
