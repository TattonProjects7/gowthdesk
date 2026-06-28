"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, Check, ShieldAlert, TrendingDown } from "lucide-react";
import Nav from "@/components/Nav";
import Sparkline from "@/components/Sparkline";
import ThesisPanel from "@/components/ThesisPanel";
import { useMarket } from "@/lib/useMarket";
import { candidateFor } from "@/lib/shorts";
import { UNIVERSE } from "@/lib/market";
import { squeezeTone } from "@/lib/squeeze";
import { useTakenShorts } from "@/lib/store";

export default function ShortDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol || "").toUpperCase();
  const valid = UNIVERSE.some((t) => t.symbol === symbol);

  const { mounted, priceFor, closesFor } = useMarket();
  const { take, has } = useTakenShorts();

  const c = useMemo(() => (mounted && valid ? candidateFor(symbol, closesFor(symbol)) : null), [mounted, valid, symbol, closesFor]);
  const price = mounted && valid ? priceFor(symbol) : 0;

  if (!valid) {
    return (
      <div className="min-h-screen bg-ink-950">
        <Nav />
        <main className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-ink-300">No coverage for “{symbol}”.</p>
          <Link href="/" className="mt-4 inline-block text-rose-400 hover:underline">
            ← Back to scanner
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />
      <main className="mx-auto max-w-3xl px-5 sm:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" /> Scanner
        </Link>

        {!c ? (
          <div className="h-96 rounded-2xl border border-ink-800 bg-ink-900 animate-pulse" />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-3xl font-bold text-white">{c.symbol}</h1>
                  <span className="rounded-md bg-rose-950 border border-rose-900 px-2 py-0.5 text-xs font-semibold text-rose-300">SHORT</span>
                </div>
                <p className="text-ink-400">{c.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-bold text-white">${price.toFixed(2)}</p>
                <p className="text-xs text-ink-500">live · score {c.score}/100 ({c.grade})</p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-rose-900 bg-gradient-to-br from-rose-950/40 to-ink-900 p-5">
              <p className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-400" /> {c.headline}
              </p>
            </div>

            {/* Squeeze Risk Radar — the standout safeguard */}
            <SqueezeRadar c={c} />

            {/* Structured trade */}
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400 mb-3">The structured trade</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <Stat label="Entry (short at)" value={`$${c.structure.entry.toFixed(2)}`} />
              <Stat label="Stop (you're wrong)" value={`$${c.structure.stop.toFixed(2)}`} tone="rose" sub={`+${(c.structure.stopPct * 100).toFixed(1)}%`} />
              <Stat label="Target (thesis done)" value={`$${c.structure.target.toFixed(2)}`} tone="emerald" sub={`−${(c.structure.targetPct * 100).toFixed(1)}%`} />
              <Stat label="Size" value={`${c.structure.shares} sh`} sub={`$${(c.structure.shares * c.structure.entry).toLocaleString()}`} />
            </div>

            <PayoffBar entry={c.structure.entry} stop={c.structure.stop} target={c.structure.target} price={price} />

            <div className="mt-5 grid grid-cols-3 gap-3">
              <BigStat label="Max loss" value={`−£${c.structure.maxLoss}`} tone="rose" caption="capped — lose small" />
              <BigStat label="Max gain" value={`+£${c.structure.maxGain.toLocaleString()}`} tone="emerald" caption="the big win" />
              <BigStat label="Reward : risk" value={`${c.structure.rewardRisk.toFixed(1)}:1`} tone="white" caption="asymmetry" />
            </div>

            {/* AI dual thesis */}
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400 mb-3">Both sides of the trade</h2>
            <ThesisPanel c={c} />

            {/* Why */}
            <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-ink-400 mb-3">Why it’s on the shortlist</h2>
            <div className="space-y-2 mb-6">
              {c.reasons.length === 0 && <p className="text-sm text-ink-400">No strong signals right now — this one ranks low for a reason.</p>}
              {c.reasons.map((r) => (
                <div key={r.label} className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900 p-3.5">
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${
                      r.weight >= 0 ? "bg-rose-950 text-rose-300 border border-rose-900" : "bg-emerald-950 text-emerald-300 border border-emerald-900"
                    }`}
                  >
                    {r.weight >= 0 ? `+${Math.round(r.weight)}` : Math.round(r.weight)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{r.label}</p>
                    <p className="text-sm text-ink-400">{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Signals + chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">30-day price</p>
                <Sparkline points={closesFor(c.symbol)} width={260} height={70} />
              </div>
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1">Signals</p>
                <Row k="RSI (14)" v={c.signals.rsi.toFixed(0)} hot={c.signals.rsi >= 68} />
                <Row k="Stretch vs mean" v={`${c.signals.zscore >= 0 ? "+" : ""}${c.signals.zscore.toFixed(1)}σ`} hot={c.signals.zscore >= 1.5} />
                <Row k="30-day trend" v={`${c.signals.trend30 >= 0 ? "+" : ""}${c.signals.trend30.toFixed(1)}%`} />
                <Row k="5-day momentum" v={`${c.signals.accel5 >= 0 ? "+" : ""}${c.signals.accel5.toFixed(1)}%`} hot={c.signals.accel5 < 0} />
                <Row k="Daily volatility" v={`${(c.signals.volatility * 100).toFixed(1)}%`} hot={c.signals.volatility >= 0.03} />
                <Row k="10d vs 30d avg" v={c.signals.belowShortMa ? "below (bearish)" : "above"} hot={c.signals.belowShortMa} />
              </div>
            </div>

            <button
              onClick={() =>
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
              disabled={has(c.symbol)}
              className={`w-full rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors ${
                has(c.symbol) ? "bg-ink-800 text-ink-500 cursor-default" : "bg-rose-600 text-white hover:bg-rose-500"
              }`}
            >
              {has(c.symbol) ? (
                <span className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4" /> Tracking this short — watch it in My shorts
                </span>
              ) : (
                "Track this short"
              )}
            </button>
          </>
        )}
      </main>
    </div>
  );
}

function SqueezeRadar({ c }: { c: import("@/lib/shorts").ShortCandidate }) {
  const sq = c.squeeze;
  const tone = squeezeTone(sq.level);
  return (
    <div className={`rounded-2xl border p-5 ${tone.border} ${tone.bg}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className={`flex items-center gap-2 font-semibold ${tone.text}`}>
          <ShieldAlert className="h-5 w-5" /> Short-squeeze risk: {sq.level.toUpperCase()}
        </p>
        <div className="text-right">
          <p className={`text-2xl font-bold ${tone.text}`}>{sq.score}</p>
          <p className="text-[10px] text-ink-400 uppercase">/100 risk</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Mini label="Short interest" value={`${sq.shortInterestPctFloat.toFixed(1)}%`} sub="of float" />
        <Mini label="Days to cover" value={sq.daysToCover.toFixed(1)} sub="shorts trapped" />
        <Mini label="Borrow fee" value={`${sq.borrowFeePct.toFixed(1)}%`} sub={sq.hardToBorrow ? "hard to borrow" : "per year"} />
      </div>
      <p className="text-sm text-ink-200/90">{sq.verdict}</p>
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-ink-800 bg-ink-950/40 p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono font-bold text-white">{value}</p>
      <p className="text-[10px] text-ink-500">{sub}</p>
    </div>
  );
}

function PayoffBar({ entry, stop, target, price }: { entry: number; stop: number; target: number; price: number }) {
  const lo = target;
  const hi = stop;
  const pct = (v: number) => Math.max(0, Math.min(100, ((hi - v) / (hi - lo)) * 100));
  const entryPos = pct(entry);
  const pricePos = pct(price);

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-emerald-400 font-semibold">target ${target.toFixed(2)}</span>
        <span className="text-ink-400">entry ${entry.toFixed(2)}</span>
        <span className="text-rose-400 font-semibold">stop ${stop.toFixed(2)}</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-500/70 via-ink-700 to-rose-500/70">
        <div className="absolute top-1/2 -translate-y-1/2 h-5 w-0.5 bg-ink-300" style={{ left: `${entryPos}%` }} />
        <div
          className="absolute -top-1.5 h-6 w-1 rounded-full bg-white shadow ring-2 ring-ink-950 transition-all duration-500"
          style={{ left: `calc(${pricePos}% - 2px)` }}
        />
      </div>
      <div className="mt-2 text-center text-xs text-ink-400">
        live ${price.toFixed(2)} — the white marker drifts left as the short wins, right as it loses
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone = "white" }: { label: string; value: string; sub?: string; tone?: "white" | "rose" | "emerald" }) {
  const c = tone === "rose" ? "text-rose-300" : tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-3">
      <p className="text-[11px] text-ink-500 leading-tight">{label}</p>
      <p className={`mt-1 font-mono font-bold ${c}`}>{value}</p>
      {sub && <p className="text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

function BigStat({ label, value, caption, tone }: { label: string; value: string; caption: string; tone: "rose" | "emerald" | "white" }) {
  const c =
    tone === "rose"
      ? "text-rose-300 border-rose-900 bg-rose-950/40"
      : tone === "emerald"
        ? "text-emerald-300 border-emerald-900 bg-emerald-950/40"
        : "text-white border-ink-700 bg-ink-800";
  return (
    <div className={`rounded-xl border p-3.5 text-center ${c}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="text-[11px] opacity-70">{caption}</p>
    </div>
  );
}

function Row({ k, v, hot }: { k: string; v: string; hot?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-400">{k}</span>
      <span className={`font-mono ${hot ? "text-rose-300 font-semibold" : "text-ink-200"}`}>{v}</span>
    </div>
  );
}
