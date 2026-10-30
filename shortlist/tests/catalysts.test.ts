import { describe, it, expect } from "vitest";
import { nextCatalyst, fmtDate } from "@/lib/catalysts";

const T = 1_700_000_000_000;

describe("nextCatalyst", () => {
  it("always returns an upcoming date within a quarter", () => {
    for (const sym of ["AAPL", "TSLA", "COIN", "PLTR"]) {
      const c = nextCatalyst(sym, T);
      expect(c.daysUntil).toBeGreaterThanOrEqual(1);
      expect(c.daysUntil).toBeLessThanOrEqual(91);
      expect(c.date).toBeGreaterThan(T);
      expect(c.imminent).toBe(c.daysUntil <= 10);
    }
  });

  it("formats a date as day + month", () => {
    expect(fmtDate(Date.UTC(2026, 7, 12))).toBe("12 Aug");
  });
});
