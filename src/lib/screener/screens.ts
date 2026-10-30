"use client";

import { createStore, useStore } from "../docstore";
import type { SignalId } from "./snapshot";
import type { ViewId } from "./columns";

// Saved screens. Each is a document entry, so it syncs across devices with the
// rest of the user's data. A screen with `alert` on raises an alert whenever a
// share newly enters it — Finviz Elite's screener alerts, on the free plan.

export interface SavedScreen {
  id: string;
  name: string;
  filters: string[];
  signal: SignalId | "";
  sort: string;
  view: ViewId;
  alert: boolean;
  /** Symbols matching when the alert engine last looked, to spot new entrants. */
  last?: string[];
  createdAt: number;
}

export const MAX_SCREENS = 30;

export const screensStore = createStore<SavedScreen[]>("shortlist.screens.v1", () => []);

export function useSavedScreens(): SavedScreen[] {
  return useStore(screensStore) ?? [];
}

export function saveScreen(s: Omit<SavedScreen, "id" | "createdAt" | "last">): string | null {
  const list = screensStore.get() ?? [];
  if (list.length >= MAX_SCREENS) return null;
  const id = `scr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  screensStore.set([{ ...s, name: s.name.trim().slice(0, 60) || "My screen", id, createdAt: Date.now() }, ...list]);
  return id;
}

export function deleteScreen(id: string): void {
  screensStore.set((l) => (l ?? []).filter((s) => s.id !== id));
}

export function setScreenAlert(id: string, alert: boolean): void {
  // Turning an alert on starts from the current matches, so only *new* entrants fire.
  screensStore.set((l) => (l ?? []).map((s) => (s.id === id ? { ...s, alert, last: alert ? undefined : s.last } : s)));
}

export function setScreenMatches(id: string, symbols: string[]): void {
  screensStore.set((l) => (l ?? []).map((s) => (s.id === id ? { ...s, last: symbols } : s)));
}

/** Encode a screen as URL search params for sharing. */
export function screenToQuery(s: { filters: string[]; signal?: string; sort?: string; view?: string }): string {
  const p = new URLSearchParams();
  if (s.filters.length) p.set("f", s.filters.join(","));
  if (s.signal) p.set("s", s.signal);
  if (s.sort && s.sort !== "-cap") p.set("o", s.sort);
  if (s.view && s.view !== "overview") p.set("v", s.view);
  const q = p.toString();
  return q ? `?${q}` : "";
}
