"use client";

import { useEffect } from "react";
import { createStore, useStore } from "./docstore";

// Trade celebrations: every filled buy pops confetti and fireworks, every sell
// rains cash, and a working limit order gets a small sparkle. Users can turn
// the effects and the sounds off in Settings, and reduced-motion is respected.

export type TradeFxKind = "buy" | "sell" | "working" | "rebalance";

export interface TradeFx {
  kind: TradeFxKind;
  symbol: string;
  name?: string;
  qty?: number;
  valueGbp?: number;
  priceLabel?: string;
  account?: string;
  /** True when the order went to a real broker account. */
  real?: boolean;
  /** Free-text detail, e.g. the working order's trigger price. */
  detail?: string;
  /** Screen point to pop the confetti from, e.g. the button that was tapped. */
  origin?: { x: number; y: number };
}

export interface FxPrefs {
  celebrations: boolean;
  sounds: boolean;
}

export const fxPrefsStore = createStore<FxPrefs>("shortlist.fx.v1", () => ({ celebrations: true, sounds: true }));

export function useFxPrefs(): FxPrefs {
  const p = useStore(fxPrefsStore);
  return { celebrations: p?.celebrations ?? true, sounds: p?.sounds ?? true };
}

export function setFxPref(key: keyof FxPrefs, value: boolean): void {
  fxPrefsStore.set((p) => ({ celebrations: p?.celebrations ?? true, sounds: p?.sounds ?? true, [key]: value }));
}

type Listener = (t: TradeFx & { id: number }) => void;
const listeners = new Set<Listener>();
let seq = 0;

let busyUntil = 0;

/** When the trade card will have closed, so other toasts can wait their turn. */
export function tradeFxBusyUntil(): number {
  return busyUntil;
}

export function celebrateTrade(t: TradeFx): void {
  busyUntil = Date.now() + (t.kind === "working" ? 3300 : 4700);
  const item = { ...t, id: ++seq };
  listeners.forEach((l) => l(item));
}

export function useTradeFxListener(l: Listener): void {
  useEffect(() => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, [l]);
}

/** Centre of an element, for popping confetti from the button that was tapped. */
export function originOf(el: Element | null | undefined): { x: number; y: number } | undefined {
  if (!el) return undefined;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
