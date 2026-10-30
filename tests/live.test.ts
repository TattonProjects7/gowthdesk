import { describe, it, expect } from "vitest";
import { chooseStreamed, fromWire, parseCoinbase, parseFinnhub, toWire, finnhubStreamSymbol, streamableSymbols } from "@/lib/live/feeds";
import { anchorBars, anchorCloses, padBars, withLiveBar } from "@/lib/live/merge";
import { describeSession, marketFor, sessionAt } from "@/lib/sessions";
import { getInstrument } from "@/lib/instruments";
import { simBars, type Bar } from "@/lib/bars";

const DAY = 86400_000;

describe("real-time feeds", () => {
  it("reads Coinbase ticker messages", () => {
    const r = parseCoinbase({ type: "ticker", product_id: "BTC-USD", price: "68123.45", open_24h: "67000", high_24h: "68500", low_24h: "66800", time: "2026-10-30T09:00:00.123Z" });
    expect(r).toEqual(["BTC", { p: 68123.45, t: Date.parse("2026-10-30T09:00:00.123Z"), o: 67000, h: 68500, l: 66800, pc: 67000 }]);
    expect(parseCoinbase({ type: "subscriptions" })).toBeNull();
    expect(parseCoinbase({ type: "ticker", product_id: "PEPE-USD", price: "1" })).toBeNull();
    expect(parseCoinbase({ type: "ticker", product_id: "ETH-USD", price: "nope" })).toBeNull();
  });

  it("reads Finnhub trades, keeping the latest per symbol", () => {
    const r = parseFinnhub({
      type: "trade",
      data: [
        { s: "AAPL", p: 230.1, t: 1000, v: 10 },
        { s: "AAPL", p: 230.4, t: 3000, v: 5 },
        { s: "AAPL", p: 229.9, t: 2000, v: 1 },
        { s: "MSFT", p: 450, t: 1500, v: 2 },
        { s: "ZZZZ", p: 1, t: 1, v: 1 },
      ],
    });
    expect(Object.fromEntries(r)).toEqual({ AAPL: { p: 230.4, t: 3000 }, MSFT: { p: 450, t: 1500 } });
    expect(parseFinnhub({ type: "ping" })).toEqual([]);
  });

  it("only streams US listings through Finnhub", () => {
    expect(finnhubStreamSymbol(getInstrument("AAPL")!)).toBe("AAPL");
    expect(finnhubStreamSymbol(getInstrument("LLOY")!)).toBeNull();
    expect(finnhubStreamSymbol(getInstrument("BTC")!)).toBeNull();
    expect(finnhubStreamSymbol(getInstrument("VUSA")!)).toBeNull();
    const s = streamableSymbols();
    expect(s.crypto).toEqual(["BTC", "ETH", "SOL", "XRP", "DOGE"]);
    expect(s.us.length).toBeGreaterThan(100);
  });

  it("gives what people are viewing the limited slots first", () => {
    const picked = chooseStreamed(["GME", "LLOY", "PLTR", "GME"], 5);
    expect(picked).toHaveLength(5);
    expect(picked.slice(0, 2)).toEqual(["GME", "PLTR"]);
    // The rest are the biggest companies.
    expect(picked).toContain("NVDA");
    expect(chooseStreamed([], 50)).toHaveLength(50);
  });

  it("round-trips the compact wire format", () => {
    expect(fromWire(toWire({ p: 10, t: 5 }))).toEqual({ p: 10, t: 5, o: undefined, h: undefined, l: undefined, pc: undefined });
    expect(fromWire(toWire({ p: 10, t: 5, o: 9, h: 11, l: 8.5, pc: 9.5 }))).toEqual({ p: 10, t: 5, o: 9, h: 11, l: 8.5, pc: 9.5 });
    expect(toWire({ p: 10, t: 5 })).toHaveLength(2);
  });
});

