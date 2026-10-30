import { NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { UNIVERSE } from "@/lib/market";
import { fetchDailyCloses, fetchLiveQuote, hasLiveData, type LiveQuote } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

// Returns real prices/candles when a provider key is configured, otherwise a
// `simulated` flag telling the client to drive itself from the built-in engine.
//
// Free tiers are tight (Finnhub ~60 calls a minute, Alpha Vantage 25 a day) and
// the universe is ~160 instruments, so quotes are cached on the server and
// refreshed in rotation: each request tops up the stalest few, at most one
// batch every 15 seconds, and every client shares the same cache. Daily candle
// history is fetched for the short-scanner names, one at a time, and kept 12
// hours. Always responds quickly and never throws — the UI must keep working.

const QUOTE_BATCH = 10; // per refresh → ~40 calls a minute; fundamentals use ~16 more
const QUOTE_GAP = 15_000;
const CLOSES_TTL = 12 * 3600_000;
const CLOSES_GAP = 60_000;

const quoteCache = new Map<string, { at: number; q: LiveQuote | null }>();
const closesCache = new Map<string, { at: number; c: number[] | null }>();
let lastQuoteBatch = 0;
let lastCloses = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  const now = Date.now();
  const jobs: Promise<void>[] = [];
  if (now - lastQuoteBatch >= QUOTE_GAP) {
    lastQuoteBatch = now;
    const stalest = INSTRUMENTS.filter((i) => i.finnhub)
      .map((i) => ({ i, at: quoteCache.get(i.symbol)?.at ?? 0 }))
      .sort((a, b) => a.at - b.at)
      .slice(0, QUOTE_BATCH);
    for (const { i } of stalest) {
      jobs.push(
        fetchLiveQuote(i.finnhub as string).then((q) => {
          // A failed refresh keeps the last good quote rather than dropping it.
          const prev = quoteCache.get(i.symbol)?.q ?? null;
          quoteCache.set(i.symbol, { at: Date.now(), q: q ?? prev });
        }),
      );
    }
  }
  if (now - lastCloses >= CLOSES_GAP) {
    const due = UNIVERSE.find((t) => now - (closesCache.get(t.symbol)?.at ?? 0) > CLOSES_TTL);
    if (due) {
      lastCloses = now;
      jobs.push(
        fetchDailyCloses(due.symbol).then((c) => {
          closesCache.set(due.symbol, { at: Date.now(), c: c ?? closesCache.get(due.symbol)?.c ?? null });
        }),
      );
    }
  }
  await Promise.all(jobs);
}

export async function GET() {
  if (!hasLiveData()) {
    return NextResponse.json({ source: "simulated" as const });
  }

  if (!inflight) inflight = refresh().finally(() => (inflight = null));
  await inflight;

  const quotes: Record<string, number | null> = {};
  const ohlc: Record<string, Omit<LiveQuote, "c">> = {};
  const closes: Record<string, number[] | null> = {};
  for (const i of INSTRUMENTS) {
    const q = quoteCache.get(i.symbol)?.q;
    // LSE quotes arrive in pence for shares and pounds for most ETFs — Finnhub
    // reports both in the listing currency, which matches our instrument metadata.
    quotes[i.symbol] = q?.c ?? null;
    if (q) ohlc[i.symbol] = { o: q.o, h: q.h, l: q.l, pc: q.pc };
    const c = closesCache.get(i.symbol)?.c;
    if (c) closes[i.symbol] = c;
  }

  const gotAny = Object.values(quotes).some(Boolean) || Object.values(closes).some(Boolean);
  return NextResponse.json({
    source: gotAny ? ("live" as const) : ("simulated" as const),
    quotes,
    ohlc,
    closes,
  });
}
