import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK to check the request Today's Shortlist sends for its
// notes, and how replies, refusals and stray symbols are handled.
const calls: unknown[] = [];
let response: unknown = null;

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    beta = {
      messages: {
        create: async (params: unknown) => {
          calls.push(params);
          return response;
        },
        stream: () => {
          throw new Error("not used");
        },
      },
    };
    static APIError = class extends Error {};
  }
  return { default: Anthropic };
});

const pick = {
  symbol: "INTC",
  name: "Intel",
  why: "It's losing money, and a death cross has formed.",
  evidence: ["Loss-making: No profits to support the share price."],
  triggers: ["Death cross: The 50-day average has crossed below the 200-day."],
  against: ["Profits are forecast to grow 59% next year."],
  squeeze: "low squeeze risk; 3.6% of shares sold short",
  results: null,
  rewardRisk: 2.9,
};

const reply = (notes: unknown) => ({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ notes }) }] });

beforeEach(() => {
  calls.length = 0;
  response = null;
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("Today's Shortlist notes", () => {
  it("asks Claude for structured notes with a cacheable, advice-free system prompt", async () => {
    const { aiShortlistBrief } = await import("@/lib/ai/claude");
    response = reply([{ symbol: "INTC", why: "Losing money as the trend turns down.", thesis: "Losses and a death cross.", against: "Profits are forecast to rebound." }]);
    const notes = await aiShortlistBrief([pick]);
    expect(notes).toEqual([{ symbol: "INTC", why: "Losing money as the trend turns down.", thesis: "Losses and a death cross.", against: "Profits are forecast to rebound." }]);
    const p = calls[0] as Record<string, unknown>;
    expect(p.model).toBe("claude-opus-5-5");
    expect(p.fallbacks).toBe("default");
    expect((p.output_config as { effort: string; format: { type: string } }).effort).toBe("low");
    expect((p.output_config as { format: { type: string } }).format.type).toBe("json_schema");
    const system = p.system as { text: string; cache_control?: unknown }[];
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[0].text).toMatch(/Never tell the reader to short, sell, buy or hold/);
    expect(system[0].text).toMatch(/Use only the evidence given/);
    expect(JSON.stringify(p.messages)).toContain("INTC");
  });

  it("drops notes for symbols it wasn't given and returns null on a refusal", async () => {
    const { aiShortlistBrief } = await import("@/lib/ai/claude");
    response = reply([
      { symbol: "INTC", why: "a", thesis: "b", against: "c" },
      { symbol: "GME", why: "x", thesis: "y", against: "z" },
    ]);
    expect((await aiShortlistBrief([pick]))?.map((n) => n.symbol)).toEqual(["INTC"]);
    response = { stop_reason: "refusal", content: [] };
    expect(await aiShortlistBrief([pick])).toBeNull();
  });

  it("keeps the rules-based wording when no AI key is set", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    const { POST } = await import("@/app/api/shortlist/brief/route");
    const res = await POST(new Request("http://x/api/shortlist/brief", { method: "POST", body: JSON.stringify({ items: [pick] }) }));
    expect(await res.json()).toEqual({ source: "rules", notes: [] });
    expect(calls.length).toBe(0);
    const bad = await POST(new Request("http://x/api/shortlist/brief", { method: "POST", body: JSON.stringify({ items: [{ symbol: "<script>" }] }) }));
    expect(bad.status).toBe(400);
  });

  it("caches the notes for the same picks and serves them to the next visitor", async () => {
    const { POST } = await import("@/app/api/shortlist/brief/route");
    response = reply([{ symbol: "INTC", why: "a", thesis: "b", against: "c" }]);
    const body = JSON.stringify({ items: [{ ...pick, why: "cache test" }] });
    const first = await (await POST(new Request("http://x/api/shortlist/brief", { method: "POST", body, headers: { "x-forwarded-for": "1.1.1.1" } }))).json();
    const second = await (await POST(new Request("http://x/api/shortlist/brief", { method: "POST", body, headers: { "x-forwarded-for": "2.2.2.2" } }))).json();
    expect(first.source).toBe("ai");
    expect(second).toEqual(first);
    expect(calls.length).toBe(1);
  });
});
