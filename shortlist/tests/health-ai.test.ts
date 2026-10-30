import { describe, it, expect } from "vitest";
import { healthCheck } from "@/lib/health";
import { initialState, placeOrder, setProtection, openAccount, creditReward, grantShares, summarise, type Pricer } from "@/lib/portfolio";
import { offlineCoach, offlineDigest } from "@/lib/ai/offline";
import { rateLimited } from "@/lib/ai/ratelimit";
import type { CoachContext } from "@/lib/ai/types";

const T = Date.UTC(2026, 9, 17, 9);
const PRICES: Record<string, number> = { VWRL: 100, VUSA: 80, AGBP: 5, SGLN: 40, AAPL: 200, BTC: 60000, ETH: 3000, COIN: 240, LLOY: 60 };
const P: Pricer = { now: T, price: (s) => PRICES[s] ?? 0, prevClose: (s) => (PRICES[s] ?? 0) * 0.99 };
const buy = (s: ReturnType<typeof initialState>, symbol: string, amountGbp: number, accountId = "acc_gia") =>
  placeOrder(s, { accountId, symbol, side: "buy", type: "market", amountGbp }, P).state;

describe("portfolio health", () => {
  it("has no score until something is invested", () => {
    expect(healthCheck(initialState(T), P).score).toBeNull();
  });

  it("scores a diversified, low-cost, wrapped portfolio well", () => {
    let s = openAccount(initialState(T), "ISA", T).state;
    s = { ...s, accounts: s.accounts.map((a) => (a.type === "ISA" ? { ...a, cash: 6000 } : a)) };
    s = buy(s, "VWRL", 5000, "acc_isa");
    s = buy(s, "AGBP", 2500);
    s = buy(s, "SGLN", 700);
    const h = healthCheck(s, P);
    expect(h.score).toBeGreaterThanOrEqual(80);
    expect(h.grade).toMatch(/A|B/);
    expect(h.factors).toHaveLength(7);
    expect(h.factors.reduce((a, f) => a + f.max, 0)).toBe(100);
  });

  it("flags a concentrated crypto bet and mostly idle cash", () => {
    const s = buy(initialState(T), "BTC", 1500);
    const h = healthCheck(s, P);
    expect(h.score!).toBeLessThan(50);
    const by = Object.fromEntries(h.factors.map((f) => [f.id, f]));
    expect(by.concentration.status).toBe("bad");
    expect(by.mix.status).toBe("bad");
    expect(by.cash.status).not.toBe("good");
    expect(by.protection.points).toBe(0); // volatile and unprotected
    const protectedS = setProtection(s, s.holdings[0].id, { trailingPct: 15 });
    expect(Object.fromEntries(healthCheck(protectedS, P).factors.map((f) => [f.id, f])).protection.points).toBe(10);
  });

  it("sees hidden concentration through funds", () => {
    let s = buy(initialState(T), "VUSA", 2000);
    s = buy(s, "AAPL", 3000);
    const conc = healthCheck(s, P).factors.find((f) => f.id === "concentration")!;
    expect(conc.detail).toContain("Apple");
    expect(conc.detail).toContain("Direct + VUSA");
  });
});

describe("rewards in the portfolio engine", () => {
  it("credits practice cash and gifted shares as money in, not as return", () => {
    let s = creditReward(initialState(T), "acc_gia", 25, T, "Learn & Earn");
    const g = grantShares(s, "acc_gia", "LLOY", 1, P, "Free share");
    s = g.state;
    expect(g.valueGbp).toBe(0.6);
    expect(s.accounts[0].cash).toBe(10_025);
    expect(s.holdings[0]).toMatchObject({ symbol: "LLOY", qty: 1, avgCost: 0.6 });
    const sum = summarise(s, P);
    expect(sum.totalValue).toBeCloseTo(10_025.6, 2);
    expect(sum.netDeposits).toBeCloseTo(10_025.6, 2);
    expect(sum.totalReturn).toBeCloseTo(0, 2);
    expect(s.transactions[0]).toMatchObject({ type: "reward", amount: 0, value: 0.6 });
  });
});

