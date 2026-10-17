// The paper-portfolio engine — accounts, orders, holdings, analytics.
//
// Modelled on what the leading UK apps do: IG's deal ticket with an account
// selector (GIA / ISA / SIPP), fractional dealing from £1, limit and stop
// orders, stop-loss / take-profit / trailing stops; interactive investor's
// single-screen portfolio overview and order history; InvestEngine's target
// weights, Smart Top-Ups, AutoInvest, Savings Plans, one-click rebalancing and
// portfolio look-through.
//
// Everything here is a pure function over PortfolioState so it is testable and
// works identically against the simulator or live prices. Money is GBP.
// Shortlist is a research and paper-trading product: nothing here places real
// orders with a broker.

import { getInstrument, INSTRUMENTS, type Instrument } from "./instruments";
import { fxFeeFor, toGbp } from "./fx";

export type AccountType = "GIA" | "ISA" | "SIPP";
export type OrderSide = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type OrderStatus = "pending" | "filled" | "cancelled" | "rejected";
export type OrderSource = "manual" | "savings" | "autoinvest" | "rebalance" | "stop_loss" | "take_profit" | "trailing_stop";
export type Frequency = "weekly" | "fortnightly" | "monthly";

export interface Account {
  id: string;
  type: AccountType;
  name: string;
  cash: number; // GBP
  openedAt: number;
  autoInvest: { enabled: boolean; buffer: number };
  targets: Record<string, number>; // symbol → target % (sums to ≤ 100)
}

export interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  qty: number; // fractional allowed
  avgCost: number; // GBP per unit, fees included
  openedAt: number;
  stopLoss: number | null; // native price
  takeProfit: number | null; // native price
  trailingPct: number | null; // % below the high-water mark
  highWater: number; // native price, for the trailing stop
  lastDivCycle: number; // dividend cycle index already paid
}

export interface Order {
  id: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty?: number;
  amountGbp?: number;
  limitPrice?: number; // native price (limit or stop trigger)
  status: OrderStatus;
  source: OrderSource;
  createdAt: number;
  filledAt?: number;
  fillPrice?: number; // native
  fillQty?: number;
  fillValueGbp?: number;
  feeGbp?: number;
  note?: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  trailingPct?: number | null;
}

export type TxType = "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "buy" | "sell" | "dividend" | "reward";

export interface Tx {
  id: string;
  accountId: string;
  type: TxType;
  amount: number; // signed cash effect in GBP
  at: number;
  symbol?: string;
  qty?: number;
  realised?: number; // on sells
  note: string;
  value?: number; // rewards: what was given (cash or shares), counted like a deposit
}

export interface SavingsPlan {
  id: string;
  accountId: string;
  amount: number;
  frequency: Frequency;
  target: { kind: "symbol"; symbol: string } | { kind: "portfolio" };
  nextRunAt: number;
  active: boolean;
  createdAt: number;
  runs: number;
}

export interface PortfolioState {
  version: 1;
  accounts: Account[];
  holdings: Holding[];
  orders: Order[];
  transactions: Tx[];
  savingsPlans: SavingsPlan[];
}

export interface Pricer {
  now: number;
  price: (symbol: string) => number; // native
  prevClose: (symbol: string) => number; // native, ~1 day ago
}

export interface EngineEvent {
  id: string; // dedupe key
  kind: "order" | "protection" | "plan" | "income";
  symbol: string;
  message: string;
}

export const STARTING_CASH = 10_000;
export const MIN_ORDER_GBP = 1; // fractional dealing from £1, like IG and InvestEngine
const DAY = 86400_000;
const DIV_EPOCH = Date.UTC(2024, 0, 1);
const DIV_CYCLE_DAYS = 91;

export const ACCOUNT_META: Record<AccountType, { name: string; blurb: string; allowance?: string }> = {
  GIA: { name: "General account", blurb: "Flexible investing with no limits. Gains and dividends may be taxable." },
  ISA: { name: "Stocks & Shares ISA", blurb: "Invest up to £20,000 a year with no UK tax on gains or income.", allowance: "£20,000 / tax year" },
  SIPP: { name: "SIPP (pension)", blurb: "Long-term retirement pot with tax relief on contributions. Access from 55 (57 from 2028).", allowance: "£60,000 / tax year" },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function inst(symbol: string): Instrument {
  const i = getInstrument(symbol);
  if (!i) throw new Error(`Unknown instrument ${symbol}`);
  return i;
}

/** GBP value of one unit at the current price. */
export function unitGbp(symbol: string, p: Pricer): number {
  const i = inst(symbol);
  return toGbp(p.price(symbol), i.currency, p.now);
}

function prevUnitGbp(symbol: string, p: Pricer): number {
  const i = inst(symbol);
  return toGbp(p.prevClose(symbol), i.currency, p.now);
}

export function divCycle(symbol: string, now: number): number {
  const seed = getInstrument(symbol)?.seed ?? 1;
  const days = Math.floor((now - DIV_EPOCH) / DAY);
  return Math.floor((days - ((seed * 29) % DIV_CYCLE_DAYS)) / DIV_CYCLE_DAYS);
}

export function initialState(now = Date.now()): PortfolioState {
  const gia: Account = {
    id: "acc_gia",
    type: "GIA",
    name: ACCOUNT_META.GIA.name,
    cash: STARTING_CASH,
    openedAt: now,
    autoInvest: { enabled: false, buffer: 0 },
    targets: {},
  };
  return {
    version: 1,
    accounts: [gia],
    holdings: [],
    orders: [],
    transactions: [{ id: "tx_welcome", accountId: gia.id, type: "deposit", amount: STARTING_CASH, at: now, note: "Welcome deposit — virtual funds to practise with" }],
    savingsPlans: [],
  };
}

// Defensive normalisation of a loaded document.
export function ensureState(raw: unknown): PortfolioState {
  const s = (raw ?? {}) as Partial<PortfolioState>;
  if (!Array.isArray(s.accounts) || s.accounts.length === 0) return initialState();
  return {
    version: 1,
    accounts: s.accounts,
    holdings: Array.isArray(s.holdings) ? s.holdings : [],
    orders: Array.isArray(s.orders) ? s.orders : [],
    transactions: Array.isArray(s.transactions) ? s.transactions : [],
    savingsPlans: Array.isArray(s.savingsPlans) ? s.savingsPlans : [],
  };
}

export function accountById(s: PortfolioState, id: string): Account | undefined {
  return s.accounts.find((a) => a.id === id);
}

export function holdingFor(s: PortfolioState, accountId: string, symbol: string): Holding | undefined {
  return s.holdings.find((h) => h.accountId === accountId && h.symbol === symbol);
}

// ---------------------------------------------------------------------------
// accounts & cash
// ---------------------------------------------------------------------------

export function openAccount(s: PortfolioState, type: AccountType, now: number): { state: PortfolioState; account: Account } {
  const existing = s.accounts.find((a) => a.type === type);
  if (existing) return { state: s, account: existing };
  const account: Account = {
    id: `acc_${type.toLowerCase()}`,
    type,
    name: ACCOUNT_META[type].name,
    cash: 0,
    openedAt: now,
    autoInvest: { enabled: false, buffer: 0 },
    targets: {},
  };
  return { state: { ...s, accounts: [...s.accounts, account] }, account };
}

/** Practice cash earned in the Academy (Learn & Earn, missions). Counts as money in, not as return. */
export function creditReward(s: PortfolioState, accountId: string, amount: number, now: number, note: string): PortfolioState {
  if (!(amount > 0) || !accountById(s, accountId)) return s;
  return {
    ...s,
    accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, cash: r2(a.cash + amount) } : a)),
    transactions: [{ id: uid("tx"), accountId, type: "reward", amount: r2(amount), value: r2(amount), at: now, note }, ...s.transactions],
  };
}

