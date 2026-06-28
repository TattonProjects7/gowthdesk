"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Brain } from "lucide-react";
import type { Profile } from "@/lib/lifeos/types";
import { buildLifeContext } from "@/lib/lifeos/context";

interface Props {
  profile: Profile;
  now: Date;
}

interface Msg { role: "user" | "ai"; text: string }

const SUGGESTIONS = [
  "Can I afford a £4,000 holiday this month?",
  "What's the most important thing I'm forgetting?",
  "What should I do about my upcoming renewals?",
  "How's my money looking for the rest of the month?",
];

export default function AskTab({ profile, now }: Props) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setQuestion("");
    setMessages(m => [...m, { role: "user", text: query }]);
    setLoading(true);
    try {
      const res = await fetch("/api/lifeos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, context: buildLifeContext(profile, now), name: profile.name }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "ai", text: data.error ? `⚠️ ${data.error}` : data.answer }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "⚠️ Couldn't reach LifeOS just now." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-bold">Ask LifeOS</h1>
        <p className="text-ink-400 text-sm">It answers using your real numbers.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-700 py-8 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm text-ink-400 px-6">Ask anything about your life — money, dates, plans.</p>
            </div>
            <div className="space-y-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => ask(s)}
                  className="block w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-left text-sm text-ink-300 hover:border-violet-600 hover:text-white">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-violet-600 px-3.5 py-2.5 text-sm">{m.text}</p>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm leading-relaxed text-ink-100">{m.text}</p>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-ink-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 border-t border-ink-800 pt-3">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask(question)}
          placeholder="Ask anything…"
          className="flex-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-white placeholder:text-ink-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <button onClick={() => ask(question)} disabled={loading || !question.trim()}
          className="flex items-center justify-center rounded-xl bg-violet-600 px-4 hover:bg-violet-500 disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
