"use client";

import { useEffect, useState } from "react";
import { usePortfolio } from "@/lib/portfolioStore";
import { usePriceAlerts } from "@/lib/pricealerts";
import { learn, useLearn } from "@/lib/learn/store";
import { newlyCompleted } from "@/lib/learn/missions";

// Watches the app and completes missions the moment their condition is met
// (first buy, stop-loss set, ISA used…). Mounted once in the layout.
export default function MissionEngine() {
  const portfolio = usePortfolio();
  const alerts = usePriceAlerts();
  const state = useLearn();
  const [shorts, setShorts] = useState(0);
  const [ready, setReady] = useState(false);

  // Tracked shorts live in their own local store (store.ts).
  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem("shortlist.taken.v1");
        setShorts(raw ? (JSON.parse(raw) as unknown[]).length : 0);
      } catch {
        setShorts(0);
      }
    };
    read();
    setReady(true);
    window.addEventListener("shortlist:change", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("shortlist:change", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const fresh = newlyCompleted({ portfolio, priceAlerts: alerts.length, trackedShorts: shorts, learn: state });
    if (fresh.length) learn.completeMissions(fresh);
  }, [ready, portfolio, alerts.length, shorts, state]);

  return null;
}
