// Economic & corporate calendar — the IG app's event alerts and ii's results
// diary, in one list. Company dates come from the deterministic catalyst
// engine; macro dates follow the regular monthly cadence of the real releases.

import { INSTRUMENTS } from "./instruments";
import { nextCatalyst } from "./catalysts";

export interface MarketEvent {
  id: string;
  date: number; // epoch ms (UTC midnight-ish)
  type: "earnings" | "macro";
  title: string;
  detail: string;
  symbol?: string;
  impact: "high" | "medium" | "low";
}

const DAY = 86400_000;

// day-of-month, months (1-12) when it occurs, title, detail, impact
const MACRO: { day: number; months: number[]; title: string; detail: string; impact: MarketEvent["impact"] }[] = [
  { day: 6, months: [2, 3, 5, 6, 8, 9, 11, 12], title: "Bank of England rate decision", detail: "MPC announcement and Monetary Policy Report. Moves gilts, GBP and UK banks.", impact: "high" },
  { day: 18, months: [1, 3, 5, 6, 7, 9, 11, 12], title: "US Federal Reserve (FOMC) decision", detail: "Rate decision, statement and press conference. Sets the tone for global risk.", impact: "high" },
  { day: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: "US CPI inflation", detail: "Consumer price index. The release markets watch most for Fed direction.", impact: "high" },
  { day: 16, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: "UK CPI inflation", detail: "ONS inflation print; feeds straight into BoE expectations.", impact: "medium" },
  { day: 3, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: "US non-farm payrolls", detail: "Jobs report, first Friday of the month.", impact: "medium" },
  { day: 13, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: "UK GDP (monthly)", detail: "Growth estimate from the ONS.", impact: "low" },
  { day: 1, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: "Global PMIs", detail: "Manufacturing purchasing-managers indices.", impact: "low" },
];

export function upcomingEvents(now: number, horizonDays = 30): MarketEvent[] {
  const out: MarketEvent[] = [];
  const end = now + horizonDays * DAY;

  // Company results for everything with a seed (shortable names + UK shares).
  for (const i of INSTRUMENTS) {
    if (i.type !== "stock") continue;
    const c = nextCatalyst(i.symbol, now);
    if (c.date <= end) {
      const title = i.region === "UK" ? `${i.name} results` : `${i.name} earnings`;
      out.push({
        id: `earn:${i.symbol}:${Math.floor(c.date / DAY)}`,
        date: c.date,
        type: "earnings",
        title,
        detail: c.imminent ? `${c.type} — within ${c.daysUntil} days. Expect a bigger-than-usual move.` : `${c.type} in ${c.daysUntil} days.`,
        symbol: i.symbol,
        impact: c.imminent ? "high" : "medium",
      });
    }
  }

  // Macro calendar.
  const start = new Date(now);
  for (let m = 0; m < 2; m++) {
    const y = start.getUTCFullYear();
    const mo = start.getUTCMonth() + m; // may overflow — Date handles it
    for (const ev of MACRO) {
      const d = Date.UTC(y, mo, ev.day, 12);
      const month = new Date(d).getUTCMonth() + 1;
      if (!ev.months.includes(month)) continue;
      if (d < now - 12 * 3600_000 || d > end) continue;
      out.push({ id: `macro:${ev.title}:${Math.floor(d / DAY)}`, date: d, type: "macro", title: ev.title, detail: ev.detail, impact: ev.impact });
    }
  }

  return out.sort((a, b) => a.date - b.date);
}

export function fmtEventDate(ms: number): string {
  const d = new Date(ms);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}
