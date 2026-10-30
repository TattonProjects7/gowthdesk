"use client";

import { useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// A tiny document store: one JSON document per key, persisted to localStorage
// and — when the user is signed in — mirrored to the `user_state` table in
// Supabase. Every new feature (portfolio, watchlists, price alerts, savings
// plans, settings) is a document, so they all get offline-first behaviour and
// cross-device sync from one implementation.
//
//   const store = createStore("shortlist.watchlists.v1", () => initial);
//   const value = useStore(store);     // in components
//   store.set(prev => next);           // anywhere (engine, event handlers)

type Listener = () => void;

export interface Store<T> {
  key: string;
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(l: Listener): () => void;
  /** Server/hydration snapshot — stable reference, never reads the browser. */
  serverSnapshot(): T;
}

interface Registered {
  store: Store<unknown>;
  /** Apply a cloud value without echoing it back to the cloud. */
  applyRemote(value: unknown, updatedAt: number): void;
  updatedAt(): number;
}

const REGISTRY = new Map<string, Registered>();
const META_SUFFIX = ":updated";

export function createStore<T>(key: string, initial: () => T): Store<T> {
  let cached: T | undefined;
  let loaded = false;
  let server: T | undefined;
  let updatedAt = 0;
  const listeners = new Set<Listener>();

  const load = (): T => {
    if (loaded) return cached as T;
    loaded = true;
    if (typeof window === "undefined") {
      cached = initial();
      return cached;
    }
    try {
      const raw = window.localStorage.getItem(key);
      cached = raw ? (JSON.parse(raw) as T) : initial();
      updatedAt = Number(window.localStorage.getItem(key + META_SUFFIX) || 0);
    } catch {
      cached = initial();
    }
    return cached as T;
  };

  const persist = (value: T, ts: number) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.localStorage.setItem(key + META_SUFFIX, String(ts));
    } catch {
      /* quota / private mode — keep in memory */
    }
  };

  const notify = () => listeners.forEach((l) => l());

  const store: Store<T> = {
    key,
    get: () => load(),
    set: (next) => {
      const prev = load();
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (value === prev) return;
      cached = value;
      updatedAt = Date.now();
      if (typeof window !== "undefined") {
        persist(value, updatedAt);
        scheduleCloudPush(key, value, updatedAt);
      }
      notify();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    serverSnapshot: () => {
      if (server === undefined) server = initial();
      return server;
    },
  };

  REGISTRY.set(key, {
    store: store as Store<unknown>,
    applyRemote: (value, ts) => {
      cached = value as T;
      loaded = true;
      updatedAt = ts;
      persist(cached, ts);
      notify();
    },
    updatedAt: () => {
      load();
      return updatedAt;
    },
  });

  // Cross-tab sync.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === key) {
        loaded = false;
        load();
        notify();
      }
    });
  }

  return store;
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.serverSnapshot);
}

// ---------------------------------------------------------------------------
// Cloud mirror (Supabase `user_state`): attached by <CloudSync/> on sign-in.
// ---------------------------------------------------------------------------

let cloud: { supabase: SupabaseClient; userId: string } | null = null;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleCloudPush(key: string, value: unknown, updatedAt: number) {
  if (!cloud) return;
  const existing = pending.get(key);
  if (existing) clearTimeout(existing);
  pending.set(
    key,
    setTimeout(() => {
      pending.delete(key);
      pushToCloud(key, value, updatedAt);
    }, 800),
  );
}

async function pushToCloud(key: string, value: unknown, updatedAt: number) {
  if (!cloud) return;
  try {
    await cloud.supabase
      .from("user_state")
      .upsert({ user_id: cloud.userId, key, value, updated_at: new Date(updatedAt).toISOString() }, { onConflict: "user_id,key" });
  } catch {
    /* offline — the local copy is authoritative until next push */
  }
}

// Called once per sign-in. Pulls every registered document; the newer copy
// (cloud vs local) wins, and local-only data is pushed up.
export async function attachCloud(supabase: SupabaseClient, userId: string): Promise<void> {
  cloud = { supabase, userId };
  try {
    const { data } = await supabase.from("user_state").select("key,value,updated_at").eq("user_id", userId);
    const remote = new Map<string, { value: unknown; ts: number }>();
    for (const row of data ?? []) {
      remote.set(String(row.key), { value: row.value, ts: new Date(String(row.updated_at)).getTime() });
    }
    for (const [key, reg] of REGISTRY) {
      const r = remote.get(key);
      const localTs = reg.updatedAt();
      if (r && r.ts > localTs) reg.applyRemote(r.value, r.ts);
      else if (localTs > 0 && (!r || localTs > r.ts)) pushToCloud(key, reg.store.get(), localTs);
    }
  } catch {
    /* cloud unavailable — stay local */
  }
}

export function detachCloud(): void {
  cloud = null;
}

export function cloudAttached(): boolean {
  return cloud !== null;
}
