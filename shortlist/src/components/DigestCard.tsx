"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useCoach } from "@/components/coach/CoachProvider";
import { offlineDigest } from "@/lib/ai/offline";
import type { Digest, DigestInput } from "@/lib/ai/types";

// "Why is it moving?" — an AI digest on every instrument page, in the spirit
// of Robinhood Cortex Digests. Shows the instant offline digest first, then
// swaps in the AI version when it arrives. Cached per symbol per day.
export default function DigestCard({ input }: { input: DigestInput | null }) {
  const coach = useCoach();
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(false);
  const symbol = input?.symbol;

  const load = async (force = false) => {
    if (!input) return;
    const key = `shortlist.digest.${input.symbol}.${new Date().toISOString().slice(0, 10)}`;
    if (!force) {
      try {
        const cached = window.localStorage.getItem(key);
        if (cached) {
          setDigest(JSON.parse(cached) as Digest);
          return;
        }
      } catch {
        /* ignore */
      }
    }
    setDigest(offlineDigest(input));
    setLoading(true);
    try {
      const res = await fetch("/api/digest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const d = (await res.json()) as Digest;
      if (d?.headline) {
        setDigest(d);
        if (d.source === "ai") {
          try {
            window.localStorage.setItem(key, JSON.stringify(d));
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* keep the offline digest */
    } finally {
      setLoading(false);
    }
  };

  // Load once per symbol (not on every price tick).
  useEffect(() => {
    if (symbol) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, Boolean(input)]);

  if (!input || !digest) return <div className="mt-4 h-40 rounded-3xl border border-white/[0.07] bg-ink-900/70 shadow-card animate-pulse" />;

  return (
    <section className="mt-4 rounded-3xl border border-violet-900/60 bg-gradient-to-br from-violet-950/40 to-ink-900 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-violet-300">
          <Sparkles className="h-4 w-4" /> Why it&apos;s moving
        </p>
        <span className="flex items-center gap-2 text-[10px] text-ink-500">
          {loading && <Loader2 className="h-3 w-3 animate-spin" />}
          {digest.source === "ai" ? "AI digest" : "Data digest"}
          <button onClick={() => load(true)} className="rounded-full p-1 hover:bg-ink-800 hover:text-white" aria-label="Refresh digest">
            <RefreshCw className="h-3 w-3" />
          </button>
        </span>
      </div>
      <p className="mt-2 font-semibold text-white">{digest.headline}</p>
      <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
        {digest.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-ink-400">{digest.takeaway}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => coach.open(`Tell me more about why ${input.symbol} is moving and what it means for a long-term investor`)} className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-500/25">
          <Sparkles className="h-3.5 w-3.5" /> Ask a follow-up
        </button>
        <span className="text-[10px] text-ink-600">Educational summary, not advice.</span>
      </div>
    </section>
  );
}
