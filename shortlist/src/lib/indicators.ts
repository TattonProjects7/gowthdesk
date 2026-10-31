// Technical indicators for the chart (IG-style): moving averages, Bollinger
// Bands, RSI and MACD. All pure functions over a closes array (oldest first).
// Outputs are aligned to the input — positions without enough history are null.

export type Series = (number | null)[];

export function sma(values: number[], n: number): Series {
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    if (i >= n - 1) out[i] = sum / n;
  }
  return out;
}

export function ema(values: number[], n: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length < n) return out;
  const k = 2 / (n + 1);
  let prev = values.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = prev;
  for (let i = n; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export interface Bollinger {
  middle: Series;
  upper: Series;
  lower: Series;
}

export function bollinger(values: number[], n = 20, k = 2): Bollinger {
  const middle = sma(values, n);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = n - 1; i < values.length; i++) {
    const win = values.slice(i - n + 1, i + 1);
    const m = middle[i] as number;
    const sd = Math.sqrt(win.reduce((a, v) => a + (v - m) ** 2, 0) / n);
    upper[i] = m + k * sd;
    lower[i] = m - k * sd;
  }
  return { middle, upper, lower };
}

// Wilder's RSI.
export function rsiSeries(values: number[], n = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + Math.max(0, d)) / n;
    loss = (loss * (n - 1) + Math.max(0, -d)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export interface Macd {
  macd: Series;
  signal: Series;
  histogram: Series;
}

export function macd(values: number[], fast = 12, slow = 26, signalN = 9): Macd {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line: Series = values.map((_, i) => (f[i] != null && s[i] != null ? (f[i] as number) - (s[i] as number) : null));
  // Signal = EMA of the MACD line over the stretch where it exists.
  const start = line.findIndex((v) => v != null);
  const signal: Series = new Array(values.length).fill(null);
  const histogram: Series = new Array(values.length).fill(null);
  if (start >= 0) {
    const valid = line.slice(start) as number[];
    const sig = ema(valid, signalN);
    for (let i = 0; i < valid.length; i++) {
      if (sig[i] != null) {
        signal[start + i] = sig[i];
        histogram[start + i] = valid[i] - (sig[i] as number);
      }
    }
  }
  return { macd: line, signal, histogram };
}

// Percentage change between the first and last close in a window.
export function pctChange(values: number[]): number {
  if (values.length < 2 || !values[0]) return 0;
  return (values[values.length - 1] / values[0] - 1) * 100;
}

// Max drawdown in % over the series (how far it fell from a peak).
export function maxDrawdown(values: number[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    if (peak > 0) worst = Math.min(worst, (v / peak - 1) * 100);
  }
  return worst;
}
