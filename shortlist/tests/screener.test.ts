import { describe, it, expect } from "vitest";
import { barForDay, barToday, simBars, scaleBars, type Bar } from "@/lib/bars";
import { INSTRUMENTS, getInstrument, instrumentsFor } from "@/lib/instruments";
import { priceAt } from "@/lib/market";
import { buildSnapshot, rankSignals, benchmarkFor, type Snapshot } from "@/lib/screener/snapshot";
import { detectCandle, detectPattern } from "@/lib/screener/patterns";
import { FILTERS, PRESETS, allTokens, runScreen, tokenLabel } from "@/lib/screener/filters";
import { demoBase, fundamentalsFor, fromFinnhubMetrics } from "@/lib/fundamentals";

const T = Date.UTC(2026, 9, 21, 15, 30); // a fixed Wednesday afternoon
const DAY = 86400_000;

function snapshots(): Snapshot[] {
  const out: Snapshot[] = [];
  for (const i of INSTRUMENTS) {
    const s = buildSnapshot({ symbol: i.symbol, bars: simBars(i.symbol, T, 400), now: T, market: simBars(benchmarkFor(i), T, 400), fund: fundamentalsFor(i.symbol, priceAt(i.symbol, T)) });
    if (s) out.push(s);
  }
  rankSignals(out);
  return out;
}

describe("universe", () => {
  it("covers every sector with reference data and unique symbols", () => {
    const stocks = INSTRUMENTS.filter((i) => i.type === "stock");
    expect(stocks.length).toBeGreaterThan(140);
    expect(new Set(INSTRUMENTS.map((i) => i.symbol)).size).toBe(INSTRUMENTS.length);
    for (const s of stocks) {
      expect(s.industry, s.symbol).toBeTruthy();
      expect(s.sharesM, s.symbol).toBeGreaterThan(0);
    }
    expect(new Set(stocks.map((s) => s.sector)).size).toBeGreaterThanOrEqual(11);
  });

  it("splits UK and US tabs by listing, not by where the company is based", () => {
    expect(instrumentsFor("us").some((i) => i.symbol === "ARM")).toBe(true);
    expect(instrumentsFor("uk").every((i) => i.exchange === "LSE")).toBe(true);
    expect(getInstrument("COIN")?.exchange).toBe("NASDAQ");
  });
});

describe("OHLCV bars", () => {
  it("are deterministic and internally consistent", () => {
    const day = Math.floor(T / DAY) - 3;
    expect(barForDay("AAPL", day)).toEqual(barForDay("AAPL", day));
    for (const sym of ["AAPL", "LLOY", "VUSA", "BTC", "HOOD"]) {
      const bars = simBars(sym, T, 120);
      expect(bars.length).toBe(120);
      for (const b of bars) {
        expect(b.h).toBeGreaterThanOrEqual(Math.max(b.o, b.c) - 1e-9);
        expect(b.l).toBeLessThanOrEqual(Math.min(b.o, b.c) + 1e-9);
        expect(b.v).toBeGreaterThan(0);
      }
      expect(bars[bars.length - 1].c).toBe(priceAt(sym, T));
    }
  });

  it("only widens today's range as the day goes on", () => {
    const a = barToday("NVDA", T - 3 * 3600_000)!;
    const b = barToday("NVDA", T)!;
    expect(b.v).toBeGreaterThan(a.v);
    expect(b.o).toBe(a.o);
  });

  it("re-bases onto a live quote and keeps the real open/high/low", () => {
    const bars = simBars("AAPL", T, 30);
    const out = scaleBars(bars, 300, { o: 295, h: 302, l: 294, pc: 296 });
    const t = out[out.length - 1];
    expect(t.c).toBe(300);
    expect(t.o).toBe(295);
    expect(t.h).toBe(302);
    expect(out[out.length - 2].c).toBe(296);
  });
});

describe("factor-model simulator", () => {
  it("moves the market together on some days and apart on others", () => {
    const stocks = INSTRUMENTS.filter((i) => i.type === "stock");
    const ratios: number[] = [];
    for (let k = 1; k <= 60; k++) {
      const t = T - k * DAY;
      const up = stocks.filter((s) => priceAt(s.symbol, t) > priceAt(s.symbol, t - DAY)).length;
      ratios.push(up / stocks.length);
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const sd = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length);
    // Independent coin flips across ~150 names would give sd ≈ 0.04.
    expect(sd).toBeGreaterThan(0.1);
  });
});

