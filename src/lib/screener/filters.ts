// The screener's filter catalogue, Finviz-style: Descriptive, Fundamental and
// Technical filters, each a list of options. Everything is data, so a screen is
// just a list of "filter:option" tokens — easy to save, share in a URL, alert
// on, or have the AI build from a plain-English request.
//
// Every filter carries a one-line plain-English explainer. Finviz assumes you
// know what PEG or ATR means; Shortlist doesn't.

import { INSTRUMENTS } from "../instruments";
import { INDEX_LABEL, THEMES, type IndexCode } from "../universe";
import { CANDLE_LABEL, PATTERN_LABEL, type CandleId, type PatternId } from "./patterns";
import type { SignalId, Snapshot } from "./snapshot";

export type FilterGroup = "descriptive" | "fundamental" | "technical";

export interface FilterOption {
  id: string;
  label: string;
  test: (s: Snapshot) => boolean;
}

export interface FilterDef {
  id: string;
  label: string;
  group: FilterGroup;
  help: string;
  options: FilterOption[];
}

type Getter = (s: Snapshot) => number | null | undefined;

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const over = (get: Getter, x: number) => (s: Snapshot) => ok(get(s)) && (get(s) as number) > x;
const under = (get: Getter, x: number) => (s: Snapshot) => ok(get(s)) && (get(s) as number) < x;
const between = (get: Getter, a: number, b: number) => (s: Snapshot) => ok(get(s)) && (get(s) as number) >= a && (get(s) as number) <= b;

function ranges(get: Getter, unders: number[], overs: number[], fmt: (n: number) => string): FilterOption[] {
  return [
    ...unders.map((x) => ({ id: `u${x}`, label: `Under ${fmt(x)}`, test: under(get, x) })),
    ...overs.map((x) => ({ id: `o${x}`, label: `Over ${fmt(x)}`, test: over(get, x) })),
  ];
}

const pctF = (n: number) => `${n}%`;
const xF = (n: number) => `${n}`;

function perfOptions(get: Getter): FilterOption[] {
  return [
    { id: "up", label: "Up", test: over(get, 0) },
    { id: "down", label: "Down", test: under(get, 0) },
    ...[10, 20, 30, 50, 100].map((x) => ({ id: `o${x}`, label: `Up more than ${x}%`, test: over(get, x) })),
    ...[10, 20, 30, 50].map((x) => ({ id: `d${x}`, label: `Down more than ${x}%`, test: under(get, -x) })),
  ];
}

function smaOptions(pctGet: Getter, smaGet: Getter): FilterOption[] {
  return [
    { id: "pa", label: "Price above", test: over(pctGet, 0) },
    { id: "pb", label: "Price below", test: under(pctGet, 0) },
    ...[5, 10, 20, 50].map((x) => ({ id: `pa${x}`, label: `Price ${x}% above`, test: over(pctGet, x) })),
    ...[5, 10, 20, 50].map((x) => ({ id: `pb${x}`, label: `Price ${x}% below`, test: under(pctGet, -x) })),
    {
      id: "xa",
      label: "Price crossed above today",
      test: (s) => ok(smaGet(s)) && s.prevClose < (smaGet(s) as number) && s.price > (smaGet(s) as number),
    },
    {
      id: "xb",
      label: "Price crossed below today",
      test: (s) => ok(smaGet(s)) && s.prevClose > (smaGet(s) as number) && s.price < (smaGet(s) as number),
    },
  ];
}

function hiLoOptions(fromHigh: Getter, fromLow: Getter, prefix: string): FilterOption[] {
  return [
    { id: "nh", label: `New ${prefix} high`, test: (s) => ok(fromHigh(s)) && (fromHigh(s) as number) >= -0.05 },
    { id: "nl", label: `New ${prefix} low`, test: (s) => ok(fromLow(s)) && (fromLow(s) as number) <= 0.05 },
    { id: "b5", label: "0–5% below high", test: between(fromHigh, -5, 0) },
    ...[10, 20, 30, 50].map((x) => ({ id: `b${x}`, label: `${x}% or more below high`, test: under(fromHigh, -x + 0.0001) })),
    { id: "a5", label: "0–5% above low", test: between(fromLow, 0, 5) },
    ...[10, 20, 50, 100].map((x) => ({ id: `a${x}`, label: `${x}% or more above low`, test: over(fromLow, x - 0.0001) })),
  ];
}

const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const SECTORS = uniq(INSTRUMENTS.filter((i) => i.type === "stock").map((i) => i.sector));
const INDUSTRIES = uniq(INSTRUMENTS.map((i) => i.industry));

