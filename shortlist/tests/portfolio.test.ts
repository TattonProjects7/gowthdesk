import { describe, it, expect } from "vitest";
import {
  initialState,
  placeOrder,
  processPending,
  processProtections,
  smartTopUpPlan,
  rebalancePlan,
  executeRebalance,
  runSavingsPlans,
  runAutoInvest,
  addSavingsPlan,
  setTargets,
  setAutoInvest,
  openAccount,
  transfer,
  allocation,
  overlaps,
  summarise,
  incomeProjection,
  payDividends,
  divCycle,
  nextRun,
  STARTING_CASH,
  MODEL_PORTFOLIOS,
  type Pricer,
} from "@/lib/portfolio";
import { toGbp, gbpUsd, FX_FEE_PCT } from "@/lib/fx";
import { getInstrument } from "@/lib/instruments";

const T = 1_700_000_000_000;

// A controllable price feed: fixed native prices, tweakable per test.
function pricer(prices: Record<string, number>, now = T): Pricer {
  return { now, price: (s) => prices[s] ?? 0, prevClose: (s) => (prices[s] ?? 0) * 0.99 };
}

const BASE = { VUSA: 80, VWRL: 100, ISF: 8, AAPL: 200, LLOY: 60, BTC: 60000, AGBP: 5, IGLT: 10, SGLN: 40, EQQQ: 400, VFEM: 50 };

describe("fx", () => {
  it("converts pence and dollars to pounds", () => {
    expect(toGbp(100, "GBX", T)).toBe(1);
    expect(toGbp(80, "GBP", T)).toBe(80);
    expect(toGbp(gbpUsd(T), "USD", T)).toBeCloseTo(1, 6);
  });
});

describe("orders", () => {
  it("fills a market buy in £ with fractional units and no fee on GBP ETFs", () => {
    const s0 = initialState(T);
    const r = placeOrder(s0, { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", amountGbp: 100 }, pricer(BASE));
    expect(r.error).toBeUndefined();
    expect(r.order?.status).toBe("filled");
    expect(r.order?.fillQty).toBeCloseTo(1.25, 6);
    expect(r.order?.feeGbp).toBe(0);
    expect(r.state.accounts[0].cash).toBeCloseTo(STARTING_CASH - 100, 2);
    expect(r.state.holdings).toHaveLength(1);
    expect(r.state.transactions[0].type).toBe("buy");
  });

  it("charges the FX fee on USD shares and converts at GBP/USD", () => {
    const r = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "AAPL", side: "buy", type: "market", qty: 10 }, pricer(BASE));
    const unit = 200 / gbpUsd(T);
    expect(r.order?.fillValueGbp).toBeCloseTo(10 * unit, 1);
    expect(r.order?.feeGbp).toBeCloseTo((10 * unit * FX_FEE_PCT) / 100, 1);
    expect(r.state.accounts[0].cash).toBeCloseTo(STARTING_CASH - 10 * unit * (1 + FX_FEE_PCT / 100), 1);
  });

  it("prices LSE shares in pence", () => {
    const r = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "LLOY", side: "buy", type: "market", qty: 1000 }, pricer(BASE));
    expect(r.order?.fillValueGbp).toBe(600); // 1000 × 60p
  });

  it("rejects a buy it cannot fund and reports the shortfall", () => {
    const r = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VWRL", side: "buy", type: "market", amountGbp: 20_000 }, pricer(BASE));
    expect(r.order).toBeUndefined();
    expect(r.error).toMatch(/Not enough cash/);
    expect(r.shortfall).toBeCloseTo(10_000, 0);
  });

  it("sells, realises P&L and removes an emptied holding", () => {
    let s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 10 }, pricer(BASE)).state;
    const up = pricer({ ...BASE, VUSA: 88 });
    const r = placeOrder(s, { accountId: "acc_gia", symbol: "VUSA", side: "sell", type: "market", qty: 10 }, up);
    s = r.state;
    expect(r.order?.status).toBe("filled");
    expect(s.holdings).toHaveLength(0);
    expect(s.transactions[0].realised).toBeCloseTo(80, 2);
    expect(s.accounts[0].cash).toBeCloseTo(STARTING_CASH + 80, 2);
    expect(summarise(s, up).realised).toBeCloseTo(80, 2);
  });

  it("holds a limit buy until the price falls to the limit, then fills it", () => {
    const r = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "limit", amountGbp: 100, limitPrice: 75 }, pricer(BASE));
    expect(r.order?.status).toBe("pending");
    const untouched = processPending(r.state, pricer({ ...BASE, VUSA: 78 }));
    expect(untouched.state.orders[0].status).toBe("pending");
    const filled = processPending(r.state, pricer({ ...BASE, VUSA: 74 }));
    expect(filled.state.orders[0].status).toBe("filled");
    expect(filled.state.orders[0].fillPrice).toBe(74);
    expect(filled.events[0].kind).toBe("order");
  });

  it("refuses a buy limit above the market and a stop above the market", () => {
    expect(placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "limit", amountGbp: 100, limitPrice: 90 }, pricer(BASE)).error).toMatch(/below/);
    const s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 1 }, pricer(BASE)).state;
    expect(placeOrder(s, { accountId: "acc_gia", symbol: "VUSA", side: "sell", type: "stop", qty: 1, limitPrice: 90 }, pricer(BASE)).error).toMatch(/below/);
  });
});

