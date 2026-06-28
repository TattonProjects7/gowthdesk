"use client";

import { useState } from "react";
import { Check, AlertTriangle, Wallet } from "lucide-react";
import type { Profile } from "@/lib/lifeos/types";
import {
  simulateAffordability, formatGBP, spendableBalance, netWorth, projectCashflow,
} from "@/lib/lifeos/derive";

interface Props {
  profile: Profile;
  now: Date;
}

export default function MoneyTab({ profile, now }: Props) {
  const [amount, setAmount] = useState(1000);
  const [whenDays, setWhenDays] = useState(7);

  const spendable = spendableBalance(profile);
  const proj = projectCashflow(profile, now, 30);
  const sim = simulateAffordability(profile, now, amount, whenDays, 30);

  const KIND_LABEL: Record<string, string> = { current: "Current", savings: "Savings", investment: "Investments" };

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Money</h1>
        <p className="text-ink-400 text-sm">What&apos;s really safe to spend this month.</p>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-ink-700 bg-gradient-to-br from-violet-950 to-ink-900 p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Spendable now</p>
          <p className="text-2xl font-bold">{formatGBP(spendable)}</p>
        </div>
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Net worth</p>
          <p className="text-2xl font-bold">{formatGBP(netWorth(profile))}</p>
        </div>
      </div>

      {/* Affordability simulator */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">Can I afford it?</h2>
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-ink-200">How much?</span>
              <span className="text-lg font-bold text-violet-300">{formatGBP(amount)}</span>
            </div>
            <input type="range" min={50} max={Math.max(5000, Math.round(spendable))} step={50}
              value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full accent-violet-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-ink-200">When?</span>
              <span className="text-sm font-semibold text-ink-100">{whenDays === 0 ? "Today" : `in ${whenDays} day${whenDays === 1 ? "" : "s"}`}</span>
            </div>
            <input type="range" min={0} max={30} step={1}
              value={whenDays} onChange={e => setWhenDays(Number(e.target.value))} className="w-full accent-violet-500" />
          </div>

          <div className={`rounded-xl border p-3.5 ${sim.canAfford ? "border-emerald-800 bg-emerald-950/50" : "border-amber-800 bg-amber-950/40"}`}>
            <div className="flex items-center gap-2 mb-1">
              {sim.canAfford
                ? <Check className="h-4 w-4 text-emerald-400" />
                : <AlertTriangle className="h-4 w-4 text-amber-400" />}
              <span className={`text-sm font-bold ${sim.canAfford ? "text-emerald-400" : "text-amber-400"}`}>
                {sim.canAfford ? "Yes — you can afford this" : "Careful — this is tight"}
              </span>
            </div>
            <p className="text-xs text-ink-300 leading-relaxed">{sim.verdict}</p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-ink-900/60 p-2">
                <p className="text-[10px] uppercase tracking-wider text-ink-500">Lowest, if you buy</p>
                <p className={`text-sm font-bold ${sim.lowAfter < sim.buffer ? "text-amber-400" : "text-ink-100"}`}>{formatGBP(sim.lowAfter)}</p>
              </div>
              <div className="rounded-lg bg-ink-900/60 p-2">
                <p className="text-[10px] uppercase tracking-wider text-ink-500">Lowest, if you don&apos;t</p>
                <p className="text-sm font-bold text-ink-100">{formatGBP(sim.lowWithout)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accounts */}
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink-500">
          <Wallet className="h-3.5 w-3.5" /> Accounts
        </h2>
        <div className="rounded-2xl border border-ink-700 bg-ink-900 divide-y divide-ink-800 overflow-hidden">
          {profile.accounts.length === 0 && (
            <p className="px-4 py-5 text-center text-sm text-ink-500">No accounts yet — add them in setup.</p>
          )}
          {profile.accounts.map(a => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm text-ink-100">{a.label}</p>
                <p className="text-[11px] text-ink-500">{KIND_LABEL[a.kind] ?? a.kind}</p>
              </div>
              <span className="text-sm font-semibold text-ink-100">{formatGBP(a.balance)}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] text-ink-600">
        Projection assumes your logged bills and one-offs. Lowest point this month: {formatGBP(proj.low)}.
      </p>
    </div>
  );
}