describe("snapshots", () => {
  const snaps = snapshots();
  const aapl = snaps.find((s) => s.symbol === "AAPL")!;

  it("compute finite Finviz-style metrics", () => {
    for (const k of ["price", "change", "volume", "avgVolume", "relVolume", "rsi", "atr", "volW", "volM", "fromHigh52", "fromLow52"] as const) {
      expect(Number.isFinite(aapl[k]), k).toBe(true);
    }
    expect(aapl.fromHigh52).toBeLessThanOrEqual(0.0001);
    expect(aapl.fromLow52).toBeGreaterThanOrEqual(-0.0001);
    expect(aapl.sma200).not.toBeNull();
    expect(aapl.marketCapUsd).toBeGreaterThan(1e12);
    expect(aapl.beta).not.toBeNull();
    expect(aapl.earnings?.daysUntil).toBeGreaterThanOrEqual(0);
  });

  it("gives UK shares a dollar market cap and price", () => {
    const lloy = snaps.find((s) => s.symbol === "LLOY")!;
    expect(lloy.priceUsd).toBeLessThan(lloy.price); // pence → dollars
    expect(lloy.marketCapUsd).toBeGreaterThan(1e10);
  });

  it("flags the most active and most volatile names across the universe", () => {
    expect(snaps.filter((s) => s.signals.includes("most_active")).length).toBe(12);
    expect(snaps.filter((s) => s.signals.includes("most_volatile")).length).toBe(12);
  });
});

describe("pattern recognition", () => {
  const mk = (closes: number[], spread = 0.6): Bar[] => closes.map((c, k) => ({ t: k * DAY, o: c, h: c + spread, l: c - spread, c, v: 1000 }));

  it("finds a rising channel", () => {
    const closes = Array.from({ length: 90 }, (_, k) => 100 + k * 0.25 + 4 * Math.sin(k / 3));
    const p = detectPattern(mk(closes));
    expect(p?.id).toBe("channel_up");
    expect(p?.upper && p.lower).toBeTruthy();
  });

  it("finds a double top", () => {
    const closes = Array.from({ length: 90 }, (_, k) => {
      if (k < 30) return 90 + k * 0.6; // rally to 108
      if (k < 40) return 108 - (k - 30) * 0.9; // dip
      if (k < 50) return 99 + (k - 40) * 0.9; // back to the top
      return 108 - (k - 50) * 0.18; // fading
    });
    const p = detectPattern(mk(closes, 0.2));
    expect(["double_top", "multiple_top"]).toContain(p?.id);
  });

  it("classifies candles", () => {
    const prev: Bar = { t: 0, o: 100, h: 101, l: 99, c: 99.2, v: 1 };
    expect(detectCandle(prev, { t: 1, o: 100, h: 102, l: 98, c: 100.05, v: 1 })).toBe("doji");
    expect(detectCandle(prev, { t: 1, o: 100, h: 100.2, l: 95, c: 100.1, v: 1 })).toBe("dragonfly_doji");
    expect(detectCandle(undefined, { t: 1, o: 100, h: 100.3, l: 97, c: 100.25, v: 1 })).toBe("dragonfly_doji");
    expect(detectCandle(undefined, { t: 1, o: 100, h: 104, l: 99.95, c: 103.95, v: 1 })).toBe("marubozu_white");
    expect(detectCandle(undefined, { t: 1, o: 100, h: 100.6, l: 96, c: 100.5, v: 1 })).toBe("hammer");
    expect(detectCandle(prev, { t: 1, o: 99, h: 101.5, l: 98.9, c: 101.2, v: 1 })).toBe("bullish_engulfing");
  });
});

describe("filters and screens", () => {
  const snaps = snapshots();

  it("has unique, labelled tokens", () => {
    const toks = allTokens();
    expect(new Set(toks).size).toBe(toks.length);
    expect(FILTERS.every((f) => f.help.length > 10 && f.options.length > 0)).toBe(true);
    expect(tokenLabel("cap:large")).toBe("Market cap: Large ($10bn–$200bn)");
    expect(tokenLabel("nope:x")).toBeNull();
  });

  it("ANDs different filters and ORs options of the same filter", () => {
    const tech = runScreen(snaps, { filters: ["sector:technology"] });
    const energy = runScreen(snaps, { filters: ["sector:energy"] });
    const both = runScreen(snaps, { filters: ["sector:technology", "sector:energy"] });
    expect(both.length).toBe(tech.length + energy.length);
    const techUk = runScreen(snaps, { filters: ["sector:technology", "exch:lse"] });
    expect(techUk.every((s) => s.i.sector === "Technology" && s.i.exchange === "LSE")).toBe(true);
    expect(runScreen(snaps, { filters: ["bogus:token"] }).length).toBe(snaps.length);
  });

  it("screens on fundamentals and signals", () => {
    const cheap = runScreen(snaps, { filters: ["pe:u15", "type:stock"] });
    expect(cheap.length).toBeGreaterThan(0);
    expect(cheap.every((s) => (s.fund?.pe ?? 99) < 15)).toBe(true);
    const losers = runScreen(snaps, { filters: ["pe:neg"] });
    expect(losers.every((s) => (s.fund?.eps ?? 0) < 0)).toBe(true);
    const active = runScreen(snaps, { filters: [], signal: "most_active" });
    expect(active.length).toBe(12);
  });

  it("uses only valid tokens in presets", () => {
    const valid = new Set(allTokens());
    for (const p of PRESETS) for (const t of p.screen.filters) expect(valid.has(t), `${p.id} ${t}`).toBe(true);
  });
});

