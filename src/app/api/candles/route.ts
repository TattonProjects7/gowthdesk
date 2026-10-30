import { NextResponse } from "next/server";
import { getInstrument } from "@/lib/instruments";
import { loadCandles, type CandleSource } from "@/lib/live/candles";
import type { Bar } from "@/lib/bars";

export const dynamic = "force-dynamic";

// Real daily candles, so charts and indicators use actual history rather than
// the simulator's:
//   • crypto — Coinbase Exchange public candles (no key)
//   • US shares and ETFs — Twelve Data (free key, TWELVEDATA_API_KEY)
// Anything else answers `source: "none"` and the app keeps the simulated shape
// re-based onto the real price. Responses are cached on the server and at the
// CDN, so the free tiers' limits are shared by everyone, not spent per visitor.

const OK_TTL = { crypto: 30 * 60_000, stock: 6 * 3600_000 };
const FAIL_TTL = 10 * 60_000;

type Source = CandleSource;
type Result = { source: Source; bars: Bar[]; throttled?: boolean };
const cache = new Map<string, { at: number; ttl: number } & Result>();
const inflight = new Map<string, Promise<Result>>();

export async function GET(req: Request) {
  const sym = (new URL(req.url).searchParams.get("s") ?? "").toUpperCase();
  const i = getInstrument(sym);
  if (!i) return NextResponse.json({ error: "Unknown instrument." }, { status: 404 });

  const hit = cache.get(i.symbol);
  let r: Result;
  if (hit && Date.now() - hit.at < hit.ttl) r = hit;
  else {
    let p = inflight.get(i.symbol);
    if (!p) {
      p = loadCandles(i).finally(() => inflight.delete(i.symbol));
      inflight.set(i.symbol, p);
    }
    r = await p;
    // A failed refresh keeps serving the last good candles.
    if (r.source === "none" && hit?.bars.length) r = hit;
    const ttl = r.throttled ? 60_000 : r.source === "none" ? FAIL_TTL : OK_TTL[i.type === "crypto" ? "crypto" : "stock"];
    cache.set(i.symbol, { at: Date.now(), ttl, ...r });
  }

  return NextResponse.json(
    // `retry` tells the browser when asking again is worthwhile (seconds).
    { symbol: i.symbol, source: r.source, bars: r.bars, ...(r.source === "none" ? { retry: r.throttled ? 65 : 600 } : {}) },
    { headers: r.source === "none" ? { "Cache-Control": "no-store" } : { "Cache-Control": `public, s-maxage=${i.type === "crypto" ? 900 : 3600}, stale-while-revalidate=86400` } },
  );
}
