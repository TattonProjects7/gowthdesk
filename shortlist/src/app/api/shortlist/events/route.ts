import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/instruments";
import { fetchCompanyNews, fetchInsiderTransactions, fetchRecommendationTrend, hasNews } from "@/lib/marketdata";
import { downgradeEvent, insiderEvent, newsEvents } from "@/lib/shortlist/events";
import type { EventsBySymbol, MarketEvent } from "@/lib/shortlist/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The Signal hunter's outside evidence for Today's Shortlist: bad-news
// headlines, insiders selling and analysts turning cautious, for the handful of
// weakest shares the device sends. Real data only: without FINNHUB_API_KEY the
// answer is "none" and the list runs on chart triggers alone.
//
// Each share is cached for six hours and shared by every visitor. A share costs
// up to three Finnhub calls (news; insiders and analyst trend for US shares),
// fetched three shares at a time to stay inside the free tier's rate limit.

const TTL = 6 * 3600_000;
const MAX = 15;
const cache = new Map<string, { at: number; events: MarketEvent[] }>();

async function eventsFor(symbol: string, now: number): Promise<MarketEvent[]> {
  const hit = cache.get(symbol);
  if (hit && now - hit.at < TTL) return hit.events;
  const i = getInstrument(symbol);
  if (!i?.finnhub) return [];
  const us = i.region === "US" && i.currency === "USD";
  const [news, insiders, trend] = await Promise.all([
    fetchCompanyNews(i.finnhub),
    us ? fetchInsiderTransactions(i.finnhub) : Promise.resolve([]),
    us ? fetchRecommendationTrend(i.finnhub) : Promise.resolve([]),
  ]);
  const events = [...newsEvents(news, now), insiderEvent(insiders, now), downgradeEvent(trend)].filter((e): e is MarketEvent => !!e);
  cache.set(symbol, { at: now, events });
  return events;
}

export async function GET(req: Request) {
  if (!hasNews()) return NextResponse.json({ source: "none" as const, events: {} });
  const raw = new URL(req.url).searchParams.get("symbols") ?? "";
  const symbols = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()))]
    .filter((s) => getInstrument(s)?.type === "stock")
    .slice(0, MAX);
  const now = Date.now();
  const events: EventsBySymbol = {};
  for (let k = 0; k < symbols.length; k += 3) {
    const batch = symbols.slice(k, k + 3);
    const res = await Promise.all(batch.map((s) => eventsFor(s, now).catch(() => [] as MarketEvent[])));
    batch.forEach((s, j) => {
      if (res[j].length) events[s] = res[j];
    });
  }
  return NextResponse.json({ source: "live" as const, events });
}
