import { describe, it, expect } from "vitest";
import { candidateFor, scanMarket, RISK_BUDGET } from "@/lib/shorts";
import { simCloses } from "@/lib/signals";

const T = 1_700_000_000_000;
const closesFor = (symbol: string) => simCloses(symbol, T);

describe("candidateFor", () => {
  const c = candidateFor("COIN", closesFor("COIN"));

  it("structures a short with stop above and target below entry", () => {
    expect(c.structure.stop).toBeGreaterThan(c.structure.entry);
    expect(c.structure.target).toBeLessThan(c.structure.entry);
  });

  it("keeps risk small and defined (≈ the risk budget)", () => {
    expect(c.structure.maxLoss).toBeGreaterThan(0);
    expect(c.structure.maxLoss).toBeLessThanOrEqual(RISK_BUDGET + 1);
    expect(c.structure.rewardRisk).toBeGreaterThan(0);
    expect(c.structure.maxGain).toBeGreaterThan(c.structure.maxLoss);
  });

  it("produces a bounded score, a grade and a squeeze read", () => {
    expect(c.score).toBeGreaterThanOrEqual(3);
    expect(c.score).toBeLessThanOrEqual(98);
    expect(c.grade).toBeTruthy();
    expect(["low", "moderate", "high", "extreme"]).toContain(c.squeeze.level);
  });
});

describe("scanMarket", () => {
  it("returns every symbol ranked by descending score", () => {
    const ranked = scanMarket(closesFor);
    expect(ranked.length).toBeGreaterThan(5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });
});
