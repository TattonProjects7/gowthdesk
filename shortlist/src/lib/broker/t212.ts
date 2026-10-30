// Server-side Trading 212 Public API client (Invest and Stocks ISA accounts).
// Demo (practice money) and live (real money) are separate servers, and each
// API key belongs to one of them. Never import this from client components.

import { resolveT212Ticker, symbolFromT212, type T212InstrumentMeta } from "./tickers";
import type { BrokerAccount, BrokerCash, BrokerEnv, BrokerOrder, BrokerPosition, PlaceRealOrder } from "./types";

export interface T212Creds {
  env: BrokerEnv;
  key: string;
  secret?: string;
}

export class BrokerError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function t212Base(env: BrokerEnv): string {
  const override = process.env.T212_API_BASE?.replace(/\/$/, "");
  if (override) return override;
  return env === "live" ? "https://live.trading212.com" : "https://demo.trading212.com";
}

/** Newer keys come as an ID + secret pair (HTTP Basic); older keys are sent as-is. */
export function authHeader(c: T212Creds): string {
  if (c.secret) return `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString("base64")}`;
  return c.key;
}

async function call<T>(c: T212Creds, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${t212Base(c.env)}${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: authHeader(c), Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch {
    throw new BrokerError(502, "Couldn't reach Trading 212. Try again in a moment.");
  }
  if (res.status === 401 || res.status === 403) {
    throw new BrokerError(401, "Trading 212 didn't accept this API key. Check it's correct, active, and allows account data and orders.");
  }
  if (res.status === 429) throw new BrokerError(429, "Trading 212 is limiting requests. Wait a few seconds and try again.");
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const j = (json ?? {}) as { message?: string; code?: string; clarification?: string };
    const raw = j.message || j.clarification || j.code || `Trading 212 returned ${res.status}`;
    throw new BrokerError(res.status >= 500 ? 502 : 400, humanise(raw));
  }
  return json as T;
}

function humanise(code: string): string {
  const known: Record<string, string> = {
    InsufficientFreeForStocksBuy: "Not enough free cash in your Trading 212 account for this buy.",
    InsufficientValueForStocksSell: "You don't hold enough of this to sell that quantity.",
    SellingEquityNotOwned: "You don't hold this in your Trading 212 account.",
    MarketClosed: "The market is closed. Use a limit order, or try again when it opens.",
    InstrumentNotFound: "Trading 212 doesn't offer this instrument.",
    MinValueExceeded: "That order is below Trading 212's minimum size.",
    QuantityPrecisionMismatch: "Trading 212 doesn't allow that many decimal places for this instrument.",
  };
  return known[code] ?? code.replace(/([a-z])([A-Z])/g, "$1 $2");
}

// ------------------------------------------------------------------ reads

export async function getInfo(c: T212Creds): Promise<{ id: number; currencyCode: string }> {
  return call(c, "/api/v0/equity/account/info");
}

export async function getCash(c: T212Creds): Promise<BrokerCash> {
  const j = await call<Partial<BrokerCash>>(c, "/api/v0/equity/account/cash");
  return { free: n(j.free), total: n(j.total), invested: n(j.invested), ppl: n(j.ppl), result: n(j.result), blocked: j.blocked == null ? null : n(j.blocked), pieCash: n(j.pieCash) };
}

interface RawPosition {
  ticker: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  ppl: number;
  fxPpl?: number | null;
  maxSell?: number;
  initialFillDate?: string;
}

export async function getPositions(c: T212Creds): Promise<BrokerPosition[]> {
  const j = await call<RawPosition[]>(c, "/api/v0/equity/portfolio");
  return (Array.isArray(j) ? j : []).map((p) => ({
    ticker: p.ticker,
    symbol: symbolFromT212(p.ticker),
    quantity: n(p.quantity),
    averagePrice: n(p.averagePrice),
    currentPrice: n(p.currentPrice),
    ppl: n(p.ppl),
    fxPpl: p.fxPpl == null ? null : n(p.fxPpl),
    maxSell: p.maxSell == null ? null : n(p.maxSell),
    initialFillDate: p.initialFillDate,
  }));
}

