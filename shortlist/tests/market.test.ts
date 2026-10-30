import { describe, it, expect } from "vitest";
import { priceAt, dayChangePct, UNIVERSE } from "@/lib/market";

const T = 1_700_000_000_000; // fixed timestamp for determinism

describe("market simulator", () => {
  it("is deterministic for a given (symbol, time)", () => {
    expect(priceAt("AAPL", T)).toBe(priceAt("AAPL", T));
  });

  it("stays within a sane band of the anchor price", () => {
    for (const t of UNIVERSE) {
      const p = priceAt(t.symbol, T);
      expect(p).toBeGreaterThan(t.base * 0.7);
      expect(p).toBeLessThan(t.base * 1.3);
    }
  });

  it("returns 0 for an unknown symbol", () => {
    expect(priceAt("NOPE", T)).toBe(0);
  });

  it("produces a finite day-change percentage", () => {
    const chg = dayChangePct("NVDA", T);
    expect(Number.isFinite(chg)).toBe(true);
  });
});
