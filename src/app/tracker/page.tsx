"use client";

import Link from "next/link";
import { Radar, Trophy, X } from "lucide-react";
import Nav from "@/components/Nav";
import { useNow } from "@/lib/useNow";
import { useTakenShorts, shortPnl, shortState, shortProgress, type TakenShort } from "@/lib/store";
import { priceAt } from "@/lib/market";

export default function Tracker() {
  const { now, mounted } = useNow();
  const { items, drop } = useTakenShorts();

  const ready = mounted;
  const totalPnl = ready ? items.reduce((a, t) => a + shortPnl(t, now), 0) : 0;
  const wins = ready ? items.filter((t) => shortState(t, now) === "won").length : 0;
  const stopped = ready ? items.filter((t) => shortState(t, now) === "stopped").length : 0;

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 sm:px-8 py-10">
        <h1 className="text-2xl font-bold text-white mb-1">My shorts</h1>
        <p className="text-ink-400 mb-6">Watch the asymmetry play out — losses stay capped, winners run to target.</p>

        {ready && items.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-7">
            <Summary label="Open P&L" value={`${totalPnl >= 0 ? "+" : ""}£${Math.round(totalPnl).toLocaleString()}`} tone={totalPnl >= 0 ? "emerald" : "rose"} />
            <Summary label="Hit target" value={`${wins}`} tone="emerald" />
            <Summary label="Stopped out" value={`${stopped}`} tone="rose" />
          </div>
        )}

        {!ready && <div className="h-40 rounded-2xl border border-ink-800 bg-ink-900 animate-pulse" />}

        {ready && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-900 p-10 text-center">
            <Radar className="mx-auto h-8 w-8 text-ink-500 mb-3" />
            <p className="text-ink-300 font-medium">No shorts tracked yet.</p>
            <p className="text-ink-500 text-sm mb-5">Pick a setup from the scanner and watch it run.</p>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
              <Radar className="h-4 w-4" /> Open the scanner
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {ready && items.map((t) => <TrackedCard key={t.id} t={t} now={now} onDrop={() => drop(t.id)} />)}
        </div>
      </main>
    </div>
  );
}

function TrackedCard({ t, now, onDrop }: { t: TakenShort; now: number; onDrop: () => void }) {
  const price = priceAt(t.symbol, now);
  const pnl = shortPnl(t, now);
  const state = shortState(t, now);
  const progress = shortProgress(t, now);

  const badge =
    state === "won"
      ? { text: "TARGET HIT", cls: "bg-emerald-950 text-emerald-300 border-emerald-800" }
      : state === "stopped"
        ? { text: "STOPPED OUT", cls: "bg-rose-950 text-rose-300 border-rose-800" }
        : { text: "OPEN", cls: "bg-ink-800 text-ink-300 border-ink-700" };

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Link href={`/short/${t.symbol}`} className="font-bold text-white hover:underline">
            {t.symbol}
          </Link>
          <span className="text-sm text-ink-400">{t.name}</span>
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.text}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className={`font-mono font-bold ${pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {pnl >= 0 ? "+" : ""}£{Math.round(pnl).toLocaleString()}
            </p>
            <p className="text-[11px] text-ink-500">live ${price.toFixed(2)}</p>
          </div>
          <button onClick={onDrop} className="text-ink-500 hover:text-rose-400" aria-label="Stop tracking">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* progress from stop → target */}
      <div className="relative h-2 rounded-full bg-ink-800 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${state === "stopped" ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-500">
        <span className="text-rose-400">
          stop ${t.stop.toFixed(2)} · −£{t.maxLoss}
        </span>
        <span>entry ${t.entry.toFixed(2)}</span>
        <span className="text-emerald-400 inline-flex items-center gap-1">
          <Trophy className="h-3 w-3" /> target ${t.target.toFixed(2)} · +£{t.maxGain.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" }) {
  const c = tone === "emerald" ? "text-emerald-300" : "text-rose-300";
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900 p-4 text-center">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${c}`}>{value}</p>
    </div>
  );
}
