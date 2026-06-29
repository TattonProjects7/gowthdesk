// Defined-risk put alternative.
//
// Shorting shares has uncapped loss and can be squeezed or margin-called. Buying
// a put expresses the same bearish view with risk capped NATIVELY at the premium
// paid — you can never lose more than you put in, and no squeeze can force you
// out. We price a representative put with Black–Scholes off the same volatility
// the scanner already computed, so the alternative needs no options-chain feed.

export interface PutPlay {
  strike: number;
  expiryDays: number;
  ivPct: number; // annualised implied vol used
  premium: number; // per share
  contracts: number; // sized to a similar risk budget
  maxLoss: number; // premium × 100 × contracts — capped, the whole point
  breakeven: number; // strike − premium
  payoffAtTarget: number; // net profit if spot reaches the short's target by expiry
}

function normCdf(x: number): number {
  // Abramowitz–Stegun approximation of the standard normal CDF.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function blackScholesPut(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, K - S);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

// Pick a sensible standard strike increment for a given price.
function strikeStep(price: number): number {
  if (price >= 200) return 5;
  if (price >= 50) return 2.5;
  if (price >= 20) return 1;
  return 0.5;
}

// Build a representative put play from the short setup.
export function putPlayFor(input: {
  price: number;
  target: number;
  dailyVol: number;
  riskBudget: number;
}): PutPlay {
  const { price, target, dailyVol, riskBudget } = input;
  const expiryDays = 45;
  const T = expiryDays / 365;
  const r = 0.04;
  const iv = Math.max(0.2, dailyVol * Math.sqrt(252)); // annualise daily vol, floor at 20%

  // At-the-money put, rounded to a standard strike.
  const step = strikeStep(price);
  const strike = Math.round(price / step) * step;

  const premium = round2(blackScholesPut(price, strike, T, r, iv));
  const perContractCost = premium * 100;
  const contracts = Math.max(1, Math.round(riskBudget / perContractCost));
  const maxLoss = round2(perContractCost * contracts);
  const breakeven = round2(strike - premium);

  // Value of the put if spot is at the short's target at expiry (intrinsic only).
  const intrinsicAtTarget = Math.max(0, strike - target);
  const payoffAtTarget = round2((intrinsicAtTarget - premium) * 100 * contracts);

  return { strike, expiryDays, ivPct: round2(iv * 100), premium, contracts, maxLoss, breakeven, payoffAtTarget };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
