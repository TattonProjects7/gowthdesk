// Mapping and message parsing for the real-time feeds. Pure, so it's shared by
// the server relay and the tests.
//
//   • Coinbase Exchange public WebSocket: crypto, no key, 24/7.
//   • Finnhub WebSocket: US share and ETF trades, free key, 50 symbols per key
//     on the free plan. London listings need a paid feed (see GO-LIVE.md).

import { INSTRUMENTS, type Instrument } from "@/lib/instruments";

export interface Tick {
  p: number; // last price, in the instrument's own currency
  t: number; // exchange time, epoch ms
  o?: number; // today's open (crypto: 24 hours ago)
  h?: number;
  l?: number;
  pc?: number; // previous close (crypto: price 24 hours ago)
}

/** Wire format: [price, time, open?, high?, low?, prevClose?]. */
export type WireTick = [number, number, number?, number?, number?, number?];

export const toWire = (k: Tick): WireTick => {
  const w: WireTick = [k.p, k.t];
  if (k.o || k.h || k.l || k.pc) w.push(k.o ?? 0, k.h ?? 0, k.l ?? 0, k.pc ?? 0);
  return w;
};

export const fromWire = (w: WireTick): Tick => {
  const pos = (n?: number) => (typeof n === "number" && n > 0 ? n : undefined);
  return { p: w[0], t: w[1], o: pos(w[2]), h: pos(w[3]), l: pos(w[4]), pc: pos(w[5]) };
};

export type FeedId = "coinbase" | "finnhub";

export const coinbaseProduct = (i: Instrument): string | null => (i.type === "crypto" ? `${i.symbol}-USD` : null);

/** Finnhub's ticker for a US-listed share or ETF; null for anything else. */
export function finnhubStreamSymbol(i: Instrument): string | null {
  if (i.type === "crypto" || i.exchange === "LSE" || !i.finnhub) return null;
  if (i.finnhub.includes(":") || i.finnhub.includes(".")) return null;
  return i.finnhub;
}

export const CRYPTO_PRODUCTS = INSTRUMENTS.map((i) => [coinbaseProduct(i), i.symbol] as const).filter((x): x is readonly [string, string] => !!x[0]);
const BY_PRODUCT = new Map(CRYPTO_PRODUCTS);
const BY_FINNHUB = new Map(INSTRUMENTS.map((i) => [finnhubStreamSymbol(i), i.symbol] as const).filter((x): x is readonly [string, string] => !!x[0]));

export const symbolForFinnhub = (fs: string): string => BY_FINNHUB.get(fs) ?? fs;

const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** A Coinbase `ticker` message → [our symbol, tick]. */
export function parseCoinbase(raw: unknown): [string, Tick] | null {
  const m = raw as { type?: string; product_id?: string; price?: string; open_24h?: string; high_24h?: string; low_24h?: string; time?: string };
  if (!m || m.type !== "ticker" || !m.product_id) return null;
  const sym = BY_PRODUCT.get(m.product_id);
  const p = num(m.price);
  if (!sym || !p) return null;
  const t = m.time ? Date.parse(m.time) : NaN;
  const open = num(m.open_24h);
  return [sym, { p, t: Number.isFinite(t) ? t : Date.now(), o: open, h: num(m.high_24h), l: num(m.low_24h), pc: open }];
}

/** A Finnhub `trade` message → the latest trade per symbol. */
export function parseFinnhub(raw: unknown): [string, Tick][] {
  const m = raw as { type?: string; data?: { s?: string; p?: number; t?: number }[] };
  if (!m || m.type !== "trade" || !Array.isArray(m.data)) return [];
  const last = new Map<string, Tick>();
  for (const d of m.data) {
    const sym = d.s ? BY_FINNHUB.get(d.s) : undefined;
    const p = num(d.p);
    if (!sym || !p) continue;
    const t = typeof d.t === "number" ? d.t : Date.now();
    const prev = last.get(sym);
    if (!prev || t >= prev.t) last.set(sym, { p, t });
  }
  return [...last];
}

/** Rough size, used to choose which shares get the limited streaming slots. */
function sizeOf(i: Instrument): number {
  return (i.sharesM ?? 0) * i.base;
}

const US_STREAMABLE = INSTRUMENTS.filter((i) => finnhubStreamSymbol(i)).sort((a, b) => sizeOf(b) - sizeOf(a));

/**
 * Which shares to stream when the plan caps the number of symbols: whatever
 * people are looking at right now first (most recent first), then the largest
 * companies.
 */
export function chooseStreamed(focus: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (sym: string) => {
    const i = INSTRUMENTS.find((x) => x.symbol === sym);
    const fs = i && finnhubStreamSymbol(i);
    if (!fs || seen.has(fs) || out.length >= limit) return;
    seen.add(fs);
    out.push(fs);
  };
  for (const s of focus) add(s);
  for (const i of US_STREAMABLE) add(i.symbol);
  return out;
}

export const streamableSymbols = (): { crypto: string[]; us: string[] } => ({
  crypto: CRYPTO_PRODUCTS.map(([, s]) => s),
  us: US_STREAMABLE.map((i) => i.symbol),
});