describe("blending real prices into history", () => {
  it("makes today's change the real one", () => {
    const sim = [100, 102, 101, 104];
    const out = anchorCloses(sim, 210, 200);
    expect(out[2]).toBeCloseTo(200, 6);
    expect(out[3]).toBe(210);
    expect(out[3] / out[2] - 1).toBeCloseTo(0.05, 6);
    // Shape is kept: relative moves before yesterday are unchanged.
    expect(out[1] / out[0]).toBeCloseTo(102 / 100, 6);
    // Without a previous close, the whole series is scaled to the live price.
    const k = anchorCloses(sim, 208);
    expect(k[3]).toBe(208);
    expect(k[2] / k[3]).toBeCloseTo(101 / 104, 6);
    expect(anchorCloses(sim)).toBe(sim);
  });

  it("re-bases simulated bars onto the real open, high, low and close", () => {
    const now = Date.UTC(2026, 9, 30, 15);
    const bars = simBars("AAPL", now, 30);
    const out = anchorBars(bars, 231, { o: 228, h: 232, l: 227, pc: 229 });
    const t = out[out.length - 1];
    expect(out[out.length - 2].c).toBeCloseTo(229, 4);
    expect(t).toMatchObject({ o: 228, c: 231, h: 232, l: 227 });
    expect(out).toHaveLength(30);
  });

  it("puts the live price on today's real candle, or adds one", () => {
    const now = Date.UTC(2026, 9, 30, 15);
    const today = Math.floor(now / DAY) * DAY;
    const real: Bar[] = [
      { t: today - 2 * DAY, o: 10, h: 11, l: 9, c: 10.5, v: 1 },
      { t: today - DAY, o: 10.5, h: 12, l: 10, c: 11, v: 1 },
      { t: today, o: 11, h: 11.5, l: 10.8, c: 11.2, v: 1 },
    ];
    const upd = withLiveBar(real, 11.9, now, now);
    expect(upd).toHaveLength(3);
    expect(upd[2]).toMatchObject({ c: 11.9, h: 11.9, l: 10.8 });
    // Feed hasn't printed today's bar yet: a trade today adds it.
    const added = withLiveBar(real.slice(0, 2), 11.4, now, now, { o: 11.1 });
    expect(added).toHaveLength(3);
    expect(added[2]).toMatchObject({ t: today, o: 11.1, c: 11.4, h: 11.4, l: 11.1 });
    // A stale price (yesterday's) doesn't invent a bar for today.
    expect(withLiveBar(real.slice(0, 2), 11.4, today - 3600_000, now)).toHaveLength(2);
  });

  it("pads short real history with simulated history, without a jump", () => {
    const now = Date.UTC(2026, 9, 30, 15);
    const sim = simBars("BTC", now, 400);
    const real = sim.slice(-100).map((b) => ({ ...b, o: b.o * 1.5, h: b.h * 1.5, l: b.l * 1.5, c: b.c * 1.5 }));
    const out = padBars(real, sim, 300);
    expect(out).toHaveLength(300);
    expect(out[out.length - 1]).toEqual(real[real.length - 1]);
    const join = out.length - real.length;
    expect(out[join - 1].c).toBeCloseTo(real[0].o, 4);
    expect(padBars(real, sim, 50)).toEqual(real.slice(-50));
  });
});

describe("market hours", () => {
  const at = (iso: string) => Date.parse(iso);

  it("knows when New York is open", () => {
    // Friday 30 October 2026: New York is on EDT (UTC-4).
    expect(sessionAt("US", at("2026-10-30T13:29:00Z")).open).toBe(false);
    expect(sessionAt("US", at("2026-10-30T13:30:00Z")).open).toBe(true);
    expect(sessionAt("US", at("2026-10-30T19:59:00Z")).open).toBe(true);
    const after = sessionAt("US", at("2026-10-30T20:00:00Z"));
    expect(after).toMatchObject({ open: false, reason: "after" });
    // Next open is Monday 2 November, after the US clocks go back (EST, UTC-5).
    expect(new Date(after.next!).toISOString()).toBe("2026-11-02T14:30:00.000Z");
  });

  it("knows when London is open, including bank holidays and half days", () => {
    expect(sessionAt("LSE", at("2026-10-30T08:00:00Z")).open).toBe(true); // GMT from 25 Oct
    expect(sessionAt("LSE", at("2026-10-30T16:29:00Z")).open).toBe(true);
    expect(sessionAt("LSE", at("2026-10-30T16:30:00Z")).open).toBe(false);
    expect(sessionAt("LSE", at("2026-08-31T10:00:00Z"))).toMatchObject({ open: false, reason: "holiday" });
    expect(sessionAt("LSE", at("2026-12-24T12:00:00Z")).open).toBe(true);
    expect(sessionAt("LSE", at("2026-12-24T12:31:00Z")).open).toBe(false);
    // Christmas: next open skips the 25th, the weekend and the Boxing Day substitute.
    expect(new Date(sessionAt("LSE", at("2026-12-24T13:00:00Z")).next!).toISOString()).toBe("2026-12-29T08:00:00.000Z");
  });

  it("treats crypto as always open and maps instruments to markets", () => {
    expect(sessionAt("CRYPTO", at("2026-12-25T03:00:00Z")).open).toBe(true);
    expect(marketFor(getInstrument("BTC")!)).toBe("CRYPTO");
    expect(marketFor(getInstrument("LLOY")!)).toBe("LSE");
    expect(marketFor(getInstrument("VUSA")!)).toBe("LSE");
    expect(marketFor(getInstrument("AAPL")!)).toBe("US");
  });

  it("describes the session in plain words", () => {
    const t = at("2026-10-30T18:00:00Z");
    expect(describeSession(sessionAt("US", t), t)).toBe("Open · closes in 2h 0m");
    const w = at("2026-10-31T12:00:00Z");
    expect(describeSession(sessionAt("LSE", w), w, "Europe/London")).toBe("Closed · opens Mon 08:00");
    const pre = at("2026-10-30T07:15:00Z");
    expect(describeSession(sessionAt("LSE", pre), pre)).toBe("Closed · opens in 45m");
    expect(describeSession(sessionAt("CRYPTO", t), t)).toBe("Trades 24/7");
  });
});
