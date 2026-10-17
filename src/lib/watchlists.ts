"use client";

import { createStore, useStore } from "./docstore";
import { getInstrument } from "./instruments";

// Watchlists, IG-style: up to 50 named lists, each an ordered set of symbols.
// Synced across devices when signed in (see docstore.ts).

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
  createdAt: number;
}

export const MAX_WATCHLISTS = 50;
const DEFAULT_ID = "wl_default";

export const watchlistStore = createStore<Watchlist[]>("shortlist.watchlists.v1", () => [
  { id: DEFAULT_ID, name: "My watchlist", symbols: ["VUSA", "AAPL", "LLOY", "NVDA", "BTC"], createdAt: 0 },
]);

export function useWatchlists(): Watchlist[] {
  const lists = useStore(watchlistStore);
  return Array.isArray(lists) && lists.length ? lists : watchlistStore.serverSnapshot();
}

function id(): string {
  return `wl_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e5).toString(36)}`;
}

export function createWatchlist(name: string): string | null {
  let created: string | null = null;
  watchlistStore.set((prev) => {
    if (prev.length >= MAX_WATCHLISTS) return prev;
    const w: Watchlist = { id: id(), name: name.trim() || `Watchlist ${prev.length + 1}`, symbols: [], createdAt: Date.now() };
    created = w.id;
    return [...prev, w];
  });
  return created;
}

export function renameWatchlist(listId: string, name: string): void {
  watchlistStore.set((prev) => prev.map((w) => (w.id === listId ? { ...w, name: name.trim() || w.name } : w)));
}

export function deleteWatchlist(listId: string): void {
  watchlistStore.set((prev) => (prev.length > 1 ? prev.filter((w) => w.id !== listId) : prev));
}

export function toggleSymbol(listId: string, symbol: string): void {
  const sym = symbol.toUpperCase();
  if (!getInstrument(sym)) return;
  watchlistStore.set((prev) =>
    prev.map((w) => (w.id === listId ? { ...w, symbols: w.symbols.includes(sym) ? w.symbols.filter((s) => s !== sym) : [...w.symbols, sym] } : w)),
  );
}

export function reorderSymbol(listId: string, symbol: string, dir: -1 | 1): void {
  watchlistStore.set((prev) =>
    prev.map((w) => {
      if (w.id !== listId) return w;
      const i = w.symbols.indexOf(symbol);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= w.symbols.length) return w;
      const next = [...w.symbols];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...w, symbols: next };
    }),
  );
}

/** Which lists contain the symbol. */
export function listsContaining(lists: Watchlist[], symbol: string): Watchlist[] {
  return lists.filter((w) => w.symbols.includes(symbol.toUpperCase()));
}
