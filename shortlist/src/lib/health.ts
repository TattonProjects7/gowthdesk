// Portfolio health check — a 0–100 score with plain-English reasons.
//
// Seven factors, each tied to a lesson so every weakness comes with a way to
// learn about it: diversification, concentration, asset mix, costs, idle
// cash, protection and tax wrappers. Pure and unit-tested; the AI coach
// narrates it, but the numbers never depend on the AI.

import { getInstrument } from "./instruments";
import { allocation, valueHoldings, type PortfolioState, type Pricer } from "./portfolio";
import { computeSignals } from "./signals";

export type FactorStatus = "good" | "ok" | "bad";

export interface Factor {
  id: "diversification" | "concentration" | "mix" | "costs" | "cash" | "protection" | "wrappers";
  label: string;
  points: number;
  max: number;
  status: FactorStatus;
  detail: string;
  tip: string;
  lesson?: string;
}

export interface Health {
  score: number | null; // null when there's nothing invested yet
  grade: string;
  summary: string;
  factors: Factor[];
}

function status(points: number, max: number): FactorStatus {
  const r = points / max;
  return r >= 0.8 ? "good" : r >= 0.45 ? "ok" : "bad";
}

function grade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 72) return "B";
  if (score >= 58) return "C";
  if (score >= 45) return "D";
  return "E";
}

