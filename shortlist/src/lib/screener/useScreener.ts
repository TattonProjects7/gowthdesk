"use client";

import { useEffect, useMemo, useState } from "react";
import { INSTRUMENTS, getInstrument } from "../instruments";
import { fundamentalsFor, type FundamentalBase } from "../fundamentals";
import { useMarket } from "../useMarket";
import type { Bar } from "../bars";
import { benchmarkFor, buildSnapshot, rankSignals, type Snapshot } from "./snapshot";

export type FundState = "loading" | "live" | "demo";

interface FundPayload {
  source: "live" | "demo";
  data?: Record<string, Partial<FundamentalBase>>;
  coverage?: { have: number; of: number };
}

// One shared fundamentals fetch for every screen that needs it.
let fundCache: { at: number; p: FundPayload } | null = null;
let fundInflight: Promise<FundPayload> | null = null;
async function loadFundamentals(): Promise<FundPayload> {
  if (fundCache && Date.now() - fundCache.at < 5 * 60_000) return fundCache.p;
  if (!fundInflight) {
    fundInflight = fetch("/api/fundamentals", { cache: "no-store" })
      .then((r) => r.json() as Promise<FundPayload>)
      .catch(() => ({ source: "demo" as const }))
      .then((p) => {
        fundCache = { at: Date.now(), p };
        return p;
      })
      .finally(() => (fundInflight = null));
  }
  return fundInflight;
}

// Rebuilding ~160 snapshots is a few tens of milliseconds, so do it at most
// every 10 seconds and share the result between components on the page.
const REFRESH = 10_000;
let memo: { key: string; snaps: Snapshot[] } | null = null;

/**
 * Market-wide snapshots for the screener, heatmap, groups and overview pages.
 * `symbols` limits the work to a subset (e.g. one quote page and its peers).
 */
export function useScreener(symbols?: string[]): {
  mounted: boolean;
  source: "loading" | "simulated" | "live";
  fund: FundState;
  coverage?: { have: number; of: number };
  now: number;
  snaps: Snapshot[];
  bySymbol: Map<string, Snapshot>;
} {
  const { mounted, source, now, barsFor, priceFor } = useMarket();
  const [fp, setFp] = useState<FundPayload | null>(fundCache?.p ?? null);

  useEffect(() => {
    let alive = true;
    loadFundamentals().then((p) => alive && setFp(p));
    const id = setInterval(() => loadFundamentals().then((p) => alive && setFp(p)), 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const bucket = Math.floor(now / REFRESH);
  const subsetKey = symbols ? symbols.join(",") : "*";

  const snaps = useMemo(() => {
    if (!mounted || !now) return [];
    const key = `${bucket}|${source}|${fp?.source ?? "-"}|${fundCache?.at ?? 0}|${subsetKey}`;
    if (memo && memo.key === key) return memo.snaps;
    const list = symbols ? symbols.map((s) => getInstrument(s)).filter((x): x is NonNullable<typeof x> => !!x) : INSTRUMENTS;
    const benchCache = new Map<string, Bar[]>();
    const bench = (sym: string) => {
      let b = benchCache.get(sym);
      if (!b) {
        b = barsFor(sym, 400);
        benchCache.set(sym, b);
      }
      return b;
    };
    const out: Snapshot[] = [];
    for (const i of list) {
      const bars = barsFor(i.symbol, 400);
      const price = priceFor(i.symbol);
      const live = fp?.source === "live" ? fp.data?.[i.symbol] : null;
      const s = buildSnapshot({ symbol: i.symbol, bars, now, market: bench(benchmarkFor(i)), fund: fundamentalsFor(i.symbol, price, live ?? null) });
      if (s) out.push(s);
    }
    if (!symbols) rankSignals(out);
    memo = { key, snaps: out };
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, bucket, source, fp, subsetKey]);

  const bySymbol = useMemo(() => new Map(snaps.map((s) => [s.symbol, s])), [snaps]);

  return {
    mounted,
    source,
    fund: !fp ? "loading" : fp.source,
    coverage: fp?.coverage,
    now,
    snaps,
    bySymbol,
  };
}
