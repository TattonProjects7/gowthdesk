// Today's Shortlist: six specialist stages that turn every UK and US share in
// the app into a short, ranked list of short ideas, each with the reason it's
// there and the case against it.
//
//   1. Finder       — every share with enough history is considered
//   2. Analyst      — weighs valuation, profits and the chart into a bear score
//   3. Signal hunter — needs a fresh trigger: a break on the chart, insiders
//                      selling, an analyst downgrade or bad news
//   4. Enricher     — adds short interest, squeeze risk, the next results date
//                      and a defined-risk trade plan
//   5. Qualifier    — throws out squeeze traps, oversold names, results too
//                      close to call and trades that don't pay enough
//   6. Prioritiser  — ranks what's left; the top ten make the list
//
// Pure functions of the screener snapshots (plus optional news/insider/analyst
// events from the server), so it runs on the device, works with the simulator
// or live data, and is easy to test. It describes evidence; it never tells
// anyone to trade.

import type { Snapshot } from "../screener/snapshot";
import { CANDLE_LABEL, type CandleId } from "../screener/patterns";
import { computeSignals } from "../signals";
import { squeezeFor, type Squeeze } from "../squeeze";
import { gradeFor, structureFor, type ShortStructure } from "../shorts";
import { toGbp } from "../fx";
import type { Currency, Region } from "../instruments";

export type StageId = "finder" | "analyst" | "signals" | "enricher" | "qualifier" | "prioritiser";

export const STAGES: { id: StageId; name: string; job: string }[] = [
  { id: "finder", name: "Finder", job: "Checks every UK and US share in the app" },
  { id: "analyst", name: "Analyst", job: "Weighs valuation, profits and the chart" },
  { id: "signals", name: "Signal hunter", job: "Needs a fresh trigger: a break, insider selling, a downgrade or bad news" },
  { id: "enricher", name: "Enricher", job: "Adds short interest, squeeze risk, results dates and a trade plan" },
  { id: "qualifier", name: "Qualifier", job: "Drops squeeze traps, oversold names and trades that don't pay enough" },
  { id: "prioritiser", name: "Prioritiser", job: "Ranks by strength of case, reward against risk and timing" },
];

export const LIST_SIZE = 10;
/** Analyst score from which a share counts as "looks weak". */
export const WEAK_AT = 45;
/** Weak names at or above this score that still miss the list are shown as near-misses. */
export const NEAR_MISS_AT = 48;

export interface Point {
  label: string;
  detail: string;
  /** A short phrase for the one-line reason, e.g. "profits are shrinking". */
  phrase: string;
  weight: number;
  /** Company figures make a more specific reason than the chart. */
  kind?: "chart" | "business";
}

export type TriggerSource = "chart" | "news" | "insiders" | "analysts";

export interface Trigger extends Point {
  source: TriggerSource;
  url?: string;
  at?: number;
}

/** A dated event found by the server (news, insider filings, analyst ratings). */
export interface MarketEvent {
  kind: "insider_selling" | "downgrade" | "bad_news";
  label: string;
  detail: string;
  phrase: string;
  weight: number;
  at: number;
  url?: string;
}

export type EventsBySymbol = Record<string, MarketEvent[]>;

export interface ShortlistItem {
  rank: number;
  symbol: string;
  name: string;
  region: Region;
  currency: Currency;
  sector: string;
  score: number;
  grade: string;
  why: string;
  bear: Point[];
  triggers: Trigger[];
  against: string[];
  squeeze: Pick<Squeeze, "level" | "score" | "shortInterestPctFloat" | "verdict">;
  catalyst: { date: number; daysUntil: number; timing: string } | null;
  structure: ShortStructure;
  /** Price when the list was built, in the share's own currency. */
  priceAtBuild: number;
  closes: number[];
}

export interface SkippedItem {
  symbol: string;
  name: string;
  stage: StageId;
  reason: string;
  score: number;
}

