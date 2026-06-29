"use client";

import { useEffect } from "react";
import { useMarket } from "@/lib/useMarket";
import { useTakenShorts, shortState } from "@/lib/store";
import { scanMarket } from "@/lib/shorts";
import { pushAlert } from "@/lib/alerts";

// Mounted once in the layout. Watches the live market and the user's tracked
// shorts, and raises alerts when: a tracked short hits its target or stop, or a
// fresh A-grade setup appears. Fires a browser notification too when permitted.
export default function AlertEngine() {
  const { mounted, priceFor, closesFor } = useMarket();
  const { items } = useTakenShorts();

  useEffect(() => {
    if (!mounted) return;

    const notify = (title: string, body: string) => {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(title, { body });
        } catch {
          /* ignore */
        }
      }
    };

    // 1. Tracked shorts reaching a terminal state (once per position per outcome).
    for (const t of items) {
      const state = shortState(t, priceFor(t.symbol));
      if (state === "won") {
        if (pushAlert({ id: `target:${t.id}`, type: "target", symbol: t.symbol, message: `${t.symbol} hit your target — +£${t.maxGain.toLocaleString()}. The big win landed.` }))
          notify(`🎯 ${t.symbol} hit target`, `+£${t.maxGain.toLocaleString()} — your short played out.`);
      } else if (state === "stopped") {
        if (pushAlert({ id: `stop:${t.id}`, type: "stop", symbol: t.symbol, message: `${t.symbol} hit your stop — loss capped at £${t.maxLoss}. Lose small, move on.` }))
          notify(`🛑 ${t.symbol} stopped out`, `Loss capped at £${t.maxLoss}.`);
      }
    }

    // 2. Fresh A-grade setups (once per symbol per day).
    const day = new Date().toISOString().slice(0, 10);
    const tracked = new Set(items.map((i) => i.symbol));
    const top = scanMarket(closesFor).filter((c) => c.grade === "A" || c.grade === "A−");
    for (const c of top) {
      if (tracked.has(c.symbol)) continue;
      if (pushAlert({ id: `agrade:${c.symbol}:${day}`, type: "agrade", symbol: c.symbol, message: `New A-grade short: ${c.symbol} scores ${c.score}/100 — ${c.headline}` }))
        notify(`📉 A-grade short: ${c.symbol}`, c.headline);
    }
  }, [mounted, items, priceFor, closesFor]);

  return null;
}
