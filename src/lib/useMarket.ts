"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { priceAt } from "./market";
import { simCloses } from "./signals";
import { scaleBars, simBars, type Bar } from "./bars";

type Source = "loading" | "simulated" | "live";

interface MarketPayload {
  source: "simulated" | "live";
  quotes?: Record<string, number | null>;
  ohlc?: Record<string, { o?: number; h?: number; l?: number; pc?: number }>;
  closes?: Record<string, number[] | null>;
}

// One hook to rule the data layer. It transparently serves either REAL prices
// (when the /api/market route reports a configured provider) or the built-in
// simulator, for every instrument in the universe (shares, ETFs, crypto).
// Pages just call priceFor()/closesFor() and never care which.
export function useMarket(): {
  mounted: boolean;
  source: Source;
  now: number;
  priceFor: (symbol: string) => number;
  closesFor: (symbol: string, n?: number) => number[];
  barsFor: (symbol: string, n?: number) => Bar[];
  isLive: (symbol: string) => boolean;
} {
  const [now, setNow] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<Source>("loading");
  const data = useRef<MarketPayload>({ source: "simulated" });
  const sourceRef = useRef<Source>("loading");
  sourceRef.current = source;

  useEffect(() => {
    let cancelled = false;
    setMounted(true);
    setNow(Date.now());

    const fetchData = async () => {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        const json = (await res.json()) as MarketPayload;
        if (cancelled) return;
        data.current = json;
        setSource(json.source === "live" ? "live" : "simulated");
      } catch {
        if (!cancelled) setSource("simulated");
      }
    };
    fetchData();

    let tick = 0;
    const id = setInterval(() => {
      tick++;
      setNow(Date.now());
      if (sourceRef.current === "live" && tick % 10 === 0) fetchData(); // refresh real data ~every 20s
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Anchor the simulator's recent shape to a real last price when we have a live
  // quote but no live candle history (free tiers often give one but not both).
  const scaleTo = (series: number[], last: number): number[] => {
    const cur = series[series.length - 1];
    if (!cur || !last) return series;
    const k = last / cur;
    return series.map((p) => Math.round(p * k * 100) / 100);
  };

  const priceFor = useCallback(
    (symbol: string): number => {
      if (source === "live") {
        const q = data.current.quotes?.[symbol];
        if (typeof q === "number" && q > 0) return q;
        const c = data.current.closes?.[symbol];
        if (c && c.length) return c[c.length - 1];
      }
      return priceAt(symbol, now);
    },
    [source, now],
  );

  // Daily closes ending now. `n` days of history (default 31 — enough for the
  // signals; the chart asks for up to a year).
  const closesFor = useCallback(
    (symbol: string, n = 31): number[] => {
      if (source === "live") {
        const c = data.current.closes?.[symbol];
        if (c && c.length >= 20 && n <= c.length) return c.slice(-n);
        const q = data.current.quotes?.[symbol];
        const last = typeof q === "number" && q > 0 ? q : c && c.length ? c[c.length - 1] : 0;
        if (last > 0) return scaleTo(simCloses(symbol, now, n), last);
      }
      return simCloses(symbol, now, n);
    },
    [source, now],
  );

  // Daily OHLCV bars ending now. Live mode re-bases the simulated shape onto the
  // real last price and drops in the real open/high/low/previous close.
  const barsFor = useCallback(
    (symbol: string, n = 260): Bar[] => {
      const bars = simBars(symbol, now, n);
      if (source === "live") {
        const q = data.current.quotes?.[symbol];
        if (typeof q === "number" && q > 0) return scaleBars(bars, q, data.current.ohlc?.[symbol]);
      }
      return bars;
    },
    [source, now],
  );

  const isLive = useCallback((symbol: string) => source === "live" && typeof data.current.quotes?.[symbol] === "number", [source]);

  return { mounted, source, now, priceFor, closesFor, barsFor, isLive };
}
