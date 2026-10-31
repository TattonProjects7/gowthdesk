import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/instruments";
import { fetchCompanyNews, hasNews } from "@/lib/marketdata";

export const dynamic = "force-dynamic";

// Company news for one instrument. Real headlines via Finnhub when configured;
// otherwise an empty list and the client shows its generated research notes.
export async function GET(req: Request) {
  const symbol = (new URL(req.url).searchParams.get("symbol") || "").toUpperCase();
  const i = getInstrument(symbol);
  if (!i) return NextResponse.json({ error: "Unknown symbol" }, { status: 404 });
  if (!hasNews() || !i.finnhub || i.type === "crypto") return NextResponse.json({ source: "none", items: [] });
  const items = await fetchCompanyNews(i.type === "stock" ? i.finnhub : i.symbol);
  return NextResponse.json({ source: items.length ? "finnhub" : "none", items });
}
