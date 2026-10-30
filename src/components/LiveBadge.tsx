"use client";

import { useSyncExternalStore } from "react";
import type { Freshness } from "@/lib/useMarket";
import { liveVersion, streamStatus, subscribeLive } from "@/lib/live/client";

const LOOK: Record<Freshness, { label: string; cls: string; dot: string; title: string }> = {
  realtime: { label: "Real-time", cls: "text-emerald-300", dot: "bg-emerald-400 live-dot", title: "Streaming trade by trade." },
  delayed: { label: "Delayed", cls: "text-amber-300", dot: "bg-amber-400", title: "A real quote, refreshed every few minutes." },
  closed: { label: "Market closed", cls: "text-ink-400", dot: "bg-ink-500", title: "The last real price. Its market is shut." },
  simulated: { label: "Simulated", cls: "text-ink-500", dot: "bg-ink-600", title: "No live feed for this yet: prices come from Shortlist's market simulator." },
};

/** How current a price is: Real-time, Delayed, Market closed or Simulated. */
export function FreshnessBadge({ f, className = "" }: { f: Freshness; className?: string }) {
  const l = LOOK[f];
  return (
    <span title={l.title} className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${l.cls} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
      {l.label}
    </span>
  );
}

/** Which live feeds are up, for page headers. */
export function useStreamStatus() {
  useSyncExternalStore(subscribeLive, liveVersion, () => 0);
  return streamStatus();
}
