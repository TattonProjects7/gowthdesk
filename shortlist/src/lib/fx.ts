// Currency conversion into the app's base currency (GBP).
//
// UK brokers quote LSE shares in pence (GBX) and charge an FX fee on non-GBP
// dealing (IG: 0.5–0.7%, ii: 1.5% on small trades, InvestEngine: none on GBP
// ETFs). We model a flat, transparent fee so the paper account behaves like the
// real thing. GBP/USD is simulated deterministically alongside prices.

import type { Currency } from "./instruments";

export const FX_FEE_PCT = 0.5; // charged on non-GBP buys and sells

// GBP/USD: ~1.27 with a gentle deterministic wander (±2%).
export function gbpUsd(tMs: number): number {
  const d = tMs / 86400_000;
  return Math.round((1.27 + Math.sin(d / 19) * 0.018 + Math.sin(d / 3.3) * 0.006) * 10000) / 10000;
}

// Convert a native price to GBP per unit.
export function toGbp(price: number, currency: Currency, tMs: number): number {
  switch (currency) {
    case "GBP":
      return price;
    case "GBX":
      return price / 100;
    case "USD":
      return price / gbpUsd(tMs);
  }
}

export function fxFeeFor(currency: Currency): number {
  return currency === "GBP" || currency === "GBX" ? 0 : FX_FEE_PCT / 100;
}