/** Gift whole shares (the free practice share). Cost basis is today's value, as brokers record it. */
export function grantShares(s: PortfolioState, accountId: string, symbol: string, qty: number, p: Pricer, note: string): { state: PortfolioState; valueGbp: number } {
  const i = getInstrument(symbol);
  if (!i || !(qty > 0) || !accountById(s, accountId)) return { state: s, valueGbp: 0 };
  const u = unitGbp(symbol, p);
  const value = r2(u * qty);
  const native = p.price(symbol);
  const existing = holdingFor(s, accountId, symbol);
  const holdings = existing
    ? s.holdings.map((h) => (h.id === existing.id ? { ...h, qty: r6(h.qty + qty), avgCost: r6((h.qty * h.avgCost + value) / (h.qty + qty)) } : h))
    : [
        ...s.holdings,
        { id: uid("h"), accountId, symbol, qty, avgCost: r6(u), openedAt: p.now, stopLoss: null, takeProfit: null, trailingPct: null, highWater: native, lastDivCycle: divCycle(symbol, p.now) },
      ];
  return {
    state: { ...s, holdings, transactions: [{ id: uid("tx"), accountId, type: "reward", amount: 0, value, at: p.now, symbol, qty, note }, ...s.transactions] },
    valueGbp: value,
  };
}

export function deposit(s: PortfolioState, accountId: string, amount: number, now: number, note = "Top-up (virtual funds)"): PortfolioState {
  if (!(amount > 0)) return s;
  return {
    ...s,
    accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, cash: r2(a.cash + amount) } : a)),
    transactions: [{ id: uid("tx"), accountId, type: "deposit", amount: r2(amount), at: now, note }, ...s.transactions],
  };
}

export function withdraw(s: PortfolioState, accountId: string, amount: number, now: number): { state: PortfolioState; error?: string } {
  const a = accountById(s, accountId);
  if (!a) return { state: s, error: "Account not found" };
  if (!(amount > 0)) return { state: s, error: "Enter an amount" };
  if (a.cash < amount) return { state: s, error: "Not enough cash" };
  return {
    state: {
      ...s,
      accounts: s.accounts.map((x) => (x.id === accountId ? { ...x, cash: r2(x.cash - amount) } : x)),
      transactions: [{ id: uid("tx"), accountId, type: "withdrawal", amount: -r2(amount), at: now, note: "Withdrawal (virtual)" }, ...s.transactions],
    },
  };
}

export function transfer(s: PortfolioState, fromId: string, toId: string, amount: number, now: number): { state: PortfolioState; error?: string } {
  const from = accountById(s, fromId);
  const to = accountById(s, toId);
  if (!from || !to || fromId === toId) return { state: s, error: "Pick two different accounts" };
  if (!(amount > 0)) return { state: s, error: "Enter an amount" };
  if (from.cash < amount) return { state: s, error: `Only ${fmt(from.cash)} available in ${from.name}` };
  return {
    state: {
      ...s,
      accounts: s.accounts.map((a) => (a.id === fromId ? { ...a, cash: r2(a.cash - amount) } : a.id === toId ? { ...a, cash: r2(a.cash + amount) } : a)),
      transactions: [
        { id: uid("tx"), accountId: toId, type: "transfer_in", amount: r2(amount), at: now, note: `From ${from.name}` },
        { id: uid("tx"), accountId: fromId, type: "transfer_out", amount: -r2(amount), at: now, note: `To ${to.name}` },
        ...s.transactions,
      ],
    },
  };
}

export function setTargets(s: PortfolioState, accountId: string, targets: Record<string, number>): PortfolioState {
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(targets)) if (getInstrument(k) && v > 0) clean[k] = r2(v);
  return { ...s, accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, targets: clean } : a)) };
}

export function setAutoInvest(s: PortfolioState, accountId: string, enabled: boolean, buffer: number): PortfolioState {
  return { ...s, accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, autoInvest: { enabled, buffer: Math.max(0, r2(buffer)) } } : a)) };
}

export function setProtection(
  s: PortfolioState,
  holdingId: string,
  p: { stopLoss?: number | null; takeProfit?: number | null; trailingPct?: number | null },
): PortfolioState {
  return {
    ...s,
    holdings: s.holdings.map((h) =>
      h.id === holdingId
        ? {
            ...h,
            stopLoss: p.stopLoss === undefined ? h.stopLoss : p.stopLoss,
            takeProfit: p.takeProfit === undefined ? h.takeProfit : p.takeProfit,
            trailingPct: p.trailingPct === undefined ? h.trailingPct : p.trailingPct,
          }
        : h,
    ),
  };
}

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------

