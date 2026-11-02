import { describe, it, expect } from "vitest";
import { simBars } from "@/lib/bars";
import { INSTRUMENTS, getInstrument } from "@/lib/instruments";
import { priceAt } from "@/lib/market";
import { buildSnapshot, rankSignals, benchmarkFor, type Snapshot } from "@/lib/screener/snapshot";
import { fundamentalsFor } from "@/lib/fundamentals";
import { analyse, buildShortlist, chartTriggers, weakestSymbols, whyLine, LIST_SIZE, NEAR_MISS_AT, WEAK_AT, type MarketEvent } from "@/lib/shortlist/pipeline";
import { downgradeEvent, insiderEvent, newsEvents } from "@/lib/shortlist/events";
import { RISK_BUDGET } from "@/lib/shorts";
import { squeezeFor } from "@/lib/squeeze";

const DAY = 86400_000;
const DAYS = [Date.UTC(2026, 9, 21, 15, 30), Date.UTC(2026, 10, 2, 7, 15), Date.UTC(2026, 6, 14, 12, 0)];

function snapshots(t: number): Snapshot[] {
  const out: Snapshot[] = [];
  for (const i of INSTRUMENTS) {
    const s = buildSnapshot({ symbol: i.symbol, bars: simBars(i.symbol, t, 400), now: t, market: simBars(benchmarkFor(i), t, 400), fund: fundamentalsFor(i.symbol, priceAt(i.symbol, t)) });
    if (s) out.push(s);
  }
  rankSignals(out);
  return out;
}

const SNAPS = new Map(DAYS.map((t) => [t, snapshots(t)]));
const T = DAYS[0];

