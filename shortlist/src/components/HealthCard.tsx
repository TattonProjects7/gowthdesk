"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, HeartPulse, Sparkles } from "lucide-react";
import { useCoach } from "@/components/coach/CoachProvider";
import { healthCheck } from "@/lib/health";
import { getLesson } from "@/lib/learn/content";
import type { PortfolioState, Pricer } from "@/lib/portfolio";

// Portfolio health score with expandable factors, each linked to a lesson,
// and a one-tap "explain it with AI".
export default function HealthCard({ state, pricer, closesFor }: { state: PortfolioState; pricer: Pricer; closesFor: (s: string) => number[] }) {
  const h = useMemo(() => healthCheck(state, pricer, closesFor), [state, pricer, closesFor]);
  const [open, setOpen] = useState(false);
  const coach = useCoach();
  if (h.score == null) return null;
  const color = h.score >= 72 ? "#34d399" : h.score >= 50 ? "#fbbf24" : "#fb7185";
  const C = 2 * Math.PI * 26;
  return (
    <section className="mt-4 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#252a47" strokeWidth="7" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(h.score / 100) * C} ${C}`} style={{ transition: "stroke-dasharray 700ms ease" }} />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-mono text-lg font-bold text-white">{h.score}</span>
            <span className="text-[9px] text-ink-400">/100</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <HeartPulse className="h-4 w-4 text-rose-300" /> Portfolio health · {h.grade}
          </p>
          <p className="mt-0.5 text-sm text-white">{h.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => coach.open("Explain my portfolio health score and what I could improve first")} className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-500/25">
              <Sparkles className="h-3.5 w-3.5" /> Explain with AI
            </button>
            <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-ink-700 px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800">
              {open ? "Hide" : "See"} breakdown {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <ul className="mt-4 space-y-2.5">
          {h.factors.map((f) => {
            const lesson = f.lesson ? getLesson(f.lesson) : undefined;
            const tone = f.status === "good" ? "bg-emerald-400" : f.status === "ok" ? "bg-amber-400" : "bg-rose-400";
            return (
              <li key={f.id} className="rounded-2xl bg-ink-950/60 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{f.label}</span>
                  <span className="font-mono text-xs text-ink-400">
                    {f.points}/{f.max}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div className={`h-full rounded-full ${tone}`} style={{ width: `${(f.points / f.max) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-ink-300">{f.detail}</p>
                <p className="text-xs text-ink-400">
                  {f.tip}{" "}
                  {lesson && f.status !== "good" && (
                    <Link href={`/learn/${lesson.id}`} className="text-rose-300 hover:underline">
                      Learn: {lesson.title} →
                    </Link>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