const usd = (n: number) => (n >= 1e9 ? `$${n / 1e9}bn` : `$${n / 1e6}m`);
const f = (s: Snapshot) => s.fund;

export const FILTERS: FilterDef[] = [
  // --------------------------------------------------------------- descriptive
  {
    id: "type",
    label: "Asset type",
    group: "descriptive",
    help: "Shares, exchange-traded funds or cryptocurrencies.",
    options: [
      { id: "stock", label: "Shares", test: (s) => s.i.type === "stock" },
      { id: "etf", label: "ETFs", test: (s) => s.i.type === "etf" },
      { id: "crypto", label: "Crypto", test: (s) => s.i.type === "crypto" },
    ],
  },
  {
    id: "exch",
    label: "Exchange",
    group: "descriptive",
    help: "Where the share is listed. LSE prices are in pence.",
    options: [
      { id: "nasdaq", label: "NASDAQ", test: (s) => s.i.exchange === "NASDAQ" },
      { id: "nyse", label: "NYSE", test: (s) => s.i.exchange === "NYSE" },
      { id: "lse", label: "London (LSE)", test: (s) => s.i.exchange === "LSE" },
    ],
  },
  {
    id: "idx",
    label: "Index",
    group: "descriptive",
    help: "Membership of a major stock-market index.",
    options: (Object.keys(INDEX_LABEL) as IndexCode[]).map((k) => ({ id: k.toLowerCase(), label: INDEX_LABEL[k], test: (s: Snapshot) => !!s.i.indices?.includes(k) })),
  },
  {
    id: "sector",
    label: "Sector",
    group: "descriptive",
    help: "The broad part of the economy a company works in.",
    options: SECTORS.map((x) => ({ id: slug(x), label: x, test: (s: Snapshot) => s.i.sector === x })),
  },
  {
    id: "ind",
    label: "Industry",
    group: "descriptive",
    help: "A narrower slice of the sector, e.g. Semiconductors within Technology.",
    options: INDUSTRIES.map((x) => ({ id: slug(x), label: x, test: (s: Snapshot) => s.i.industry === x })),
  },
  {
    id: "theme",
    label: "Theme",
    group: "descriptive",
    help: "The big investment stories, like AI or obesity drugs. A share can belong to several.",
    options: Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, test: (s: Snapshot) => t.symbols.includes(s.symbol) })),
  },
  {
    id: "geo",
    label: "Country / region",
    group: "descriptive",
    help: "Where the business is based (not always where it's listed — Arm is British but trades in New York).",
    options: [
      { id: "us", label: "USA", test: (s) => s.i.region === "US" && !s.i.country },
      { id: "uk", label: "United Kingdom", test: (s) => s.i.region === "UK" },
      { id: "europe", label: "Europe (ex-UK)", test: (s) => s.i.region === "Europe" },
      { id: "foreign", label: "Non-US", test: (s) => s.i.region !== "US" || !!s.i.country },
    ],
  },
  {
    id: "cap",
    label: "Market cap",
    group: "descriptive",
    help: "The company's total value on the stock market: share price × shares in issue, in US dollars.",
    options: [
      { id: "mega", label: "Mega (over $200bn)", test: over((s) => s.marketCapUsd, 200e9) },
      { id: "large", label: "Large ($10bn–$200bn)", test: between((s) => s.marketCapUsd, 10e9, 200e9) },
      { id: "mid", label: "Mid ($2bn–$10bn)", test: between((s) => s.marketCapUsd, 2e9, 10e9) },
      { id: "small", label: "Small ($300m–$2bn)", test: between((s) => s.marketCapUsd, 0.3e9, 2e9) },
      { id: "largeover", label: "Large and over (over $10bn)", test: over((s) => s.marketCapUsd, 10e9) },
      { id: "midover", label: "Mid and over (over $2bn)", test: over((s) => s.marketCapUsd, 2e9) },
      { id: "u10b", label: `Under ${usd(10e9)}`, test: under((s) => s.marketCapUsd, 10e9) },
    ],
  },
  {
    id: "div",
    label: "Dividend yield",
    group: "descriptive",
    help: "Yearly dividends as a % of the share price — the cash income you'd get.",
    options: [
      { id: "none", label: "None (0%)", test: (s) => !s.fund?.dividendYield && !s.i.dividendYieldPct },
      { id: "pos", label: "Positive (over 0%)", test: (s) => (s.fund?.dividendYield ?? s.i.dividendYieldPct) > 0 },
      ...[1, 2, 3, 4, 5, 6, 8].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: (s: Snapshot) => (s.fund?.dividendYield ?? s.i.dividendYieldPct) > x })),
    ],
  },
  {
    id: "short",
    label: "Short float",
    group: "descriptive",
    help: "The share of tradable stock that's been sold short. High numbers mean a crowded bet against it — and squeeze risk.",
    options: [{ id: "low", label: "Low (under 5%)", test: under((s) => f(s)?.shortFloat, 5) }, ...[5, 10, 15, 20].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.shortFloat, x) }))],
  },
  {
    id: "recom",
    label: "Analyst rating",
    group: "descriptive",
    help: "The average analyst view, from 1 (strong buy) to 5 (strong sell). Analysts are often wrong — treat it as one input.",
    options: [
      { id: "sb", label: "Strong buy (1)", test: under((s) => f(s)?.recom, 1.5) },
      { id: "b", label: "Buy or better", test: under((s) => f(s)?.recom, 2.01) },
      { id: "h", label: "Hold (around 3)", test: between((s) => f(s)?.recom, 2.5, 3.5) },
      { id: "s", label: "Sell or worse", test: over((s) => f(s)?.recom, 3.99) },
    ],
  },
  {
    id: "avgvol",
    label: "Average volume",
    group: "descriptive",
    help: "How many shares change hands on a typical day (3-month average). Higher means easier to trade.",
    options: [100e3, 500e3, 1e6, 5e6, 10e6, 50e6].map((x) => ({ id: `o${x / 1e3}k`, label: `Over ${x >= 1e6 ? `${x / 1e6}M` : `${x / 1e3}K`}`, test: over((s) => s.avgVolume, x) })),
  },
  {
    id: "relvol",
    label: "Relative volume",
    group: "descriptive",
    help: "Today's volume against normal for this time of day. 2 means twice as busy as usual — something's happening.",
    options: [
      ...[1, 1.5, 2, 3, 5].map((x) => ({ id: `o${x}`, label: `Over ${x}×`, test: over((s) => s.relVolume, x) })),
      ...[1, 0.5].map((x) => ({ id: `u${x}`, label: `Under ${x}×`, test: under((s) => s.relVolume, x) })),
    ],
  },
  {
    id: "curvol",
    label: "Current volume",
    group: "descriptive",
    help: "Shares traded so far today.",
    options: [100e3, 500e3, 1e6, 5e6, 10e6, 50e6].map((x) => ({ id: `o${x / 1e3}k`, label: `Over ${x >= 1e6 ? `${x / 1e6}M` : `${x / 1e3}K`}`, test: over((s) => s.volume, x) })),
  },
  {
    id: "shares",
    label: "Shares outstanding",
    group: "descriptive",
    help: "How many shares the company has issued.",
    options: [
      ...[500, 1000].map((x) => ({ id: `u${x}m`, label: `Under ${x >= 1000 ? `${x / 1000}B` : `${x}M`}`, test: under((s) => s.i.sharesM, x) })),
      ...[500, 1000, 5000, 10000].map((x) => ({ id: `o${x}m`, label: `Over ${x >= 1000 ? `${x / 1000}B` : `${x}M`}`, test: over((s) => s.i.sharesM, x) })),
    ],
  },
  {
    id: "price",
    label: "Price (in $)",
    group: "descriptive",
    help: "Share price converted to US dollars, so London and New York compare like for like.",
    options: [
      ...[5, 10, 20, 50, 100].map((x) => ({ id: `u${x}`, label: `Under $${x}`, test: (s: Snapshot) => usdPrice(s) < x })),
      ...[5, 10, 20, 50, 100, 500].map((x) => ({ id: `o${x}`, label: `Over $${x}`, test: (s: Snapshot) => usdPrice(s) > x })),
    ],
  },
  {
    id: "target",
    label: "Target price",
    group: "descriptive",
    help: "Where analysts think the price will be in 12 months, versus today.",
    options: [
      { id: "above", label: "Price below target", test: over((s) => f(s)?.targetUpside, 0) },
      ...[10, 20, 30].map((x) => ({ id: `a${x}`, label: `${x}% or more upside`, test: over((s) => f(s)?.targetUpside, x - 0.0001) })),
      { id: "below", label: "Price above target", test: under((s) => f(s)?.targetUpside, 0) },
    ],
  },
  {
    id: "earn",
    label: "Earnings date",
    group: "descriptive",
    help: "When the company next reports results. Prices often jump on the day.",
    options: [
      { id: "today", label: "Today", test: (s) => s.earnings?.daysUntil === 0 },
      { id: "week", label: "Within 7 days", test: (s) => !!s.earnings && s.earnings.daysUntil <= 7 },
      { id: "2w", label: "Within 14 days", test: (s) => !!s.earnings && s.earnings.daysUntil <= 14 },
      { id: "month", label: "Within 31 days", test: (s) => !!s.earnings && s.earnings.daysUntil <= 31 },
    ],
  },

  // -------------------------------------------------------------- fundamental
  {
    id: "pe",
    label: "P/E",
    group: "fundamental",
    help: "Price ÷ last year's earnings per share: how many years of profit you're paying for. Lower is cheaper, but cheap can mean trouble.",
    options: [
      { id: "low", label: "Low (under 15)", test: under((s) => f(s)?.pe, 15) },
      { id: "profitable", label: "Profitable (over 0)", test: over((s) => f(s)?.pe, 0) },
      { id: "high", label: "High (over 50)", test: over((s) => f(s)?.pe, 50) },
      { id: "neg", label: "Loss-making", test: (s) => ok(f(s)?.eps) && (f(s)?.eps as number) < 0 },
      ...ranges((s) => f(s)?.pe, [10, 15, 20, 25, 30, 40], [10, 20, 30, 40], xF),
    ],
  },
  {
    id: "fpe",
    label: "Forward P/E",
    group: "fundamental",
    help: "Price ÷ next year's forecast earnings. Lower than the P/E means profits are expected to grow.",
    options: [{ id: "low", label: "Low (under 15)", test: under((s) => f(s)?.fwdPe, 15) }, { id: "high", label: "High (over 50)", test: over((s) => f(s)?.fwdPe, 50) }, ...ranges((s) => f(s)?.fwdPe, [10, 15, 20, 25, 30], [20, 30], xF)],
  },
  {
    id: "peg",
    label: "PEG",
    group: "fundamental",
    help: "P/E ÷ expected growth rate. Around 1 is often called fair; under 1 can mean growth is cheap.",
    options: [{ id: "low", label: "Low (under 1)", test: under((s) => f(s)?.peg, 1) }, ...ranges((s) => f(s)?.peg, [2, 3], [1, 2, 3], xF)],
  },
  {
    id: "ps",
    label: "P/S",
    group: "fundamental",
    help: "Price ÷ sales per share. Useful for companies with little or no profit yet.",
    options: [{ id: "low", label: "Low (under 1)", test: under((s) => f(s)?.ps, 1) }, ...ranges((s) => f(s)?.ps, [2, 3, 5, 10], [5, 10], xF)],
  },
  {
    id: "pb",
    label: "P/B",
    group: "fundamental",
    help: "Price ÷ book value (assets minus debts) per share. Under 1 means the market values it below its accounts.",
    options: [{ id: "low", label: "Low (under 1)", test: under((s) => f(s)?.pb, 1) }, ...ranges((s) => f(s)?.pb, [2, 3, 5], [3, 5, 10], xF)],
  },
  {
    id: "epsy",
    label: "EPS growth this year",
    group: "fundamental",
    help: "How much earnings per share grew over the last year.",
    options: [{ id: "neg", label: "Negative", test: under((s) => f(s)?.epsGrowthThisY, 0) }, { id: "pos", label: "Positive", test: over((s) => f(s)?.epsGrowthThisY, 0) }, ...[10, 20, 30].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.epsGrowthThisY, x) }))],
  },
  {
    id: "epsny",
    label: "EPS growth next year",
    group: "fundamental",
    help: "How much analysts expect earnings per share to grow next year.",
    options: [{ id: "neg", label: "Negative", test: under((s) => f(s)?.epsGrowthNextY, 0) }, { id: "pos", label: "Positive", test: over((s) => f(s)?.epsGrowthNextY, 0) }, ...[10, 20, 30].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.epsGrowthNextY, x) }))],
  },
  {
    id: "sales",
    label: "Sales growth",
    group: "fundamental",
    help: "How much revenue grew over the last 12 months.",
    options: [{ id: "neg", label: "Negative", test: under((s) => f(s)?.salesGrowth, 0) }, { id: "pos", label: "Positive", test: over((s) => f(s)?.salesGrowth, 0) }, ...[5, 10, 20].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.salesGrowth, x) }))],
  },
  {
    id: "roe",
    label: "Return on equity",
    group: "fundamental",
    help: "Profit as a % of shareholders' money. Consistently over 15% is a sign of a quality business.",
    options: [{ id: "pos", label: "Positive", test: over((s) => f(s)?.roe, 0) }, { id: "neg", label: "Negative", test: under((s) => f(s)?.roe, 0) }, ...[10, 15, 20, 30].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.roe, x) }))],
  },
  {
    id: "roa",
    label: "Return on assets",
    group: "fundamental",
    help: "Profit as a % of everything the company owns.",
    options: [{ id: "pos", label: "Positive", test: over((s) => f(s)?.roa, 0) }, ...[5, 10, 15].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.roa, x) }))],
  },
  {
    id: "gm",
    label: "Gross margin",
    group: "fundamental",
    help: "What's left of each £1 of sales after the direct cost of making the product.",
    options: [20, 40, 60, 80].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.grossMargin, x) })),
  },
  {
    id: "om",
    label: "Operating margin",
    group: "fundamental",
    help: "Profit from the core business as a % of sales, before interest and tax.",
    options: [{ id: "neg", label: "Negative", test: under((s) => f(s)?.operMargin, 0) }, { id: "pos", label: "Positive", test: over((s) => f(s)?.operMargin, 0) }, ...[10, 20, 30].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.operMargin, x) }))],
  },
  {
    id: "nm",
    label: "Net margin",
    group: "fundamental",
    help: "Final profit as a % of sales, after everything.",
    options: [{ id: "neg", label: "Negative", test: under((s) => f(s)?.netMargin, 0) }, { id: "pos", label: "Positive", test: over((s) => f(s)?.netMargin, 0) }, ...[10, 20, 30].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.netMargin, x) }))],
  },
  {
    id: "de",
    label: "Debt/equity",
    group: "fundamental",
    help: "Borrowings compared with shareholders' money. Under 1 is usually comfortable; banks and utilities run higher.",
    options: [{ id: "low", label: "Low (under 0.5)", test: under((s) => f(s)?.debtEq, 0.5) }, { id: "u1", label: "Under 1", test: under((s) => f(s)?.debtEq, 1) }, { id: "o1", label: "Over 1", test: over((s) => f(s)?.debtEq, 1) }, { id: "o2", label: "Over 2", test: over((s) => f(s)?.debtEq, 2) }],
  },
  {
    id: "cr",
    label: "Current ratio",
    group: "fundamental",
    help: "Short-term assets ÷ short-term bills. Over 1 means it can cover what's due this year.",
    options: [{ id: "u1", label: "Under 1", test: under((s) => f(s)?.currentRatio, 1) }, ...[1, 1.5, 2, 3].map((x) => ({ id: `o${x}`, label: `Over ${x}`, test: over((s) => f(s)?.currentRatio, x) }))],
  },
  {
    id: "payout",
    label: "Payout ratio",
    group: "fundamental",
    help: "The share of profit paid out as dividends. Over 100% isn't sustainable for long.",
    options: [{ id: "none", label: "None", test: (s) => ok(f(s)?.payout) && (f(s)?.payout as number) === 0 }, { id: "u50", label: "Under 50%", test: between((s) => f(s)?.payout, 0.01, 50) }, { id: "u100", label: "Under 100%", test: between((s) => f(s)?.payout, 0.01, 100) }, { id: "o50", label: "Over 50%", test: over((s) => f(s)?.payout, 50) }, { id: "o100", label: "Over 100%", test: over((s) => f(s)?.payout, 100) }],
  },
  {
    id: "insider",
    label: "Insider ownership",
    group: "fundamental",
    help: "How much of the company its directors and managers own. Skin in the game.",
    options: [{ id: "low", label: "Low (under 1%)", test: under((s) => f(s)?.insiderOwn, 1) }, ...[5, 10].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.insiderOwn, x) }))],
  },
  {
    id: "inst",
    label: "Institutional ownership",
    group: "fundamental",
    help: "How much is held by funds, pensions and insurers.",
    options: [{ id: "u50", label: "Under 50%", test: under((s) => f(s)?.instOwn, 50) }, ...[50, 70, 90].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => f(s)?.instOwn, x) }))],
  },

  // ---------------------------------------------------------------- technical
  { id: "chg", label: "Change today", group: "technical", help: "Today's move versus yesterday's close.", options: [{ id: "up", label: "Up", test: over((s) => s.change, 0) }, { id: "down", label: "Down", test: under((s) => s.change, 0) }, ...[2, 5, 10].map((x) => ({ id: `o${x}`, label: `Up more than ${x}%`, test: over((s) => s.change, x) })), ...[2, 5, 10].map((x) => ({ id: `d${x}`, label: `Down more than ${x}%`, test: under((s) => s.change, -x) }))] },
  { id: "perfw", label: "Performance (week)", group: "technical", help: "Price change over the last 7 days.", options: perfOptions((s) => s.perfW) },
  { id: "perfm", label: "Performance (month)", group: "technical", help: "Price change over the last month.", options: perfOptions((s) => s.perfM) },
  { id: "perfq", label: "Performance (quarter)", group: "technical", help: "Price change over the last 3 months.", options: perfOptions((s) => s.perfQ) },
  { id: "perfh", label: "Performance (half year)", group: "technical", help: "Price change over the last 6 months.", options: perfOptions((s) => s.perfH) },
  { id: "perfytd", label: "Performance (YTD)", group: "technical", help: "Price change since 1 January.", options: perfOptions((s) => s.perfYtd) },
  { id: "perfy", label: "Performance (year)", group: "technical", help: "Price change over the last 12 months.", options: perfOptions((s) => s.perfY) },
  {
    id: "volat",
    label: "Volatility (month)",
    group: "technical",
    help: "The average gap between each day's high and low, as a % of price. Higher means a bumpier ride.",
    options: [...[1, 2, 3].map((x) => ({ id: `u${x}`, label: `Under ${x}%`, test: under((s) => s.volM, x) })), ...[2, 3, 4, 5, 8].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => s.volM, x) }))],
  },
  {
    id: "rsi",
    label: "RSI (14)",
    group: "technical",
    help: "Momentum from 0 to 100. Over 70 is 'overbought' (ran up fast), under 30 'oversold' (sold off hard).",
    options: [
      ...[80, 70, 60].map((x) => ({ id: `ob${x}`, label: `Overbought (over ${x})`, test: over((s) => s.rsi, x) })),
      ...[40, 30, 20].map((x) => ({ id: `os${x}`, label: `Oversold (under ${x})`, test: under((s) => s.rsi, x) })),
      { id: "n60", label: "Not overbought (under 60)", test: under((s) => s.rsi, 60) },
      { id: "n40", label: "Not oversold (over 40)", test: over((s) => s.rsi, 40) },
    ],
  },
  {
    id: "gap",
    label: "Gap",
    group: "technical",
    help: "How far today's open jumped from yesterday's close. Big gaps usually follow news.",
    options: [{ id: "up", label: "Up", test: over((s) => s.gap, 0) }, { id: "down", label: "Down", test: under((s) => s.gap, 0) }, ...[1, 2, 3, 5].map((x) => ({ id: `u${x}`, label: `Up ${x}%+`, test: over((s) => s.gap, x) })), ...[1, 2, 3, 5].map((x) => ({ id: `d${x}`, label: `Down ${x}%+`, test: under((s) => s.gap, -x) }))],
  },
  { id: "sma20", label: "20-day SMA", group: "technical", help: "The average closing price of the last 20 days: the short-term trend.", options: smaOptions((s) => s.sma20Pct, (s) => s.sma20) },
  { id: "sma50", label: "50-day SMA", group: "technical", help: "The average of the last 50 closes: the medium-term trend.", options: [...smaOptions((s) => s.sma50Pct, (s) => s.sma50), { id: "a200", label: "SMA50 above SMA200", test: (s) => ok(s.sma50) && ok(s.sma200) && (s.sma50 as number) > (s.sma200 as number) }, { id: "b200", label: "SMA50 below SMA200", test: (s) => ok(s.sma50) && ok(s.sma200) && (s.sma50 as number) < (s.sma200 as number) }] },
  { id: "sma200", label: "200-day SMA", group: "technical", help: "The average of the last 200 closes: the long-term trend most investors watch.", options: smaOptions((s) => s.sma200Pct, (s) => s.sma200) },
  { id: "chgopen", label: "Change from open", group: "technical", help: "How the price has moved since today's open.", options: [{ id: "up", label: "Up", test: over((s) => s.changeOpen, 0) }, { id: "down", label: "Down", test: under((s) => s.changeOpen, 0) }, ...[2, 5].map((x) => ({ id: `u${x}`, label: `Up ${x}%+`, test: over((s) => s.changeOpen, x) })), ...[2, 5].map((x) => ({ id: `d${x}`, label: `Down ${x}%+`, test: under((s) => s.changeOpen, -x) }))] },
  { id: "hl20", label: "20-day high/low", group: "technical", help: "Where the price sits against its range over the last 20 days.", options: hiLoOptions((s) => s.fromHigh20, (s) => s.fromLow20, "20-day") },
  { id: "hl50", label: "50-day high/low", group: "technical", help: "Where the price sits against its range over the last 50 days.", options: hiLoOptions((s) => s.fromHigh50, (s) => s.fromLow50, "50-day") },
  { id: "hl52", label: "52-week high/low", group: "technical", help: "Where the price sits against its range over the last year.", options: hiLoOptions((s) => s.fromHigh52, (s) => s.fromLow52, "52-week") },
  {
    id: "pattern",
    label: "Chart pattern",
    group: "technical",
    help: "Shapes traders look for in the chart, found automatically. Patterns hint at what might happen; they don't promise it.",
    options: [
      ...(Object.keys(PATTERN_LABEL) as PatternId[]).map((k) => ({ id: k, label: PATTERN_LABEL[k], test: (s: Snapshot) => s.pattern?.id === k })),
      { id: "tlsupport", label: "At trendline support", test: (s: Snapshot) => !!s.pattern?.atSupport },
      { id: "tlresist", label: "At trendline resistance", test: (s: Snapshot) => !!s.pattern?.atResistance },
      { id: "hsr", label: "At horizontal support/resistance", test: (s: Snapshot) => s.srLevel != null },
    ],
  },
  {
    id: "candle",
    label: "Candlestick",
    group: "technical",
    help: "The shape of today's price bar — who won the day, buyers or sellers.",
    options: (Object.keys(CANDLE_LABEL) as CandleId[]).map((k) => ({ id: k, label: CANDLE_LABEL[k], test: (s: Snapshot) => s.candle === k })),
  },
  {
    id: "beta",
    label: "Beta",
    group: "technical",
    help: "How much the share moves with the market. 1 = in step, 2 = twice as much, 0.5 = half as much.",
    options: [{ id: "u0.5", label: "Under 0.5", test: under((s) => s.beta, 0.5) }, { id: "u1", label: "Under 1", test: under((s) => s.beta, 1) }, { id: "o1", label: "Over 1", test: over((s) => s.beta, 1) }, { id: "o1.5", label: "Over 1.5", test: over((s) => s.beta, 1.5) }, { id: "o2", label: "Over 2", test: over((s) => s.beta, 2) }],
  },
  {
    id: "atr",
    label: "ATR (% of price)",
    group: "technical",
    help: "Average true range: a typical day's full move, as a % of price. Handy for sizing a stop-loss.",
    options: [{ id: "u1", label: "Under 1%", test: under((s) => s.atrPct, 1) }, ...[1, 2, 3, 5].map((x) => ({ id: `o${x}`, label: `Over ${x}%`, test: over((s) => s.atrPct, x) }))],
  },
];

