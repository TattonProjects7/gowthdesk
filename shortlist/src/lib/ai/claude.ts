// Server-only Claude integration for the AI coach and "why is it moving"
// digests. Uses the official Anthropic SDK; without ANTHROPIC_API_KEY every
// caller falls back to the offline coach (src/lib/ai/offline.ts).
//
// Model: Claude Opus 5.5 at low effort (chat answers don't repay deep
// thinking), with the server-side refusal fallback switched on so a declined
// request is retried on Anthropic's recommended model instead of failing.

import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CoachContext, Digest, DigestInput } from "./types";

export const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

// Stable instructions first (cacheable); the per-request context goes after.
const COACH_SYSTEM = `You are the Shortlist coach, a friendly investing tutor inside a UK paper-trading and learning app. Users practise with virtual money across UK and US shares, ETFs and crypto, take bite-size lessons in the Academy, and can explore a short-selling scanner.

How to help:
- Teach. Explain ideas in plain English with a concrete example, then check understanding or suggest a next step. Match the user's experience level: beginners get no jargon without a definition; advanced users can go deeper.
- Ground answers in the context block below (their portfolio, health check, the instrument or lesson on screen). Quote their actual numbers when relevant. Never invent prices, news or events you were not given; if you don't have the information, say so.
- Be UK-specific: ISAs (£20,000 a year allowance), SIPPs (tax relief; access from 55, rising to 57 from April 2028), general accounts (£3,000 capital gains and £500 dividend allowances), 0.5% stamp duty on most UK shares but not ETFs, FSCS up to £85,000 if a firm fails.
- When it helps, link a lesson with markdown, e.g. [Why fees matter](/learn/fees-matter). Available lesson ids: what-is-a-share, how-markets-move, risk-and-return, compounding, what-is-an-etf, fees-matter, look-through, isas, sipps, gia-tax, moving-averages, rsi-momentum, volatility-bands, order-types, position-sizing, biases, short-selling, squeezes, defined-risk. You can also link app screens: /markets, /portfolio, /portfolio?tab=analytics, /portfolio?tab=automate, /watchlist, /scan, /i/SYMBOL.

Boundaries:
- This is education on paper money, not regulated financial advice. Don't tell the user to buy or sell a specific investment or predict prices. Instead give them a framework, the trade-offs, and the risks, then let them decide. Discussing pros and cons of an idea is fine.
- Encourage healthy habits: diversification, low costs, long horizons, position sizing, using tax wrappers. Gently challenge overtrading, FOMO, and concentrated or high-risk bets. Short selling and crypto carry high risk; say so when relevant.
- If someone seems to be in financial difficulty or asks about debt, point them to free help such as MoneyHelper.

Style: warm, encouraging, concise. Usually under 180 words. Use short paragraphs, bullet points and **bold** for key terms. No headings.`;

function contextBlock(ctx: CoachContext): string {
  return `Context for this conversation (JSON, from the app):\n${JSON.stringify(ctx)}`;
}

function sanitize(messages: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
  const trimmed = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  // The conversation must start with a user turn.
  while (trimmed.length && trimmed[0].role !== "user") trimmed.shift();
  return trimmed;
}

/** Stream the coach's reply as text chunks. Throws if the API call fails before any text. */
export async function* streamCoach(messages: ChatMessage[], ctx: CoachContext): AsyncGenerator<string> {
  const msgs = sanitize(messages);
  if (!msgs.length) return;
  const stream = anthropic().beta.messages.stream({
    model: MODEL,
    max_tokens: 4096,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: [
      { type: "text", text: COACH_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextBlock(ctx) },
    ],
    messages: msgs,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") {
    yield "\n\nI can't help with that one. Try asking about investing concepts, your portfolio, or a lesson.";
  } else if (final.stop_reason === "max_tokens") {
    yield "…";
  }
}

const DIGEST_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "One plain-English sentence, under 90 characters, on what the share is doing today." },
    bullets: { type: "array", items: { type: "string" }, description: "Exactly three short bullets explaining the likely drivers, using only the data provided." },
    takeaway: { type: "string", description: "One sentence of educational context for a long-term investor. No buy/sell advice." },
  },
  required: ["headline", "bullets", "takeaway"],
  additionalProperties: false,
};

/** Robinhood-Cortex-style "why is it moving" digest, as JSON. Returns null on any failure. */
export async function aiDigest(d: DigestInput): Promise<Digest | null> {
  const prompt = `Explain in plain English why ${d.name} (${d.symbol}) may be moving today, for a UK learner investor. Use only the data below — do not invent news, numbers or events. If there are no headlines, explain the move from the technicals and positioning, and say it may simply be normal day-to-day noise.\n\n${JSON.stringify(d)}`;
  const res = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 2048,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: DIGEST_SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    const j = JSON.parse(text.text) as Omit<Digest, "source">;
    if (!j.headline || !Array.isArray(j.bullets) || !j.takeaway) return null;
    return { source: "ai", headline: j.headline, bullets: j.bullets.slice(0, 3), takeaway: j.takeaway };
  } catch {
    return null;
  }
}

