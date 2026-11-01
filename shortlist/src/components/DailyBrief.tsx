"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Coffee, Sparkles } from "lucide-react";
import { useCoach } from "@/components/coach/CoachProvider";
import { INSTRUMENTS, fmtGbp } from "@/lib/instruments";
import { upcomingEvents, fmtEventDate } from "@/lib/events";

// "Your 60-second brief" — a Robinhood-Snacks-style digest of today: the
// biggest movers, your own day, and the next big event. Built from live data,
// with one tap to have the coach explain it.
export default function DailyBrief({ now, priceFor, closesFor, dayChange }: { now: number; priceFor: (s: string) => number; closesFor: (s: string) => number[]; dayChange: number }) {
  const coach = useCoach();
  const { up, down, event } = useMemo(() => {
    const rows = INSTRUMENTS.map((i) => {
      const c = closesFor(i.symbol);
      const p = priceFor(i.symbol);
      const prev = c[c.length - 2] || p;
      return { i, chg: prev ? (p / prev - 1) * 100 : 0 };
    }).sort((a, b) => b.chg - a.chg);
    const ev = upcomingEvents(now, 10).find((e) => e.impact === "high") ?? upcomingEvents(now, 10)[0];
    return { up: rows[0], down: rows[rows.length - 1], event: ev };
  }, [now, priceFor, closesFor]);

  const hour = new Date(now).getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="mt-4 rounded-3xl border border-ink-800 bg-gradient-to-br from-sky-950/40 to-ink-900 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-300">
          <Coffee className="h-4 w-4" /> {hello} · your 60-second brief
        </p>
      </div>
      <ul className="mt-2.5 space-y-1.5 text-sm text-ink-200">
        <li>
          📈 <Link href={`/i/${up.i.symbol}`} className="font-semibold text-white hover:underline">{up.i.name}</Link> leads today, <span className="text-emerald-300">+{up.chg.toFixed(1)}%</span>.
        </li>
        <li>
          📉 <Link href={`/i/${down.i.symbol}`} className="font-semibold text-white hover:underline">{down.i.name}</Link> is the biggest faller, <span className="text-rose-300">{down.chg.toFixed(1)}%</span>.
        </li>
        <li>
          💼 Your portfolio is <span className={dayChange >= 0 ? "text-emerald-300" : "text-rose-300"}>{fmtGbp(dayChange, { sign: true })}</span> today.
        </li>
        {event && (
          <li>
            🗓️ Coming up {fmtEventDate(event.date)}: <span className="text-white">{event.title}</span>.
          </li>
        )}
      </ul>
      <button onClick={() => coach.open(`Why is ${up.i.symbol} up and ${down.i.symbol} down today? Keep it simple.`)} className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-500/25">
        <Sparkles className="h-3.5 w-3.5" /> Explain today&apos;s moves
      </button>
    </section>
  );
}
