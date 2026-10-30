// Real daily candles from free sources (server only). See /api/candles.
import type { Instrument } from "@/lib/instruments";
import type { Bar } from "@/lib/bars";
import { coinbaseProduct, finnhubStreamSymbol } from "./feeds";

const DAY = 86400_000;

export type CandleSource = "coinbase" | "twelvedata" | "none";

// Twelve Data's free plan allows 8 calls a minute; stay just under it.
const TD_PER_MIN = Number(process.env.TWELVEDATA_PER_MINUTE) || 7;
const tdCalls: number[] = [];
function tdAllowed(): boolean {
  const now = Date.now();
  while (tdCalls.length && now - tdCalls[0] > 60_000) tdCalls.shift();
  if (tdCalls.length >= TD_PER_MIN) return false;
  tdCalls.push(now);
  return true;
}

async function get(url: string, ms = 6000): Promise<unknown | null> {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, cache: "no-store", headers: { "User-Agent": "Shortlist/1.0", Accept: "application/json" } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(id);
  }
}

const clean = (bars: Bar[]) => bars.filter((b) => [b.o, b.h, b.l, b.c].every((x) => Number.isFinite(x) && x > 0)).sort((a, b) => a.t - b.t);

export async function coinbaseCandles(product: string): Promise<Bar[] | null> {
  const base = process.env.COINBASE_REST_URL || "https://api.exchange.coinbase.com";
  const j = await get(`${base}/products/${encodeURIComponent(product)}/candles?granularity=86400`);
  if (!Array.isArray(j)) return null;
  // [time (s), low, high, open, close, volume], newest first.
  const bars = clean(
    (j as unknown[]).filter(Array.isArray).map((r) => {
      const [t, l, h, o, c, v] = (r as number[]).map(Number);
      return { t: Math.floor((t * 1000) / DAY) * DAY, o, h, l, c, v: Math.round(v || 0) };
    }),
  );
  return bars.length >= 20 ? bars : null;
}

export async function twelveDataCandles(symbol: string, key: string): Promise<Bar[] | null> {
  const base = process.env.TWELVEDATA_URL || "https://api.twelvedata.com";
  const j = (await get(`${base}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=400&apikey=${encodeURIComponent(key)}`)) as {
    status?: string;
    values?: { datetime?: string; open?: string; high?: string; low?: string; close?: string; volume?: string }[];
  } | null;
  // Twelve Data reports errors (including rate limits) inside a 200 response.
  if (!j || j.status !== "ok" || !Array.isArray(j.values)) return null;
  const bars = clean(
    j.values.map((v) => {
      const [y, m, d] = (v.datetime ?? "").slice(0, 10).split("-").map(Number);
      return { t: Date.UTC(y, (m || 1) - 1, d || 1), o: Number(v.open), h: Number(v.high), l: Number(v.low), c: Number(v.close), v: Math.round(Number(v.volume) || 0) };
    }),
  );
  return bars.length >= 20 ? bars : null;
}

export async function loadCandles(i: Instrument): Promise<{ source: CandleSource; bars: Bar[]; throttled?: boolean }> {
  const product = coinbaseProduct(i);
  if (product) {
    const bars = await coinbaseCandles(product);
    return bars ? { source: "coinbase", bars } : { source: "none", bars: [] };
  }
  const key = process.env.TWELVEDATA_API_KEY;
  const us = finnhubStreamSymbol(i);
  if (key && us) {
    if (!tdAllowed()) return { source: "none", bars: [], throttled: true };
    const bars = await twelveDataCandles(us, key);
    return bars ? { source: "twelvedata", bars } : { source: "none", bars: [] };
  }
  return { source: "none", bars: [] };
}