describe("offline AI coach and digest", () => {
  const ctx: CoachContext = {
    page: "/i/LLOY",
    experience: "beginner",
    lessonsDone: 0,
    level: "Curious",
    instrument: { symbol: "LLOY", name: "Lloyds Banking Group", type: "stock", currency: "GBX", price: 58, dayChangePct: 2.4, trend30Pct: -6, rsi: 72, dailyVolPct: 1.4, aboveTrend: false, dividendYieldPct: 4.6, sector: "Financials", region: "UK", description: "" },
  };
  const ask = (q: string, c = ctx) => offlineCoach([{ role: "user", content: q }], c);

  it("never recommends a trade, gives a framework instead", () => {
    const a = ask("Should I buy LLOY now?");
    expect(a).toMatch(/can't tell you whether to buy or sell/);
    expect(a).toContain("/learn/position-sizing");
    expect(a).toMatch(/not financial advice/);
  });

  it("explains terms with live numbers and a lesson link", () => {
    const a = ask("What does RSI mean?");
    expect(a).toContain("**RSI**");
    expect(a).toContain("LLOY's RSI is 72");
    expect(a).toContain("(/learn/rsi-momentum)");
  });

  it("answers why-is-it-moving from the instrument data", () => {
    const a = ask("Why is it moving today?");
    expect(a).toMatch(/Lloyds Banking Group (jumps|edges up)/);
    expect(a).toMatch(/RSI is 72/);
  });

  it("reviews the portfolio with the health check", () => {
    const a = ask("How healthy is my portfolio?", {
      ...ctx,
      portfolio: { totalValue: 10_500, cash: 500, invested: 10_000, dayChange: 12, totalReturnPct: 5, accounts: ["GIA"], holdings: [{ symbol: "BTC", name: "Bitcoin", type: "crypto", account: "GIA", valueGbp: 10_000, weightPct: 95, pnlPct: 5 }] },
      health: { score: 31, grade: "E", summary: "High risk. Focus on diversification first.", issues: [{ label: "Concentration", detail: "Bitcoin is 100%.", tip: "Spread out." }] },
    });
    expect(a).toContain("Health score: 31/100");
    expect(a).toContain("Concentration");
  });

  it("covers UK tax wrappers and has a helpful default", () => {
    expect(ask("ISA or SIPP?")).toContain("£20,000");
    expect(ask("hello there", { page: "/", experience: null, lessonsDone: 0, level: "Curious" })).toMatch(/I'm your Shortlist coach/);
  });

  it("builds a digest that scales its tone to the size of the move", () => {
    const base = { symbol: "BP", name: "BP", type: "stock", currency: "GBX", price: 400, trend30Pct: 8, rsi: 55, zscore: 1, dailyVolPct: 1.5, aboveTrend: true, sentimentLongPct: 70, headlines: [] };
    const big = offlineDigest({ ...base, dayChangePct: -4.2 });
    expect(big.headline).toMatch(/slides 4.2% — a bigger move than usual/);
    expect(big.bullets).toHaveLength(3);
    const small = offlineDigest({ ...base, dayChangePct: 0.3, headlines: ["BP raises dividend"] });
    expect(small.headline).toMatch(/edges up/);
    expect(small.bullets[2]).toContain("BP raises dividend");
  });
});

describe("rate limiter", () => {
  it("allows up to the limit inside the window, then blocks, then recovers", () => {
    const k = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimited(k, 3, 1000, 10_000 + i)).toBe(false);
    expect(rateLimited(k, 3, 1000, 10_500)).toBe(true);
    expect(rateLimited(k, 3, 1000, 12_000)).toBe(false);
  });
});

describe("offline coach — instrument explainer", () => {
  const ctx: CoachContext = {
    page: "/i/VWRL",
    experience: "beginner",
    lessonsDone: 0,
    level: "Curious",
    instrument: { symbol: "VWRL", name: "Vanguard FTSE All-World UCITS ETF", type: "etf", currency: "GBP", price: 108, dayChangePct: 0.4, trend30Pct: 2.1, rsi: 55, dailyVolPct: 0.9, aboveTrend: true, dividendYieldPct: 1.7, ocfPct: 0.22, sector: "Diversified", region: "Global", description: "3,600+ companies across developed and emerging markets." },
  };
  it("explains the instrument on screen in plain English", () => {
    const a = offlineCoach([{ role: "user", content: "Explain Vanguard FTSE All-World UCITS ETF (VWRL) to me like I'm new to investing" }], ctx);
    expect(a).toContain("**Vanguard FTSE All-World UCITS ETF (VWRL)**");
    expect(a).toContain("0.22% a year");
    expect(a).toContain("/learn/what-is-an-etf");
    expect(a).toContain("spread across many sectors, with global exposure");
    expect(a).not.toMatch(/ in diversified/);
  });
  it("describes a single share by its sector and market", () => {
    const a = offlineCoach([{ role: "user", content: "Explain LLOY to me" }], { ...ctx, page: "/i/LLOY", instrument: { ...ctx.instrument!, symbol: "LLOY", name: "Lloyds Banking Group", type: "stock", currency: "GBX", ocfPct: undefined, sector: "Financials", region: "UK" } });
    expect(a).toContain("a UK-listed share in the financials sector.");
  });
  it("lists the risks when asked", () => {
    const a = offlineCoach([{ role: "user", content: "What are the risks of VWRL?" }], ctx);
    expect(a).toMatch(/main risks/);
    expect(a).toMatch(/Market risk/);
  });
});
