import { NextResponse } from "next/server";
import { UNIVERSE } from "@/lib/market";
import { fetchDailyCloses, fetchQuote, hasLiveData } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

// Returns real prices/candles when a provider key is configured, otherwise a
// `simulated` flag telling the client to drive itself from the built-in engine.
// Always responds quickly and never throws — the UI must keep working.
export async function GET() {
  if (!hasLiveData()) {
    return NextResponse.json({ source: "simulated" as const });
  }

  const quotes: Record<string, number | null> = {};
  const closes: Record<string, number[] | null> = {};

  await Promise.all(
    UNIVERSE.map(async (t) => {
      const [q, c] = await Promise.all([fetchQuote(t.symbol), fetchDailyCloses(t.symbol)]);
      quotes[t.symbol] = q;
      closes[t.symbol] = c;
    }),
  );

  const gotAny = Object.values(quotes).some(Boolean) || Object.values(closes).some(Boolean);
  return NextResponse.json({
    source: gotAny ? ("live" as const) : ("simulated" as const),
    quotes,
    closes,
  });
}