export function healthCheck(s: PortfolioState, p: Pricer, closesFor?: (symbol: string) => number[]): Health {
  const views = valueHoldings(s, p);
  const invested = views.reduce((a, v) => a + v.valueGbp, 0);
  const cash = s.accounts.reduce((a, x) => a + x.cash, 0);
  const total = invested + cash;
  if (invested <= 0) {
    return { score: null, grade: "–", summary: "Invest in something to get your first health score.", factors: [] };
  }

  const factors: Factor[] = [];

  // 1. Diversification — effective number of underlying companies (look-through).
  const look = allocation(s, p, "lookthrough", false);
  let hhi = 0;
  for (const sl of look) {
    const w = sl.pct / 100;
    // "Other holdings in X" is hundreds of small positions — treat as 50 equal slices.
    if (sl.name.startsWith("Other holdings in")) hhi += 50 * (w / 50) ** 2;
    else hhi += w * w;
  }
  const effectiveN = hhi > 0 ? 1 / hhi : 0;
  const divPts = Math.round(Math.min(25, (Math.min(effectiveN, 20) / 20) * 25));
  factors.push({
    id: "diversification",
    label: "Diversification",
    points: divPts,
    max: 25,
    status: status(divPts, 25),
    detail: `Spread across the equivalent of ${effectiveN >= 20 ? "20+" : effectiveN.toFixed(1)} equally weighted companies.`,
    tip: effectiveN >= 20 ? "Nicely spread — a global tracker does a lot of the work." : "A global or S&P 500 ETF instantly spreads you across hundreds of companies.",
    lesson: "risk-and-return",
  });

  // 2. Concentration — the biggest single underlying company.
  const top = look.filter((x) => !x.name.startsWith("Other holdings in"))[0];
  const topPct = top?.pct ?? 0;
  const conPts = topPct <= 10 ? 20 : topPct <= 20 ? 14 : topPct <= 35 ? 8 : topPct <= 60 ? 3 : 0;
  factors.push({
    id: "concentration",
    label: "Concentration",
    points: conPts,
    max: 20,
    status: status(conPts, 20),
    detail: top ? `Largest single exposure: ${top.name} at ${topPct.toFixed(1)}% of what you've invested${top.via.length > 1 ? `, held via ${top.via.join(" + ")}` : ""}.` : "No single company dominates.",
    tip: topPct > 20 ? `If ${top?.name} fell 30%, your invested money would drop about ${(topPct * 0.3).toFixed(0)}%. Consider trimming or adding broader funds.` : "No single company can sink you.",
    lesson: "look-through",
  });

  // 3. Asset mix — shares, bonds, gold, crypto.
  const assets = allocation(s, p, "asset", false);
  const crypto = assets.find((a) => a.name === "Crypto")?.pct ?? 0;
  const classes = assets.filter((a) => a.pct >= 5).length;
  let mixPts = classes >= 3 ? 15 : classes === 2 ? 12 : 8;
  if (crypto > 50) mixPts = 2;
  else if (crypto > 25) mixPts = Math.min(mixPts, 6);
  factors.push({
    id: "mix",
    label: "Asset mix",
    points: mixPts,
    max: 15,
    status: status(mixPts, 15),
    detail: assets.map((a) => `${a.name} ${a.pct.toFixed(0)}%`).join(" · "),
    tip: crypto > 25 ? "Crypto is very volatile. Many investors keep it to a small slice." : classes < 2 ? "Bonds or gold can cushion falls when shares drop." : "A sensible spread across asset types.",
    lesson: "risk-and-return",
  });

  // 4. Costs — weighted fund charges and FX exposure.
  let ocf = 0;
  let usd = 0;
  for (const v of views) {
    const w = v.valueGbp / invested;
    ocf += (v.instrument.ocfPct ?? 0) * w;
    if (v.instrument.currency === "USD") usd += w;
  }
  const costPts = Math.round(Math.max(0, 15 - Math.max(0, ocf - 0.1) * 30 - usd * 4));
  factors.push({
    id: "costs",
    label: "Costs",
    points: costPts,
    max: 15,
    status: status(costPts, 15),
    detail: `Average fund charge ${ocf.toFixed(2)}% a year; ${(usd * 100).toFixed(0)}% held in dollars (FX fee on each trade).`,
    tip: ocf > 0.25 ? "Cheaper trackers can save thousands over decades." : usd > 0.5 ? "Sterling-listed ETFs avoid FX fees on US exposure." : "Costs look lean.",
    lesson: "fees-matter",
  });

  // 5. Idle cash.
  const cashPct = total > 0 ? (cash / total) * 100 : 0;
  const cashPts = cashPct <= 15 ? 10 : cashPct <= 30 ? 7 : cashPct <= 50 ? 4 : 1;
  factors.push({
    id: "cash",
    label: "Cash drag",
    points: cashPts,
    max: 10,
    status: status(cashPts, 10),
    detail: `${cashPct.toFixed(0)}% of your portfolio is uninvested cash.`,
    tip: cashPct > 30 ? "Turn on AutoInvest or a savings plan so spare cash goes to work." : "A small cash buffer is healthy.",
    lesson: "compounding",
  });

  // 6. Protection on volatile positions.
  const volatile = views.filter((v) => {
    const c = closesFor?.(v.symbol);
    const vol = c && c.length > 15 ? computeSignals(c).volatility : (getInstrument(v.symbol)?.vol ?? 0);
    return vol >= 0.03;
  });
  const protectedN = volatile.filter((v) => v.stopLoss != null || v.trailingPct != null).length;
  const protPts = volatile.length === 0 ? 10 : Math.round((protectedN / volatile.length) * 10);
  factors.push({
    id: "protection",
    label: "Protection",
    points: protPts,
    max: 10,
    status: status(protPts, 10),
    detail: volatile.length ? `${protectedN} of ${volatile.length} high-volatility holding${volatile.length > 1 ? "s have" : " has"} a stop-loss or trailing stop.` : "No high-volatility holdings that need a stop.",
    tip: volatile.length > protectedN ? `Consider a trailing stop on ${volatile.filter((v) => v.stopLoss == null && v.trailingPct == null).map((v) => v.symbol).slice(0, 3).join(", ")}.` : "Risk is managed.",
    lesson: "position-sizing",
  });

  // 7. Tax wrappers.
  const isa = s.accounts.find((a) => a.type === "ISA");
  const inWrapper = views.filter((v) => s.accounts.find((a) => a.id === v.accountId)?.type !== "GIA").reduce((a, v) => a + v.valueGbp, 0);
  const wrapPts = inWrapper > 0 ? 5 : isa ? 3 : 1;
  factors.push({
    id: "wrappers",
    label: "Tax wrappers",
    points: wrapPts,
    max: 5,
    status: status(wrapPts, 5),
    detail: inWrapper > 0 ? `${((inWrapper / invested) * 100).toFixed(0)}% of investments sit in an ISA or SIPP.` : "Everything is in the taxable general account.",
    tip: inWrapper > 0 ? "You're using your tax shields." : "An ISA shelters up to £20,000 a year from UK tax.",
    lesson: "isas",
  });

  const score = factors.reduce((a, f) => a + f.points, 0);
  const worst = [...factors].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const summary =
    score >= 85
      ? "Excellent — diversified, low-cost and protected."
      : score >= 70
        ? `In good shape. Biggest win available: ${worst.label.toLowerCase()}.`
        : score >= 50
          ? `Room to improve, starting with ${worst.label.toLowerCase()}.`
          : `High risk. Focus on ${worst.label.toLowerCase()} first.`;
  return { score, grade: grade(score), summary, factors };
}
