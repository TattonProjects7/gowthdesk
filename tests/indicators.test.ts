import { describe, it, expect } from "vitest";
import { sma, ema, bollinger, rsiSeries, macd, pctChange, maxDrawdown } from "@/lib/indicators";
import { evaluatePriceAlerts } from "@/lib/pricealerts";
import { searchInstruments, instrumentsFor, INSTRUMENTS, getInstrument } from "@/lib/instruments";
import { priceAt } from "@/lib/market";
import { upcomingEvents } from "@/lib/events";
import { researchNotes } from "@/lib/news";
import { simCloses } from "@/lib/signals";

const T = 1_700_000_000_000;
const up = Array.from({ length: 40 }, (_, i) => 100 + i);

describe("indicators", () => {
  it("simple and exponential averages line up with the series", () => {
    const s = sma(up, 10);
    expect(s[8]).toBeNull();
    expect(s[9]).toBe(104.5);
    expect(s[39]).toBe(134.5);
    const e = ema(up, 10);
    expect(e[9]).toBe(104.5);
    expect(e[39]).toBeGreaterThan(130);
    expect(e[39]).toBeLessThan(139);
  });

  it("bollinger bands bracket the middle band", () => {
    const b = bollinger(up, 20, 2);
    const i = 39;
    expect(b.lower[i]).toBeLessThan(b.middle[i] as number);
    expect(b.upper[i]).toBeGreaterThan(b.middle[i] as number);
  });

  it("rsi is 100 for a pure uptrend and bounded otherwise", () => {
    expect(rsiSeries(up, 14)[39]).toBe(100);
    const wobble = up.map((v, i) => v + (i % 3) * 3);
    const r = rsiSeries(wobble, 14)[39] as number;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(100);
  });

  it("macd produces a line, signal and histogram once warmed up", () => {
    const m = macd(up);
    expect(m.macd[24]).toBeNull();
    expect(m.macd[39]).not.toBeNull();
    expect(m.signal[39]).not.toBeNull();
    expect(m.histogram[39]).toBeCloseTo((m.macd[39] as number) - (m.signal[39] as number), 10);
  });

  it("pct change and drawdown", () => {
    expect(pctChange([100, 110])).toBeCloseTo(10, 6);
    expect(maxDrawdown([100, 120, 90, 130])).toBeCloseTo(-25, 6);
  });
});

describe("instruments & market", () => {
  it("search ranks exact symbol first and finds by name", () => {
    expect(searchInstruments("vusa")[0].symbol).toBe("VUSA");
    expect(searchInstruments("lloyds")[0].symbol).toBe("LLOY");
    expect(searchInstruments("zzz")).toHaveLength(0);
  });

  it("market tabs partition the universe", () => {
    const uk = instrumentsFor("uk");
    expect(uk.every((i) => i.region === "UK" && i.type === "stock")).toBe(true);
    expect(instrumentsFor("etf").every((i) => i.type === "etf")).toBe(true);
    expect(instrumentsFor("crypto").map((i) => i.symbol)).toEqual(["BTC", "ETH", "SOL", "XRP", "DOGE"]);
  });

  it("every instrument simulates a sane price near its anchor", () => {
    for (const i of INSTRUMENTS) {
      const p = priceAt(i.symbol, T);
      expect(p).toBeGreaterThan(i.base * 0.7);
      expect(p).toBeLessThan(i.base * 1.3);
    }
  });

  it("ETF look-through weights are sensible", () => {
    for (const i of INSTRUMENTS.filter((x) => x.type === "etf")) {
      const h = (i.holdings ?? []).reduce((a, w) => a + w.pct, 0);
      expect(h).toBeGreaterThan(0);
      expect(h).toBeLessThanOrEqual(100.01);
      expect((i.sectors ?? []).reduce((a, w) => a + w.pct, 0)).toBeCloseTo(100, 0);
      expect((i.regions ?? []).reduce((a, w) => a + w.pct, 0)).toBeCloseTo(100, 0);
      for (const w of i.holdings ?? []) if (w.symbol) expect(getInstrument(w.symbol)).toBeTruthy();
    }
  });
});

describe("price alerts", () => {
  const p = { now: T, price: (s: string) => (s === "VUSA" ? 80 : 0), prevClose: () => 76 };
  it("fires above/below and percentage-move alerts correctly", () => {
    const fired = evaluatePriceAlerts(
      [
        { id: "a", symbol: "VUSA", kind: "above", value: 79, createdAt: 0, triggeredAt: null },
        { id: "b", symbol: "VUSA", kind: "above", value: 81, createdAt: 0, triggeredAt: null },
        { id: "c", symbol: "VUSA", kind: "below", value: 81, createdAt: 0, triggeredAt: null },
        { id: "d", symbol: "VUSA", kind: "pct_up", value: 5, createdAt: 0, triggeredAt: null }, // +5.26%
        { id: "e", symbol: "VUSA", kind: "pct_down", value: 1, createdAt: 0, triggeredAt: null },
        { id: "f", symbol: "VUSA", kind: "above", value: 1, createdAt: 0, triggeredAt: 123 }, // already fired
      ],
      p,
    );
    expect(fired.map((f) => f.id).sort()).toEqual(["a", "c", "d"]);
    expect(fired[0].triggeredPrice).toBe(80);
  });
});

describe("calendar & research", () => {
  it("lists upcoming events sorted by date within the horizon", () => {
    const ev = upcomingEvents(T, 30);
    expect(ev.length).toBeGreaterThan(3);
    for (let i = 1; i < ev.length; i++) expect(ev[i].date).toBeGreaterThanOrEqual(ev[i - 1].date);
    expect(ev.every((e) => e.date <= T + 30 * 86400_000)).toBe(true);
    expect(ev.some((e) => e.type === "macro")).toBe(true);
    expect(ev.some((e) => e.type === "earnings")).toBe(true);
  });

  it("generates research notes from signals for any instrument", () => {
    for (const sym of ["AAPL", "LLOY", "VUSA", "BTC"]) {
      const notes = researchNotes(sym, simCloses(sym, T), T);
      expect(notes.length).toBeGreaterThanOrEqual(3);
      expect(notes.every((n) => n.headline && n.summary)).toBe(true);
    }
  });
});
