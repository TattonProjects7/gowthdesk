import { describe, it, expect } from "vitest";
import { blackScholesPut, putPlayFor } from "@/lib/options";

describe("black-scholes put", () => {
  it("prices a positive premium for an at-the-money put", () => {
    const p = blackScholesPut(100, 100, 45 / 365, 0.04, 0.5);
    expect(p).toBeGreaterThan(0);
  });

  it("falls back to intrinsic value at expiry", () => {
    expect(blackScholesPut(90, 100, 0, 0.04, 0.5)).toBeCloseTo(10, 5);
    expect(blackScholesPut(110, 100, 0, 0.04, 0.5)).toBe(0);
  });

  it("is worth more when volatility is higher", () => {
    const lo = blackScholesPut(100, 100, 0.25, 0.04, 0.2);
    const hi = blackScholesPut(100, 100, 0.25, 0.04, 0.8);
    expect(hi).toBeGreaterThan(lo);
  });
});

describe("putPlayFor", () => {
  it("returns a coherent, defined-risk structure", () => {
    const play = putPlayFor({ price: 200, target: 170, dailyVol: 0.03, riskBudget: 250 });
    expect(play.premium).toBeGreaterThan(0);
    expect(play.maxLoss).toBeGreaterThan(0);
    expect(play.contracts).toBeGreaterThanOrEqual(1);
    expect(play.breakeven).toBeLessThan(play.strike); // a put's breakeven is below strike
    expect(play.ivPct).toBeGreaterThanOrEqual(20); // vol floor
  });
});
