import { NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { fetchFinnhubFundamentals } from "@/lib/marketdata";
import { fromFinnhubMetrics, type FundamentalBase } from "@/lib/fundamentals";

export const dynamic = "force-dynamic";

// Live company fundamentals for the screener, when FINNHUB_API_KEY is set.
// Without a key the client uses labelled demo figures instead.
//
// Only US companies are fetched: Finnhub reports per-share figures in each
// company's reporting currency (pounds, euros, kroner…), which wouldn't match
// prices quoted in pence or dollars and would give nonsense ratios. UK and
// other foreign companies keep their labelled demo figures.
//
// Fundamentals change slowly, so each company is cached for a day and the cache
// fills in rotation — two companies (four API calls) every 15 seconds, which
// together with /api/market keeps under Finnhub's free-tier rate limit.

const TTL = 24 * 3600_000;
const BATCH = 2;
const GAP = 15_000;

const ELIGIBLE = INSTRUMENTS.filter((i) => i.type === "stock" && i.finnhub && i.currency === "USD" && i.region === "US" && !i.country);
const cache = new Map<string, { at: number; f: Partial<FundamentalBase> | null }>();
let last = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const now = Date.now();
  if (now - last < GAP) return;
  last = now;
  const due = ELIGIBLE.filter((i) => now - (cache.get(i.symbol)?.at ?? 0) > TTL).slice(0, BATCH);
  await Promise.all(
    due.map(async (i) => {
      const r = await fetchFinnhubFundamentals(i.finnhub as string);
      cache.set(i.symbol, { at: Date.now(), f: r ? fromFinnhubMetrics(r.metric, r.recommendation) : (cache.get(i.symbol)?.f ?? null) });
    }),
  );
}

export async function GET() {
  if (!process.env.FINNHUB_API_KEY) return NextResponse.json({ source: "demo" as const });
  if (!inflight) inflight = refresh().finally(() => (inflight = null));
  await inflight;
  const data: Record<string, Partial<FundamentalBase>> = {};
  for (const [sym, v] of cache) if (v.f) data[sym] = v.f;
  return NextResponse.json({ source: "live" as const, data, coverage: { have: Object.keys(data).length, of: ELIGIBLE.length } });
}
