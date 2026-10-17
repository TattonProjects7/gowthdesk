"use client";

import { createStore, useStore } from "./docstore";
import { raise } from "./alerts";
import * as P from "./portfolio";

// The live portfolio document + the actions the UI and engine call. All the
// maths lives in portfolio.ts; this file only wires it to the store and to the
// alert feed.

export const portfolioStore = createStore<P.PortfolioState>("shortlist.portfolio.v1", () => P.initialState());

export function usePortfolio(): P.PortfolioState {
  return P.ensureState(useStore(portfolioStore));
}

export function makePricer(now: number, priceFor: (s: string) => number, closesFor: (s: string) => number[]): P.Pricer {
  return {
    now,
    price: priceFor,
    prevClose: (s) => {
      const c = closesFor(s);
      return c.length >= 2 ? c[c.length - 2] : priceFor(s);
    },
  };
}

function emit(events: P.EngineEvent[]) {
  for (const e of events) {
    const title = e.kind === "income" ? "💷 Dividend received" : e.kind === "protection" ? "🛡 Position closed" : e.kind === "plan" ? "🔁 Automation ran" : "✅ Order update";
    raise({ id: e.id, type: e.kind, symbol: e.symbol, message: e.message, title });
  }
}

function update<R>(op: (s: P.PortfolioState) => { state: P.PortfolioState } & R): R {
  let out!: R;
  portfolioStore.set((prev) => {
    const r = op(P.ensureState(prev));
    out = r;
    return r.state;
  });
  return out;
}

export const portfolio = {
  place(input: P.OrderInput, p: P.Pricer): P.OrderResult {
    const r = update((s) => P.placeOrder(s, input, p));
    emit(r.events);
    return r;
  },
  cancel(orderId: string) {
    portfolioStore.set((s) => P.cancelOrder(P.ensureState(s), orderId));
  },
  deposit(accountId: string, amount: number) {
    portfolioStore.set((s) => P.deposit(P.ensureState(s), accountId, amount, Date.now()));
  },
  withdraw(accountId: string, amount: number): string | undefined {
    return update((s) => P.withdraw(s, accountId, amount, Date.now())).error;
  },
  transfer(fromId: string, toId: string, amount: number): string | undefined {
    return update((s) => P.transfer(s, fromId, toId, amount, Date.now())).error;
  },
  openAccount(type: P.AccountType): P.Account {
    return update((s) => P.openAccount(s, type, Date.now())).account;
  },
  setTargets(accountId: string, targets: Record<string, number>) {
    portfolioStore.set((s) => P.setTargets(P.ensureState(s), accountId, targets));
  },
  applyModel(accountId: string, modelId: string) {
    const m = P.MODEL_PORTFOLIOS.find((x) => x.id === modelId);
    if (m) portfolioStore.set((s) => P.setTargets(P.ensureState(s), accountId, m.targets));
  },
  setAutoInvest(accountId: string, enabled: boolean, buffer: number) {
    portfolioStore.set((s) => P.setAutoInvest(P.ensureState(s), accountId, enabled, buffer));
  },
  setProtection(holdingId: string, p: { stopLoss?: number | null; takeProfit?: number | null; trailingPct?: number | null }) {
    portfolioStore.set((s) => P.setProtection(P.ensureState(s), holdingId, p));
  },
  addPlan(plan: Omit<P.SavingsPlan, "id" | "runs" | "active" | "createdAt">) {
    portfolioStore.set((s) => P.addSavingsPlan(P.ensureState(s), plan, Date.now()));
  },
  updatePlan(id: string, patch: Partial<P.SavingsPlan>) {
    portfolioStore.set((s) => P.updateSavingsPlan(P.ensureState(s), id, patch));
  },
  removePlan(id: string) {
    portfolioStore.set((s) => P.removeSavingsPlan(P.ensureState(s), id));
  },
  /** Invest an amount of the account's cash across its target weights (Smart Top-Up). */
  topUp(accountId: string, amount: number, p: P.Pricer): { errors: string[]; count: number } {
    const r = update((s) => {
      const allocs = P.smartTopUpPlan(s, accountId, amount, p);
      const x = P.executeAllocations(s, accountId, allocs, p, "autoinvest");
      return { ...x, count: allocs.length };
    });
    emit(r.events);
    return { errors: r.errors, count: r.count };
  },
  rebalance(accountId: string, p: P.Pricer): { legs: P.RebalanceLeg[]; errors: string[] } {
    const r = update((s) => P.executeRebalance(s, accountId, p));
    emit(r.events);
    return { legs: r.legs, errors: r.errors };
  },
  /** One engine pass; `full` includes savings plans, AutoInvest and dividends. */
  tick(p: P.Pricer, full: boolean) {
    const r = update((s) => P.tick(s, p, full));
    emit(r.events);
  },
  reset() {
    portfolioStore.set(() => P.initialState());
  },
};
