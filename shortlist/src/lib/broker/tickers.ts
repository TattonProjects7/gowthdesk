import { getInstrument } from "@/lib/instruments";
import type { PlaceRealOrder } from "./types";

// Mapping between Shortlist symbols and Trading 212 tickers.
// Trading 212 uses e.g. "AAPL_US_EQ" for US shares and "VUSAl_EQ" for London
// listings (a lowercase exchange letter before "_EQ"). Crypto isn't available
// through the Trading 212 Invest / ISA API.

export interface T212InstrumentMeta {
  ticker: string;
  shortName?: string;
  shortname?: string;
  currencyCode?: string;
  type?: string;
  isin?: string;
  name?: string;
}

/** Whether a Shortlist instrument can be traded for real through Trading 212. */
export function realTradable(symbol: string): boolean {
  const i = getInstrument(symbol);
  return Boolean(i && i.type !== "crypto");
}

export function guessT212Ticker(symbol: string): string | null {
  const i = getInstrument(symbol);
  if (!i || i.type === "crypto") return null;
  return i.exchange === "LSE" ? `${i.symbol}l_EQ` : `${i.symbol}_US_EQ`;
}

/** Prefer the broker's own instrument list; fall back to the naming pattern. */
export function resolveT212Ticker(symbol: string, meta?: T212InstrumentMeta[] | null): string | null {
  const i = getInstrument(symbol);
  if (!i || i.type === "crypto") return null;
  const guess = guessT212Ticker(symbol);
  if (meta && meta.length) {
    const want = i.exchange === "LSE" ? ["GBX", "GBP"] : ["USD"];
    const exact = meta.find((m) => m.ticker === guess);
    if (exact) return exact.ticker;
    const byName = meta.find((m) => (m.shortName ?? m.shortname ?? "").toUpperCase() === i.symbol && want.includes((m.currencyCode ?? "").toUpperCase()));
    if (byName) return byName.ticker;
  }
  return guess;
}

/** The Shortlist symbol for a Trading 212 ticker, or null if we don't list it. */
export function symbolFromT212(ticker: string): string | null {
  let base = ticker;
  if (base.endsWith("_US_EQ")) base = base.slice(0, -6);
  else if (/[a-z]_EQ$/.test(base)) base = base.slice(0, -4);
  else if (base.endsWith("_EQ")) base = base.slice(0, -3);
  const sym = base.toUpperCase();
  return getInstrument(sym) ? sym : null;
}

/** Validate an order request before it goes anywhere near a broker. */
export function validateRealOrder(o: Partial<PlaceRealOrder>): { ok: true; order: PlaceRealOrder } | { ok: false; error: string } {
  if (!o || typeof o.symbol !== "string" || !getInstrument(o.symbol)) return { ok: false, error: "Unknown instrument." };
  if (!realTradable(o.symbol)) return { ok: false, error: `${o.symbol} can't be traded through Trading 212.` };
  if (o.side !== "buy" && o.side !== "sell") return { ok: false, error: "Choose buy or sell." };
  if (o.type !== "market" && o.type !== "limit" && o.type !== "stop") return { ok: false, error: "Choose market, limit or stop." };
  const q = Number(o.quantity);
  if (!Number.isFinite(q) || q <= 0) return { ok: false, error: "Enter a quantity above zero." };
  if (q > 1_000_000) return { ok: false, error: "That quantity is too large." };
  const quantity = Math.round(q * 1e6) / 1e6;
  const order: PlaceRealOrder = { symbol: o.symbol, side: o.side, type: o.type, quantity };
  if (o.type === "limit") {
    const lp = Number(o.limitPrice);
    if (!Number.isFinite(lp) || lp <= 0) return { ok: false, error: "Enter a limit price above zero." };
    order.limitPrice = lp;
  }
  if (o.type === "stop") {
    const sp = Number(o.stopPrice);
    if (!Number.isFinite(sp) || sp <= 0) return { ok: false, error: "Enter a stop price above zero." };
    order.stopPrice = sp;
  }
  if (o.type !== "market") order.timeValidity = o.timeValidity === "GOOD_TILL_CANCEL" ? "GOOD_TILL_CANCEL" : "DAY";
  return { ok: true, order };
}
