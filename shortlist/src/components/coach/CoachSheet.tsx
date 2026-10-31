"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import RichText from "@/components/RichText";
import { createStore, useStore } from "@/lib/docstore";
import { learn } from "@/lib/learn/store";
import { useCoachContext } from "@/lib/ai/useCoachContext";
import type { ChatMessage } from "@/lib/ai/types";
import { tapHaptic } from "@/lib/native";

// The AI coach panel: a bottom sheet on phones, a side drawer on desktop.
// Answers stream in as they're written. Conversation is kept on this device.
const historyStore = createStore<ChatMessage[]>("shortlist.coach.local.v1", () => []);

export default function CoachSheet({ onClose, pending, onConsumed }: { onClose: () => void; pending: string | null; onConsumed: () => void }) {
  const raw = useStore(historyStore);
  const history = Array.isArray(raw) ? raw : [];
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "offline" | null>(null);
  const { build: buildContext, ready } = useCoachContext();
  const path = usePathname() || "/";
  const scroller = useRef<HTMLDivElement>(null);
  const busy = streaming !== null;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [history.length, streaming]);

  // Lock page scroll behind the sheet on phones.
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (window.innerWidth < 1024) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    tapHaptic();
    learn.flag("coach");
    const next: ChatMessage[] = [...history, { role: "user", content: q }];
    historyStore.set(next.slice(-40));
    setInput("");
    setStreaming("");
    let acc = "";
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-12), context: buildContext() }),
      });
      setSource((res.headers.get("X-Coach-Source") as "ai" | "offline") ?? null);
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setStreaming(acc);
      }
    } catch {
      if (!acc) acc = "I couldn't reach the coach just now. Check your connection and try again.";
    }
    historyStore.set((h) => [...h, { role: "assistant" as const, content: acc }].slice(-40));
    setStreaming(null);
  };

  // A screen asked the coach something ("Why is BP moving?") — send it once
  // live prices are loaded, so the context carries real numbers.
  useEffect(() => {
    if (ready && pending) {
      onConsumed();
      send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pending]);

  const sym = path.match(/^\/(?:i|short)\/([A-Za-z]+)/)?.[1]?.toUpperCase();
  const suggestions = sym
    ? [`Why is ${sym} moving?`, `Explain ${sym} like I'm new`, `What are the risks of ${sym}?`, "What does RSI mean?"]
    : path.startsWith("/learn/")
      ? ["Explain this lesson more simply", "Give me a real-world example", "Quiz me on this"]
      : path.startsWith("/portfolio")
        ? ["How healthy is my portfolio?", "How diversified am I?", "ISA or SIPP for me?", "How do I lower my costs?"]
        : path.startsWith("/scan") || path.startsWith("/short")
          ? ["How does short selling work?", "What is a short squeeze?", "Why use a put instead?"]
          : ["Where should a beginner start?", "What's an ETF?", "How healthy is my portfolio?", "ISA vs SIPP?"];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end lg:justify-start lg:items-end">
      <button className="absolute inset-0 bg-black/55 fade-in lg:bg-black/30" aria-label="Close coach" onClick={onClose} />
      <section
        role="dialog"
        aria-label="AI coach"
        className="sheet-up relative flex h-[86vh] flex-col rounded-t-3xl border-t border-ink-700 bg-ink-950 lg:h-full lg:w-[420px] lg:rounded-none lg:border-l lg:border-t-0"
      >
        <header className="flex items-center gap-3 border-b border-ink-800 px-4 py-3 lg:pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Shortlist Coach</p>
            <p className="text-[11px] text-ink-400">{source === "ai" ? "AI · sees your practice portfolio" : source === "offline" ? "Quick answers from your app data" : "Ask anything about investing"}</p>
          </div>
          {history.length > 0 && (
            <button onClick={() => historyStore.set([])} className="rounded-full p-2 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="New conversation" title="New conversation">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-full p-2 text-ink-400 hover:bg-ink-800 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          {history.length === 0 && streaming === null && (
            <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-4">
              <p className="font-semibold text-white">Hi! I&apos;m your investing coach 👋</p>
              <p className="mt-1 text-ink-400">
                I can explain any term, review your practice portfolio, tell you why a share is moving, or point you to the right lesson. I teach — I don&apos;t tell you what to buy.
              </p>
            </div>
          )}
          {history.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand shadow-glow-rose px-3.5 py-2.5 text-white">
                {m.content}
              </div>
            ) : (
              <div key={i} className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-ink-900/70 shadow-card px-3.5 py-2.5 text-ink-200">
                <RichText text={m.content} onNavigate={onClose} />
              </div>
            ),
          )}
          {streaming !== null && (
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-white/[0.07] bg-ink-900/70 shadow-card px-3.5 py-2.5 text-ink-200">
              {streaming ? (
                <RichText text={streaming} onNavigate={onClose} />
              ) : (
                <span className="inline-flex items-center gap-2 text-ink-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-ink-800 px-3 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {!busy && (
            <div className="-mx-3 mb-2 flex gap-2 overflow-x-auto px-3 no-scrollbar">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="whitespace-nowrap rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-200 hover:border-ink-500">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask the coach…"
              aria-label="Message the coach"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder-ink-500 focus:border-rose-600 focus:outline-none"
            />
            <button type="submit" disabled={busy || !input.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-glow-rose disabled:opacity-40" aria-label="Send">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-ink-600">Educational only · not financial advice · paper money</p>
        </div>
      </section>
    </div>
  );
}
