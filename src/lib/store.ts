"use client";

import { useCallback, useEffect, useState } from "react";
import { round2 } from "./market";
import { useAuth } from "@/lib/auth";

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

// Map a Supabase row to the in-app shape (numeric columns may arrive as strings).
function rowToShort(r: Record<string, unknown>): TakenShort {
  return {
    id: String(r.id),
    symbol: String(r.symbol),
    name: String(r.name),
    entry: Number(r.entry),
    stop: Number(r.stop),
    target: Number(r.target),
    shares: Number(r.shares),
    maxLoss: Number(r.max_loss),
    maxGain: Number(r.max_gain),
    rewardRisk: Number(r.reward_risk),
    openedAt: new Date(String(r.opened_at)).getTime(),
  };
}

// Tracked shorts persist to Supabase when the user is signed in, and to
// localStorage otherwise — same API either way, so the UI never branches.
export function useTakenShorts() {
  const { supabase, user } = useAuth();
  const cloud = Boolean(supabase && user);
  const [items, setItems] = useState<TakenShort[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (cloud && supabase && user) {
      let active = true;
      supabase
        .from("tracked_shorts")
        .select("*")
        .order("opened_at", { ascending: false })
        .then(({ data }) => {
          if (active && data) setItems(data.map(rowToShort));
        });
      return () => {
        active = false;
      };
    }

    setItems(load());
    const sync = () => setItems(load());
    window.addEventListener("shortlist:change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shortlist:change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [cloud, supabase, user]);

  const take = useCallback(
    async (t: Omit<TakenShort, "id" | "openedAt">): Promise<boolean> => {
      if (items.some((x) => x.symbol === t.symbol)) return false; // one per symbol

      if (cloud && supabase && user) {
        const { data, error } = await supabase
          .from("tracked_shorts")
          .insert({
            user_id: user.id,
            symbol: t.symbol,
            name: t.name,
            entry: t.entry,
            stop: t.stop,
            target: t.target,
            shares: t.shares,
            max_loss: t.maxLoss,
            max_gain: t.maxGain,
            reward_risk: t.rewardRisk,
          })
          .select()
          .single();
        if (error || !data) return false;
        setItems((prev) => [rowToShort(data), ...prev]);
        return true;
      }

      const next = [{ ...t, id: makeId(), openedAt: Date.now() }, ...load()];
      persist(next);
      setItems(next);
      return true;
    },
    [cloud, supabase, user, items],
  );

  const drop = useCallback(
    async (id: string) => {
      if (cloud && supabase && user) {
        await supabase.from("tracked_shorts").delete().eq("id", id);
        setItems((prev) => prev.filter((x) => x.id !== id));
        return;
      }
      const next = load().filter((x) => x.id !== id);
      persist(next);
      setItems(next);
    },
    [cloud, supabase, user],
  );

  const has = useCallback((symbol: string) => items.some((x) => x.symbol === symbol), [items]);

  return { items, take, drop, has, mounted };
}

// --- Live evaluation of a taken short (price comes from the active data source) -

export function shortPnl(t: TakenShort, price: number): number {
  // Clamp to the structure: once price reaches the stop or target the trade is
  // treated as closed there, so the loss can never exceed maxLoss and the gain
  // never exceeds maxGain. This is what makes "lose small, win big" honest.
  const effective = Math.max(t.target, Math.min(t.stop, price));
  return round2((t.entry - effective) * t.shares); // shorts profit when price falls
}

export function shortState(t: TakenShort, price: number): ShortState {
  if (price >= t.stop) return "stopped"; // capped small loss
  if (price <= t.target) return "won"; // big win
  return "open";
}

// 0–1 progress from stop (0) toward target (1), for a payoff bar.
export function shortProgress(t: TakenShort, price: number): number {
  const span = t.stop - t.target;
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (t.stop - price) / span));
}

// --- Expectancy / R-multiple analytics --------------------------------------
// "R" = result expressed in units of risk. Risking £maxLoss, a +£maxLoss result
// is +1R. Expectancy (avg R per trade) is the single number that says whether
// the asymmetric edge actually pays — a positive expectancy is the whole game.

export interface TrackerStats {
  closed: number;
  open: number;
  winRate: number; // % of closed trades that won
  expectancyR: number; // average R across closed trades
  avgWinR: number;
  avgLossR: number;
  totalR: number;
  totalPnl: number;
  interpretation: string;
}

export function trackerStats(items: TakenShort[], priceFor: (s: string) => number, riskBudget: number): TrackerStats {
  const withState = items.map((t) => {
    const price = priceFor(t.symbol);
    return { t, price, state: shortState(t, price), pnl: shortPnl(t, price) };
  });
  const closed = withState.filter((x) => x.state !== "open");
  const open = withState.length - closed.length;
  const totalPnl = round2(withState.reduce((a, x) => a + x.pnl, 0));

  if (closed.length === 0) {
    return { closed: 0, open, winRate: 0, expectancyR: 0, avgWinR: 0, avgLossR: 0, totalR: 0, totalPnl, interpretation: "Close out a tracked short (target or stop) to start measuring your edge in R." };
  }

  const rs = closed.map((x) => x.pnl / x.t.maxLoss);
  const winsR = rs.filter((r) => r > 0);
  const lossR = rs.filter((r) => r <= 0);
  const winRate = (winsR.length / rs.length) * 100;
  const expectancyR = rs.reduce((a, b) => a + b, 0) / rs.length;
  const avgWinR = winsR.length ? winsR.reduce((a, b) => a + b, 0) / winsR.length : 0;
  const avgLossR = lossR.length ? lossR.reduce((a, b) => a + b, 0) / lossR.length : 0;
  const totalR = rs.reduce((a, b) => a + b, 0);

  const interpretation =
    expectancyR > 0.05
      ? `Positive expectancy of +${expectancyR.toFixed(2)}R — each £${riskBudget} risked returns about £${Math.round(expectancyR * riskBudget)} on average. The asymmetry is paying.`
      : expectancyR < -0.05
        ? `Negative expectancy of ${expectancyR.toFixed(2)}R — you're losing about £${Math.round(Math.abs(expectancyR) * riskBudget)} per £${riskBudget} risked. Tighten setup selection or stops.`
        : "Roughly break-even so far — not enough edge yet to call it.";

  return {
    closed: closed.length,
    open,
    winRate: Math.round(winRate),
    expectancyR: round2(expectancyR),
    avgWinR: round2(avgWinR),
    avgLossR: round2(avgLossR),
    totalR: round2(totalR),
    totalPnl,
    interpretation,
  };
}