const usdPrice = (s: Snapshot) => s.priceUsd;

const BY_ID = new Map(FILTERS.map((d) => [d.id, d]));
export function getFilter(id: string): FilterDef | undefined {
  return BY_ID.get(id);
}

export const SIGNALS: { id: SignalId; label: string; help: string }[] = [
  { id: "top_gainers", label: "Top gainers", help: "The biggest risers today." },
  { id: "top_losers", label: "Top losers", help: "The biggest fallers today." },
  { id: "new_high", label: "New 52-week high", help: "Trading above every price of the past year." },
  { id: "new_low", label: "New 52-week low", help: "Trading below every price of the past year." },
  { id: "most_active", label: "Most active", help: "The most money traded today." },
  { id: "most_volatile", label: "Most volatile", help: "The widest daily ranges this week." },
  { id: "unusual_volume", label: "Unusual volume", help: "At least twice the normal volume for this time of day." },
  { id: "overbought", label: "Overbought", help: "RSI over 70: risen fast, may cool off." },
  { id: "oversold", label: "Oversold", help: "RSI under 30: fallen hard, may bounce." },
  { id: "earnings_today", label: "Earnings today", help: "Reporting results today." },
  { id: "earnings_week", label: "Earnings this week", help: "Reporting within 7 days." },
  { id: "gap_up", label: "Gap up", help: "Opened 2%+ above yesterday's close." },
  { id: "gap_down", label: "Gap down", help: "Opened 2%+ below yesterday's close." },
  { id: "breakout", label: "20-day breakout", help: "Above its 20-day high on heavier-than-usual volume." },
  { id: "pullback_uptrend", label: "Pullback in uptrend", help: "Long-term uptrend, but cooled back to its 50-day average." },
  { id: "golden_cross", label: "Golden cross", help: "50-day average crossed above the 200-day in the last 10 days." },
  { id: "death_cross", label: "Death cross", help: "50-day average crossed below the 200-day in the last 10 days." },
  { id: "tl_support", label: "Trendline support", help: "Sitting on the lower line of its chart pattern." },
  { id: "tl_resistance", label: "Trendline resistance", help: "Pressing on the upper line of its chart pattern." },
  { id: "horizontal_sr", label: "Horizontal S/R", help: "At a price level it has turned at three or more times before." },
  ...(Object.keys(PATTERN_LABEL) as PatternId[]).map((k) => ({ id: `p_${k}` as SignalId, label: PATTERN_LABEL[k], help: "Chart pattern found automatically." })),
];

