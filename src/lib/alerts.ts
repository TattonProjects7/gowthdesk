"use client";

import { useCallback, useEffect, useState } from "react";

export type AlertType = "target" | "stop" | "agrade";

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
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
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
