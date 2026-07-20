import { describe, it, expect } from "vitest";
import { computeSignals } from "@/lib/signals";

const rising = Array.from({ length: 31 }, (_, i) => 100 + i);
const falling = Array.from({ length: 31 }, (_, i) => 130 - i);

describe("computeSignals", () => {
  it("reports the last close as the price", () => {
    expect(computeSignals(rising).price).toBe(130);
  });

  it("flags a strong uptrend as overbought and above its short MA", () => {
    const s = computeSignals(rising);
    expect(s.rsi).toBeGreaterThan(65);
    expect(s.belowShortMa).toBe(false);
    expect(s.trend30).toBeGreaterThan(0);
  });

  it("flags a downtrend as oversold and below its short MA", () => {
    const s = computeSignals(falling);
    expect(s.rsi).toBeLessThan(35);
    expect(s.belowShortMa).toBe(true);
    expect(s.trend30).toBeLessThan(0);
  });

  it("pads short input without throwing", () => {
    const s = computeSignals([100, 101, 102]);
    expect(Number.isFinite(s.rsi)).toBe(true);
    expect(Number.isFinite(s.zscore)).toBe(true);
  });
});
