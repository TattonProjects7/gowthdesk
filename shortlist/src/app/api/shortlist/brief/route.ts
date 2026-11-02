import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, aiShortlistBrief, type BriefInput, type BriefNote } from "@/lib/ai/claude";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Plain-English notes for Today's Shortlist, written by Claude from the
// evidence the device sends. Without ANTHROPIC_API_KEY (or on any failure) the
// answer is "rules" and the page keeps its rules-based wording.
//
// The same picks give the same notes all day, so answers are cached by the
// list's contents and shared by every visitor.

const TTL = 12 * 3600_000;
const cache = new Map<string, { at: number; notes: BriefNote[] }>();

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v.slice(0, n).map((x) => str(x, max)).filter(Boolean) : []);

function clean(raw: unknown): BriefInput | null {
  const r = raw as Record<string, unknown>;
  const symbol = str(r?.symbol, 12).toUpperCase();
  if (!/^[A-Z0-9.]{1,12}$/.test(symbol)) return null;
  return {
    symbol,
    name: str(r.name, 80),
    why: str(r.why, 200),
    evidence: strs(r.evidence, 5, 200),
    triggers: strs(r.triggers, 4, 200),
    against: strs(r.against, 3, 220),
    squeeze: str(r.squeeze, 200),
    results: typeof r.results === "string" ? r.results.slice(0, 80) : null,
    rewardRisk: typeof r.rewardRisk === "number" && Number.isFinite(r.rewardRisk) ? Math.round(r.rewardRisk * 10) / 10 : 0,
  };
}

export async function POST(req: Request) {
  let body: { items?: unknown };
  try {
    body = (await req.json()) as { items?: unknown };
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 10).map(clean).filter((x): x is BriefInput => !!x);
  if (!items.length) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  if (!aiConfigured()) return NextResponse.json({ source: "rules" as const, notes: [] });

  const key = JSON.stringify(items);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ source: "ai" as const, notes: hit.notes });
  if (rateLimited(`brief:${clientKey(req)}`, 6, 10 * 60_000)) return NextResponse.json({ source: "rules" as const, notes: [] });

  try {
    const notes = await aiShortlistBrief(items);
    if (notes && notes.length) {
      cache.set(key, { at: Date.now(), notes });
      if (cache.size > 200) cache.delete(cache.keys().next().value as string);
      return NextResponse.json({ source: "ai" as const, notes });
    }
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error(`shortlist brief: API error ${err.status}`);
    else console.error("shortlist brief: unexpected error", err);
  }
  return NextResponse.json({ source: "rules" as const, notes: [] });
}
