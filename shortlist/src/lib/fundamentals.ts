// Company fundamentals for the screener and quote pages: valuation, growth,
// profitability, balance sheet, ownership and analyst views.
//
// Two sources, never mixed up:
//   • live — Finnhub's basic-financials and recommendation endpoints, fetched on
//     the server when FINNHUB_API_KEY is set (see /api/fundamentals).
//   • demo — sector-shaped sample figures generated from each instrument's seed,
//     so the screener works with zero keys. They're labelled "demo" in the UI
//     wherever they appear; they are not real company data.
//
// Ratios that depend on the share price (P/E, P/S, P/B, dividend yield, target
// upside) are recomputed from the live price, as a real terminal does.

import { getInstrument, type Instrument } from "./instruments";
import { hash01 } from "./market";
import { squeezeFor } from "./squeeze";

export type FundSource = "live" | "demo";

/** Per-share and percentage figures that don't move with the share price. */
export interface FundamentalBase {
  eps: number | null; // trailing 12m EPS, in the instrument's price currency
  epsNextY: number | null; // consensus EPS for next year
  salesPerShare: number | null;
  bookPerShare: number | null;
  epsGrowthThisY: number | null; // %
  epsGrowthNextY: number | null; // %
  epsGrowth5Y: number | null; // % a year, next 5 years
  salesGrowth: number | null; // % year on year (TTM)
  roe: number | null; // %
  roa: number | null; // %
  grossMargin: number | null; // %
  operMargin: number | null; // %
  netMargin: number | null; // %
  debtEq: number | null; // ×
  currentRatio: number | null; // ×
  payout: number | null; // % of earnings paid out
  insiderOwn: number | null; // %
  instOwn: number | null; // %
  shortFloat: number | null; // %
  recom: number | null; // 1 = strong buy … 5 = strong sell
  targetPrice: number | null; // in the instrument's price currency
  dividendYield: number | null; // % (live feeds report it directly)
  source: FundSource;
}

/** Price-dependent ratios, ready to display. */
export interface Fundamentals extends FundamentalBase {
  pe: number | null;
  fwdPe: number | null;
  peg: number | null;
  ps: number | null;
  pb: number | null;
  targetUpside: number | null; // %
}

interface Template {
  pe: [number, number];
  margin: [number, number]; // net margin %
  gross: [number, number];
  growth: [number, number]; // sales growth %
  roe: [number, number];
  pb: [number, number];
  debtEq: [number, number];
  current: [number, number];
  inst: [number, number];
}

const T: Record<string, Template> = {
  Technology: { pe: [22, 48], margin: [12, 38], gross: [48, 78], growth: [4, 32], roe: [14, 55], pb: [5, 18], debtEq: [0.1, 0.9], current: [1.2, 3.2], inst: [55, 82] },
  "Communication Services": { pe: [12, 32], margin: [8, 30], gross: [40, 70], growth: [1, 16], roe: [8, 32], pb: [1.5, 8], debtEq: [0.3, 1.6], current: [0.8, 2.2], inst: [55, 80] },
  "Consumer Discretionary": { pe: [16, 38], margin: [4, 16], gross: [25, 55], growth: [1, 14], roe: [10, 40], pb: [3, 14], debtEq: [0.4, 2.2], current: [0.8, 1.9], inst: [60, 85] },
  "Consumer Staples": { pe: [15, 26], margin: [5, 18], gross: [25, 60], growth: [0, 6], roe: [14, 45], pb: [3, 10], debtEq: [0.5, 1.8], current: [0.6, 1.3], inst: [55, 78] },
  Healthcare: { pe: [14, 36], margin: [8, 28], gross: [55, 82], growth: [1, 15], roe: [10, 40], pb: [2.5, 12], debtEq: [0.3, 1.5], current: [0.9, 2.6], inst: [60, 85] },
  Financials: { pe: [9, 18], margin: [15, 35], gross: [55, 95], growth: [2, 12], roe: [8, 18], pb: [0.7, 2.4], debtEq: [0.8, 3.2], current: [0.9, 1.4], inst: [55, 80] },
  Energy: { pe: [8, 15], margin: [6, 16], gross: [20, 45], growth: [-6, 8], roe: [9, 22], pb: [1.1, 2.6], debtEq: [0.15, 0.7], current: [0.9, 1.5], inst: [55, 75] },
  Industrials: { pe: [16, 32], margin: [6, 17], gross: [20, 45], growth: [1, 11], roe: [12, 40], pb: [3, 12], debtEq: [0.4, 1.8], current: [0.9, 1.8], inst: [60, 82] },
  Materials: { pe: [11, 26], margin: [6, 20], gross: [20, 45], growth: [-5, 8], roe: [7, 18], pb: [1.3, 4.5], debtEq: [0.2, 0.7], current: [1.1, 2.4], inst: [55, 80] },
  Utilities: { pe: [14, 21], margin: [10, 18], gross: [30, 55], growth: [1, 7], roe: [8, 12], pb: [1.4, 2.6], debtEq: [1.2, 2.0], current: [0.5, 1.0], inst: [60, 78] },
  "Real Estate": { pe: [24, 55], margin: [18, 40], gross: [55, 80], growth: [2, 9], roe: [3, 10], pb: [1.3, 4.0], debtEq: [0.7, 1.6], current: [0.4, 1.4], inst: [70, 92] },
};