const SCREEN_SCHEMA = {
  type: "object",
  properties: {
    filters: { type: "array", items: { type: "string" }, description: 'Screener tokens, each "filterId:optionId", taken only from the catalogue.' },
    signal: { type: "string", description: "One signal id from the catalogue, or an empty string for none." },
    sort: { type: "string", description: 'Column to sort by, e.g. "-change", "pe", "-div", "-cap". A leading minus sorts high to low.' },
    explanation: { type: "string", description: "One or two plain-English sentences describing the screen you built, for a beginner." },
  },
  required: ["filters", "signal", "sort", "explanation"],
  additionalProperties: false,
};

/** Turn a plain-English request into screener tokens. The caller validates them. Returns null on any failure. */
export async function aiScreen(q: string, catalogue: string, columns: string[]): Promise<{ filters: string[]; signal: string; sort: string; explanation: string } | null> {
  const system = `You build stock screens for Shortlist, a UK investing app with a Finviz-style screener covering UK and US shares, ETFs and crypto. Translate the user's request into filter tokens from this catalogue. Use only tokens that appear in it, written "filterId:optionId". Choose the fewest filters that capture the intent; options of the same filter are OR-ed, different filters are AND-ed. If the request is vague, pick sensible beginner-friendly defaults and say what you assumed. This is a screening tool, not advice: describe what the screen finds, never tell the user to buy or sell.

Sortable columns: ${columns.join(", ")}

Catalogue:
${catalogue}`;
  const res = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 1024,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCREEN_SCHEMA } },
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: q }],
  }, { timeout: 8000, maxRetries: 0 }); // the page falls back to the keyword parser rather than wait
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    const j = JSON.parse(text.text) as { filters?: unknown; signal?: unknown; sort?: unknown; explanation?: unknown };
    if (!Array.isArray(j.filters) || typeof j.explanation !== "string") return null;
    return {
      filters: j.filters.filter((t): t is string => typeof t === "string"),
      signal: typeof j.signal === "string" ? j.signal : "",
      sort: typeof j.sort === "string" ? j.sort : "",
      explanation: j.explanation,
    };
  } catch {
    return null;
  }
}

/** One Today's Shortlist pick, as sent to the analyst write-up. Evidence only. */
export interface BriefInput {
  symbol: string;
  name: string;
  why: string;
  evidence: string[];
  triggers: string[];
  against: string[];
  squeeze: string;
  results: string | null;
  rewardRisk: number;
}

export interface BriefNote {
  symbol: string;
  why: string;
  thesis: string;
  against: string;
}

const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          why: { type: "string", description: "One plain-English line, under 110 characters, on why this share made the list." },
          thesis: { type: "string", description: "Two short sentences: the case that the price could fall, from the evidence given." },
          against: { type: "string", description: "One sentence: the strongest reason the short could go wrong." },
        },
        required: ["symbol", "why", "thesis", "against"],
        additionalProperties: false,
      },
    },
  },
  required: ["notes"],
  additionalProperties: false,
};

const BRIEF_SYSTEM = `You write the notes for "Today's Shortlist" in Shortlist, a UK app where people learn investing and practise short selling with virtual money. Each morning a rules-based screen picks up to ten shares that look weak and have a fresh trigger. For each one you write a short, plain-English note for a learner.

Rules:
- Use only the evidence given for that share. Never add news, numbers, dates or events you were not given.
- Describe the evidence; don't recommend. Never tell the reader to short, sell, buy or hold, and never predict a price. Write "the case for a fall is…", not "you should short".
- Always give a fair, specific reason the short could go wrong, taken from the case against when one is provided.
- UK English, no jargon without a quick explanation, no hype, no emojis.
- Return one note per share, with the same symbol you were given.`;

/** Plain-English notes for the day's shortlist. Returns null on any failure; callers keep the rules-based text. */
export async function aiShortlistBrief(items: BriefInput[]): Promise<BriefNote[] | null> {
  if (!items.length) return [];
  const res = await anthropic().beta.messages.create(
    {
      model: MODEL,
      max_tokens: 4096,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: BRIEF_SCHEMA } },
      system: [{ type: "text", text: BRIEF_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Today's picks (JSON):\n${JSON.stringify(items)}` }],
    },
    { timeout: 25_000, maxRetries: 1 },
  );
  if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") return null;
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return null;
  try {
    const j = JSON.parse(text.text) as { notes?: Partial<BriefNote>[] };
    if (!Array.isArray(j.notes)) return null;
    const wanted = new Set(items.map((i) => i.symbol));
    return j.notes
      .filter((n): n is BriefNote => typeof n.symbol === "string" && wanted.has(n.symbol) && typeof n.why === "string" && typeof n.thesis === "string" && typeof n.against === "string")
      .map((n) => ({ symbol: n.symbol, why: n.why.slice(0, 160), thesis: n.thesis.slice(0, 400), against: n.against.slice(0, 280) }));
  } catch {
    return null;
  }
}
