"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, RotateCcw, Sparkles, X } from "lucide-react";
import LessonWidget from "@/components/learn/Widgets";
import { useCoach } from "@/components/coach/CoachProvider";
import { getLesson, getTrack, nextLessonAfter } from "@/lib/learn/content";
import { learn, useLearn } from "@/lib/learn/store";
import { successHaptic, warningHaptic } from "@/lib/native";
import type { Award } from "@/lib/learn/progress";

// The lesson player: story-style cards with a progress bar, then a
// three-question quiz with instant explanations, then XP and practice cash.
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const lesson = getLesson(id);
  const router = useRouter();
  const coach = useCoach();
  const s = useLearn();
  const [step, setStep] = useState(0); // 0..cards-1 = cards, then quiz questions, then results
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [award, setAward] = useState<Award | null>(null);

  useEffect(() => {
    setStep(0);
    setPicked(null);
    setScore(0);
    setAward(null);
  }, [id]);

  if (!lesson) {
    return (
      <main className="min-h-screen px-6 py-20 text-center">
        <p className="text-ink-300">Lesson not found.</p>
        <Link href="/learn" className="mt-4 inline-block text-rose-400 hover:underline">
          ← Back to the Academy
        </Link>
      </main>
    );
  }

  const track = getTrack(lesson.track);
  const nCards = lesson.cards.length;
  const nQ = lesson.quiz.length;
  const total = nCards + nQ;
  const inCards = step < nCards;
  const qIndex = step - nCards;
  const done = step >= total;
  const prev = s.lessons[lesson.id];
  const next = nextLessonAfter(lesson.id);

  const advance = () => {
    if (inCards) setStep(step + 1);
    else if (!done) {
      const isLast = qIndex === nQ - 1;
      if (isLast) {
        const a = learn.finishLesson(lesson.id, score, nQ);
        setAward(a);
      }
      setPicked(null);
      setStep(step + 1);
    }
  };

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === lesson.quiz[qIndex].answer) {
      setScore((x) => x + 1);
      successHaptic();
    } else warningHaptic();
  };

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        {/* Top bar: close + story progress */}
        <div className="flex items-center gap-3">
          <Link href="/learn" className="rounded-full p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close lesson">
            <X className="h-5 w-5" />
          </Link>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < step || done ? "bg-gradient-to-r from-amber-400 to-rose-500" : i === step ? "bg-ink-500" : "bg-ink-800"}`} />
            ))}
          </div>
          <button onClick={() => coach.open(`Help me understand “${lesson.title}”`)} className="rounded-full p-1.5 text-blue-300 hover:bg-ink-800" aria-label="Ask the coach about this lesson" title="Ask the coach">
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-xs font-medium text-ink-400">
          {track.emoji} {track.title} · {lesson.title}
        </p>

        {/* Body */}
        <div className="mt-4 flex-1">
          {inCards && <CardView key={step} card={lesson.cards[step]} />}

          {!inCards && !done && (
            <div key={`q${qIndex}`} className="fade-in">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Quiz · {qIndex + 1} of {nQ}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">{lesson.quiz[qIndex].q}</h2>
              <div className="mt-4 grid gap-2.5">
                {lesson.quiz[qIndex].options.map((o, i) => {
                  const q = lesson.quiz[qIndex];
                  const shown = picked !== null;
                  const cls = !shown
                    ? "border-ink-700 bg-ink-900 hover:border-ink-500 active:scale-[0.99]"
                    : i === q.answer
                      ? "border-emerald-600 bg-emerald-950/50 text-emerald-100"
                      : i === picked
                        ? "border-rose-700 bg-rose-950/50 text-rose-100"
                        : "border-ink-800 bg-ink-900 opacity-50";
                  return (
                    <button key={i} onClick={() => answer(i)} disabled={shown} className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-all ${cls}`}>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-ink-300">{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1">{o}</span>
                      {shown && i === q.answer && <Check className="h-5 w-5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className={`fade-in mt-4 rounded-2xl p-4 text-sm ${picked === lesson.quiz[qIndex].answer ? "bg-emerald-950/40 text-emerald-100" : "bg-rose-950/40 text-rose-100"}`}>
                  <p className="font-semibold">{picked === lesson.quiz[qIndex].answer ? "Correct! 🎉" : "Not quite"}</p>
                  <p className="mt-1 opacity-90">{lesson.quiz[qIndex].why}</p>
                </div>
              )}
            </div>
          )}

          {done && (
            <div className="fade-in text-center">
              <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-rose-500/30 text-5xl">{score === nQ ? "💯" : score >= nQ - 1 ? "🎓" : "📚"}</div>
              <h2 className="mt-4 text-2xl font-semibold text-white">{score === nQ ? "Perfect score!" : score >= nQ - 1 ? "Nicely done!" : "Lesson complete"}</h2>
              <p className="mt-1 text-ink-400">
                You got {score} of {nQ} right.
              </p>
              <div className="mx-auto mt-5 grid max-w-xs grid-cols-2 gap-2">
                <div className="rounded-2xl bg-amber-500/10 p-3">
                  <p className="text-[10px] uppercase text-amber-400">XP</p>
                  <p className="font-mono text-xl font-bold text-amber-300">+{award?.xp ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 p-3">
                  <p className="text-[10px] uppercase text-emerald-400">Practice cash</p>
                  <p className="font-mono text-xl font-bold text-emerald-300">+£{award?.cash ?? 0}</p>
                </div>
              </div>
              {award && !award.firstTime && award.xp === 0 && <p className="mt-3 text-xs text-ink-500">Rewards are paid on your first completion{prev && prev.best < prev.total ? " — a perfect retake earns the bonus XP." : "."}</p>}
              {award?.cash ? <p className="mt-3 text-xs text-ink-400">Your practice cash is in your General account, ready to invest.</p> : null}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex items-center gap-2">
          {done ? (
            <>
              <button
                onClick={() => {
                  setStep(0);
                  setScore(0);
                  setPicked(null);
                  setAward(null);
                }}
                className="flex h-12 items-center gap-2 rounded-2xl border border-ink-700 px-4 text-sm font-semibold text-ink-200 hover:bg-ink-800"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
              {next ? (
                <button onClick={() => router.push(`/learn/${next.id}`)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand shadow-glow-rose text-sm font-semibold text-white hover:brightness-110">
                  Next: {next.title} <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <Link href="/learn" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand shadow-glow-rose text-sm font-semibold text-white hover:brightness-110">
                  Back to the Academy
                </Link>
              )}
            </>
          ) : (
            <>
              {step > 0 && inCards && (
                <button onClick={() => setStep(step - 1)} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-700 text-ink-300 hover:bg-ink-800" aria-label="Previous card">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={advance}
                disabled={!inCards && picked === null}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand shadow-glow-rose text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40"
              >
                {inCards ? (step === nCards - 1 ? "Start the quiz" : "Continue") : qIndex === nQ - 1 ? "See results" : "Next question"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {!done && (
          <Link href="/learn" className="mt-3 inline-flex items-center justify-center gap-1 text-xs text-ink-500 hover:text-ink-300">
            <ArrowLeft className="h-3 w-3" /> All lessons
          </Link>
        )}
      </main>
    </div>
  );
}

function CardView({ card }: { card: NonNullable<ReturnType<typeof getLesson>>["cards"][number] }) {
  return (
    <div className="fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-ink-800 to-ink-900 text-5xl">{card.emoji}</div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">{card.title}</h2>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-200">{card.body}</p>
      {card.widget && (
        <div className="mt-5">
          <LessonWidget kind={card.widget} symbol={card.symbol} />
        </div>
      )}
      {card.tryIt && (
        <Link href={card.tryIt.href} className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-rose-900 bg-rose-950/50 px-3.5 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950">
          Try it: {card.tryIt.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
