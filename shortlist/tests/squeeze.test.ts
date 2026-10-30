import { describe, it, expect } from "vitest";
import { squeezeFor } from "@/lib/squeeze";

describe("squeeze radar", () => {
  it("rates a crowded, expensive-to-borrow name as high risk & hard to borrow", () => {
    const s = squeezeFor("COIN");
    expect(["high", "extreme"]).toContain(s.level);
    expect(s.hardToBorrow).toBe(true);
    expect(s.score).toBeGreaterThan(45);
  });

  it("rates a lightly-shorted mega-cap as low risk", () => {
    const s = squeezeFor("AAPL");
    expect(s.level).toBe("low");
    expect(s.hardToBorrow).toBe(false);
  });

  it("keeps the score within 0–100 and lets overrides raise it", () => {
    const base = squeezeFor("DIS");
    expect(base.score).toBeGreaterThanOrEqual(0);
    expect(base.score).toBeLessThanOrEqual(100);
    const crowded = squeezeFor("DIS", { shortInterestPctFloat: 30, daysToCover: 9, borrowFeePct: 20 });
    expect(crowded.score).toBeGreaterThan(base.score);
    expect(crowded.level).toBe("extreme");
  });
});