export interface Funnel {
  scanned: number;
  weak: number;
  triggered: number;
  qualified: number;
  listed: number;
}

export interface Shortlist {
  builtAt: number;
  funnel: Funnel;
  items: ShortlistItem[];
  skipped: SkippedItem[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r1 = (n: number) => Math.round(n * 10) / 10;
const sum = (ps: { weight: number }[]) => ps.reduce((s, p) => s + p.weight, 0);
const byWeight = <T extends { weight: number }>(ps: T[]) => [...ps].sort((a, b) => b.weight - a.weight);

// --- 2. Analyst ---------------------------------------------------------------

interface Analysis {
  score: number;
  bear: Point[];
  bull: string[];
}

export function analyse(s: Snapshot): Analysis {
  const closes = s.bars.map((b) => b.c);
  const sig = computeSignals(closes.slice(-31));
  const bear: Point[] = [];
  const bull: string[] = [];
  let drag = 0;
  let kind: Point["kind"] = "chart";
  const add = (label: string, detail: string, phrase: string, weight: number) => bear.push({ label, detail, phrase, weight: r1(weight), kind });

  // The chart
  if (sig.zscore >= 1.5) add("Overextended", `Trading ${sig.zscore.toFixed(1)} standard deviations above its 20-day average.`, "it's stretched well above its average", Math.min(16, 6 + (sig.zscore - 1.5) * 10));
  if (s.rsi >= 68) add("Overbought", `RSI of ${Math.round(s.rsi)}: buyers may be running out of steam.`, "it looks overbought", Math.min(12, 5 + (s.rsi - 68) * 0.5));
  if (s.sma50 && s.sma200 && s.price < s.sma50 && s.sma50 < s.sma200) add("Downtrend", "Below its 50-day average, which is below its 200-day: a downtrend.", "it's in a downtrend", 10);
  else if (s.sma200 && s.price < s.sma200) add("Below the 200-day", "Trading under its 200-day average, the long-term trend line.", "it's under its 200-day average", 5);
  if (s.perfQ !== null && s.perfQ <= -10) add("Falling", `Down ${Math.abs(s.perfQ).toFixed(0)}% in three months.`, `it's down ${Math.abs(s.perfQ).toFixed(0)}% in three months`, Math.min(8, 3 + Math.abs(s.perfQ) * 0.15));
  if (sig.volatility >= 0.025) add("Room to move", `Swings about ${(sig.volatility * 100).toFixed(1)}% a day, so a real fall is in range.`, "it moves enough to fall fast", Math.min(6, 2 + (sig.volatility - 0.025) * 150));

  if (s.rsi <= 32) {
    drag -= 12;
    bull.push(`Already oversold (RSI ${Math.round(s.rsi)}): falls this sharp often bounce.`);
  }
  if (s.sma50 && s.sma200 && s.price > s.sma50 && s.sma50 > s.sma200 && (s.perfM ?? 0) > 4) {
    drag -= 8;
    bull.push("The uptrend is intact: above its 50- and 200-day averages.");
  } else if (s.sma200 && s.price > s.sma200) {
    bull.push("Still above its 200-day average, so the long-term trend is up.");
  }

  // The business
  const f = s.fund;
  kind = "business";
  if (f) {
    if (f.eps !== null && f.eps <= 0) add("Loss-making", "No profits to support the share price.", "it's losing money", 10);
    else if (f.pe !== null && f.pe >= 40) add("Expensive", `P/E of ${Math.round(f.pe)}: priced for everything to go right.`, `it's priced for perfection at ${Math.round(f.pe)} times earnings`, Math.min(12, 4 + (f.pe - 40) * 0.15));
    if (f.epsGrowthThisY !== null && f.epsGrowthThisY < 0) add("Profits shrinking", `Earnings down ${Math.abs(f.epsGrowthThisY).toFixed(0)}% this year.`, "profits are shrinking", Math.min(10, 4 + Math.abs(f.epsGrowthThisY) * 0.2));
    if (f.salesGrowth !== null && f.salesGrowth < 0) add("Sales shrinking", `Sales down ${Math.abs(f.salesGrowth).toFixed(0)}% on last year.`, "sales are falling", Math.min(8, 3 + Math.abs(f.salesGrowth) * 0.3));
    if (f.debtEq !== null && f.debtEq >= 2) add("Heavy debt", `Debt is ${f.debtEq.toFixed(1)} times shareholders' equity.`, "it carries heavy debt", 6);
    if (f.targetUpside !== null && f.targetUpside < 0) add("Above analysts' target", `Trading ${Math.abs(f.targetUpside).toFixed(0)}% above the average analyst price target.`, "it's above analysts' price targets", Math.min(8, 3 + Math.abs(f.targetUpside) * 0.4));
    if (f.recom !== null && f.recom >= 3) add("Analysts cautious", `Average analyst rating ${f.recom.toFixed(1)} out of 5 (5 = strong sell).`, "analysts are cautious", 5);

    if (f.epsGrowthNextY !== null && f.epsGrowthNextY >= 15) bull.push(`Profits are forecast to grow ${Math.round(f.epsGrowthNextY)}% next year.`);
    if (f.targetUpside !== null && f.targetUpside >= 15) bull.push(`Analysts' average target is ${Math.round(f.targetUpside)}% above the price.`);
    else if (f.recom !== null && f.recom <= 2) bull.push("Most analysts rate it a buy.");
    if (f.netMargin !== null && f.netMargin >= 20 && (f.roe ?? 0) >= 20) bull.push(`Very profitable: a ${Math.round(f.netMargin)}% net margin.`);
  }

  return { score: Math.round(clamp(30 + sum(bear) + drag, 0, 100)), bear: byWeight(bear), bull };
}

// --- 3. Signal hunter ---------------------------------------------------------

const BEARISH_CANDLES: CandleId[] = ["bearish_engulfing", "gravestone_doji", "marubozu_black"];

export function chartTriggers(s: Snapshot): Trigger[] {
  const out: Trigger[] = [];
  const add = (label: string, detail: string, phrase: string, weight: number) => out.push({ source: "chart", label, detail, phrase, weight });
  const closes = s.bars.map((b) => b.c);
  const sig = computeSignals(closes.slice(-31));

  // A real break: at least 1% under the 50-day average now, after closing above
  // it on most of the five days before and most of the month before that.
  const ma50 = s.sma50;
  if (ma50 && s.price <= ma50 * 0.99) {
    const above = (bs: typeof s.bars) => bs.filter((b) => b.c > ma50).length;
    if (above(s.bars.slice(-6, -1)) >= 3 && above(s.bars.slice(-26, -6)) >= 14)
      add("Broke its 50-day average", "Closed below its 50-day average after holding above it for weeks.", "it has just broken below its 50-day average", 9);
  }
  if (s.signals.includes("death_cross")) add("Death cross", "The 50-day average has crossed below the 200-day.", "a death cross has formed", 8);
  if (s.pattern?.bias === "bearish") {
    // A falling channel is a trend already under way; tops, wedges and triangles are fresher turns.
    const channel = s.pattern.id === "channel_down";
    add(channel ? "Falling channel" : s.pattern.label, channel ? "Trading in a falling channel of lower highs and lower lows." : "A bearish chart pattern has formed.", channel ? "it's sliding in a falling channel" : `a ${s.pattern.label.toLowerCase()} has formed`, channel ? 5 : 7);
  }
  if (sig.accel5 <= -3 && s.fromHigh20 <= -3 && s.fromHigh20 >= -15)
    add("Rolling over", `Down ${Math.abs(sig.accel5).toFixed(1)}% in a week, ${Math.abs(s.fromHigh20).toFixed(0)}% off its 20-day high.`, "it's rolling over from a high", 7);
  if (s.signals.includes("gap_down")) add("Gapped down", `Opened ${Math.abs(s.gap).toFixed(1)}% below the previous close.`, "it gapped down", 6);
  if (s.candle && BEARISH_CANDLES.includes(s.candle)) add(CANDLE_LABEL[s.candle], "A bearish candle on the latest day.", `a ${CANDLE_LABEL[s.candle].toLowerCase()} candle printed`, 4);
  return out;
}

const EVENT_SOURCE: Record<MarketEvent["kind"], TriggerSource> = { insider_selling: "insiders", downgrade: "analysts", bad_news: "news" };

function eventTriggers(events: MarketEvent[] = []): Trigger[] {
  return events.map((e) => ({ source: EVENT_SOURCE[e.kind], label: e.label, detail: e.detail, phrase: e.phrase, weight: e.weight, url: e.url, at: e.at }));
}

// --- 4. Enricher --------------------------------------------------------------

function squeezeOf(s: Snapshot): Squeeze {
  const si = s.fund?.shortFloat;
  return squeezeFor(s.symbol, si !== null && si !== undefined ? { shortInterestPctFloat: si } : undefined);
}

function planFor(s: Snapshot, now: number): ShortStructure {
  const sig = computeSignals(s.bars.map((b) => b.c).slice(-31));
  return structureFor(sig, (perShare) => toGbp(perShare, s.i.currency, now));
}

// --- 5. Qualifier -------------------------------------------------------------

function disqualify(s: Snapshot, sq: Squeeze, triggers: Trigger[], plan: ShortStructure): { stage: StageId; reason: string } | null {
  if (sq.level === "extreme") return { stage: "qualifier", reason: `Squeeze trap: ${sq.shortInterestPctFloat.toFixed(1)}% of its shares are already sold short.` };
  if (s.rsi <= 30) return { stage: "qualifier", reason: `Already oversold (RSI ${Math.round(s.rsi)}): late to short, with bounce risk.` };
  if (s.earnings && s.earnings.daysUntil <= 2)
    return { stage: "qualifier", reason: `Results ${s.earnings.daysUntil <= 0 ? "today" : `in ${s.earnings.daysUntil} day${s.earnings.daysUntil === 1 ? "" : "s"}`}: a coin flip. Wait for the numbers.` };
  if (!triggers.length) return { stage: "signals", reason: "Looks weak, but nothing has cracked yet: no fresh trigger." };
  if (plan.rewardRisk < 2) return { stage: "qualifier", reason: `Reward too small for the risk (${plan.rewardRisk.toFixed(1)} to 1).` };
  const uptrend = s.sma50 && s.sma200 && s.price > s.sma50 && s.sma50 > s.sma200 && (s.perfM ?? 0) > 4;
  if (uptrend && sum(triggers) < 10) return { stage: "qualifier", reason: "The uptrend is still intact, and the trigger isn't strong enough to fight it." };
  return null;
}

function caseAgainst(s: Snapshot, sq: Squeeze, bull: string[]): string[] {
  const out: string[] = [];
  if (sq.level === "high" || sq.level === "moderate")
    out.push(`${sq.shortInterestPctFloat.toFixed(1)}% of shares are sold short: a sharp rally could force shorts to buy back and push it higher.`);
  if (s.earnings && s.earnings.daysUntil <= 10) out.push(`Results in ${s.earnings.daysUntil} days could send it higher if they beat.`);
  out.push(...bull);
  if (out.length < 2) out.push("Shares tend to rise over time, so a short needs the timing to be right.");
  return out.slice(0, 3);
}

// --- 6. Prioritiser -----------------------------------------------------------

function priority(analystScore: number, triggers: Trigger[], plan: ShortStructure, sq: Squeeze, s: Snapshot): number {
  const rrBonus = clamp((plan.rewardRisk - 2) * 2.5, 0, 8);
  const timing = s.earnings && s.earnings.daysUntil >= 3 && s.earnings.daysUntil <= 21 ? 4 : 0;
  const crowd = sq.level === "high" ? 8 : sq.level === "moderate" ? 3 : 0;
  return Math.round(clamp(analystScore * 0.9 + Math.min(30, sum(triggers) * 1.4) + rrBonus + timing - crowd, 1, 99));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function whyLine(bear: Point[], triggers: Trigger[]): string {
  // Lead with what's specific to the company when there is something, then the trigger.
  const ranked = byWeight(bear);
  const b = ranked.find((p) => p.kind === "business" && p.weight >= 4) ?? ranked[0];
  const t = byWeight(triggers)[0];
  const parts = [b?.phrase, t?.phrase].filter(Boolean) as string[];
  return parts.length ? `${cap(parts.join(", and "))}.` : "Several weak signals line up.";
}

// --- The pipeline -------------------------------------------------------------

/** Pre-pass for the Signal hunter's server lookups: the weakest names, worst first. */
export function weakestSymbols(snaps: Snapshot[], n = 15): string[] {
  return snaps
    .filter((s) => s.i.type === "stock" && s.bars.length >= 60)
    .map((s) => ({ s: s.symbol, score: analyse(s).score }))
    .filter((x) => x.score >= WEAK_AT)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
}

export function buildShortlist(snaps: Snapshot[], now: number, events: EventsBySymbol = {}, size = LIST_SIZE): Shortlist {
  // 1. Finder
  const pool = snaps.filter((s) => s.i.type === "stock" && s.bars.length >= 60);

  const ranked: (ShortlistItem & { _score: number })[] = [];
  const skipped: SkippedItem[] = [];
  let weak = 0;
  let triggered = 0;

  for (const s of pool) {
    // 2. Analyst
    const a = analyse(s);
    if (a.score < WEAK_AT) continue;
    weak++;

    // 3. Signal hunter
    const triggers = byWeight([...chartTriggers(s), ...eventTriggers(events[s.symbol])]);
    if (triggers.length) triggered++;

    // 4. Enricher
    const sq = squeezeOf(s);
    const plan = planFor(s, now);

    // 5. Qualifier
    const out = disqualify(s, sq, triggers, plan);
    if (out) {
      if (a.score >= NEAR_MISS_AT) skipped.push({ symbol: s.symbol, name: s.i.name, stage: out.stage, reason: out.reason, score: a.score });
      continue;
    }

    // 6. Prioritiser (scored here, cut below)
    const score = priority(a.score, triggers, plan, sq, s);
    ranked.push({
      rank: 0,
      _score: score,
      symbol: s.symbol,
      name: s.i.name,
      region: s.i.region,
      currency: s.i.currency,
      sector: s.i.sector,
      score,
      grade: gradeFor(score),
      why: whyLine(a.bear, triggers),
      bear: a.bear.slice(0, 4),
      triggers: triggers.slice(0, 4),
      against: caseAgainst(s, sq, a.bull),
      squeeze: { level: sq.level, score: sq.score, shortInterestPctFloat: sq.shortInterestPctFloat, verdict: sq.verdict },
      catalyst: s.earnings ? { date: s.earnings.date, daysUntil: s.earnings.daysUntil, timing: s.earnings.timing } : null,
      structure: plan,
      priceAtBuild: s.price,
      closes: s.bars.slice(-30).map((b) => b.c),
    });
  }

  ranked.sort((x, y) => y._score - x._score || x.symbol.localeCompare(y.symbol));
  const items = ranked.slice(0, size).map(({ _score, ...it }, k) => ({ ...it, rank: k + 1 }));
  for (const r of ranked.slice(size)) skipped.push({ symbol: r.symbol, name: r.name, stage: "prioritiser", reason: `Qualified, but ranked below the top ${size}.`, score: r.score });

  return {
    builtAt: now,
    funnel: { scanned: pool.length, weak, triggered, qualified: ranked.length, listed: items.length },
    items,
    skipped: skipped.sort((x, y) => y.score - x.score).slice(0, 20),
  };
}
