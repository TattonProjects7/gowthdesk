"use client";

import { useSyncExternalStore } from "react";
import type { BrokerAccount, BrokerEnv, BrokerOrder, BrokerStatus, PlaceRealOrder } from "./types";

// Demo mode vs real mode.
//   demo: the built-in £10,000 practice portfolio (everything works offline).
//   real: your own Trading 212 account (practice or live server), through the
//         /api/broker routes. The API key lives only in an httpOnly cookie.
// The chosen mode is kept on this device only, never synced, so a phone can't
// silently switch another device into real money.

export type TradeMode = "demo" | "real";

const MODE_KEY = "shortlist.mode.v1";
let mode: TradeMode = "demo";
let modeLoaded = false;
const modeListeners = new Set<() => void>();

function loadMode(): void {
  if (modeLoaded || typeof window === "undefined") return;
  modeLoaded = true;
  try {
    if (window.localStorage.getItem(MODE_KEY) === "real") mode = "real";
  } catch {
    /* storage unavailable */
  }
}

export function getMode(): TradeMode {
  loadMode();
  return mode;
}

export function setMode(m: TradeMode): void {
  mode = m;
  modeLoaded = true;
  try {
    window.localStorage.setItem(MODE_KEY, m);
  } catch {
    /* storage unavailable */
  }
  modeListeners.forEach((l) => l());
}

export function useMode(): TradeMode {
  return useSyncExternalStore(
    (l) => {
      modeListeners.add(l);
      return () => modeListeners.delete(l);
    },
    getMode,
    () => "demo",
  );
}

// ------------------------------------------------------------ broker state

export interface BrokerState {
  status: BrokerStatus | null;
  account: BrokerAccount | null;
  loading: boolean;
  error: string | null;
  connectOpen: boolean;
}

const SERVER_STATE: BrokerState = { status: null, account: null, loading: false, error: null, connectOpen: false };
let state: BrokerState = SERVER_STATE;
const listeners = new Set<() => void>();

function patch(p: Partial<BrokerState>): void {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}

export function useBroker(): BrokerState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER_STATE,
  );
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-shortlist": "1", ...(init?.headers ?? {}) },
    credentials: "same-origin",
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j as T;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export const broker = {
  async refreshStatus(): Promise<BrokerStatus | null> {
    try {
      const s = await call<BrokerStatus>("/api/broker/status");
      patch({ status: s });
      return s;
    } catch {
      const s: BrokerStatus = { broker: "trading212", configured: false, connected: false };
      patch({ status: s });
      return s;
    }
  },

  async refreshAccount(): Promise<void> {
    if (!state.status?.connected) return;
    patch({ loading: true });
    try {
      const a = await call<BrokerAccount>("/api/broker/account");
      patch({ account: a, error: null });
    } catch (e) {
      const m = msg(e);
      if (/Connect your Trading 212/.test(m)) patch({ status: { ...(state.status as BrokerStatus), connected: false }, account: null, error: null });
      else patch({ error: m });
    } finally {
      patch({ loading: false });
    }
  },

  async connect(env: BrokerEnv, key: string, secret: string | undefined, acceptLive: boolean): Promise<void> {
    const r = await call<{ env: BrokerEnv; accountId: number; currency: string }>("/api/broker/connect", {
      method: "POST",
      body: JSON.stringify({ env, key, secret: secret || undefined, acceptLive }),
    });
    patch({ status: { broker: "trading212", configured: true, connected: true, env: r.env, accountId: r.accountId, currency: r.currency }, connectOpen: false, error: null, account: null });
    setMode("real");
    await broker.refreshAccount();
  },

  async disconnect(): Promise<void> {
    try {
      await call("/api/broker/disconnect", { method: "POST" });
    } finally {
      patch({ status: state.status ? { ...state.status, connected: false, env: undefined, accountId: undefined } : null, account: null });
      setMode("demo");
    }
  },

  async place(o: PlaceRealOrder): Promise<BrokerOrder> {
    const r = await call<{ order: BrokerOrder }>("/api/broker/orders", { method: "POST", body: JSON.stringify(o) });
    void broker.refreshAccount();
    return r.order;
  },

  async cancel(id: number): Promise<void> {
    await call(`/api/broker/orders/${id}`, { method: "DELETE" });
    void broker.refreshAccount();
  },

  openConnect(): void {
    patch({ connectOpen: true });
  },

  closeConnect(): void {
    patch({ connectOpen: false });
  },
};

/** Switch between demo and real. Real needs a connected account first. */
export async function switchMode(m: TradeMode): Promise<void> {
  if (m === "demo") return setMode("demo");
  const s = state.status ?? (await broker.refreshStatus());
  if (s?.connected) {
    setMode("real");
    void broker.refreshAccount();
  } else broker.openConnect();
}