export const SIGNAL_LABEL = new Map(SIGNALS.map((s) => [s.id, s.label]));

export interface Screen {
  filters: string[]; // "filter:option"
  signal?: SignalId | "";
  /** Limit the screen to these symbols (Finviz's Tickers box). */
  tickers?: string[];
}

/** Apply a screen. Unknown tokens are ignored so old saved screens keep working. */
export function runScreen(snaps: Snapshot[], screen: Screen): Snapshot[] {
  const tests: ((s: Snapshot) => boolean)[] = [];
  // Several options of the same filter are OR-ed (e.g. two sectors); filters are AND-ed.
  const grouped = new Map<string, FilterOption[]>();
  for (const tok of screen.filters) {
    const [fid, oid] = tok.split(":");
    const opt = getFilter(fid)?.options.find((o) => o.id === oid);
    if (!opt) continue;
    grouped.set(fid, [...(grouped.get(fid) ?? []), opt]);
  }
  for (const opts of grouped.values()) tests.push((s) => opts.some((o) => o.test(s)));
  const only = screen.tickers?.length ? new Set(screen.tickers.map((t) => t.toUpperCase())) : null;
  return snaps.filter((s) => (!only || only.has(s.symbol)) && (!screen.signal || s.signals.includes(screen.signal)) && tests.every((t) => t(s)));
}

