// Derive the technical signals that make a stock a *short* candidate. The core
// fn now works from an array of daily closes, so it is data-source agnostic:
// feed it the simulator's samples OR real candles from a market-data provider.

import { priceAt } from "./market";

const DAY = 86400_000;

export interface Signals {
  price: number;
  ma10: number;
  ma30: number;
  trend30: number; // % change over 30d
  accel5: number; // % change over last 5d (momentum rolling over?)
  zscore: number; // how stretched above its mean (overextension)
  rsi: number; // 0–100 overbought/oversold
  volatility: number; // daily-return stdev (convexity / payoff potential)
  belowShortMa: boolean; // ma10 < ma30 → downtrend confirmed
}

// Simulated daily closes ending "now" (chronological, oldest first). Used as the
// zero-config fallback when no live market-data key is configured.
export function simCloses(symbol: string, now: number, n = 31): number[] {
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(priceAt(symbol, now - i * DAY));
  return out;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function std(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function computeSignals(closes: number[]): Signals {
  // Be defensive: providers may return short series. Pad from the front.
  const c = closes.length >= 31 ? closes : [...Array(31 - closes.length).fill(closes[0] ?? 0), ...closes];
  const price = c[c.length - 1];
  const last10 = c.slice(-10);
  const last30 = c.slice(-30);
  const last20 = c.slice(-20);

  const ma10 = mean(last10);
  const ma30 = mean(last30);
  const trend30 = c[c.length - 30] ? (price / c[c.length - 30] - 1) * 100 : 0;
  const accel5 = c[c.length - 6] ? (price / c[c.length - 6] - 1) * 100 : 0;

  const sd20 = std(last20) || 1;
  const zscore = (price - mean(last20)) / sd20;

  const rets: number[] = [];
  for (let i = 1; i < c.length; i++) if (c[i - 1]) rets.push((c[i] - c[i - 1]) / c[i - 1]);
  const volatility = rets.length ? std(rets.slice(-14)) : 0;

  const window = rets.slice(-14);
  const gains = window.filter((r) => r > 0);
  const lossesArr = window.filter((r) => r < 0).map((r) => -r);
  const avgGain = gains.length ? mean(gains) : 0;
  const avgLoss = lossesArr.length ? mean(lossesArr) : 0;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = avgLoss === 0 && avgGain === 0 ? 50 : 100 - 100 / (1 + rs);

  return { price, ma10, ma30, trend30, accel5, zscore, rsi, volatility, belowShortMa: ma10 < ma30 };
}
