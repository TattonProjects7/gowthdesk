"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useScreener } from "../screener/useScreener";
import { buildShortlist, weakestSymbols, type EventsBySymbol, type Shortlist, type ShortlistItem } from "./pipeline";
import type { BriefNote } from "../ai/claude";
import { fmtDate } from "../catalysts";

// Today's Shortlist on the device: once the market data and fundamentals have
// loaded, ask the server for news/insider/analyst events on the weakest names,
// run the six stages, and keep the result for the rest of the UK day so the
// list doesn't reshuffle with every tick. Prices on the page stay live.

const LIST_KEY = "shortlist.today.v1";
const BRIEF_KEY = "shortlist.brief.v1";

interface Stored {
  day: string;
  key: string;
  events: "live" | "none";
  list: Shortlist;
}

/** The calendar day in London, e.g. "2026-11-02": the list changes at UK midnight. */
export function ukDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or blocked: the list still works for this visit */
  }
}

export function briefInput(it: ShortlistItem) {
  return {
    symbol: it.symbol,
    name: it.name,
    why: it.why,
    evidence: it.bear.map((p) => `${p.label}: ${p.detail}`),
    triggers: it.triggers.map((t) => `${t.label}: ${t.detail}`),
    against: it.against,
    squeeze: `${it.squeeze.level} squeeze risk; ${it.squeeze.shortInterestPctFloat.toFixed(1)}% of shares sold short`,
    results: it.catalyst ? `Results on ${fmtDate(it.catalyst.date)} (${it.catalyst.daysUntil} days)` : null,
    rewardRisk: it.structure.rewardRisk,
  };
}

export function useTodaysShortlist(): {
  status: "loading" | "ready";
  list: Shortlist | null;
  day: string;
  sources: { prices: "loading" | "simulated" | "live"; fundamentals: "loading" | "live" | "demo"; events: "live" | "none" | "loading"; notes: "ai" | "rules" | "loading" };
  notes: Record<string, BriefNote>;
  livePrice: (symbol: string) => number | null;
} {
  const { mounted, source, fund, now, snaps, bySymbol } = useScreener();
  const [stored, setStored] = useState<Stored | null>(null);
  const [notes, setNotes] = useState<{ key: string; source: "ai" | "rules"; notes: Record<string, BriefNote> } | null>(null);
  const building = useRef(false);

  const day = now ? ukDay(now) : "";
  const dataKey = `${source}|${fund}`;
  const ready = mounted && !!now && source !== "loading" && fund !== "loading" && snaps.length > 0;

  useEffect(() => {
    const s = read<Stored>(LIST_KEY);
    if (s?.list?.items) setStored(s);
  }, []);

  const fresh = !!stored && stored.day === day && stored.key === dataKey;

  // Build (at most once per day and data source).
  useEffect(() => {
    if (!ready || fresh || building.current) return;
    building.current = true;
    const symbols = weakestSymbols(snaps);
    const at = now;
    (async () => {
      let events: EventsBySymbol = {};
      let evSource: "live" | "none" = "none";
      // Don't hold the page for a slow feed: after 12 seconds build without events
      // (the server keeps fetching and caches them for the next visitor).
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const r = await fetch(`/api/shortlist/events?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store", signal: ctrl.signal });
        const j = (await r.json()) as { source: "live" | "none"; events?: EventsBySymbol };
        evSource = j.source === "live" ? "live" : "none";
        events = j.events ?? {};
      } catch {
        /* no events: chart triggers only */
      } finally {
        clearTimeout(timer);
      }
      const next: Stored = { day: ukDay(at), key: dataKey, events: evSource, list: buildShortlist(snaps, at, events) };
      write(LIST_KEY, next);
      setStored(next);
      building.current = false;
    })();
  }, [ready, fresh, snaps, now, dataKey]);

  const list = fresh ? stored!.list : null;
  const listKey = list ? `${day}|${list.items.map((i) => i.symbol).join(",")}` : "";

  // Plain-English notes for the day's picks (AI when the server has a key).
  useEffect(() => {
    if (!list || !list.items.length || notes?.key === listKey) return;
    const cached = read<{ key: string; source: "ai" | "rules"; notes: Record<string, BriefNote> }>(BRIEF_KEY);
    if (cached?.key === listKey) {
      setNotes(cached);
      return;
    }
    let alive = true;
    fetch("/api/shortlist/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: list.items.map(briefInput) }) })
      .then((r) => r.json() as Promise<{ source?: "ai" | "rules"; notes?: BriefNote[] }>)
      .then((j) => {
        const map: Record<string, BriefNote> = {};
        for (const n of j.notes ?? []) map[n.symbol] = n;
        const v = { key: listKey, source: j.source === "ai" && Object.keys(map).length ? ("ai" as const) : ("rules" as const), notes: map };
        if (v.source === "ai") write(BRIEF_KEY, v);
        if (alive) setNotes(v);
      })
      .catch(() => alive && setNotes({ key: listKey, source: "rules", notes: {} }));
    return () => {
      alive = false;
    };
  }, [list, listKey, notes?.key]);

  const livePrice = useMemo(() => (symbol: string) => bySymbol.get(symbol)?.price ?? null, [bySymbol]);

  return {
    status: list ? "ready" : "loading",
    list,
    day,
    sources: {
      prices: source,
      fundamentals: fund,
      events: fresh ? stored!.events : "loading",
      notes: !list ? "loading" : notes?.key === listKey ? notes.source : "loading",
    },
    notes: notes?.key === listKey ? notes.notes : {},
    livePrice,
  };
}