export interface OrderInput {
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  qty?: number;
  amountGbp?: number;
  limitPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  trailingPct?: number | null;
  source?: OrderSource;
}

export interface OrderResult {
  state: PortfolioState;
  order?: Order;
  error?: string;
  shortfall?: number; // GBP missing when a buy can't be funded
  events: EngineEvent[];
}

/** Estimate what a buy/sell will cost or return, for the deal-ticket preview. */
export function previewOrder(input: Pick<OrderInput, "symbol" | "side" | "qty" | "amountGbp">, p: Pricer): { qty: number; valueGbp: number; feeGbp: number; totalGbp: number; unitGbp: number } {
  const i = inst(input.symbol);
  const u = unitGbp(input.symbol, p);
  const feePct = fxFeeFor(i.currency);
  let qty = input.qty ?? 0;
  if (!input.qty && input.amountGbp) {
    qty = input.side === "buy" ? input.amountGbp / (u * (1 + feePct)) : input.amountGbp / u;
  }
  qty = r6(Math.max(0, qty));
  const valueGbp = r2(qty * u);
  const feeGbp = r2(valueGbp * feePct);
  const totalGbp = input.side === "buy" ? r2(valueGbp + feeGbp) : r2(valueGbp - feeGbp);
  return { qty, valueGbp, feeGbp, totalGbp, unitGbp: u };
}

export function placeOrder(s: PortfolioState, input: OrderInput, p: Pricer): OrderResult {
  const account = accountById(s, input.accountId);
  if (!account) return { state: s, error: "Choose an account", events: [] };
  const i = getInstrument(input.symbol);
  if (!i) return { state: s, error: "Unknown instrument", events: [] };
  if (!input.qty && !input.amountGbp) return { state: s, error: "Enter an amount", events: [] };
  if (input.amountGbp !== undefined && input.amountGbp < MIN_ORDER_GBP && !input.qty) return { state: s, error: `Minimum order is £${MIN_ORDER_GBP}`, events: [] };
  if ((input.type === "limit" || input.type === "stop") && !(input.limitPrice && input.limitPrice > 0)) return { state: s, error: "Enter a trigger price", events: [] };
  if (input.type === "stop" && input.side !== "sell") return { state: s, error: "Stop orders are sell orders", events: [] };

  const order: Order = {
    id: uid("ord"),
    accountId: input.accountId,
    symbol: i.symbol,
    side: input.side,
    type: input.type,
    qty: input.qty,
    amountGbp: input.amountGbp,
    limitPrice: input.limitPrice,
    status: "pending",
    source: input.source ?? "manual",
    createdAt: p.now,
    stopLoss: input.stopLoss ?? null,
    takeProfit: input.takeProfit ?? null,
    trailingPct: input.trailingPct ?? null,
  };

  if (order.type === "market") {
    const r = fillOrder(s, order, p);
    return r;
  }

  // Working order — sits until the price crosses the trigger.
  const price = p.price(i.symbol);
  const lp = order.limitPrice as number;
  if (order.type === "limit" && order.side === "buy" && lp >= price) return { state: s, error: "A buy limit must be below the current price (use a market order to buy now)", events: [] };
  if (order.type === "limit" && order.side === "sell" && lp <= price) return { state: s, error: "A sell limit must be above the current price", events: [] };
  if (order.type === "stop" && lp >= price) return { state: s, error: "A stop must be below the current price", events: [] };
  if (order.side === "sell") {
    const h = holdingFor(s, order.accountId, order.symbol);
    if (!h) return { state: s, error: "You don't hold this in that account", events: [] };
  }
  return { state: { ...s, orders: [order, ...s.orders] }, order, events: [] };
}