// Sample loss-makers, so "P/E: negative" filters have something to find.
const LOSS_MAKERS = new Set(["MRNA", "SNOW", "OCDO", "BA", "INTC"]);

const lerp = (r: [number, number], u: number) => r[0] + (r[1] - r[0]) * u;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Demo fundamentals for an instrument. Deterministic; null for ETFs and crypto. */
export function demoBase(i: Instrument): FundamentalBase | null {
  if (i.type !== "stock") return null;
  const t = T[i.sector] ?? T.Industrials;
  const u = (k: number) => hash01(i.seed * 7177 + k * 131);
  const uk = i.exchange === "LSE";
  const loss = LOSS_MAKERS.has(i.symbol);

  const pe0 = lerp(t.pe, u(1)) * (uk ? 0.78 : 1);
  const growth = lerp(t.growth, u(2));
  const margin = loss ? -lerp([3, 28], u(3)) : lerp(t.margin, u(3));
  const eps = loss ? -(i.base / lerp([25, 60], u(4))) : i.base / pe0;
  const epsGrowthNextY = loss ? lerp([-20, 60], u(5)) : growth * lerp([0.6, 1.8], u(5)) + lerp([-3, 6], u(6));
  const salesPerShare = Math.abs(eps) > 0 && margin !== 0 ? Math.abs(eps / (margin / 100)) : i.base / 3;
  const pb = lerp(t.pb, u(7));
  const yieldPct = i.dividendYieldPct;
  const payout = !loss && yieldPct > 0 ? Math.min(140, ((yieldPct / 100) * i.base) / eps * 100) : 0;
  const sq = squeezeFor(i.symbol);
  const shortFloat = i.shortable ? sq.shortInterestPctFloat : r1(lerp([0.5, 3.5], u(8)) * Math.min(3, i.vol / 0.016));

  return {
    eps: r2(eps),
    epsNextY: r2(eps * (1 + epsGrowthNextY / 100)),
    salesPerShare: r2(salesPerShare),
    bookPerShare: r2(i.base / pb),
    epsGrowthThisY: r1(loss ? lerp([-40, 30], u(9)) : growth * lerp([0.5, 2], u(9))),
    epsGrowthNextY: r1(epsGrowthNextY),
    epsGrowth5Y: loss ? null : r1(Math.max(1, growth * lerp([0.7, 1.4], u(10)))),
    salesGrowth: r1(growth),
    roe: r1(loss ? -lerp([2, 30], u(11)) : lerp(t.roe, u(11))),
    roa: r1(loss ? -lerp([1, 15], u(12)) : lerp(t.roe, u(11)) / lerp([1.8, 5], u(12))),
    grossMargin: r1(lerp(t.gross, u(13))),
    operMargin: r1(margin * lerp([1.15, 1.45], u(14))),
    netMargin: r1(margin),
    debtEq: r2(lerp(t.debtEq, u(15))),
    currentRatio: r2(lerp(t.current, u(16))),
    payout: r1(payout),
    insiderOwn: r1(lerp([0.05, 1.5], u(17)) * (u(18) > 0.88 ? 8 : 1)),
    instOwn: r1(lerp(t.inst, u(19))),
    shortFloat,
    recom: r1(lerp([1.4, 2.9], u(20))),
    targetPrice: r2(i.base * (1 + lerp([-0.06, 0.24], u(21)))),
    dividendYield: null,
    source: "demo",
  };
}

