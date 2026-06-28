"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Plus, X, Brain, Check } from "lucide-react";
import type { Profile, LifeDate, Bill, Account, DateKind } from "@/lib/lifeos/types";
import { createBlankProfile, uid } from "@/lib/lifeos/store";

interface Props {
  onComplete: (p: Profile) => void;
  onCancel?: () => void;
}

const KINDS: { value: DateKind; label: string }[] = [
  { value: "birthday", label: "🎂 Birthday" },
  { value: "renewal", label: "🔁 Renewal" },
  { value: "appointment", label: "📅 Appointment" },
  { value: "event", label: "⭐ Event" },
];

const input = "w-full rounded-xl border border-ink-700 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder:text-ink-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-ink-400 mb-1.5";

export default function Onboarding({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("United Kingdom");
  const [dates, setDates] = useState<LifeDate[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [balance, setBalance] = useState("");
  const [savings, setSavings] = useState("");

  function finish() {
    const p = createBlankProfile(name, location);
    p.dates = dates.filter(d => d.label.trim() && d.date);
    p.bills = bills.filter(b => b.label.trim() && b.amount > 0);
    const accts: Account[] = [];
    if (balance) accts.push({ id: uid("a"), label: "Current account", balance: Number(balance) || 0, kind: "current" });
    if (savings) accts.push({ id: uid("a"), label: "Savings", balance: Number(savings) || 0, kind: "savings" });
    p.accounts = accts;
    onComplete(p);
  }

  const steps = ["You", "Key dates", "Money"];

  return (
    <div className="flex flex-col h-full">
      {/* Progress header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold">Set up LifeOS</span>
          {onCancel && (
            <button onClick={onCancel} className="ml-auto text-ink-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {steps.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-violet-500" : "bg-ink-700"}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Let&apos;s make it yours</h2>
              <p className="text-sm text-ink-400">Nothing here is fabricated — you tell LifeOS about your life, and it stays on your device.</p>
            </div>
            <div>
              <span className={label}>What should I call you?</span>
              <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoFocus />
            </div>
            <div>
              <span className={label}>Where are you based?</span>
              <input className={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, country" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-1">Key dates</h2>
              <p className="text-sm text-ink-400">Birthdays, renewals, appointments — the things you don&apos;t want to forget.</p>
            </div>
            {dates.map((d, i) => (
              <div key={d.id} className="rounded-xl border border-ink-700 bg-ink-900 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <input className={input} value={d.label} placeholder="e.g. Mum's birthday"
                    onChange={e => setDates(updateAt(dates, i, { label: e.target.value }))} />
                  <button onClick={() => setDates(dates.filter((_, x) => x !== i))} className="shrink-0 text-ink-500 hover:text-rose-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input type="date" className={input} value={d.date}
                    onChange={e => setDates(updateAt(dates, i, { date: e.target.value }))} />
                  <select className={input} value={d.kind}
                    onChange={e => setDates(updateAt(dates, i, { kind: e.target.value as DateKind, recurring: e.target.value === "birthday" ? "yearly" : d.recurring }))}>
                    {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button
              onClick={() => setDates([...dates, { id: uid("d"), label: "", date: "", kind: "birthday", recurring: "yearly" }])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-2.5 text-sm text-ink-300 hover:border-violet-500 hover:text-white"
            >
              <Plus className="h-4 w-4" /> Add a date
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">Your money</h2>
              <p className="text-sm text-ink-400">Roughly what&apos;s in the bank and what leaves each month. Powers the affordability tools.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className={label}>Current account £</span>
                <input className={input} inputMode="numeric" value={balance} onChange={e => setBalance(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="1840" />
              </div>
              <div>
                <span className={label}>Savings £</span>
                <input className={input} inputMode="numeric" value={savings} onChange={e => setSavings(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="3600" />
              </div>
            </div>
            <div>
              <span className={label}>Monthly bills</span>
              <div className="space-y-2">
                {bills.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <input className={input} value={b.label} placeholder="e.g. Mortgage"
                      onChange={e => setBills(updateAt(bills, i, { label: e.target.value }))} />
                    <input className={`${input} w-20`} inputMode="numeric" value={b.amount || ""} placeholder="£"
                      onChange={e => setBills(updateAt(bills, i, { amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))} />
                    <input className={`${input} w-16`} inputMode="numeric" value={b.dayOfMonth || ""} placeholder="day"
                      onChange={e => setBills(updateAt(bills, i, { dayOfMonth: Math.min(31, Number(e.target.value.replace(/[^0-9]/g, "")) || 1) }))} />
                    <button onClick={() => setBills(bills.filter((_, x) => x !== i))} className="shrink-0 text-ink-500 hover:text-rose-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setBills([...bills, { id: uid("b"), label: "", amount: 0, dayOfMonth: 1, category: "Bills" }])}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-2.5 text-sm text-ink-300 hover:border-violet-500 hover:text-white"
              >
                <Plus className="h-4 w-4" /> Add a bill
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center gap-3 border-t border-ink-800 px-5 py-4">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-4 py-2.5 text-sm text-ink-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : <div />}
        {step < 2 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !name.trim()}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={finish} className="ml-auto flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500">
            <Check className="h-4 w-4" /> Finish setup
          </button>
        )}
      </div>
    </div>
  );
}

function updateAt<T>(arr: T[], i: number, patch: Partial<T>): T[] {
  return arr.map((item, x) => (x === i ? { ...item, ...patch } : item));
}