/** Fill an order at the current price (market orders now; working orders when triggered). */
export function fillOrder(s: PortfolioState, order: Order, p: Pricer): OrderResult {
  const account = accountById(s, order.accountId);
  if (!account) return { state: s, error: "Account not found", events: [] };
  const i = inst(order.symbol);
  const u = unitGbp(order.symbol, p);
  const native = p.price(order.symbol);
  const feePct = fxFeeFor(i.currency);
  const others = s.orders.filter((o) => o.id !== order.id);

  if (order.side === "buy") {
    const qty = r6(order.qty ?? (order.amountGbp as number) / (u * (1 + feePct)));
    if (!(qty > 0)) return { state: s, error: "Amount too small", events: [] };
    const value = r2(qty * u);
    const fee = r2(value * feePct);
    const total = r2(value + fee);
    if (account.cash + 1e-9 < total) {
      const rejected: Order = { ...order, status: "rejected", note: `Needed ${fmt(total)}, had ${fmt(account.cash)}` };
      return {
        state: { ...s, orders: order.status === "pending" && s.orders.some((o) => o.id === order.id) ? [rejected, ...others] : s.orders },
        error: `Not enough cash in ${account.name} — you need ${fmt(total)} and have ${fmt(account.cash)}.`,
        shortfall: r2(total - account.cash),
        events: [],
      };
    }
    const existing = holdingFor(s, account.id, i.symbol);
    const holdings = existing
      ? s.holdings.map((h) =>
          h.id === existing.id
            ? {
                ...h,
                qty: r6(h.qty + qty),
                avgCost: r6((h.qty * h.avgCost + total) / (h.qty + qty)),
                highWater: Math.max(h.highWater, native),
                stopLoss: order.stopLoss ?? h.stopLoss,
                takeProfit: order.takeProfit ?? h.takeProfit,
                trailingPct: order.trailingPct ?? h.trailingPct,
              }
            : h,
        )
      : [
          ...s.holdings,
          {
            id: uid("h"),
            accountId: account.id,
            symbol: i.symbol,
            qty,
            avgCost: r6(total / qty),
            openedAt: p.now,
            stopLoss: order.stopLoss ?? null,
            takeProfit: order.takeProfit ?? null,
            trailingPct: order.trailingPct ?? null,
            highWater: native,
            lastDivCycle: divCycle(i.symbol, p.now),
          },
        ];
    const filled: Order = { ...order, status: "filled", filledAt: p.now, fillPrice: native, fillQty: qty, fillValueGbp: value, feeGbp: fee };
    const tx: Tx = { id: uid("tx"), accountId: account.id, type: "buy", amount: -total, at: p.now, symbol: i.symbol, qty, note: `Bought ${fmtQty(qty)} ${i.symbol} @ ${fmtNativePrice(native, i)}${fee ? ` (FX fee ${fmt(fee)})` : ""}` };
    return {
      state: {
        ...s,
        accounts: s.accounts.map((a) => (a.id === account.id ? { ...a, cash: r2(a.cash - total) } : a)),
        holdings,
        orders: [filled, ...others],
        transactions: [tx, ...s.transactions],
      },
      order: filled,
      events: order.source === "manual" && order.type === "market" ? [] : [{ id: `order:${filled.id}`, kind: "order", symbol: i.symbol, message: orderMessage(filled, i, fee) }],
    };
  }

  // sell
  const h = holdingFor(s, account.id, i.symbol);
  if (!h) {
    const rejected: Order = { ...order, status: "rejected", note: "No holding to sell" };
    return { state: { ...s, orders: s.orders.some((o) => o.id === order.id) ? [rejected, ...others] : s.orders }, error: "You don't hold this in that account", events: [] };
  }
  let qty = order.qty ?? (order.amountGbp as number) / u;
  qty = r6(Math.min(qty, h.qty));
  if (!(qty > 0)) return { state: s, error: "Amount too small", events: [] };
  const value = r2(qty * u);
  const fee = r2(value * feePct);
  const net = r2(value - fee);
  const realised = r2((u - h.avgCost) * qty - fee);
  const remaining = r6(h.qty - qty);
  const holdings = remaining < 1e-6 ? s.holdings.filter((x) => x.id !== h.id) : s.holdings.map((x) => (x.id === h.id ? { ...x, qty: remaining } : x));
  const filled: Order = { ...order, status: "filled", filledAt: p.now, fillPrice: native, fillQty: qty, fillValueGbp: value, feeGbp: fee };
  const tx: Tx = {
    id: uid("tx"),
    accountId: account.id,
    type: "sell",
    amount: net,
    at: p.now,
    symbol: i.symbol,
    qty,
    realised,
    note: `Sold ${fmtQty(qty)} ${i.symbol} @ ${fmtNativePrice(native, i)} — ${realised >= 0 ? "profit" : "loss"} ${fmt(realised)}`,
  };
  return {
    state: {
      ...s,
      accounts: s.accounts.map((a) => (a.id === account.id ? { ...a, cash: r2(a.cash + net) } : a)),
      holdings,
      orders: [filled, ...others],
      transactions: [tx, ...s.transactions],
    },
    order: filled,
    events: order.source === "manual" && order.type === "market" ? [] : [{ id: `order:${filled.id}`, kind: order.source.includes("stop") || order.source === "take_profit" ? "protection" : "order", symbol: i.symbol, message: orderMessage(filled, i, fee) }],
  };
}

function orderMessage(o: Order, i: Instrument, fee: number): string {
  const verb = o.side === "buy" ? "Bought" : "Sold";
  const why =
    o.source === "stop_loss"
      ? "stop-loss triggered"
      : o.source === "trailing_stop"
        ? "trailing stop triggered"
        : o.source === "take_profit"
          ? "take-profit hit"
          : o.source === "savings"
            ? "savings plan"
            : o.source === "autoinvest"
              ? "AutoInvest"
              : o.source === "rebalance"
                ? "rebalance"
                : o.type === "limit"
                  ? "limit order filled"
                  : o.type === "stop"
                    ? "stop order filled"
                    : "order filled";
  return `${verb} ${fmtQty(o.fillQty ?? 0)} ${i.symbol} @ ${fmtNativePrice(o.fillPrice ?? 0, i)} (${fmt(o.fillValueGbp ?? 0)}${fee ? ` + ${fmt(fee)} FX` : ""}) — ${why}.`;
}

export function cancelOrder(s: PortfolioState, orderId: string): PortfolioState {
  return { ...s, orders: s.orders.map((o) => (o.id === orderId && o.status === "pending" ? { ...o, status: "cancelled" } : o)) };
}

/** Fill any working orders whose trigger has been crossed. */
export function processPending(s: PortfolioState, p: Pricer): { state: PortfolioState; events: EngineEvent[] } {
  let state = s;
  const events: EngineEvent[] = [];
  for (const o of s.orders.filter((x) => x.status === "pending")) {
    const price = p.price(o.symbol);
    const lp = o.limitPrice ?? 0;
    const hit = (o.type === "limit" && o.side === "buy" && price <= lp) || (o.type === "limit" && o.side === "sell" && price >= lp) || (o.type === "stop" && price <= lp);
    if (!hit) continue;
    const r = fillOrder(state, o, p);
    state = r.state;
    events.push(...r.events);
    if (r.error && !r.order) {
      // Couldn't fill (e.g. cash spent elsewhere) — fillOrder already marked it rejected.
      events.push({ id: `reject:${o.id}`, kind: "order", symbol: o.symbol, message: `${o.symbol} ${o.type} order could not be filled: ${r.error}` });
    }
  }
  return { state, events };
}

