"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle, Sparkles } from "lucide-react";
import { useCoach } from "@/components/coach/CoachProvider";
import { getLesson, getTerm } from "@/lib/learn/content";

// "Tap to explain": wraps a label; tapping shows a plain-English definition,
// the lesson that teaches it, and a shortcut to ask the AI coach.
export default function ExplainTerm({ term, children }: { term: string; children: ReactNode }) {
  const t = getTerm(term);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const coach = useCoach();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  if (!t) return <>{children}</>;
  const lesson = t.lesson ? getLesson(t.lesson) : undefined;
  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-0.5 underline decoration-dotted decoration-ink-600 underline-offset-2 hover:text-white" aria-expanded={open}>
        {children}
        <HelpCircle className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <span className="fade-in absolute left-0 top-full z-40 mt-1.5 block w-64 rounded-2xl border border-ink-700 bg-ink-900 p-3 text-left shadow-2xl">
          <span className="block text-sm font-semibold text-white">{t.term}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-300">{t.short}</span>
          <span className="mt-2 flex flex-wrap gap-3 text-xs">
            {lesson && (
              <Link href={`/learn/${lesson.id}`} className="font-medium text-rose-300 hover:underline">
                2-min lesson →
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                coach.open(`Explain ${t.term} using the instrument I'm looking at as an example`);
              }}
              className="inline-flex items-center gap-1 font-medium text-violet-300 hover:underline"
            >
              <Sparkles className="h-3 w-3" /> Ask the coach
            </button>
          </span>
        </span>
      )}
    </span>
  );
}
