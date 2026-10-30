import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, aiDigest } from "@/lib/ai/claude";
import { offlineDigest } from "@/lib/ai/offline";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";
import type { DigestInput } from "@/lib/ai/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// "Why is it moving?" — an AI digest of today's move (Robinhood Cortex
// Digests, for practice). Claude when configured, otherwise a rules-based
// digest from the same inputs. Clients cache the result per symbol per day.
export async function POST(req: Request) {
  let d: DigestInput;
  try {
    d = (await req.json()) as DigestInput;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!d?.symbol || typeof d.price !== "number") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  d.headlines = Array.isArray(d.headlines) ? d.headlines.slice(0, 5).map((h) => String(h).slice(0, 200)) : [];

  if (aiConfigured() && !rateLimited(`digest:${clientKey(req)}`, 40, 10 * 60_000)) {
    try {
      const ai = await aiDigest(d);
      if (ai) return NextResponse.json(ai);
    } catch (err) {
      if (err instanceof Anthropic.APIError) console.error(`digest: API error ${err.status}`);
      else console.error("digest: unexpected error", err);
    }
  }
  return NextResponse.json(offlineDigest(d));
}
