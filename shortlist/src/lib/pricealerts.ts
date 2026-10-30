"use client";

import { createStore, useStore } from "./docstore";
import { getInstrument } from "./instruments";
import type { Pricer } from "./portfolio";

// User-defined price alerts (IG-style): "tell me when X goes above/below £Y" or
// "moves more than Z% today". Checked on every market tick by the engine and
// surfaced in the alert feed + a push/browser notification.

export type PriceAlertKind = "above" | "below" | "pct_up" | "pct_down";

export interface PriceAlert {
  id: string;
  symbol: string;
  kind: PriceAlertKind;
  value: number; // native price for above/below; percent for pct_*
  createdAt: number;
  triggeredAt: number | null;
  triggeredPrice?: number;
}

export const priceAlertStore = createStore<PriceAlert[]>("shortlist.pricealerts.v1", () => []);

export function usePriceAlerts(): PriceAlert[] {
  const v = useStore(priceAlertStore);
  return Array.isArray(v) ? v : [];
}

export function addPriceAlert(symbol: string, kind: PriceAlertKind, value: number): string | null {
  const sym = symbol.toUpperCase();
  if (!getInstrument(sym) || !(value > 0)) return null;
  const id = `pa_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
  priceAlertStore.set((prev) => [{ id, symbol: sym, kind, value, createdAt: Date.now(), triggeredAt: null }, ...prev]);
  return id;
}

export function removePriceAlert(id: string): void {
  priceAlertStore.set((prev) => prev.filter((a) => a.id !== id));
}

/** Re-arm a triggered alert. */
export function resetPriceAlert(id: string): void {
  priceAlertStore.set((prev) => prev.map((a) => (a.id === id ? { ...a, triggeredAt: null, triggeredPrice: undefined } : a)));
}

export function describeAlert(a: PriceAlert): string {
  const i = getInstrument(a.symbol);
  const unit = i?.currency === "GBX" ? "p" : i?.currency === "GBP" ? "£" : "$";
  const price = unit === "p" ? `${a.value}p` : `${unit}${a.value.toLocaleString()}`;
  switch (a.kind) {
    case "above":
      return `${a.symbol} rises above ${price}`;
    case "below":
      return `${a.symbol} falls below ${price}`;
    case "pct_up":
      return `${a.symbol} up more than ${a.value}% today`;
    case "pct_down":
      return `${a.symbol} down more than ${a.value}% today`;
  }
}

/** Evaluate every armed alert; mark the ones that fire and return them. Pure apart from the store write. */
export function evaluatePriceAlerts(alerts: PriceAlert[], p: Pricer): PriceAlert[] {
  const fired: PriceAlert[] = [];
  for (const a of alerts) {
    if (a.triggeredAt) continue;
    const price = p.price(a.symbol);
    if (!(price > 0)) continue;
    let hit = false;
    if (a.kind === "above") hit = price >= a.value;
    else if (a.kind === "below") hit = price <= a.value;
    else {
      const prev = p.prevClose(a.symbol);
      const chg = prev > 0 ? ((price - prev) / prev) * 100 : 0;
      hit = a.kind === "pct_up" ? chg >= a.value : chg <= -a.value;
    }
    if (hit) fired.push({ ...a, triggeredAt: p.now, triggeredPrice: price });
  }
  return fired;
}

export function checkPriceAlerts(p: Pricer): PriceAlert[] {
  const fired = evaluatePriceAlerts(priceAlertStore.get(), p);
  if (fired.length) {
    const byId = new Map(fired.map((f) => [f.id, f]));
    priceAlertStore.set((prev) => prev.map((a) => byId.get(a.id) ?? a));
  }
  return fired;
}
