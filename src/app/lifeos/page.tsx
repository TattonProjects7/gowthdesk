"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Send, Loader2, Sparkles, Brain,
  Calendar, ShieldAlert, Gift, Baby, Receipt, Footprints, CloudRain,
  CheckCircle2, RefreshCw,
} from "lucide-react";
import {
  USER, INTEGRATIONS, BRIEF, CASHFLOW, SUGGESTED_QUESTIONS,
} from "@/lib/lifeos";

const BRIEF_ICONS: Record<string, typeof Calendar> = {
  Calendar, ShieldAlert, Gift, Baby, Receipt, Footprints, CloudRain,
};

const TONE_STYLES: Record<string, string> = {
  neutral: "text-ink-300",
  warn: "text-amber-400",
  good: "text-emerald-400",
  money: "text-violet-300",
};

export default function LifeOS() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setAsked(query);
    setQuestion("");
    setAnswer(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lifeos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setAnswer(data.error ? `⚠️ ${data.error}` : data.answer);
    } catch {
      setAnswer("⚠️ Something went wrong reaching LifeOS.");
    } finally {
      setLoading(false);
    }
  }

  const connectedCount = INTEGRATIONS.filter(i => i.status === "connected").length;

  return (
    <div className="min-h-screen bg-ink-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="border-b border-ink-800 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-ink-400 hover:text-white text-sm transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="h-4 w-px bg-ink-700" />
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
          <Brain className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">LifeOS</span>
        <span className="rounded-full bg-violet-900 px-2 py-0.5 text-xs text-violet-300">your second brain</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-ink-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {connectedCount} accounts connected
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main column — brief + assistant */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
            {/* Greeting + brief */}
            <section>
              <p className="text-ink-400 text-sm mb-1">{todayLabel()}</p>
              <h1 className="text-3xl font-bold mb-1">Good morning, {USER.name}.</h1>
              <p className="text-ink-300 mb-6">Here&apos;s everything that matters today.</p>

              <div className="rounded-2xl border border-ink-700 bg-ink-900 divide-y divide-ink-800 overflow-hidden">
                {BRIEF.map(item => {
                  const Icon = BRIEF_ICONS[item.icon] ?? Calendar;
                  return (
                    <div key={item.key} className="flex items-center gap-3 px-5 py-3.5">
                      <Icon className={`h-4 w-4 shrink-0 ${TONE_STYLES[item.tone]}`} />
                      <span className="text-sm text-ink-100 flex-1">{item.text}</span>
                      {item.when && (
                        <span className="shrink-0 rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-ink-400">
                          {item.when}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Ask LifeOS */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-500 mb-3">
                Ask LifeOS
              </h2>

              <div className="flex gap-2 mb-3">
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && ask(question)}
                  placeholder="Ask anything about your life…"
                  className="flex-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-ink-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <button
                  onClick={() => ask(question)}
                  disabled={loading || !question.trim()}
                  className="flex items-center justify-center rounded-xl bg-violet-600 px-4 hover:bg-violet-500 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>

              {/* Suggested questions */}
              {!asked && (
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-300 hover:border-violet-600 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Conversation */}
              {asked && (
                <div className="mt-2 space-y-3">
                  <div className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm">
                      {asked}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ink-700 bg-ink-900 px-4 py-3">
                      {loading ? (
                        <span className="flex items-center gap-2 text-sm text-ink-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> LifeOS is thinking…
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-100">{answer}</p>
                      )}
                    </div>
                  </div>

                  {!loading && (
                    <button
                      onClick={() => { setAsked(null); setAnswer(null); }}
                      className="ml-10 flex items-center gap-1.5 text-xs text-ink-500 hover:text-white transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> Ask something else
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </main>

        {/* Right rail — connections + cashflow */}
        <aside className="hidden lg:flex w-80 shrink-0 flex-col gap-6 overflow-y-auto border-l border-ink-800 bg-ink-900 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
              Connected to everything
            </p>
            <div className="grid grid-cols-2 gap-2">
              {INTEGRATIONS.map(i => (
                <div
                  key={i.key}
                  className="rounded-xl border border-ink-700 bg-ink-800 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{i.emoji}</span>
                    {i.status === "connected" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                    )}
                  </div>
                  <p className="text-xs font-semibold text-ink-100">{i.name}</p>
                  <p className="text-[11px] text-ink-400 leading-tight">{i.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 mb-3">
              This month&apos;s money
            </p>
            <div className="rounded-xl border border-ink-700 bg-ink-800 divide-y divide-ink-700 overflow-hidden">
              {CASHFLOW.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-ink-100">{m.label}</p>
                    <p className="text-[10px] text-ink-500">{m.date}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${m.amount < 0 ? "text-ink-300" : "text-emerald-400"}`}>
                    {m.amount < 0 ? "−" : "+"}£{Math.abs(m.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
}
