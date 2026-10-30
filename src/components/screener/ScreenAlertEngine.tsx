"use client";

import { useEffect } from "react";
import { useScreener } from "@/lib/screener/useScreener";
import { runScreen } from "@/lib/screener/filters";
import { screensStore, setScreenMatches, useSavedScreens } from "@/lib/screener/screens";
import { raise } from "@/lib/alerts";

// Mounted once in the layout, and only does work when a saved screen has its
// alert switched on: it re-runs those screens as the market moves and raises an
// alert for each share that newly enters one.
export default function ScreenAlertEngine() {
  const screens = useSavedScreens();
  const watching = screens.some((s) => s.alert);
  return watching ? <Runner /> : null;
}

function Runner() {
  const { snaps, now } = useScreener();
  useEffect(() => {
    if (!snaps.length) return;
    for (const scr of screensStore.get() ?? []) {
      if (!scr.alert) continue;
      const matches = runScreen(snaps, { filters: scr.filters, signal: scr.signal }).map((s) => s.symbol);
      if (scr.last) {
        const prev = new Set(scr.last);
        const day = Math.floor(now / 86400_000);
        for (const sym of matches) {
          if (prev.has(sym)) continue;
          raise({
            id: `screen:${scr.id}:${sym}:${day}`,
            type: "screen",
            symbol: sym,
            title: `New match: ${scr.name}`,
            message: `${sym} just entered your "${scr.name}" screen.`,
          });
        }
      }
      if (!scr.last || scr.last.join() !== matches.join()) setScreenMatches(scr.id, matches);
    }
  }, [snaps, now]);
  return null;
}