describe("Today's Shortlist pipeline", () => {
  it("checks every UK and US share and narrows them down stage by stage", () => {
    for (const t of DAYS) {
      const snaps = SNAPS.get(t)!;
      const list = buildShortlist(snaps, t);
      const stocks = snaps.filter((s) => s.i.type === "stock").length;
      expect(list.funnel.scanned).toBe(stocks);
      expect(stocks).toBeGreaterThan(140);
      const f = list.funnel;
      expect(f.scanned).toBeGreaterThanOrEqual(f.weak);
      expect(f.weak).toBeGreaterThanOrEqual(f.triggered);
      expect(f.triggered).toBeGreaterThanOrEqual(f.qualified);
      expect(f.qualified).toBeGreaterThanOrEqual(f.listed);
      expect(f.listed).toBe(list.items.length);
      expect(list.items.length).toBeLessThanOrEqual(LIST_SIZE);
      expect(list.items.length).toBeGreaterThan(0);
    }
  });

  it("only lists shares that pass every check, ranked strongest first", () => {
    for (const t of DAYS) {
      const list = buildShortlist(SNAPS.get(t)!, t);
      list.items.forEach((it, k) => {
        expect(it.rank).toBe(k + 1);
        if (k) expect(it.score).toBeLessThanOrEqual(list.items[k - 1].score);
        expect(it.triggers.length, it.symbol).toBeGreaterThan(0);
        expect(it.bear.length, it.symbol).toBeGreaterThan(0);
        expect(it.why.length).toBeGreaterThan(10);
        expect(it.against.length).toBeGreaterThanOrEqual(1);
        expect(it.against.length).toBeLessThanOrEqual(3);
        expect(it.squeeze.level).not.toBe("extreme");
        expect(it.structure.rewardRisk).toBeGreaterThanOrEqual(2);
        expect(it.structure.target).toBeLessThan(it.structure.entry);
        expect(it.structure.stop).toBeGreaterThan(it.structure.entry);
        if (it.catalyst) expect(it.catalyst.daysUntil).toBeGreaterThan(2);
        expect(it.closes.length).toBe(30);
      });
    }
  });

  it("is deterministic for the same data", () => {
    const a = buildShortlist(SNAPS.get(T)!, T);
    const b = buildShortlist(SNAPS.get(T)!, T);
    expect(b).toEqual(a);
  });

  it("explains every near miss with the stage that stopped it", () => {
    const list = buildShortlist(SNAPS.get(T)!, T);
    const listed = new Set(list.items.map((i) => i.symbol));
    for (const s of list.skipped) {
      expect(listed.has(s.symbol)).toBe(false);
      expect(s.reason.length).toBeGreaterThan(10);
      expect(["signals", "qualifier", "prioritiser"]).toContain(s.stage);
    }
  });

  it("sizes the practice plan in pounds for pence and dollar prices", () => {
    for (const t of DAYS) {
      for (const it of buildShortlist(SNAPS.get(t)!, t).items) {
        expect(it.structure.maxLoss, it.symbol).toBeLessThanOrEqual(RISK_BUDGET + 0.01);
        // At least half the budget is used, unless one share already costs more than the budget to stop out.
        expect(it.structure.maxLoss > RISK_BUDGET / 2 || it.structure.shares === 1, it.symbol).toBe(true);
      }
    }
  });

  it("turns a news, insider or analyst event into a trigger that can qualify a share", () => {
    const snaps = SNAPS.get(T)!;
    const base = buildShortlist(snaps, T, {}, 100);
    const waiting = snaps.find((s) => s.i.type === "stock" && s.bars.length >= 60 && analyse(s).score >= WEAK_AT && chartTriggers(s).length === 0 && s.rsi > 30);
    expect(waiting, "a weak share with no chart trigger").toBeTruthy();
    expect(base.items.some((i) => i.symbol === waiting!.symbol)).toBe(false);
    const ev: MarketEvent = { kind: "insider_selling", label: "Insiders selling", detail: "3 insiders sold $4.2m.", phrase: "insiders have been selling", weight: 8, at: T - DAY };
    const withEvent = buildShortlist(snaps, T, { [waiting!.symbol]: [ev] }, 100);
    const hit = withEvent.items.find((i) => i.symbol === waiting!.symbol);
    const stillOut = withEvent.skipped.find((s) => s.symbol === waiting!.symbol);
    // Either it now qualifies with the insider trigger, or a later check (not the missing trigger) stops it.
    if (hit) expect(hit.triggers.some((x) => x.source === "insiders")).toBe(true);
    else expect(stillOut?.stage).not.toBe("signals");
  });

  it("throws out squeeze traps however weak they look", () => {
    const snaps = SNAPS.get(T)!;
    const scoreOf = (sym: string) => analyse(snaps.find((s) => s.symbol === sym)!).score;
    // The listed share with the strongest analyst case, so it would show as a near miss once dropped.
    const top = [...buildShortlist(snaps, T).items].sort((a, b) => scoreOf(b.symbol) - scoreOf(a.symbol))[0];
    expect(scoreOf(top.symbol)).toBeGreaterThanOrEqual(NEAR_MISS_AT);
    const crowded = snaps.map((s) => (s.symbol === top.symbol && s.fund ? { ...s, fund: { ...s.fund, shortFloat: 35 } } : s));
    expect(squeezeFor(top.symbol, { shortInterestPctFloat: 35 }).level).toBe("extreme");
    const list = buildShortlist(crowded, T);
    expect(list.items.some((i) => i.symbol === top.symbol)).toBe(false);
    expect(list.skipped.find((s) => s.symbol === top.symbol)?.reason).toMatch(/Squeeze trap/);
  });

  it("asks the server about the weakest names first", () => {
    const snaps = SNAPS.get(T)!;
    const syms = weakestSymbols(snaps, 15);
    expect(syms.length).toBeGreaterThan(0);
    expect(syms.length).toBeLessThanOrEqual(15);
    const scores = syms.map((s) => analyse(snaps.find((x) => x.symbol === s)!).score);
    expect(Math.min(...scores)).toBeGreaterThanOrEqual(WEAK_AT);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const s of syms) expect(getInstrument(s)?.type).toBe("stock");
  });

  it("writes the one-line reason from the strongest evidence and trigger", () => {
    const line = whyLine(
      [
        { label: "Downtrend", detail: "", phrase: "it's in a downtrend", weight: 10, kind: "chart" },
        { label: "Profits shrinking", detail: "", phrase: "profits are shrinking", weight: 9, kind: "business" },
        { label: "Heavy debt", detail: "", phrase: "it carries heavy debt", weight: 6, kind: "business" },
      ],
      [{ source: "chart", label: "Death cross", detail: "", phrase: "a death cross has formed", weight: 8 }],
    );
    expect(line).toBe("Profits are shrinking, and a death cross has formed.");
    expect(whyLine([{ label: "Downtrend", detail: "", phrase: "it's in a downtrend", weight: 10, kind: "chart" }], [])).toBe("It's in a downtrend.");
  });

  it("finds chart triggers only from real patterns in the data", () => {
    for (const s of SNAPS.get(T)!.filter((x) => x.i.type === "stock")) {
      for (const t of chartTriggers(s)) {
        expect(t.source).toBe("chart");
        if (t.label === "Death cross") expect(s.signals).toContain("death_cross");
        if (t.label === "Broke its 50-day average") expect(s.price).toBeLessThan(s.sma50 as number);
      }
    }
  });
});