interface RawOrder {
  id: number;
  ticker: string;
  type: string;
  status: string;
  quantity: number;
  filledQuantity?: number;
  filledValue?: number | null;
  value?: number | null;
  limitPrice?: number | null;
  stopPrice?: number | null;
  creationTime?: string;
}

export function mapOrder(o: RawOrder): BrokerOrder {
  const q = n(o.quantity);
  return {
    id: o.id,
    ticker: o.ticker,
    symbol: symbolFromT212(o.ticker),
    type: o.type,
    status: o.status,
    side: q < 0 ? "sell" : "buy",
    quantity: Math.abs(q),
    filledQuantity: Math.abs(n(o.filledQuantity)),
    filledValue: o.filledValue == null ? null : Math.abs(n(o.filledValue)),
    value: o.value == null ? null : Math.abs(n(o.value)),
    limitPrice: o.limitPrice == null ? null : n(o.limitPrice),
    stopPrice: o.stopPrice == null ? null : n(o.stopPrice),
    creationTime: o.creationTime,
  };
}

export async function getOrders(c: T212Creds): Promise<BrokerOrder[]> {
  const j = await call<RawOrder[]>(c, "/api/v0/equity/orders");
  return (Array.isArray(j) ? j : []).map(mapOrder);
}

export async function getAccount(c: T212Creds, currency: string): Promise<BrokerAccount> {
  const [cash, positions, orders] = await Promise.all([getCash(c), getPositions(c), getOrders(c)]);
  return { env: c.env, currency, cash, positions, orders, fetchedAt: Date.now() };
}

// The instrument list is large and heavily rate-limited, so cache it per server.
const metaCache = new Map<string, { at: number; list: T212InstrumentMeta[] }>();
const META_TTL = 12 * 60 * 60_000;

/** Test helper: forget cached instrument lists. */
export function resetInstrumentMeta(): void {
  metaCache.clear();
}

export async function getInstrumentMeta(c: T212Creds): Promise<T212InstrumentMeta[] | null> {
  const key = t212Base(c.env);
  const hit = metaCache.get(key);
  if (hit && Date.now() - hit.at < META_TTL) return hit.list;
  try {
    const list = await call<T212InstrumentMeta[]>(c, "/api/v0/equity/metadata/instruments");
    if (Array.isArray(list)) {
      metaCache.set(key, { at: Date.now(), list });
      return list;
    }
  } catch {
    /* fall back to the naming pattern */
  }
  return hit?.list ?? null;
}

// ----------------------------------------------------------------- writes

export async function placeOrder(c: T212Creds, o: PlaceRealOrder): Promise<BrokerOrder> {
  const meta = await getInstrumentMeta(c);
  const ticker = resolveT212Ticker(o.symbol, meta);
  if (!ticker) throw new BrokerError(400, `${o.symbol} can't be traded through Trading 212.`);
  // Trading 212 represents sells as a negative quantity.
  const quantity = o.side === "sell" ? -o.quantity : o.quantity;
  let raw: RawOrder;
  if (o.type === "market") raw = await call<RawOrder>(c, "/api/v0/equity/orders/market", { method: "POST", body: { ticker, quantity } });
  else if (o.type === "limit") raw = await call<RawOrder>(c, "/api/v0/equity/orders/limit", { method: "POST", body: { ticker, quantity, limitPrice: o.limitPrice, timeValidity: o.timeValidity ?? "DAY" } });
  else raw = await call<RawOrder>(c, "/api/v0/equity/orders/stop", { method: "POST", body: { ticker, quantity, stopPrice: o.stopPrice, timeValidity: o.timeValidity ?? "DAY" } });
  return mapOrder({ ...raw, ticker: raw?.ticker ?? ticker, quantity: raw?.quantity ?? quantity });
}

export async function cancelOrder(c: T212Creds, id: number): Promise<void> {
  await call(c, `/api/v0/equity/orders/${encodeURIComponent(String(id))}`, { method: "DELETE" });
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