describe("fundamentals", () => {
  it("derives price-dependent ratios from the live price", () => {
    const base = demoBase(getInstrument("MSFT")!)!;
    const f = fundamentalsFor("MSFT", 500)!;
    expect(f.source).toBe("demo");
    expect(f.pe).toBeCloseTo(500 / (base.eps as number), 1);
    expect(fundamentalsFor("VUSA", 80)).toBeNull();
    expect(fundamentalsFor("MRNA", 30)!.pe).toBeNull(); // loss-maker
  });

  it("never fills a live row with demo numbers", () => {
    const f = fundamentalsFor("AAPL", 200, { eps: 7, roe: 150 })!;
    expect(f.source).toBe("live");
    expect(f.pe).toBeCloseTo(200 / 7, 2);
    expect(f.roe).toBe(150);
    expect(f.instOwn).toBeNull();
    expect(f.targetPrice).toBeNull();
  });

  it("maps Finnhub fields and averages analyst recommendations", () => {
    const m = fromFinnhubMetrics({ epsTTM: 6.5, roeTTM: 140, "totalDebt/totalEquityQuarterly": 1.5, netProfitMarginTTM: 24 }, { strongBuy: 10, buy: 20, hold: 10, sell: 0, strongSell: 0 });
    expect(m.eps).toBe(6.5);
    expect(m.debtEq).toBe(1.5);
    expect(m.recom).toBe(2);
  });
});

describe("heatmap treemap", () => {
  it("fills the box exactly, with no overlaps, biggest first", async () => {
    const { squarify } = await import("@/lib/screener/treemap");
    const items = [50, 30, 10, 5, 3, 2].map((v, k) => ({ value: v, item: k }));
    const out = squarify(items, { x: 0, y: 0, w: 600, h: 400 });
    expect(out.length).toBe(6);
    const area = out.reduce((a, p) => a + p.rect.w * p.rect.h, 0);
    expect(area).toBeCloseTo(600 * 400, 0);
    expect(out[0].rect.w * out[0].rect.h).toBeCloseTo(600 * 400 * 0.5, 0);
    for (let a = 0; a < out.length; a++)
      for (let b = a + 1; b < out.length; b++) {
        const A = out[a].rect;
        const B = out[b].rect;
        const overlap = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x)) * Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
        expect(overlap).toBeLessThan(1e-6);
      }
    expect(squarify([], { x: 0, y: 0, w: 10, h: 10 })).toEqual([]);
  });

  it("colours red below zero and green above", async () => {
    const { heatColor } = await import("@/lib/screener/treemap");
    const [r1, g1] = heatColor(-3, 3).match(/\d+/g)!.map(Number);
    const [r2, g2] = heatColor(3, 3).match(/\d+/g)!.map(Number);
    expect(r1).toBeGreaterThan(g1);
    expect(g2).toBeGreaterThan(r2);
  });
});

describe("plain-English screens (offline)", () => {
  it("turns everyday words into valid filters", async () => {
    const { parseScreenOffline } = await import("@/lib/screener/nlp");
    const valid = new Set(allTokens());
    const r = parseScreenOffline("cheap profitable UK dividend payers near their 52-week lows");
    expect(r.filters).toEqual(expect.arrayContaining(["exch:lse", "pe:u15", "div:o2", "hl52:a5"]));
    expect(r.filters.every((t) => valid.has(t))).toBe(true);
    expect(parseScreenOffline("high dividend banks").filters).toEqual(expect.arrayContaining(["div:o4", "sector:financials"]));
    expect(parseScreenOffline("high dividend banks").filters).not.toContain("div:o2");
    expect(parseScreenOffline("show us oversold tech").filters).not.toContain("geo:us");
    expect(parseScreenOffline("US tech breakouts").signal).toBe("breakout");
    expect(parseScreenOffline("zzzz").filters).toEqual([]);
  });
});