describe("protections", () => {
  it("sells the whole position when a stop-loss is hit", () => {
    const s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 10, stopLoss: 72 }, pricer(BASE)).state;
    const calm = processProtections(s, pricer({ ...BASE, VUSA: 75 }));
    expect(calm.state.holdings).toHaveLength(1);
    const hit = processProtections(s, pricer({ ...BASE, VUSA: 71 }));
    expect(hit.state.holdings).toHaveLength(0);
    expect(hit.state.orders[0].source).toBe("stop_loss");
    expect(hit.events[0].kind).toBe("protection");
  });

  it("trails a stop below the high-water mark", () => {
    let s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 10, trailingPct: 10 }, pricer(BASE)).state;
    s = processProtections(s, pricer({ ...BASE, VUSA: 100 })).state; // new high
    expect(s.holdings[0].highWater).toBe(100);
    s = processProtections(s, pricer({ ...BASE, VUSA: 92 })).state; // −8%: still in
    expect(s.holdings).toHaveLength(1);
    s = processProtections(s, pricer({ ...BASE, VUSA: 89 })).state; // −11%: out
    expect(s.holdings).toHaveLength(0);
    expect(s.orders[0].source).toBe("trailing_stop");
  });

  it("takes profit", () => {
    const s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 10, takeProfit: 95 }, pricer(BASE)).state;
    const r = processProtections(s, pricer({ ...BASE, VUSA: 96 }));
    expect(r.state.holdings).toHaveLength(0);
    expect(r.state.orders[0].source).toBe("take_profit");
  });
});

