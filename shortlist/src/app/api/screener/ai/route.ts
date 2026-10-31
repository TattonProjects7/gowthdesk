import { NextResponse } from "next/server";
import { aiConfigured, aiScreen } from "@/lib/ai/claude";
import { clientKey, rateLimited } from "@/lib/ai/ratelimit";
import { SIGNALS, allTokens } from "@/lib/screener/filters";
import { SORTABLE } from "@/lib/screener/columns";
import { catalogue, parseScreenOffline, type ParsedScreen } from "@/lib/screener/nlp";

export const dynamic = "force-dynamic";

// Plain-English → screen. Claude builds it when ANTHROPIC_API_KEY is set; the
// keyword parser answers otherwise, or if the call fails. Whatever comes back
// is validated against the real catalogue before it reaches the page.
export async function POST(req: Request) {
  let q = "";
  try {
    const body = (await req.json()) as { q?: unknown };
    q = typeof body.q === "string" ? body.q.trim().slice(0, 300) : "";
  } catch {
    /* empty body */
  }
  if (!q) return NextResponse.json({ error: "Describe the shares you're looking for." }, { status: 400 });

  const offline = parseScreenOffline(q);
  if (!aiConfigured() || rateLimited(`screen:${clientKey(req)}`, 12, 60_000)) return NextResponse.json(offline);

  try {
    const r = await aiScreen(q, catalogue(), SORTABLE);
    if (!r) return NextResponse.json(offline);
    const valid = new Set(allTokens());
    const filters = [...new Set(r.filters.filter((t) => valid.has(t)))];
    const signal = SIGNALS.some((s) => s.id === r.signal) ? r.signal : "";
    const sortId = r.sort.replace(/^-/, "");
    const out: ParsedScreen = {
      filters,
      signal: signal as ParsedScreen["signal"],
      sort: SORTABLE.includes(sortId) ? r.sort : undefined,
      explanation: r.explanation.slice(0, 400),
      source: "ai",
    };
    // An AI answer with nothing usable falls back to the keyword parser.
    return NextResponse.json(filters.length || signal ? out : offline);
  } catch {
    return NextResponse.json(offline);
  }
}