/** Combine a base (live or demo) with the current price into display ratios. */
export function withPrice(base: FundamentalBase, i: Instrument, price: number): Fundamentals {
  const pe = base.eps && base.eps > 0 ? price / base.eps : null;
  const fwdPe = base.epsNextY && base.epsNextY > 0 ? price / base.epsNextY : null;
  const g5 = base.epsGrowth5Y ?? base.epsGrowthNextY;
  return {
    ...base,
    pe: pe != null ? r2(pe) : null,
    fwdPe: fwdPe != null ? r2(fwdPe) : null,
    peg: pe != null && g5 && g5 > 0 ? r2(pe / g5) : null,
    ps: base.salesPerShare ? r2(price / base.salesPerShare) : null,
    pb: base.bookPerShare && base.bookPerShare > 0 ? r2(price / base.bookPerShare) : null,
    targetUpside: base.targetPrice ? r1((base.targetPrice / price - 1) * 100) : null,
    dividendYield: base.dividendYield ?? (i.dividendYieldPct ? r2((i.dividendYieldPct * i.base) / price) : 0),
  };
}

export function fundamentalsFor(symbol: string, price: number, live?: Partial<FundamentalBase> | null): Fundamentals | null {
  const i = getInstrument(symbol);
  if (!i) return null;
  const demo = demoBase(i);
  if (!demo) return null;
  if (!live) return withPrice(demo, i, price);
  // A live row carries only what the feed supplied. Fields the free feed doesn't
  // cover stay empty rather than being filled with demo numbers.
  const merged = Object.fromEntries(Object.keys(demo).map((k) => [k, null])) as unknown as FundamentalBase;
  for (const [k, v] of Object.entries(live)) if (v != null) (merged as unknown as Record<string, unknown>)[k] = v;
  merged.source = "live";
  return withPrice(merged, i, price);
}

/** Map Finnhub's basic-financials payload onto our fields. Server-side helper, pure. */
export function fromFinnhubMetrics(m: Record<string, number | null | undefined>, recommendation?: { strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number } | null): Partial<FundamentalBase> {
  const num = (k: string): number | null => (typeof m[k] === "number" && Number.isFinite(m[k] as number) ? (m[k] as number) : null);
  let recom: number | null = null;
  if (recommendation) {
    const sb = recommendation.strongBuy ?? 0;
    const b = recommendation.buy ?? 0;
    const h = recommendation.hold ?? 0;
    const s = recommendation.sell ?? 0;
    const ss = recommendation.strongSell ?? 0;
    const n = sb + b + h + s + ss;
    if (n > 0) recom = r1((sb * 1 + b * 2 + h * 3 + s * 4 + ss * 5) / n);
  }
  const debt = num("totalDebt/totalEquityQuarterly") ?? num("totalDebt/totalEquityAnnual");
  return {
    eps: num("epsTTM") ?? num("epsExclExtraItemsTTM") ?? num("epsBasicExclExtraItemsTTM"),
    salesPerShare: num("revenuePerShareTTM"),
    bookPerShare: num("bookValuePerShareQuarterly") ?? num("bookValuePerShareAnnual"),
    epsGrowthThisY: num("epsGrowthTTMYoy"),
    epsGrowth5Y: num("epsGrowth5Y"),
    salesGrowth: num("revenueGrowthTTMYoy"),
    roe: num("roeTTM"),
    roa: num("roaTTM"),
    grossMargin: num("grossMarginTTM"),
    operMargin: num("operatingMarginTTM"),
    netMargin: num("netProfitMarginTTM"),
    debtEq: debt,
    currentRatio: num("currentRatioQuarterly") ?? num("currentRatioAnnual"),
    payout: num("payoutRatioTTM"),
    dividendYield: num("currentDividendYieldTTM") ?? num("dividendYieldIndicatedAnnual"),
    recom,
  };
}
