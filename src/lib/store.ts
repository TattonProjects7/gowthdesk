"use client";

import { useCallback, useEffect, useState } from "react";
import { priceAt, round2 } from "./market";

// A short the user chose to track. We persist the *structure as taken* so the
// asymmetry (small capped loss, big target) is fixed at entry and can play out.
export interface TakenShort {
  id: string;
  symbol: string;
  name: string;
  entry: number;
  stop: number;
  target: number;
  shares: number;
  maxLoss: number;
  maxGain: number;
  rewardRisk: number;
  openedAt: number;
}

export type ShortState = "open" | "won" | "stopped";

const KEY = "shortlist.taken.v1";

function load(): TakenShort[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TakenShort[]) : [];
  } catch {
    return [];
  }
}

function persist(items: TakenShort[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("shortlist:change"));
  } catch {
    /* ignore quota / private mode */
  }
}

function makeId(): string {
  return "s_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 1e6).toString(36);
}

export function useTakenShorts() {
  const [items, setItems] = useState<TakenShort[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(load());
    setMounted(true);
    const sync = () => setItems(load());
    window.addEventListener("shortlist:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shortlist:change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const take = useCallback((t: Omit<TakenShort, "id" | "openedAt">) => {
    const exists = load().some((x) => x.symbol === t.symbol);
    if (exists) return false; // one tracked short per symbol keeps the demo clean
    const next = [{ ...t, id: makeId(), openedAt: Date.now() }, ...load()];
    persist(next);
    setItems(next);
    return true;
  }, []);

  const drop = useCallback((id: string) => {
    const next = load().filter((x) => x.id !== id);
    persist(next);
    setItems(next);
  }, []);

  const has = useCallback((symbol: string) => items.some((x) => x.symbol === symbol), [items]);

  return { items, take, drop, has, mounted };
}

// --- Live evaluation of a taken short ---------------------------------------

export function shortPnl(t: TakenShort, now: number): number {
  const price = priceAt(t.symbol, now);
  // Clamp to the structure: once price reaches the stop or target the trade is
  // treated as closed there, so the loss can never exceed maxLoss and the gain
  // never exceeds maxGain. This is what makes "lose small, win big" honest.
  const effective = Math.max(t.target, Math.min(t.stop, price));
  return round2((t.entry - effective) * t.shares); // shorts profit when price falls
}

export function shortState(t: TakenShort, now: number): ShortState {
  const price = priceAt(t.symbol, now);
  if (price >= t.stop) return "stopped"; // capped small loss
  if (price <= t.target) return "won"; // big win
  return "open";
}

// 0–1 progress from stop (0) toward target (1), for a payoff bar.
export function shortProgress(t: TakenShort, now: number): number {
  const price = priceAt(t.symbol, now);
  const span = t.stop - t.target;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (t.stop - price) / span));
}
