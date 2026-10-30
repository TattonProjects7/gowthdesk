// Catalyst countdown.
//
// A short needs a *reason it falls now*, and the clearest clock is the next
// scheduled event — usually earnings. The date doubles as a risk flag: a beat
// into a crowded short can trigger a squeeze, so an imminent catalyst raises the
// stakes both ways. Dates are derived deterministically per symbol (quarterly
// cadence) so the countdown is stable and needs no earnings-calendar feed.

import { getTicker } from "./market";

const DAY = 86400_000;
const EPOCH = Date.UTC(2024, 0, 1); // fixed anchor for reproducibility
const CYCLE = 91; // ~ one quarter

export interface Catalyst {
  type: string;
  date: number; // epoch ms (UTC midnight)
  daysUntil: number;
  imminent: boolean; // within ~10 days
  note: string;
}

const TYPE: Record<string, string> = {
  AAPL: "Q earnings",
  MSFT: "Q earnings",
  GOOGL: "Q earnings",
  AMZN: "Q earnings",
  META: "Q earnings",
  NVDA: "Q earnings + guidance",
  AMD: "Q earnings",
  TSLA: "Delivery + earnings",
  DIS: "Q earnings",
  SHOP: "Q earnings",
  COIN: "Q earnings (vol-heavy)",
  PLTR: "Q earnings",
};

export function nextCatalyst(symbol: string, now: number): Catalyst {
  const seed = getTicker(symbol)?.seed ?? 1;
  const daysSinceEpoch = Math.floor((now - EPOCH) / DAY);
  const anchor = (seed * 13) % CYCLE;
  let daysUntil = (((anchor - daysSinceEpoch) % CYCLE) + CYCLE) % CYCLE;
  if (daysUntil === 0) daysUntil = CYCLE;

  const date = now + daysUntil * DAY;
  const imminent = daysUntil <= 10;
  const type = TYPE[symbol] ?? "Q earnings";

  const note = imminent
    ? `${type} in ${daysUntil} day${daysUntil === 1 ? "" : "s"} — the catalyst is close. A miss accelerates the short; a beat can squeeze it. Size for the event.`
    : `${type} in ${daysUntil} days — time for the thesis to play out before event risk hits.`;

  return { type, date, daysUntil, imminent, note };
}

// Friendly date like "12 Aug" without locale surprises.
export function fmtDate(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}