/** Plain-English label for a token, e.g. "cap:large" → "Market cap: Large ($10bn–$200bn)". */
export function tokenLabel(tok: string): string | null {
  const [fid, oid] = tok.split(":");
  const d = getFilter(fid);
  const o = d?.options.find((x) => x.id === oid);
  return d && o ? `${d.label}: ${o.label}` : null;
}

/** Every valid token, for the AI screen builder and URL validation. */
export function allTokens(): string[] {
  return FILTERS.flatMap((d) => d.options.map((o) => `${d.id}:${o.id}`));
}

// Ready-made screens for people who don't know where to start.
export const PRESETS: { id: string; name: string; blurb: string; screen: Screen }[] = [
  { id: "dividends", name: "Dividend heroes", blurb: "Large companies yielding over 4%, with a payout they can afford.", screen: { filters: ["cap:largeover", "div:o4", "payout:u100"] } },
  { id: "quality", name: "Quality at a fair price", blurb: "High returns on equity and healthy margins without a sky-high P/E.", screen: { filters: ["roe:o15", "nm:o10", "pe:u25", "cap:largeover"] } },
  { id: "momentum", name: "Momentum leaders", blurb: "Up strongly over six months and still above both key averages.", screen: { filters: ["perfh:o20", "sma50:pa", "sma200:pa"] } },
  { id: "oversold", name: "Oversold big names", blurb: "Large companies that have sold off hard enough to look stretched.", screen: { filters: ["cap:largeover", "rsi:os40"] } },
  { id: "highs", name: "Breaking to new highs", blurb: "Within reach of their 52-week high, on busier-than-usual trading.", screen: { filters: ["hl52:b5", "relvol:o1"] } },
  { id: "ukvalue", name: "Cheap UK earners", blurb: "Profitable London-listed shares on a low P/E.", screen: { filters: ["exch:lse", "pe:u15", "pe:profitable"] } },
  { id: "earnings", name: "Reporting this week", blurb: "Results due within seven days: expect big moves either way.", screen: { filters: ["earn:week"] } },
  { id: "defensive", name: "Steady defensives", blurb: "Low-beta, low-volatility dividend payers for calmer markets.", screen: { filters: ["beta:u1", "volat:u3", "div:pos", "type:stock"] } },
];
