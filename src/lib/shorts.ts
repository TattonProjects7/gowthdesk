// The engine that makes Shortlist unique: rank the market for short setups, then
// structure each one with *defined, asymmetric* risk — lose small if wrong, win
// big if right. The structuring is the point: a fixed small risk budget buys a
// position whose downside is capped and whose upside is a multiple of it.

import { UNIVERSE, round2 } from "./market";
import { computeSignals, Signals } from "./signals";

// Fixed money at risk per idea. Because the stop defines max loss, every trade
// risks exactly this — small and capped — while the target is a multiple of it.
export const RISK_BUDGET = 250;

export interface Reason {
  label: string;
  detail: string;
  weight: number; // contribution to the short score
}

export interface ShortStructure {
  entry: number;
  stop: number; // invalidation above entry — caps the loss
  target: number; // far below entry — the big win
  shares: number; // sized so (stop-entry)*shares ≈ RISK_BUDGET
  maxLoss: number; // ≈ RISK_BUDGET, the "lose small"
  maxGain: number; // the "win big"
  rewardRisk: number; // maxGain / maxLoss
  stopPct: number; // how far the stop sits above entry
  targetPct: number; // how far the target sits below entry
}

export interface ShortCandidate {
  symbol: string;
  name: string;
  signals: Signals;
  score: number; // 0–100 conviction this is a good short
  grade: string;
  reasons: Reason[];
  structure: ShortStructure;
  headline: string;
}

// Score how attractive a SHORT is. Higher = better short setup.
function scoreShort(s: Signals): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let score = 35;

  // 1. Overextension — stretched far above its own mean is the classic short fuel.
  if (s.zscore >= 1.5) {
    const w = Math.min(22, 8 + (s.zscore - 1.5) * 14);
    score += w;
    reasons.push({ label: "Overextended", detail: `Trading ${s.zscore.toFixed(1)}σ above its 20-day mean — stretched.`, weight: w });
  } else if (s.zscore <= -1) {
    score -= 14;
    reasons.push({ label: "Already washed out", detail: `${s.zscore.toFixed(1)}σ below mean — late to short.`, weight: -14 });
  }

  // 2. Overbought RSI — buyers exhausted.
  if (s.rsi >= 68) {
    const w = Math.min(18, 6 + (s.rsi - 68) * 0.6);
    score += w;
    reasons.push({ label: "Overbought", detail: `RSI ${Math.round(s.rsi)} — momentum buyers are exhausted.`, weight: round2(w) });
  } else if (s.rsi <= 35) {
    score -= 12;
    reasons.push({ label: "Oversold", detail: `RSI ${Math.round(s.rsi)} — risk of a bounce against you.`, weight: -12 });
  }

  // 3. Momentum rolling over — still elevated but the last few days are turning.
  if (s.accel5 < 0 && s.zscore > 0.5) {
    const w = Math.min(16, 6 + Math.abs(s.accel5) * 1.2);
    score += w;
    reasons.push({ label: "Rolling over", detail: `Down ${Math.abs(s.accel5).toFixed(1)}% over 5 days off a high — the turn is starting.`, weight: round2(w) });
  }

  // 4. Trend break — short MA below long MA confirms a downtrend.
  if (s.belowShortMa) {
    score += 10;
    reasons.push({ label: "Trend broken", detail: "10-day average has crossed below the 30-day — downtrend confirmed.", weight: 10 });
  } else {
    score -= 6;
  }

  // 5. Volatility = convexity. High vol means the big win is actually reachable.
  if (s.volatility >= 0.03) {
    const w = Math.min(12, 4 + (s.volatility - 0.03) * 200);
    score += w;
    reasons.push({ label: "High volatility", detail: `${(s.volatility * 100).toFixed(1)}% daily swings — a real move down is in range.`, weight: round2(w) });
  }

  return { score: Math.max(3, Math.min(98, Math.round(score))), reasons };
}

// Build the defined-risk, asymmetric short around the live price.
function structure(s: Signals): ShortStructure {
  const entry = s.price;

  // Stop sits a touch above entry — tight, so the loss stays SMALL. Scaled by
  // volatility so we don't get noise-stopped, but capped so risk stays modest.
  const stopPct = Math.min(0.06, Math.max(0.025, s.volatility * 1.4));
  const stop = round2(entry * (1 + stopPct));

  // Target is a measured move DOWN, bigger when the setup is more stretched and
  // more volatile — this is where "win big" comes from.
  const targetPct = Math.min(0.32, Math.max(0.08, s.volatility * 4 + Math.max(0, s.zscore) * 0.03));
  const target = round2(entry * (1 - targetPct));

  const riskPerShare = stop - entry;
  const shares = Math.max(1, Math.floor(RISK_BUDGET / riskPerShare));
  const maxLoss = round2(riskPerShare * shares);
  const maxGain = round2((entry - target) * shares);
  const rewardRisk = round2(maxGain / maxLoss);

  return { entry, stop, target, shares, maxLoss, maxGain, rewardRisk, stopPct, targetPct };
}

function gradeFor(score: number): string {
  if (score >= 85) return "A";
  if (score >= 75) return "A−";
  if (score >= 66) return "B+";
  if (score >= 57) return "B";
  if (score >= 48) return "C+";
  if (score >= 38) return "C";
  return "D";
}

function headlineFor(c: { symbol: string; structure: ShortStructure; reasons: Reason[] }): string {
  const top = c.reasons.filter((r) => r.weight > 0).sort((a, b) => b.weight - a.weight)[0];
  const lead = top ? top.label.toLowerCase() : "setup";
  return `Risk £${c.structure.maxLoss} to make £${c.structure.maxGain.toLocaleString()} — ${c.symbol} is ${lead}.`;
}

export function candidateFor(symbol: string, now: number): ShortCandidate {
  const meta = UNIVERSE.find((t) => t.symbol === symbol)!;
  const signals = computeSignals(symbol, now);
  const { score, reasons } = scoreShort(signals);
  const struct = structure(signals);
  return {
    symbol,
    name: meta.name,
    signals,
    score,
    grade: gradeFor(score),
    reasons,
    structure: struct,
    headline: headlineFor({ symbol, structure: struct, reasons }),
  };
}

// The scanner: every symbol scored and ranked best-short-first.
export function scanMarket(now: number): ShortCandidate[] {
  return UNIVERSE.map((t) => candidateFor(t.symbol, now)).sort((a, b) => b.score - a.score);
}
