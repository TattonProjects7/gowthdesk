"use client";

import AdSlot from "@/components/ads/AdSlot";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, Flame, Gift, GraduationCap, Lock, Search, Sparkles, Trophy } from "lucide-react";
import Nav from "@/components/Nav";
import LevelRing from "@/components/learn/LevelRing";
import { Card, H2 } from "@/components/ui";
import { useCoach } from "@/components/coach/CoachProvider";
import { GLOSSARY, LESSONS, START_TRACK, TRACKS, lessonsFor } from "@/lib/learn/content";
import { BADGES, dailyQuestion, dayKey, levelFor, liveStreak, suggestedLesson, trackProgress } from "@/lib/learn/progress";
import { MISSIONS } from "@/lib/learn/missions";
import { learn, useLearn } from "@/lib/learn/store";

// Shortlist Academy — Robinhood Learn's bite-size lessons plus a daily
// question, missions that turn lessons into habits, badges, and an AI coach.
export default function LearnHub() {
  const s = useLearn();
  const coach = useCoach();
  const [now, setNow] = useState(0);
  const [q, setQ] = useState("");
  useEffect(() => setNow(Date.now()), []);

  const lvl = levelFor(s.xp);
  const streak = now ? liveStreak(s.streak, now) : 0;
  const next = suggestedLesson(s, START_TRACK[s.profile.experience ?? "beginner"]);
  const doneCount = Object.keys(s.lessons).length;
  const missionsDone = Object.keys(s.missions).length;
  const terms = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return GLOSSARY.filter((t) => t.term.toLowerCase().includes(k) || t.aliases.some((a) => a.includes(k)) || t.short.toLowerCase().includes(k)).slice(0, 6);
  }, [q]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 sm:px-8 py-5 sm:py-8">
        {/* Hero: level, XP, streak, Learn & Earn */}
        <section className="overflow-hidden rounded-3xl border border-ink-800 bg-gradient-to-br from-blue-950/50 via-ink-900 to-ink-950 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <LevelRing level={lvl.level} pct={lvl.pct} size={72} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-medium text-blue-300">
                <GraduationCap className="h-4 w-4" /> Shortlist Academy
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">{lvl.title}</h1>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-700" style={{ width: `${lvl.pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-400">{lvl.next ? `${s.xp} / ${lvl.next} XP to level ${lvl.level + 1}` : `${s.xp} XP — top level!`}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <HeroChip icon={<Flame className={`h-4 w-4 ${streak ? "text-orange-400" : "text-ink-500"}`} />} label="Streak" value={streak === 1 ? "1 day" : `${streak} days`} />
            <HeroChip icon={<BookOpen className="h-4 w-4 text-sky-300" />} label="Lessons" value={`${doneCount}/${LESSONS.length}`} />
            <HeroChip icon={<Gift className="h-4 w-4 text-emerald-300" />} label="Earned" value={`£${s.earned.toFixed(0)}`} />
          </div>
        </section>

        {/* Continue + coach */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          {next ? (
            <Link href={`/learn/${next.id}`} className="group flex items-center gap-4 rounded-3xl border border-rose-900/70 bg-gradient-to-br from-rose-950/50 to-ink-900 p-4 transition-colors hover:border-rose-700">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600/20 text-3xl">{next.cards[0].emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-rose-300">{doneCount ? "Up next" : "Start here"}</span>
                <span className="block truncate text-base font-semibold text-white">{next.title}</span>
                <span className="block text-xs text-ink-400">
                  {next.minutes} min · +{next.xp} XP · +£{next.reward} practice cash
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-rose-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <Card tone="emerald">
              <p className="font-semibold text-white">🎉 You&apos;ve finished every lesson!</p>
              <p className="text-sm text-ink-300">Retake any lesson for a perfect score, or keep your streak going with the daily question.</p>
            </Card>
          )}
          <button onClick={() => coach.open()} className="flex items-center gap-3 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card p-4 text-left hover:border-ink-600">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white">
              <Sparkles className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-semibold text-white">Ask the AI coach</span>
              <span className="block text-xs text-ink-400">Explain anything, in plain English</span>
            </span>
          </button>
        </div>

        {/* Daily question */}
        {now > 0 && <DailyQuestion now={now} />}

        {/* Glossary search */}
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Look up a term — ${GLOSSARY.length} explained simply (ISA, RSI, ETF…)`}
            className="w-full rounded-2xl border border-ink-700 bg-ink-900 pl-10 pr-3 py-3 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
          />
        </div>
        {terms.length > 0 && (
          <div className="mt-2 space-y-2">
            {terms.map((t) => (
              <Card key={t.term} className="!p-3.5">
                <p className="text-sm font-semibold text-white">{t.term}</p>
                <p className="text-sm text-ink-400">{t.short}</p>
                <div className="mt-2 flex gap-3 text-xs">
                  {t.lesson && (
                    <Link href={`/learn/${t.lesson}`} className="text-rose-300 hover:underline">
                      Take the lesson →
                    </Link>
                  )}
                  <button onClick={() => coach.open(`Explain ${t.term} with an example`)} className="text-blue-300 hover:underline">
                    Ask the coach
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tracks */}
        <H2>Learning paths</H2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {TRACKS.map((t) => {
            const p = trackProgress(s, t.id);
            const ls = lessonsFor(t.id);
            return (
              <div key={t.id} className={`rounded-3xl border border-ink-800 bg-gradient-to-br ${t.gradient} p-4`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none">{t.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{t.title}</p>
                      <span className="rounded bg-ink-950/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-300">{t.level}</span>
                    </div>
                    <p className="text-xs text-ink-300">{t.blurb}</p>
                  </div>
                  <span className="font-mono text-xs text-ink-300">
                    {p.done}/{p.total}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {ls.map((l) => {
                    const done = s.lessons[l.id];
                    return (
                      <Link key={l.id} href={`/learn/${l.id}`} className="flex items-center gap-2.5 rounded-xl bg-ink-950/50 px-3 py-2 hover:bg-ink-950/80">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${done ? "bg-emerald-500 text-ink-950" : "bg-ink-800 text-ink-400"}`}>
                          {done ? <Check className="h-3.5 w-3.5" /> : l.cards[0].emoji}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-100">{l.title}</span>
                        <span className="text-[11px] text-ink-400">{done ? `${done.best}/${done.total}` : `${l.minutes}m · £${l.reward}`}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Missions */}
        <H2 right={<span className="text-xs text-ink-500">{missionsDone}/{MISSIONS.length} complete</span>}>Missions</H2>
        <p className="-mt-2 mb-3 text-xs text-ink-400">Put lessons into practice. Each one completes automatically the moment you do it.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MISSIONS.map((m) => {
            const done = Boolean(s.missions[m.id]);
            return (
              <Link key={m.id} href={m.href} className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-colors ${done ? "border-emerald-900/70 bg-emerald-950/20" : "border-ink-800 bg-ink-900 hover:border-ink-600"}`}>
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${done ? "text-emerald-200" : "text-white"}`}>{m.title}</span>
                  <span className="block truncate text-xs text-ink-400">{m.detail}</span>
                </span>
                {done ? (
                  <Check className="h-5 w-5 text-emerald-400" />
                ) : (
                  <span className="text-right text-[11px] leading-tight">
                    <span className="block font-bold text-amber-300">+{m.xp} XP</span>
                    <span className="block text-emerald-300">+£{m.reward}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Badges */}
        <H2 right={<span className="text-xs text-ink-500">{Object.keys(s.badges).length}/{BADGES.length}</span>}>
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="h-4 w-4" /> Badges
          </span>
        </H2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BADGES.map((b) => {
            const got = Boolean(s.badges[b.id]);
            return (
              <div key={b.id} title={b.how} className={`flex flex-col items-center rounded-2xl border p-3 text-center ${got ? "border-amber-900/70 bg-amber-950/20" : "border-ink-800 bg-ink-900 opacity-60"}`}>
                <span className={`text-3xl leading-none ${got ? "" : "grayscale"}`}>{got ? b.emoji : <Lock className="h-7 w-7 text-ink-600" />}</span>
                <span className="mt-1.5 text-[11px] font-semibold leading-tight text-white">{b.title}</span>
                <span className="mt-0.5 text-[10px] leading-tight text-ink-500">{b.how}</span>
              </div>
            );
          })}
        </div>

        <AdSlot placement="learn-bottom" />

        <p className="mt-10 text-center text-xs text-ink-600 max-w-xl mx-auto leading-relaxed">
          Learn & Earn pays practice cash into your paper portfolio — it isn&apos;t real money. Lessons are general education, not financial advice.
        </p>
      </main>
    </div>
  );
}

function HeroChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink-800/60 px-3 py-2.5">
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">
        {icon} {label}
      </p>
      <p className="mt-0.5 font-mono text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DailyQuestion({ now }: { now: number }) {
  const s = useLearn();
  const q = dailyQuestion(now);
  const today = s.daily[dayKey(now)];
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null || Boolean(today);
  return (
    <section className="mt-4 rounded-3xl border border-amber-900/60 bg-gradient-to-br from-amber-950/30 to-ink-900 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <Flame className="h-4 w-4" /> Daily question
        </p>
        <span className="text-[11px] text-ink-400">{today ? (today.correct ? "Done today ✓" : "Done today") : "+25 XP · keeps your streak"}</span>
      </div>
      <p className="mt-2 font-semibold text-white">{q.q}</p>
      <div className="mt-3 grid gap-2">
        {q.options.map((o, i) => {
          const isAnswer = i === q.answer;
          const chosen = picked === i;
          const cls = !answered
            ? "border-ink-700 bg-ink-900 hover:border-ink-500"
            : isAnswer
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-100"
              : chosen
                ? "border-rose-800 bg-rose-950/40 text-rose-100"
                : "border-ink-800 bg-ink-900 opacity-60";
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                learn.answerDaily(i === q.answer);
              }}
              className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${cls}`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-3 text-sm text-ink-300">
          {q.why}{" "}
          <Link href={`/learn/${q.lessonId}`} className="text-rose-300 hover:underline">
            Learn more →
          </Link>
        </p>
      )}
    </section>
  );
}
