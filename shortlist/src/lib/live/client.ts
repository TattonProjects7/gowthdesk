"use client";

// Browser side of real-time prices: one EventSource per tab to /api/stream,
// shared by every component, plus real daily candles fetched on demand.
// Closed while the tab or app is in the background (saves battery and data)
// and reopened when it comes back.

import { fromWire, type Tick, type WireTick } from "./feeds";
import type { StreamStatus } from "./hub";
import type { Bar } from "@/lib/bars";
import { INSTRUMENTS } from "@/lib/instruments";

export interface LiveTick extends Tick {
  rx: number; // when this browser received it
}

const ticks = new Map<string, LiveTick>();
const candles = new Map<string, Bar[]>();
const candleAsked = new Set<string>();
let status: StreamStatus | null = null;
let version = 0;
const listeners = new Set<() => void>();

let es: EventSource | null = null;
let refs = 0;
let openFocus = "";
const focusRefs = new Map<string, number>();
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let refocusTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let emitTimer: ReturnType<typeof setTimeout> | null = null;
let visHooked = false;

const EMIT_MS = 400;

function emit() {
  if (emitTimer) return;
  emitTimer = setTimeout(() => {
    emitTimer = null;
    version++;
    for (const l of listeners) l();
  }, EMIT_MS);
}

function focusKey(): string {
  return [...focusRefs.keys()].slice(0, 20).join(",");
}

function open() {
  if (typeof window === "undefined" || typeof EventSource === "undefined") return;
  if (document.visibilityState === "hidden") return;
  if (es) es.close();
  openFocus = focusKey();
  const src = new EventSource(`/api/stream${openFocus ? `?focus=${encodeURIComponent(openFocus)}` : ""}`);
  es = src;
  src.addEventListener("ticks", (e) => {
    try {
      const d = JSON.parse((e as MessageEvent).data) as Record<string, WireTick>;
      const rx = Date.now();
      for (const [s, w] of Object.entries(d)) ticks.set(s, { ...fromWire(w), rx });
      emit();
    } catch {
      /* ignore */
    }
  });
  src.addEventListener("status", (e) => {
    try {
      status = JSON.parse((e as MessageEvent).data) as StreamStatus;
      emit();
    } catch {
      /* ignore */
    }
  });
  src.onerror = () => {
    // EventSource retries dropped connections itself; it gives up only when
    // the server refuses (an error page, or no streaming support). Try again
    // later in that case.
    if (src.readyState === EventSource.CLOSED && es === src) {
      es = null;
      if (!retryTimer) retryTimer = setTimeout(() => ((retryTimer = null), refs > 0 && open()), 30_000);
    }
  };
  // Crypto candles are free and few: fetch them up front.
  for (const i of INSTRUMENTS) if (i.type === "crypto") requestCandles(i.symbol);
}

function close() {
  es?.close();
  es = null;
}

function hookVisibility() {
  if (visHooked || typeof document === "undefined") return;
  visHooked = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") close();
    else if (refs > 0 && !es) open();
  });
}

/** Keep the stream open while at least one component needs prices. */
export function retainStream(): () => void {
  refs++;
  hookVisibility();
  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = null;
  if (!es) open();
  return () => {
    refs = Math.max(0, refs - 1);
    if (refs === 0 && !closeTimer) closeTimer = setTimeout(() => ((closeTimer = null), refs === 0 && close()), 10_000);
  };
}

/** Ask for real-time priority (and real candles) for what's on screen. */
export function focusSymbols(symbols: string[]): () => void {
  for (const s of symbols) {
    focusRefs.set(s, (focusRefs.get(s) ?? 0) + 1);
    requestCandles(s);
  }
  scheduleRefocus();
  return () => {
    for (const s of symbols) {
      const n = (focusRefs.get(s) ?? 1) - 1;
      if (n <= 0) focusRefs.delete(s);
      else focusRefs.set(s, n);
    }
  };
}

// Reopen with the new focus list once it settles. Only when something new
// needs a slot; dropping focus never forces a reconnect.
function scheduleRefocus() {
  if (refocusTimer) clearTimeout(refocusTimer);
  refocusTimer = setTimeout(() => {
    refocusTimer = null;
    const key = focusKey();
    const had = new Set(openFocus.split(",").filter(Boolean));
    if (es && key !== openFocus && key.split(",").some((s) => s && !had.has(s))) open();
  }, 1200);
}

export function requestCandles(symbol: string) {
  if (candleAsked.has(symbol) || typeof fetch === "undefined") return;
  candleAsked.add(symbol);
  fetch(`/api/candles?s=${encodeURIComponent(symbol)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { source?: string; bars?: Bar[]; retry?: number } | null) => {
      if (j && j.source && j.source !== "none" && Array.isArray(j.bars) && j.bars.length >= 20) {
        candles.set(symbol, j.bars);
        emit();
      } else if (j?.retry) setTimeout(() => candleAsked.delete(symbol) && focusRefs.has(symbol) && requestCandles(symbol), j.retry * 1000);
      else setTimeout(() => candleAsked.delete(symbol), 10 * 60_000);
    })
    .catch(() => setTimeout(() => candleAsked.delete(symbol), 10 * 60_000));
}

export function subscribeLive(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const liveVersion = () => version;
export const tickFor = (symbol: string): LiveTick | undefined => ticks.get(symbol);
export const candlesFor = (symbol: string): Bar[] | undefined => candles.get(symbol);
export const streamStatus = (): StreamStatus | null => status;

/** Whether a live feed is currently carrying this symbol. */
export function isStreaming(symbol: string): boolean {
  if (!status) return false;
  return Object.values(status).some((f) => f.state === "live" && f.symbols.includes(symbol));
}