describe("Signal hunter events", () => {
  const now = Date.UTC(2026, 10, 2, 8, 0);

  it("spots bad-news headlines from the last week, one per kind", () => {
    const ev = newsEvents(
      [
        { headline: "Acme cuts full-year guidance as demand slows", url: "https://x/1", at: now - 2 * DAY },
        { headline: "Acme lowers outlook again", url: "https://x/2", at: now - 1 * DAY },
        { headline: "Acme beats estimates and raises dividend", url: "https://x/3", at: now - DAY },
        { headline: "Acme faces SEC probe over accounting", url: "https://x/4", at: now - 3 * DAY },
        { headline: "Acme issued a profit warning", url: "https://x/5", at: now - 20 * DAY },
      ],
      now,
    );
    expect(ev.map((e) => e.label).sort()).toEqual(["Cut its outlook", "Legal or regulatory trouble"]);
    expect(ev.find((e) => e.label === "Cut its outlook")?.url).toBe("https://x/2");
    expect(ev.every((e) => e.kind === "bad_news")).toBe(true);
  });

  it("flags insiders selling only when several sell real money with little buying", () => {
    const d = (n: number) => new Date(now - n * DAY).toISOString().slice(0, 10);
    const sale = (name: string, shares: number, price: number, ago: number) => ({ name, change: -shares, transactionCode: "S", transactionPrice: price, transactionDate: d(ago) });
    expect(insiderEvent([sale("A", 10_000, 150, 5), sale("B", 5_000, 150, 12)], now)?.kind).toBe("insider_selling");
    expect(insiderEvent([sale("A", 10_000, 150, 5), sale("A", 5_000, 150, 12)], now)).toBeNull(); // one person
    expect(insiderEvent([sale("A", 1_000, 150, 5), sale("B", 1_000, 150, 12)], now)).toBeNull(); // too small
    expect(insiderEvent([sale("A", 10_000, 150, 80), sale("B", 5_000, 150, 90)], now)).toBeNull(); // too old
    const withBuying = [sale("A", 10_000, 150, 5), sale("B", 5_000, 150, 12), { name: "C", change: 20_000, transactionCode: "P", transactionPrice: 150, transactionDate: d(3) }];
    expect(insiderEvent(withBuying, now)).toBeNull();
  });

  it("flags analysts turning cautious from the monthly recommendation trend", () => {
    const m = (period: string, strongBuy: number, buy: number, hold: number, sell: number, strongSell = 0) => ({ period, strongBuy, buy, hold, sell, strongSell });
    const cooling = [m("2026-11-01", 4, 8, 14, 2), m("2026-10-01", 6, 12, 9, 1), m("2026-09-01", 8, 14, 6, 0)];
    expect(downgradeEvent(cooling)?.detail).toMatch(/Buy ratings fell from 79% to 43%/);
    const steady = [m("2026-11-01", 8, 14, 6, 0), m("2026-10-01", 8, 13, 7, 0), m("2026-09-01", 8, 14, 6, 0)];
    expect(downgradeEvent(steady)).toBeNull();
    expect(downgradeEvent([m("2026-11-01", 1, 0, 0, 0)])).toBeNull();
  });
});
