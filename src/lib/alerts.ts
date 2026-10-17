"use client";

import { useCallback, useEffect, useState } from "react";
import { isNative } from "./platform";
import { nativeNotify } from "./native";

// The in-app alert feed. Short-side alerts (target/stop/A-grade) and the
// investing-side ones (price alerts, order fills, protections, savings plans,
// dividends) all land here, so the bell in the header is the one inbox.
export type AlertType = "target" | "stop" | "agrade" | "price" | "order" | "protection" | "plan" | "income";

export interface Alert {
  id: string; // also the dedupe key — pushing an existing id is a no-op
  type: AlertType;
  symbol: string;
  message: string;
  ts: number;
  seen: boolean;
}

const KEY = "shortlist.alerts.v1";
const EVENT = "shortlist:alerts";

function load(): Alert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Alert[]) : [];
  } catch {
    return [];
  }
}

function save(items: Alert[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

// Returns true if a NEW alert was added (so callers can fire a notification).
export function pushAlert(a: { id: string; type: AlertType; symbol: string; message: string }): boolean {
  const items = load();
  if (items.some((x) => x.id === a.id)) return false;
  save([{ ...a, ts: Date.now(), seen: false }, ...items]);
  return true;
}

// OS notification when the user has allowed it: a real iOS / Android
// notification inside the apps, a browser notification on the web.
export function notify(title: string, body: string): void {
  if (isNative()) {
    nativeNotify(title, body);
    return;
  }
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

/** Push to the feed and notify in one go; returns true if it was new. */
export function raise(a: { id: string; type: AlertType; symbol: string; message: string; title?: string }): boolean {
  const added = pushAlert(a);
  if (added) notify(a.title ?? a.symbol ?? "Shortlist", a.message);
  return added;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAlerts(load());
    setMounted(true);
    const sync = () => setAlerts(load());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const markAllSeen = useCallback(() => {
    save(load().map((a) => ({ ...a, seen: true })));
  }, []);

  const clear = useCallback(() => save([]), []);

  const unseen = alerts.filter((a) => !a.seen).length;
  return { alerts, unseen, mounted, markAllSeen, clear };
}
