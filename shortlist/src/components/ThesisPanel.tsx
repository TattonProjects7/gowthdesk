"use client";

import { useState } from "react";
import { Sparkles, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import type { ShortCandidate } from "@/lib/shorts";
import type { ThesisResponse } from "@/app/api/thesis/route";

// The AI dual-thesis: a bear case AND a steel-manned bull case, so the trader
// sees the strongest argument they're WRONG before committing. Generated on
// demand; works with or without an OpenAI key (deterministic fallback).
export default function ThesisPanel({ c }: { c: ShortCandidate }) {
  const [data, setData] = useState<ThesisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/thesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: c.symbol,
          name: c.name,
          score: c.score,
          reasons: c.reasons,
          squeeze: {
            level: c.squeeze.level,
            shortInterestPctFloat: c.squeeze.shortInterestPctFloat,
            daysToCover: c.squeeze.daysToCover,
            borrowFeePct: c.squeeze.borrowFeePct,
            verdict: c.squeeze.verdict,
          },
          structure: c.structure,
          signals: { rsi: c.signals.rsi, zscore: c.signals.zscore, trend30: c.signals.trend30, belowShortMa: c.signals.belowShortMa },
        }),
      });
      setData((await res.json()) as ThesisResponse);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <button
        onClick={generate}
        disabled={loading}
        className="w-full rounded-xl border border-violet-800 bg-violet-950/40 px-4 py-3.5 text-sm font-semibold text-violet-200 hover:bg-violet-950 transition-colors inline-flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Building both sides of the trade…" : "Generate AI bear case + steel-manned bull case"}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-400">AI thesis</p>
        <span className="rounded-md border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-ink-400">
          {data.source === "ai" ? "GPT" : "rules-based"}
        </span>
        {error && <span className="text-xs text-amber-400">used offline fallback</span>}
      </div>

      <Side
        tone="bear"
        icon={<TrendingDown className="h-4 w-4" />}
        title="Bear case — why the short works"
        summary={data.bear.summary}
        points={data.bear.points}
      />
      <Side
        tone="bull"
        icon={<TrendingUp className="h-4 w-4" />}
        title="Steel-manned bull case — why you might be wrong"
        summary={data.bull.summary}
        points={data.bull.points}
      />

      <div className="rounded-xl border border-amber-900 bg-amber-950/30 p-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-1">Risk note</p>
        <p className="text-sm text-amber-100/90">{data.riskNote}</p>
      </div>
    </div>
  );
}

function Side({
  tone,
  icon,
  title,
  summary,
  points,
}: {
  tone: "bear" | "bull";
  icon: React.ReactNode;
  title: string;
  summary: string;
  points: string[];
}) {
  const c =
    tone === "bear"
      ? { border: "border-rose-900", bg: "bg-rose-950/25", head: "text-rose-300", dot: "text-rose-400" }
      : { border: "border-emerald-900", bg: "bg-emerald-950/25", head: "text-emerald-300", dot: "text-emerald-400" };
  return (
    <div className={`rounded-xl border p-4 ${c.border} ${c.bg}`}>
      <p className={`flex items-center gap-2 text-sm font-semibold mb-1.5 ${c.head}`}>
        {icon} {title}
      </p>
      <p className="text-sm text-ink-200 mb-2.5">{summary}</p>
      <ul className="space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-sm text-ink-300">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${c.dot} bg-current`} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
