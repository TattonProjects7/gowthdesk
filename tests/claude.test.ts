import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK so we can check the exact requests the coach and
// digest send, and how they handle streamed text, refusals and JSON output.
const calls: { stream: unknown[]; create: unknown[] } = { stream: [], create: [] };
let streamText: string[] = [];
let streamStop = "end_turn";
let createResponse: unknown = null;

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = {
      messages: {
        stream: (params: unknown) => {
          calls.stream.push(params);
          const events = streamText.map((t) => ({ type: "content_block_delta", delta: { type: "text_delta", text: t } }));
          return {
            async *[Symbol.asyncIterator]() {
              for (const e of events) yield e;
            },
            finalMessage: async () => ({ stop_reason: streamStop, content: [] }),
          };
        },
        create: async (params: unknown) => {
          calls.create.push(params);
          return createResponse;
        },
      },
    };
    static APIError = class extends Error {};
    static RateLimitError = class extends Error {};
    static AuthenticationError = class extends Error {};
  }
  return { default: Anthropic };
});

const ctx = { page: "/portfolio", experience: "beginner" as const, lessonsDone: 2, level: "Saver" };

beforeEach(() => {
  calls.stream = [];
  calls.create = [];
  streamText = [];
  streamStop = "end_turn";
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("Claude coach", () => {
  it("streams text with Opus 5.5, low effort, refusal fallback and a cacheable system prompt", async () => {
    const { streamCoach, MODEL } = await import("@/lib/ai/claude");
    streamText = ["Hello ", "investor!"];
    const out: string[] = [];
    for await (const chunk of streamCoach([{ role: "user", content: "What is an ETF?" }], ctx)) out.push(chunk);
    expect(out.join("")).toBe("Hello investor!");
    expect(MODEL).toBe("claude-opus-5-5");
    const p = calls.stream[0] as Record<string, unknown>;
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.fallbacks).toBe("default");
    expect(p.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(p.output_config).toEqual({ effort: "low" });
    expect(p).not.toHaveProperty("thinking");
    const system = p.system as { text: string; cache_control?: unknown }[];
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[0].text).toMatch(/not regulated financial advice/);
    expect(system[1].text).toContain('"level":"Saver"');
  });

  it("trims history to the last 12 turns, starts on a user turn and caps message length", async () => {
    const { streamCoach } = await import("@/lib/ai/claude");
    const long = Array.from({ length: 20 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i} ${"x".repeat(3000)}` }));
    for await (const _ of streamCoach(long, ctx)) void _;
    const msgs = (calls.stream[0] as { messages: { role: string; content: string }[] }).messages;
    expect(msgs.length).toBeLessThanOrEqual(12);
    expect(msgs[0].role).toBe("user");
    expect(Math.max(...msgs.map((m) => m.content.length))).toBe(2000);
  });

  it("adds a polite note when the answer is refused", async () => {
    const { streamCoach } = await import("@/lib/ai/claude");
    streamStop = "refusal";
    const out: string[] = [];
    for await (const chunk of streamCoach([{ role: "user", content: "hi" }], ctx)) out.push(chunk);
    expect(out.join("")).toMatch(/can't help with that one/);
  });
});

describe("Claude digest", () => {
  const input = { symbol: "BP", name: "BP", type: "stock", currency: "GBX", price: 400, dayChangePct: -3, trend30Pct: 2, rsi: 40, zscore: -1, dailyVolPct: 1.7, aboveTrend: false, sentimentLongPct: 60, headlines: [] };

  it("requests structured JSON and parses it", async () => {
    const { aiDigest } = await import("@/lib/ai/claude");
    createResponse = { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ headline: "BP slips 3%", bullets: ["a", "b", "c", "d"], takeaway: "Normal noise." }) }] };
    const d = await aiDigest(input);
    expect(d).toEqual({ source: "ai", headline: "BP slips 3%", bullets: ["a", "b", "c"], takeaway: "Normal noise." });
    const p = calls.create[0] as { output_config: { effort: string; format: { type: string; schema: { required: string[] } } }; fallbacks: string };
    expect(p.output_config.effort).toBe("low");
    expect(p.output_config.format.type).toBe("json_schema");
    expect(p.output_config.format.schema.required).toEqual(["headline", "bullets", "takeaway"]);
    expect(p.fallbacks).toBe("default");
  });

  it("returns null on refusal or bad JSON so the route can fall back", async () => {
    const { aiDigest } = await import("@/lib/ai/claude");
    createResponse = { stop_reason: "refusal", content: [] };
    expect(await aiDigest(input)).toBeNull();
    createResponse = { stop_reason: "end_turn", content: [{ type: "text", text: "not json" }] };
    expect(await aiDigest(input)).toBeNull();
  });
});
