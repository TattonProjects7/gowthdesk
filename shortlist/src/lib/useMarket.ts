"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { priceAt } from "./market";
import { simCloses } from "./signals";
import { simBars, type Bar } from "./bars";
import { getInstrument } from "./instruments";
import { candlesFor, focusSymbols, isStreaming, liveVersion, retainStream, streamStatus, subscribeLive, tickFor } from "./live/client";
import { anchorBars, anchorCloses, padBars, withLiveBar, type Today } from "./live/merge";
import type { StreamStatus } from "./live/hub";
import { marketFor, sessionAt } from "./sessions";

type Source = "loading" | "simulated" | "live";

/**
 * How current a price is:
 *  - realtime: streaming trade by trade while its market is open
 *  - delayed: a real quote refreshed every few minutes
 *  - closed: a real last price, with its market shut
 *  - simulated: the built-in market simulator (no data feed for it)
 */
export type Freshness = "realtime" | "delayed" | "closed" | "simulated";

interface MarketPayload {
  source: "simulated" | "live";
  quotes?: Record<string, number | null>;
  ohlc?: Record<string, { o?: number; h?: number; l?: number; pc?: number; t?: number }>;
  closes?: Record<string, number[] | null>;
}

// One fetch of /api/market shared by every hook on the page.
let shared: { at: number; p: MarketPayload } | null = null;
let sharedReq: Promise<MarketPayload> | null = null;
function loadMarket(maxAge: number): Promise<MarketPayload> {
  if (shared && Date.now() - shared.at < maxAge) return Promise.resolve(shared.p);
  if (!sharedReq) {
    sharedReq = fetch("/api/market", { cache: "no-store" })
      .then((r) => r.json() as Promise<MarketPayload>)
      .then((p) => ((shared = { at: Date.now(), p }), p))
      .finally(() => (sharedReq = null));
  }
  return sharedReq;
}

// One hook to rule the data layer. Every price comes from the best source
// available for that instrument, in this order:
//   1. a real-time tick from /api/stream (crypto always; US shares with a key)
//   2. a delayed quote from /api/market (with a market-data key)
//   3. the built-in simulator
// History uses real daily candles where /api/candles has them, otherwise the
// simulator's shape re-based onto the real price and previous close.
// Pages just call priceFor()/closesFor()/barsFor() and never care which.
export function useMarket(): {
  mounted: boolean;
  source: Source;
  now: number;
  priceFor: (symbol: string) => number;
  closesFor: (symbol: string, n?: number) => number[];
  barsFor: (symbol: string, n?: number) => Bar[];
  isLive: (symbol: string) => boolean;
  freshness: (symbol: string) => Freshness;
  stream: StreamStatus | null;
} {
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<Source>("loading");
  const data = useRef<MarketPayload>({ source: "simulated" });
  const sourceRef = useRef<Source>("loading");
  sourceRef.current = source;
  const live = useSyncExternalStore(subscribeLive, liveVersion, () => 0);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    setNow(Date.now());
    const release = retainStream();

    const fetchData = async (maxAge: number) => {
      try {
        const json = await loadMarket(maxAge);
        if (cancelled) return;
        data.current = json;
        setSource(json.source === "live" ? "live" : "simulated");
      } catch {
        if (!cancelled) setSource("simulated");
      }
    };
    fetchData(15_000);

    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setNow(Date.now());
      if (sourceRef.current === "live" && tick % 10 === 0) fetchData(15_000); // refresh delayed quotes ~every 20s
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
      release();
    };
  }, []);

  // The best real price we have, and when it was traded.
  const realPrice = useCallback(
    (symbol: string): { p: number; t?: number } | null => {
      const tk = tickFor(symbol);
      const q = source === "live" ? data.current.quotes?.[symbol] : null;
      const hasQ = typeof q === "number" && q > 0;
      if (tk && (Date.now() - tk.rx < 10 * 60_000 || !hasQ)) return { p: tk.p, t: tk.t };
      if (hasQ) return { p: q as number, t: data.current.ohlc?.[symbol]?.t };
      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, live],
  );

  const todayFor = useCallback(
    (symbol: string): Today | undefined => {
      const tk = tickFor(symbol);
      const o = source === "live" ? data.current.ohlc?.[symbol] : undefined;
      if (!tk && !o) return undefined;
      return { o: tk?.o ?? o?.o, h: tk?.h ?? o?.h, l: tk?.l ?? o?.l, pc: tk?.pc ?? o?.pc };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, live],
  );

  const priceFor = useCallback((symbol: string): number => realPrice(symbol)?.p ?? priceAt(symbol, now), [realPrice, now]);

  // Daily bars ending now, `n` of them.
  const barsFor = useCallback(
    (symbol: string, n = 260): Bar[] => {
      const rp = realPrice(symbol);
      const real = candlesFor(symbol);
      if (real) {
        const merged = withLiveBar(real, rp?.p, rp?.t, now || Date.now(), todayFor(symbol));
        return merged.length >= n ? merged.slice(-n) : padBars(merged, simBars(symbol, now, n + 5), n);
      }
      const bars = simBars(symbol, now, n);
      return rp ? anchorBars(bars, rp.p, todayFor(symbol)) : bars;
    },
    [realPrice, todayFor, now],
  );

  // Daily closes ending now. `n` days of history (default 31 — enough for the
  // signals; the chart asks for up to a year).
  const closesFor = useCallback(
    (symbol: string, n = 31): number[] => {
      if (candlesFor(symbol)) return barsFor(symbol, n).map((b) => b.c);
      const rp = realPrice(symbol);
      if (source === "live") {
        const c = data.current.closes?.[symbol];
        if (c && c.length >= 20 && n <= c.length) return rp ? [...c.slice(-n, -1), rp.p] : c.slice(-n);
      }
      const sim = simCloses(symbol, now, n);
      return rp ? anchorCloses(sim, rp.p, todayFor(symbol)?.pc) : sim;
    },
    [barsFor, realPrice, todayFor, source, now],
  );

  const isLive = useCallback((symbol: string) => !!realPrice(symbol), [realPrice]);

  const freshness = useCallback(
    (symbol: string): Freshness => {
      const i = getInstrument(symbol);
      if (!i || !realPrice(symbol)) return "simulated";
      const open = sessionAt(marketFor(i), Date.now()).open;
      if (!open) return "closed";
      return tickFor(symbol) && isStreaming(symbol) ? "realtime" : "delayed";
    },
    [realPrice],
  );

  return { mounted, source, now, priceFor, closesFor, barsFor, isLive, freshness, stream: live ? streamStatus() : null };
}

/** Give these symbols the real-time slots and real candles while on screen. */
export function useLiveFocus(symbols: string[]) {
  const key = symbols.filter(Boolean).slice(0, 20).join(",");
  useEffect(() => (key ? focusSymbols(key.split(",")) : undefined), [key]);
}
