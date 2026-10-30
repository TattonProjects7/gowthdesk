"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Sparkles, Wallet } from "lucide-react";
import { learn, useLearn } from "@/lib/learn/store";
import type { Experience } from "@/lib/learn/progress";

// First-run welcome: what the app is, and how experienced you are (this sets
// the coach's tone and which learning path is suggested first).
export default function Onboarding({ onDone }: { onDone?: () => void }) {
  const s = useLearn();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || s.profile.onboarded) return null;

  const choose = (e: Experience) => {
    learn.setExperience(e);
    onDone?.();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/75 fade-in" />
      <div className="sheet-up relative w-full max-w-md rounded-t-3xl border border-ink-700 bg-gradient-to-b from-ink-900 to-ink-950 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-violet-600 text-3xl shadow-lg">👋</div>
        <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight text-white">Welcome to Shortlist</h2>
        <p className="mt-1 text-center text-sm text-ink-400">The investing app that teaches you as you go.</p>

        <ul className="mt-5 space-y-3 text-sm">
          <li className="flex gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <span className="text-ink-200">
              <b className="text-white">£10,000 of practice money</b> to invest in real UK and US shares, ETFs and crypto prices.
            </span>
          </li>
          <li className="flex gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
            <span className="text-ink-200">
              <b className="text-white">2-minute lessons</b> that pay practice cash, plus streaks, missions and badges.
            </span>
          </li>
          <li className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <span className="text-ink-200">
              <b className="text-white">An AI coach</b> that explains anything and reviews your portfolio.
            </span>
          </li>
        </ul>

        <p className="mt-6 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">How much investing have you done?</p>
        <div className="mt-2 grid gap-2">
          {(
            [
              ["beginner", "🌱", "I'm brand new", "Start with the basics"],
              ["intermediate", "📈", "I've invested a bit", "Charts, risk and orders"],
              ["advanced", "🧠", "I'm experienced", "Shorting and defined risk"],
            ] as [Experience, string, string, string][]
          ).map(([id, emoji, title, sub]) => (
            <button key={id} onClick={() => choose(id)} className="flex items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900 px-4 py-3 text-left transition-colors hover:border-rose-600 active:scale-[0.99]">
              <span className="text-2xl">{emoji}</span>
              <span className="flex-1">
                <span className="block font-semibold text-white">{title}</span>
                <span className="block text-xs text-ink-400">{sub}</span>
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => learn.dismissOnboarding()} className="mt-3 w-full text-center text-xs text-ink-500 hover:text-ink-300">
          Skip for now
        </button>
      </div>
    </div>
  );
}
