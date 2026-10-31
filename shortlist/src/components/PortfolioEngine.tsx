"use client";

import { useEffect, useRef } from "react";
import { useMarket } from "@/lib/useMarket";
import { makePricer, portfolio, portfolioStore } from "@/lib/portfolioStore";
import { checkPriceAlerts, describeAlert } from "@/lib/pricealerts";
import { raise } from "@/lib/alerts";
import { getInstrument, fmtNative } from "@/lib/instruments";

// Mounted once in the layout. Every second or so it fills working orders,
// enforces stop-loss / take-profit / trailing stops and fires price alerts;
// every ~30s it also runs the slower automation — savings plans, AutoInvest
// and dividend credits. All state changes go through portfolioStore so every
// open screen updates instantly.
export default function PortfolioEngine() {
  const { mounted, now, priceFor, closesFor } = useMarket();
  const lastFull = useRef(0);
  const lastRun = useRef(0);

  useEffect(() => {
    if (!mounted || !now) return;
    // Real-time prices update several times a second; checking orders, stops
    // and alerts once a second is plenty and keeps storage writes down.
    const t = Date.now();
    if (t - lastRun.current < 1000) return;
    lastRun.current = t;
    const p = makePricer(now, priceFor, closesFor);

    // Skip the heavy pass when there is nothing to do.
    const s = portfolioStore.get();
    const hasWork = s.orders.some((o) => o.status === "pending") || s.holdings.length > 0 || s.savingsPlans.some((x) => x.active) || s.accounts.some((a) => a.autoInvest.enabled);
    const full = now - lastFull.current > 30_000;
    if (hasWork || full) {
      portfolio.tick(p, full);
      if (full) lastFull.current = now;
    }

    for (const a of checkPriceAlerts(p)) {
      const i = getInstrument(a.symbol);
      raise({
        id: `price:${a.id}:${a.triggeredAt}`,
        type: "price",
        symbol: a.symbol,
        title: `🔔 ${a.symbol} price alert`,
        message: `${describeAlert(a)} — now ${i ? fmtNative(a.triggeredPrice ?? 0, i.currency) : ""}.`,
      });
    }
  }, [mounted, now, priceFor, closesFor]);

  return null;
}
