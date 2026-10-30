import { NextResponse } from "next/server";
import { fetchCompanyNews, fetchMarketNews, hasNews, type MarketHeadline } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

// Headlines for the News page, by tab. Live from Finnhub when FINNHUB_API_KEY is
// set; otherwise an empty list, and the page explains — we never make up news.
// Cached for five minutes per tab, shared by every visitor.

type Tab = "market" | "stocks" | "etf" | "crypto";
const TTL = 5 * 60_000;
const cache = new Map<Tab, { at: number; items: MarketHeadline[] }>();

const STOCKS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM"];
const ETFS = ["SPY", "QQQ", "VTI", "GLD"];

async function companyBatch(symbols: string[]): Promise<MarketHeadline[]> {
  const lists = await Promise.all(symbols.map(async (s) => (await fetchCompanyNews(s)).map((n) => ({ ...n, id: `${s}:${n.id}`, related: [s] }))));
  // The same story often appears under several tickers: merge by URL.
  const byUrl = new Map<string, MarketHeadline>();
  for (const n of lists.flat()) {
    const hit = byUrl.get(n.url);
    if (hit) hit.related = [...new Set([...hit.related, ...n.related])];
    else byUrl.set(n.url, n);
  }
  return [...byUrl.values()].sort((a, b) => b.at - a.at).slice(0, 60);
}

async function load(tab: Tab): Promise<MarketHeadline[]> {
  switch (tab) {
    case "market":
      return fetchMarketNews("general");
    case "crypto":
      return fetchMarketNews("crypto");
    case "stocks":
      return companyBatch(STOCKS);
    case "etf": {
      const [funds, general] = await Promise.all([companyBatch(ETFS), fetchMarketNews("general")]);
      const etfy = general.filter((n) => /\b(ETFs?|index funds?|tracker)\b/i.test(`${n.headline} ${n.summary}`));
      const seen = new Set<string>();
      return [...funds, ...etfy].filter((n) => (seen.has(n.url) ? false : (seen.add(n.url), true))).sort((a, b) => b.at - a.at);
    }
  }
}

export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("tab");
  const tab: Tab = t === "stocks" || t === "etf" || t === "crypto" ? t : "market";
  if (!hasNews()) return NextResponse.json({ source: "none" as const, items: [] });
  const hit = cache.get(tab);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ source: "live" as const, items: hit.items });
  const items = await load(tab).catch(() => hit?.items ?? []);
  if (items.length) cache.set(tab, { at: Date.now(), items });
  return NextResponse.json({ source: "live" as const, items: items.length ? items : (hit?.items ?? []) });
}