/** Stop-loss, take-profit and trailing stops on holdings → market sells. */
export function processProtections(s: PortfolioState, p: Pricer): { state: PortfolioState; events: EngineEvent[] } {
  let state = s;
  const events: EngineEvent[] = [];
  for (const h of s.holdings) {
    const price = p.price(h.symbol);
    if (!(price > 0)) continue;
    const highWater = Math.max(h.highWater, price);
    if (highWater !== h.highWater) {
      state = { ...state, holdings: state.holdings.map((x) => (x.id === h.id ? { ...x, highWater } : x)) };
    }
    let source: OrderSource | null = null;
    if (h.stopLoss != null && price <= h.stopLoss) source = "stop_loss";
    else if (h.trailingPct != null && price <= highWater * (1 - h.trailingPct / 100)) source = "trailing_stop";
    else if (h.takeProfit != null && price >= h.takeProfit) source = "take_profit";
    if (!source) continue;
    const r = fillOrder(
      state,
      {
        id: uid("ord"),
        accountId: h.accountId,
        symbol: h.symbol,
        side: "sell",
        type: "market",
        qty: h.qty,
        status: "pending",
        source,
        createdAt: p.now,
      },
      p,
    );
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

// ---------------------------------------------------------------------------
// automation: Smart Top-Up, AutoInvest, Savings Plans, Rebalance, dividends
// ---------------------------------------------------------------------------

export interface Allocation {
  symbol: string;
  amountGbp: number;
}

/** Split a deposit across the account's targets so underweights are topped up first (InvestEngine "Smart Top-Up"). */
export function smartTopUpPlan(s: PortfolioState, accountId: string, amount: number, p: Pricer): Allocation[] {
  const a = accountById(s, accountId);
  if (!a || amount <= 0) return [];
  const symbols = Object.keys(a.targets);
  if (symbols.length === 0) return [];
  const totalPct = symbols.reduce((x, k) => x + a.targets[k], 0) || 100;
  const current: Record<string, number> = {};
  let invested = 0;
  for (const k of symbols) {
    const h = holdingFor(s, accountId, k);
    current[k] = h ? h.qty * unitGbp(k, p) : 0;
    invested += current[k];
  }
  const after = invested + amount;
  const deficits: Record<string, number> = {};
  let sumDef = 0;
  for (const k of symbols) {
    deficits[k] = Math.max(0, (a.targets[k] / totalPct) * after - current[k]);
    sumDef += deficits[k];
  }
  const out: Allocation[] = [];
  if (sumDef <= 0) {
    for (const k of symbols) out.push({ symbol: k, amountGbp: r2((a.targets[k] / totalPct) * amount) });
  } else {
    const scale = Math.min(1, amount / sumDef);
    let spent = 0;
    for (const k of symbols) {
      const v = r2(deficits[k] * scale);
      if (v > 0) {
        out.push({ symbol: k, amountGbp: v });
        spent += v;
      }
    }
    const left = r2(amount - spent);
    if (left >= MIN_ORDER_GBP) for (const k of symbols) out.push({ symbol: k, amountGbp: r2((a.targets[k] / totalPct) * left) });
  }
  // merge duplicates & drop dust
  const merged = new Map<string, number>();
  for (const x of out) merged.set(x.symbol, r2((merged.get(x.symbol) ?? 0) + x.amountGbp));
  return [...merged.entries()].filter(([, v]) => v >= MIN_ORDER_GBP).map(([symbol, amountGbp]) => ({ symbol, amountGbp }));
}

export function executeAllocations(s: PortfolioState, accountId: string, allocs: Allocation[], p: Pricer, source: OrderSource): { state: PortfolioState; events: EngineEvent[]; errors: string[] } {
  let state = s;
  const events: EngineEvent[] = [];
  const errors: string[] = [];
  for (const al of allocs) {
    const r = placeOrder(state, { accountId, symbol: al.symbol, side: "buy", type: "market", amountGbp: al.amountGbp, source }, p);
    state = r.state;
    events.push(...r.events);
    if (r.error) errors.push(r.error);
  }
  return { state, events, errors };
}

export function runAutoInvest(s: PortfolioState, p: Pricer): { state: PortfolioState; events: EngineEvent[] } {
  let state = s;
  const events: EngineEvent[] = [];
  for (const a of s.accounts) {
    if (!a.autoInvest.enabled || Object.keys(a.targets).length === 0) continue;
    const excess = r2(a.cash - a.autoInvest.buffer);
    if (excess < MIN_ORDER_GBP) continue;
    const plan = smartTopUpPlan(state, a.id, excess, p);
    if (plan.length === 0) continue;
    const r = executeAllocations(state, a.id, plan, p, "autoinvest");
    state = r.state;
    if (r.events.length) {
      events.push({ id: `autoinvest:${a.id}:${p.now}`, kind: "plan", symbol: plan[0].symbol, message: `AutoInvest put ${fmt(excess)} of spare cash to work across ${plan.length} holding${plan.length > 1 ? "s" : ""} in your ${a.name}.` });
    }
  }
  return { state, events };
}

export function nextRun(from: number, f: Frequency): number {
  const d = new Date(from);
  if (f === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (f === "fortnightly") d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.getTime();
}

export function addSavingsPlan(s: PortfolioState, plan: Omit<SavingsPlan, "id" | "runs" | "active" | "createdAt">, now: number): PortfolioState {
  return { ...s, savingsPlans: [...s.savingsPlans, { ...plan, id: uid("sp"), runs: 0, active: true, createdAt: now }] };
}

export function updateSavingsPlan(s: PortfolioState, id: string, patch: Partial<SavingsPlan>): PortfolioState {
  return { ...s, savingsPlans: s.savingsPlans.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
}

export function removeSavingsPlan(s: PortfolioState, id: string): PortfolioState {
  return { ...s, savingsPlans: s.savingsPlans.filter((x) => x.id !== id) };
}

/** Run due savings plans: deposit the contribution, then invest it. */
export function runSavingsPlans(s: PortfolioState, p: Pricer): { state: PortfolioState; events: EngineEvent[] } {
  let state = s;
  const events: EngineEvent[] = [];
  for (const plan of s.savingsPlans) {
    if (!plan.active) continue;
    let guard = 0;
    let cur = state.savingsPlans.find((x) => x.id === plan.id) as SavingsPlan;
    while (cur.nextRunAt <= p.now && guard++ < 3) {
      const account = accountById(state, cur.accountId);
      if (!account) break;
      state = deposit(state, cur.accountId, cur.amount, p.now, `Savings plan contribution (${cur.frequency})`);
      let invested = 0;
      if (cur.target.kind === "symbol") {
        const r = placeOrder(state, { accountId: cur.accountId, symbol: cur.target.symbol, side: "buy", type: "market", amountGbp: cur.amount, source: "savings" }, p);
        state = r.state;
        if (r.order) invested = cur.amount;
      } else {
        const allocs = smartTopUpPlan(state, cur.accountId, cur.amount, p);
        const r = executeAllocations(state, cur.accountId, allocs, p, "savings");
        state = r.state;
        invested = allocs.reduce((x, y) => x + y.amountGbp, 0);
      }
      const label = cur.target.kind === "symbol" ? cur.target.symbol : "your target portfolio";
      events.push({
        id: `plan:${cur.id}:${cur.runs + 1}`,
        kind: "plan",
        symbol: cur.target.kind === "symbol" ? cur.target.symbol : "",
        message: `Savings plan ran: ${fmt(cur.amount)} added to ${account.name}${invested > 0 ? ` and invested in ${label}` : " (set target weights to auto-invest it)"}.`,
      });
      cur = { ...cur, nextRunAt: nextRun(cur.nextRunAt, cur.frequency), runs: cur.runs + 1 };
      state = updateSavingsPlan(state, cur.id, { nextRunAt: cur.nextRunAt, runs: cur.runs });
    }
  }
  return { state, events };
}

export interface RebalanceLeg {
  symbol: string;
  side: OrderSide;
  amountGbp: number;
  currentPct: number;
  targetPct: number;
}

/** The trades needed to return an account to its target weights (InvestEngine "one-click rebalance"). */
export function rebalancePlan(s: PortfolioState, accountId: string, p: Pricer, tolerancePct = 0.5): RebalanceLeg[] {
  const a = accountById(s, accountId);
  if (!a) return [];
  const targets = a.targets;
  const symbols = new Set([...Object.keys(targets), ...s.holdings.filter((h) => h.accountId === accountId).map((h) => h.symbol)]);
  const totalPct = Object.values(targets).reduce((x, y) => x + y, 0) || 100;
  let total = 0;
  const current: Record<string, number> = {};
  for (const k of symbols) {
    const h = holdingFor(s, accountId, k);
    current[k] = h ? h.qty * unitGbp(k, p) : 0;
    total += current[k];
  }
  if (total <= 0) return [];
  const legs: RebalanceLeg[] = [];
  for (const k of symbols) {
    const targetPct = ((targets[k] ?? 0) / totalPct) * 100;
    const currentPct = (current[k] / total) * 100;
    const delta = r2((targetPct / 100) * total - current[k]);
    if (Math.abs(currentPct - targetPct) < tolerancePct || Math.abs(delta) < MIN_ORDER_GBP) continue;
    legs.push({ symbol: k, side: delta > 0 ? "buy" : "sell", amountGbp: Math.abs(delta), currentPct: r2(currentPct), targetPct: r2(targetPct) });
  }
  // Sells first so the buys are funded.
  return legs.sort((x, y) => (x.side === y.side ? y.amountGbp - x.amountGbp : x.side === "sell" ? -1 : 1));
}

export function executeRebalance(s: PortfolioState, accountId: string, p: Pricer): { state: PortfolioState; events: EngineEvent[]; legs: RebalanceLeg[]; errors: string[] } {
  const legs = rebalancePlan(s, accountId, p);
  let state = s;
  const events: EngineEvent[] = [];
  const errors: string[] = [];
  const run = (leg: RebalanceLeg, amountGbp: number) => {
    const r = placeOrder(state, { accountId, symbol: leg.symbol, side: leg.side, type: "market", amountGbp, source: "rebalance" }, p);
    state = r.state;
    events.push(...r.events);
    if (r.error) errors.push(r.error);
  };

  // Sells first. Their proceeds can fall short of the planned buys (an FX fee on
  // selling a USD holding, rounding), so the buys are then scaled to the cash
  // that is actually there — a rebalance must never fail half-way.
  for (const leg of legs.filter((l) => l.side === "sell")) run(leg, leg.amountGbp);
  const buys = legs.filter((l) => l.side === "buy");
  const wanted = buys.reduce((x, l) => x + l.amountGbp, 0);
  const cash = accountById(state, accountId)?.cash ?? 0;
  const headroom = cash - 0.01 * buys.length; // a penny per leg for rounding
  const scale = wanted > 0 ? Math.min(1, Math.max(0, headroom) / wanted) : 0;
  for (const leg of buys) {
    const amount = Math.floor(leg.amountGbp * scale * 100) / 100;
    if (amount >= MIN_ORDER_GBP) run(leg, amount);
  }
  return { state, events, legs, errors };
}

/** Credit quarterly dividends on holdings whose ex-date cycle has rolled over. */
export function payDividends(s: PortfolioState, p: Pricer): { state: PortfolioState; events: EngineEvent[] } {
  let state = s;
  const events: EngineEvent[] = [];
  for (const h of s.holdings) {
    const i = getInstrument(h.symbol);
    if (!i || i.dividendYieldPct <= 0) continue;
    const cycle = divCycle(h.symbol, p.now);
    if (cycle <= h.lastDivCycle) continue;
    const amount = r2(h.qty * unitGbp(h.symbol, p) * (i.dividendYieldPct / 100 / 4));
    state = {
      ...state,
      holdings: state.holdings.map((x) => (x.id === h.id ? { ...x, lastDivCycle: cycle } : x)),
    };
    if (amount < 0.01) continue;
    state = {
      ...state,
      accounts: state.accounts.map((a) => (a.id === h.accountId ? { ...a, cash: r2(a.cash + amount) } : a)),
      transactions: [{ id: uid("tx"), accountId: h.accountId, type: "dividend", amount, at: p.now, symbol: h.symbol, note: `Dividend from ${i.symbol}` }, ...state.transactions],
    };
    events.push({ id: `div:${h.id}:${cycle}`, kind: "income", symbol: h.symbol, message: `${i.symbol} paid you a ${fmt(amount)} dividend.` });
  }
  return { state, events };
}

/** One engine pass. `full` also runs the slower automation (plans, AutoInvest, dividends). */
export function tick(s: PortfolioState, p: Pricer, full: boolean): { state: PortfolioState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  let r = processPending(s, p);
  events.push(...r.events);
  r = processProtections(r.state, p);
  events.push(...r.events);
  if (full) {
    r = runSavingsPlans(r.state, p);
    events.push(...r.events);
    r = runAutoInvest(r.state, p);
    events.push(...r.events);
    r = payDividends(r.state, p);
    events.push(...r.events);
  }
  return { state: r.state, events };
}

// ---------------------------------------------------------------------------
// valuation & analytics
// ---------------------------------------------------------------------------

export interface HoldingView extends Holding {
  instrument: Instrument;
  price: number; // native
  unitGbp: number;
  valueGbp: number;
  costGbp: number;
  pnlGbp: number;
  pnlPct: number;
  dayChangeGbp: number;
  dayChangePct: number;
  weightPct: number; // of total portfolio value
}

export interface AccountSummary {
  account: Account;
  cash: number;
  invested: number;
  value: number;
  pnlGbp: number;
  dayChangeGbp: number;
}

export interface PortfolioSummary {
  totalValue: number;
  cash: number;
  invested: number;
  costBasis: number;
  unrealised: number;
  unrealisedPct: number;
  realised: number;
  dividends: number;
  dayChange: number;
  dayChangePct: number;
  netDeposits: number;
  totalReturn: number; // value − net deposits
  totalReturnPct: number;
  holdings: HoldingView[];
  accounts: AccountSummary[];
}

export function valueHoldings(s: PortfolioState, p: Pricer): HoldingView[] {
  const views = s.holdings.map((h) => {
    const instrument = inst(h.symbol);
    const price = p.price(h.symbol);
    const u = unitGbp(h.symbol, p);
    const prev = prevUnitGbp(h.symbol, p);
    const valueGbp = r2(h.qty * u);
    const costGbp = r2(h.qty * h.avgCost);
    const pnlGbp = r2(valueGbp - costGbp);
    const dayChangeGbp = r2(h.qty * (u - prev));
    return {
      ...h,
      instrument,
      price,
      unitGbp: u,
      valueGbp,
      costGbp,
      pnlGbp,
      pnlPct: costGbp > 0 ? r2((pnlGbp / costGbp) * 100) : 0,
      dayChangeGbp,
      dayChangePct: prev > 0 ? r2(((u - prev) / prev) * 100) : 0,
      weightPct: 0,
    };
  });
  const total = views.reduce((x, v) => x + v.valueGbp, 0) + s.accounts.reduce((x, a) => x + a.cash, 0);
  return views.map((v) => ({ ...v, weightPct: total > 0 ? r2((v.valueGbp / total) * 100) : 0 })).sort((a, b) => b.valueGbp - a.valueGbp);
}

export function summarise(s: PortfolioState, p: Pricer): PortfolioSummary {
  const holdings = valueHoldings(s, p);
  const cash = r2(s.accounts.reduce((x, a) => x + a.cash, 0));
  const invested = r2(holdings.reduce((x, h) => x + h.valueGbp, 0));
  const costBasis = r2(holdings.reduce((x, h) => x + h.costGbp, 0));
  const unrealised = r2(invested - costBasis);
  const realised = r2(s.transactions.filter((t) => t.type === "sell").reduce((x, t) => x + (t.realised ?? 0), 0));
  const dividends = r2(s.transactions.filter((t) => t.type === "dividend").reduce((x, t) => x + t.amount, 0));
  const dayChange = r2(holdings.reduce((x, h) => x + h.dayChangeGbp, 0));
  const totalValue = r2(cash + invested);
  const netDeposits = r2(
    s.transactions.reduce((x, t) => x + (t.type === "deposit" || t.type === "withdrawal" ? t.amount : t.type === "reward" ? (t.value ?? t.amount) : 0), 0),
  );
  const totalReturn = r2(totalValue - netDeposits);
  const accounts: AccountSummary[] = s.accounts.map((a) => {
    const hs = holdings.filter((h) => h.accountId === a.id);
    const inv = r2(hs.reduce((x, h) => x + h.valueGbp, 0));
    return {
      account: a,
      cash: a.cash,
      invested: inv,
      value: r2(a.cash + inv),
      pnlGbp: r2(hs.reduce((x, h) => x + h.pnlGbp, 0)),
      dayChangeGbp: r2(hs.reduce((x, h) => x + h.dayChangeGbp, 0)),
    };
  });
  return {
    totalValue,
    cash,
    invested,
    costBasis,
    unrealised,
    unrealisedPct: costBasis > 0 ? r2((unrealised / costBasis) * 100) : 0,
    realised,
    dividends,
    dayChange,
    dayChangePct: invested - dayChange > 0 ? r2((dayChange / (invested - dayChange)) * 100) : 0,
    netDeposits,
    totalReturn,
    totalReturnPct: netDeposits > 0 ? r2((totalReturn / netDeposits) * 100) : 0,
    holdings,
    accounts,
  };
}

export type Dimension = "asset" | "sector" | "region" | "holding" | "lookthrough";

export interface Slice {
  name: string;
  symbol?: string;
  valueGbp: number;
  pct: number;
  via: string[]; // which holdings contribute ("Direct" or an ETF symbol)
}

/** Break the portfolio down by asset class, sector, region, holding, or true underlying exposure (look-through). */
export function allocation(s: PortfolioState, p: Pricer, dim: Dimension, includeCash = true): Slice[] {
  const views = valueHoldings(s, p);
  const acc = new Map<string, Slice>();
  const add = (name: string, value: number, via: string, symbol?: string) => {
    if (value <= 0) return;
    const cur = acc.get(name) ?? { name, symbol, valueGbp: 0, pct: 0, via: [] };
    cur.valueGbp += value;
    if (!cur.via.includes(via)) cur.via.push(via);
    if (symbol && !cur.symbol) cur.symbol = symbol;
    acc.set(name, cur);
  };
  for (const v of views) {
    const i = v.instrument;
    switch (dim) {
      case "asset":
        add(i.assetClass, v.valueGbp, i.type === "etf" ? i.symbol : "Direct");
        break;
      case "sector":
        if (i.type === "etf" && i.sectors) for (const w of i.sectors) add(w.name, (v.valueGbp * w.pct) / 100, i.symbol);
        else add(i.sector, v.valueGbp, "Direct");
        break;
      case "region":
        if (i.type === "etf" && i.regions) for (const w of i.regions) add(w.name, (v.valueGbp * w.pct) / 100, i.symbol);
        else add(i.region, v.valueGbp, "Direct");
        break;
      case "holding":
        add(i.name, v.valueGbp, v.accountId, i.symbol);
        break;
      case "lookthrough":
        if (i.type === "etf" && i.holdings) {
          let covered = 0;
          for (const w of i.holdings) {
            add(w.name, (v.valueGbp * w.pct) / 100, i.symbol, w.symbol);
            covered += w.pct;
          }
          if (covered < 100) add(`Other holdings in ${i.symbol}`, (v.valueGbp * (100 - covered)) / 100, i.symbol);
        } else add(i.name, v.valueGbp, "Direct", i.symbol);
        break;
    }
  }
  const cash = s.accounts.reduce((x, a) => x + a.cash, 0);
  if (includeCash && dim === "asset" && cash > 0) add("Cash", cash, "Cash");
  const total = [...acc.values()].reduce((x, y) => x + y.valueGbp, 0);
  return [...acc.values()]
    .map((x) => ({ ...x, valueGbp: r2(x.valueGbp), pct: total > 0 ? r2((x.valueGbp / total) * 100) : 0 }))
    .sort((a, b) => b.valueGbp - a.valueGbp);
}

/** Underlying companies you hold through two or more routes — the hidden concentration InvestEngine's look-through surfaces. */
export function overlaps(s: PortfolioState, p: Pricer): Slice[] {
  return allocation(s, p, "lookthrough", false).filter((x) => x.via.length >= 2);
}

export interface IncomeLine {
  symbol: string;
  name: string;
  yieldPct: number;
  annualGbp: number;
}

export function incomeProjection(s: PortfolioState, p: Pricer): { annual: number; monthly: number; yieldPct: number; lines: IncomeLine[] } {
  const views = valueHoldings(s, p);
  const lines: IncomeLine[] = views
    .filter((v) => v.instrument.dividendYieldPct > 0)
    .map((v) => ({ symbol: v.symbol, name: v.instrument.name, yieldPct: v.instrument.dividendYieldPct, annualGbp: r2((v.valueGbp * v.instrument.dividendYieldPct) / 100) }))
    .sort((a, b) => b.annualGbp - a.annualGbp);
  const annual = r2(lines.reduce((x, l) => x + l.annualGbp, 0));
  const invested = views.reduce((x, v) => x + v.valueGbp, 0);
  return { annual, monthly: r2(annual / 12), yieldPct: invested > 0 ? r2((annual / invested) * 100) : 0, lines };
}

// ---------------------------------------------------------------------------
// model portfolios (InvestEngine LifePlans / IG Smart Portfolios style)
// ---------------------------------------------------------------------------

export interface ModelPortfolio {
  id: string;
  name: string;
  equityPct: number;
  risk: 1 | 2 | 3 | 4 | 5;
  blurb: string;
  targets: Record<string, number>;
}

export const MODEL_PORTFOLIOS: ModelPortfolio[] = [
  { id: "cautious", name: "Cautious", equityPct: 20, risk: 1, blurb: "Mostly bonds with a slice of global shares. For money you may need in 3–5 years.", targets: { AGBP: 50, IGLT: 25, VWRL: 15, SGLN: 10 } },
  { id: "balanced", name: "Balanced", equityPct: 40, risk: 2, blurb: "Classic 40/60. Smoother ride, steadier growth.", targets: { VWRL: 30, VUSA: 10, AGBP: 35, IGLT: 20, SGLN: 5 } },
  { id: "moderate", name: "Moderate", equityPct: 60, risk: 3, blurb: "The traditional 60/40 — growth from shares, cushioned by bonds.", targets: { VWRL: 40, VUSA: 15, ISF: 5, AGBP: 25, IGLT: 10, SGLN: 5 } },
  { id: "growth", name: "Growth", equityPct: 80, risk: 4, blurb: "Mostly shares. Expect bigger swings for higher long-run returns.", targets: { VWRL: 45, VUSA: 20, VFEM: 10, ISF: 5, AGBP: 15, SGLN: 5 } },
  { id: "adventurous", name: "Adventurous", equityPct: 100, risk: 5, blurb: "All-in on global equities with a tech tilt. For 10+ year horizons.", targets: { VWRL: 50, VUSA: 20, EQQQ: 10, VFEM: 12, ISF: 8 } },
];

export function modelYield(m: ModelPortfolio): number {
  return r2(Object.entries(m.targets).reduce((x, [k, pct]) => x + ((getInstrument(k)?.dividendYieldPct ?? 0) * pct) / 100, 0));
}

export function modelOcf(m: ModelPortfolio): number {
  return r2(Object.entries(m.targets).reduce((x, [k, pct]) => x + ((getInstrument(k)?.ocfPct ?? 0) * pct) / 100, 0));
}

// ---------------------------------------------------------------------------
// formatting helpers (shared with the UI)
// ---------------------------------------------------------------------------

export function fmt(n: number): string {
  const abs = Math.abs(n);
  const body = abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? "−" : ""}£${body}`;
}

export function fmtQty(q: number): string {
  if (Number.isInteger(q)) return q.toLocaleString();
  return q >= 100 ? q.toFixed(2) : q.toFixed(q >= 1 ? 4 : 6).replace(/0+$/, "").replace(/\.$/, "");
}

export function fmtNativePrice(price: number, i: Instrument): string {
  if (i.currency === "GBX") return `${price.toFixed(2)}p`;
  if (i.currency === "GBP") return `£${price.toFixed(2)}`;
  return `$${price >= 1000 ? Math.round(price).toLocaleString() : price.toFixed(2)}`;
}

export const ALL_SYMBOLS = INSTRUMENTS.map((i) => i.symbol);
