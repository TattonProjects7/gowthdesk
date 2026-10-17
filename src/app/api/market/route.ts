import { NextResponse } from "next/server";
import { INSTRUMENTS } from "@/lib/instruments";
import { UNIVERSE } from "@/lib/market";
import { fetchDailyCloses, fetchQuote, hasLiveData } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

// Returns real prices/candles when a provider key is configured, otherwise a
// `simulated` flag telling the client to drive itself from the built-in engine.
// Quotes cover the whole universe (UK + US shares, ETFs, crypto); daily candle
// history is fetched only for the short-scanner names to stay inside free-tier
// rate limits. Always responds quickly and never throws — the UI must keep working.
export async function GET() {
  if (!hasLiveData()) {
    return NextResponse.json({ source: "simulated" as const });
  }

  const quotes: Record<string, number | null> = {};
  const closes: Record<string, number[] | null> = {};
  const scanner = new Set(UNIVERSE.map((t) => t.symbol));

  await Promise.all(
    INSTRUMENTS.map(async (i) => {
      const [q, c] = await Promise.all([i.finnhub ? fetchQuote(i.finnhub) : Promise.resolve(null), scanner.has(i.symbol) ? fetchDailyCloses(i.symbol) : Promise.resolve(null)]);
      // LSE quotes arrive in pence for shares and pounds for most ETFs — Finnhub
      // reports both in the listing currency, which matches our instrument metadata.
      quotes[i.symbol] = q;
      closes[i.symbol] = c;
    }),
  );

  const gotAny = Object.values(quotes).some(Boolean) || Object.values(closes).some(Boolean);
  return NextResponse.json({
    source: gotAny ? ("live" as const) : ("simulated" as const),
    quotes,
    closes,
  });
}
