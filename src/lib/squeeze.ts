// Short-Squeeze Risk Radar — the standout feature.
//
// The biggest way a short blows up is a squeeze: a crowded short position where
// any rally forces shorts to cover, fuelling the rally (GME/AMC). Most retail
// screeners surface "most shorted" stocks as *opportunities*. We invert that:
// a crowded short is a DANGER, and we warn the trader to size down or stand
// aside. The inputs are the institutional ones — short interest as a % of
// float, days-to-cover, and borrow-fee rate.

export interface SqueezeMetrics {
  shortInterestPctFloat: number; // % of float sold short
  daysToCover: number; // short interest / avg daily volume
  borrowFeePct: number; // annualised cost to borrow
  floatM: number; // free float, millions of shares
}

export interface Squeeze extends SqueezeMetrics {
  score: number; // 0–100 squeeze risk
  level: "low" | "moderate" | "high" | "extreme";
  hardToBorrow: boolean;
  verdict: string; // plain-English guidance for the short seller
}

// Realistic baseline short-interest profile per symbol. In production these come
// from a short-interest feed (FINRA bi-monthly, or ORTEX/Fintel intraday); here
// they are fixed, sensible values so the radar is meaningful offline.
const BASELINE: Record<string, SqueezeMetrics> = {
  AAPL: { shortInterestPctFloat: 0.7, daysToCover: 1.1, borrowFeePct: 0.3, floatM: 15200 },
  MSFT: { shortInterestPctFloat: 0.6, daysToCover: 1.0, borrowFeePct: 0.3, floatM: 7400 },
  GOOGL: { shortInterestPctFloat: 0.9, daysToCover: 1.3, borrowFeePct: 0.4, floatM: 12100 },
  AMZN: { shortInterestPctFloat: 1.1, daysToCover: 1.6, borrowFeePct: 0.4, floatM: 9500 },
  META: { shortInterestPctFloat: 1.4, daysToCover: 1.8, borrowFeePct: 0.5, floatM: 2200 },
  NVDA: { shortInterestPctFloat: 1.3, daysToCover: 1.2, borrowFeePct: 0.6, floatM: 24000 },
  AMD: { shortInterestPctFloat: 3.2, daysToCover: 2.4, borrowFeePct: 1.1, floatM: 1600 },
  TSLA: { shortInterestPctFloat: 3.0, daysToCover: 1.9, borrowFeePct: 1.6, floatM: 2800 },
  DIS: { shortInterestPctFloat: 2.1, daysToCover: 2.7, borrowFeePct: 0.8, floatM: 1800 },
  SHOP: { shortInterestPctFloat: 4.6, daysToCover: 3.4, borrowFeePct: 2.2, floatM: 1200 },
  COIN: { shortInterestPctFloat: 11.5, daysToCover: 4.8, borrowFeePct: 8.5, floatM: 210 },
  PLTR: { shortInterestPctFloat: 7.8, daysToCover: 3.9, borrowFeePct: 4.0, floatM: 2100 },
};

const FALLBACK: SqueezeMetrics = { shortInterestPctFloat: 3, daysToCover: 2.5, borrowFeePct: 1.5, floatM: 1000 };

// Score squeeze RISK 0–100 from the three institutional inputs, using the
// thresholds the desks use (SI%float >20 extreme; DTC 7–10 extreme; high fee).
export function squeezeFor(symbol: string, override?: Partial<SqueezeMetrics>): Squeeze {
  const m = { ...(BASELINE[symbol] ?? FALLBACK), ...override };

  // Short interest as % of float (the crowding).
  const siPts = clamp((m.shortInterestPctFloat / 25) * 45, 0, 45);
  // Days to cover (the trapped-ness — how long shorts need to escape).
  const dtcPts = clamp((m.daysToCover / 8) * 35, 0, 35);
  // Borrow fee (spikes precede squeezes; also a direct cost drag).
  const feePts = clamp((m.borrowFeePct / 15) * 20, 0, 20);

  const score = Math.round(clamp(siPts + dtcPts + feePts, 0, 100));
  const level: Squeeze["level"] = score >= 70 ? "extreme" : score >= 45 ? "high" : score >= 22 ? "moderate" : "low";
  const hardToBorrow = m.borrowFeePct >= 5 || m.shortInterestPctFloat >= 10;

  return { ...m, score, level, hardToBorrow, verdict: verdictFor(level, m) };
}

function verdictFor(level: Squeeze["level"], m: SqueezeMetrics): string {
  switch (level) {
    case "extreme":
      return `Crowded short — ${m.shortInterestPctFloat.toFixed(1)}% of float is already short and it costs ${m.borrowFeePct.toFixed(
        1,
      )}%/yr to borrow. One rally could force a violent squeeze. Stand aside or use a defined-risk put.`;
    case "high":
      return `Getting crowded (${m.shortInterestPctFloat.toFixed(1)}% of float, ${m.daysToCover.toFixed(
        1,
      )} days to cover). Real squeeze risk — size down and keep the stop tight.`;
    case "moderate":
      return `Moderately shorted. Squeeze risk is manageable but watch borrow-fee spikes.`;
    default:
      return `Lightly shorted (${m.shortInterestPctFloat.toFixed(
        1,
      )}% of float) — little crowding, so the short has room and low squeeze risk. The good kind of short.`;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function squeezeTone(level: Squeeze["level"]): { text: string; bg: string; border: string } {
  switch (level) {
    case "extreme":
      return { text: "text-rose-300", bg: "bg-rose-950", border: "border-rose-800" };
    case "high":
      return { text: "text-orange-300", bg: "bg-orange-950", border: "border-orange-800" };
    case "moderate":
      return { text: "text-amber-300", bg: "bg-amber-950", border: "border-amber-800" };
    default:
      return { text: "text-emerald-300", bg: "bg-emerald-950", border: "border-emerald-800" };
  }
}