describe("automation", () => {
  const targets = { VUSA: 60, AGBP: 40 };

  it("smart top-up fills the underweight line first", () => {
    let s = setTargets(initialState(T), "acc_gia", targets);
    s = placeOrder(s, { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", amountGbp: 600 }, pricer(BASE)).state; // 100% VUSA so far
    const plan = smartTopUpPlan(s, "acc_gia", 400, pricer(BASE));
    // After the top-up the book is £1,000: target VUSA £600 (have it), AGBP £400 (have 0) → all £400 to AGBP.
    expect(plan).toEqual([{ symbol: "AGBP", amountGbp: 400 }]);
  });

  it("splits by target weight when nothing is underweight", () => {
    const s = setTargets(initialState(T), "acc_gia", targets);
    const plan = smartTopUpPlan(s, "acc_gia", 100, pricer(BASE));
    expect(plan.find((p) => p.symbol === "VUSA")?.amountGbp).toBe(60);
    expect(plan.find((p) => p.symbol === "AGBP")?.amountGbp).toBe(40);
  });

  it("rebalances back to target with sells before buys", () => {
    let s = setTargets(initialState(T), "acc_gia", targets);
    s = placeOrder(s, { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", amountGbp: 800 }, pricer(BASE)).state;
    s = placeOrder(s, { accountId: "acc_gia", symbol: "AGBP", side: "buy", type: "market", amountGbp: 200 }, pricer(BASE)).state;
    const legs = rebalancePlan(s, "acc_gia", pricer(BASE));
    expect(legs[0]).toMatchObject({ symbol: "VUSA", side: "sell", amountGbp: 200 });
    expect(legs[1]).toMatchObject({ symbol: "AGBP", side: "buy", amountGbp: 200 });
    const after = executeRebalance(s, "acc_gia", pricer(BASE));
    expect(after.errors).toHaveLength(0);
    expect(rebalancePlan(after.state, "acc_gia", pricer(BASE))).toHaveLength(0);
    const slices = allocation(after.state, pricer(BASE), "holding", false);
    expect(slices.find((x) => x.symbol === "VUSA")?.pct).toBeCloseTo(60, 0);
  });

  it("rebalance stays self-funding when selling a USD holding costs an FX fee", () => {
    // Everything in a US share, target is all GBP ETFs: the sell pays 0.5% FX,
    // so its proceeds are short of the buys — the buys must scale down, not fail.
    let s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "AAPL", side: "buy", type: "market", amountGbp: 9_990 }, pricer(BASE)).state;
    s = setTargets(s, "acc_gia", { VWRL: 50, VUSA: 30, SGLN: 20 });
    const r = executeRebalance(s, "acc_gia", pricer(BASE));
    expect(r.errors).toEqual([]);
    expect(r.state.holdings.map((h) => h.symbol).sort()).toEqual(["SGLN", "VUSA", "VWRL"]);
    expect(r.state.accounts[0].cash).toBeGreaterThanOrEqual(0);
    expect(rebalancePlan(r.state, "acc_gia", pricer(BASE))).toHaveLength(0);
  });

  it("runs a due savings plan: deposits then invests towards targets", () => {
    let s = setTargets(initialState(T), "acc_gia", targets);
    s = addSavingsPlan(s, { accountId: "acc_gia", amount: 100, frequency: "monthly", target: { kind: "portfolio" }, nextRunAt: T - 1 }, T - 86400_000);
    const r = runSavingsPlans(s, pricer(BASE));
    expect(r.state.savingsPlans[0].runs).toBe(1);
    expect(r.state.savingsPlans[0].nextRunAt).toBe(nextRun(T - 1, "monthly"));
    expect(r.state.holdings.map((h) => h.symbol).sort()).toEqual(["AGBP", "VUSA"]);
    expect(r.state.accounts[0].cash).toBeCloseTo(STARTING_CASH, 2); // contribution fully invested
    expect(r.events[0].kind).toBe("plan");
  });

  it("AutoInvest deploys cash above the buffer", () => {
    let s = setTargets(initialState(T), "acc_gia", targets);
    s = setAutoInvest(s, "acc_gia", true, 9_500);
    const r = runAutoInvest(s, pricer(BASE));
    expect(r.state.accounts[0].cash).toBeCloseTo(9_500, 2);
    expect(r.state.holdings).toHaveLength(2);
    expect(runAutoInvest(r.state, pricer(BASE)).state.holdings).toHaveLength(2); // nothing more to do
  });

  it("model portfolios sum to 100% and only use known instruments", () => {
    for (const m of MODEL_PORTFOLIOS) {
      expect(Object.values(m.targets).reduce((a, b) => a + b, 0)).toBe(100);
      for (const k of Object.keys(m.targets)) expect(getInstrument(k)).toBeTruthy();
    }
  });
});

describe("accounts & analytics", () => {
  it("opens an ISA once and moves money between accounts", () => {
    let s = openAccount(initialState(T), "ISA", T).state;
    s = openAccount(s, "ISA", T).state;
    expect(s.accounts).toHaveLength(2);
    const r = transfer(s, "acc_gia", "acc_isa", 2_000, T);
    expect(r.error).toBeUndefined();
    expect(r.state.accounts.find((a) => a.id === "acc_isa")?.cash).toBe(2_000);
    expect(transfer(r.state, "acc_isa", "acc_gia", 5_000, T).error).toMatch(/available/);
  });

  it("looks through ETFs to underlying companies and flags overlap", () => {
    let s = initialState(T);
    s = placeOrder(s, { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", amountGbp: 1_000 }, pricer(BASE)).state;
    s = placeOrder(s, { accountId: "acc_gia", symbol: "EQQQ", side: "buy", type: "market", amountGbp: 1_000 }, pricer(BASE)).state;
    s = placeOrder(s, { accountId: "acc_gia", symbol: "AAPL", side: "buy", type: "market", amountGbp: 500 }, pricer(BASE)).state;
    const look = allocation(s, pricer(BASE), "lookthrough", false);
    const apple = look.find((x) => x.name === "Apple")!;
    expect(apple.via.sort()).toEqual(["Direct", "EQQQ", "VUSA"]);
    expect(apple.valueGbp).toBeCloseTo(500 * (1 - FX_FEE_PCT / 100) + 68 + 89, 0);
    expect(overlaps(s, pricer(BASE)).some((x) => x.name === "Apple")).toBe(true);
    const sectors = allocation(s, pricer(BASE), "sector", false);
    expect(sectors[0].name).toBe("Technology");
    const assets = allocation(s, pricer(BASE), "asset");
    expect(assets.map((a) => a.name).sort()).toEqual(["Cash", "Equity"]);
    expect(assets.reduce((x, a) => x + a.pct, 0)).toBeCloseTo(100, 0);
  });

  it("projects income from trailing yields and pays a quarterly dividend when the cycle rolls", () => {
    let s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "ISF", side: "buy", type: "market", amountGbp: 1_000 }, pricer(BASE)).state;
    const inc = incomeProjection(s, pricer(BASE));
    expect(inc.annual).toBeCloseTo(36, 0);
    expect(inc.yieldPct).toBeCloseTo(3.6, 1);
    const later = T + 92 * 86400_000;
    expect(divCycle("ISF", later)).toBe(divCycle("ISF", T) + 1);
    const paid = payDividends(s, pricer(BASE, later));
    expect(paid.events).toHaveLength(1);
    expect(paid.state.accounts[0].cash).toBeCloseTo(STARTING_CASH - 1_000 + 9, 0);
    expect(payDividends(paid.state, pricer(BASE, later)).events).toHaveLength(0); // not paid twice
    s = paid.state;
    expect(summarise(s, pricer(BASE, later)).dividends).toBeCloseTo(9, 0);
  });

  it("summarises value, day change and return vs deposits", () => {
    const s = placeOrder(initialState(T), { accountId: "acc_gia", symbol: "VUSA", side: "buy", type: "market", qty: 10 }, pricer(BASE)).state;
    const sum = summarise(s, pricer({ ...BASE, VUSA: 90 }));
    expect(sum.invested).toBe(900);
    expect(sum.unrealised).toBe(100);
    expect(sum.totalValue).toBeCloseTo(STARTING_CASH + 100, 2);
    expect(sum.totalReturn).toBeCloseTo(100, 2);
    expect(sum.dayChange).toBeCloseTo(9, 1); // prevClose = 99% of price
    expect(sum.accounts[0].value).toBeCloseTo(sum.totalValue, 2);
  });
});
