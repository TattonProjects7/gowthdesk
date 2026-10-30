// When each market is open. Real-time prices only move while a market trades,
// so the app uses this to say "Market closed · last trade 16:00" instead of
// implying a frozen price is live, and to count down to the next open.
//
// Regular sessions only (no pre-market or after-hours). Holidays and early
// closes are listed for 2026–2027; extend the tables each year.

import type { Instrument } from "./instruments";

export type MarketId = "US" | "LSE" | "CRYPTO";

interface Def {
  label: string;
  tz: string;
  open: number; // minutes after local midnight
  close: number;
  holidays: Set<string>; // local YYYY-MM-DD
  early: Record<string, number>; // local date -> early close, minutes
}

const hm = (h: number, m = 0) => h * 60 + m;

const DEFS: Record<Exclude<MarketId, "CRYPTO">, Def> = {
  US: {
    label: "US market",
    tz: "America/New_York",
    open: hm(9, 30),
    close: hm(16),
    // NYSE / Nasdaq full-day closures.
    holidays: new Set([
      "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
      "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
    ]),
    early: { "2026-11-27": hm(13), "2026-12-24": hm(13), "2027-11-26": hm(13) },
  },
  LSE: {
    label: "London market",
    tz: "Europe/London",
    open: hm(8),
    close: hm(16, 30),
    // England and Wales bank holidays.
    holidays: new Set([
      "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
      "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
    ]),
    early: { "2026-12-24": hm(12, 30), "2026-12-31": hm(12, 30), "2027-12-24": hm(12, 30), "2027-12-31": hm(12, 30) },
  },
};

export function marketFor(i: Pick<Instrument, "type" | "exchange">): MarketId {
  if (i.type === "crypto") return "CRYPTO";
  return i.exchange === "LSE" ? "LSE" : "US";
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function localParts(t: number, tz: string): { date: string; minutes: number; weekday: number } {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
    fmtCache.set(tz, f);
  }
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(t))) p[x.type] = x.value;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute), weekday };
}

function closeOn(d: Def, date: string, weekday: number): number | null {
  if (weekday === 0 || weekday === 6 || d.holidays.has(date)) return null;
  return d.early[date] ?? d.close;
}

export interface SessionState {
  market: MarketId;
  label: string;
  open: boolean;
  /** Epoch ms of the next open (when closed) or of today's close (when open). */
  next: number | null;
  reason?: "weekend" | "holiday" | "before" | "after";
}

/** Whether a market is trading at time `t`, and when that changes. */
export function sessionAt(market: MarketId, t: number): SessionState {
  if (market === "CRYPTO") return { market, label: "Crypto", open: true, next: null };
  const d = DEFS[market];
  const now = localParts(t, d.tz);
  const close = closeOn(d, now.date, now.weekday);
  if (close != null && now.minutes >= d.open && now.minutes < close) {
    return { market, label: d.label, open: true, next: t + (close - now.minutes) * 60_000 - (t % 60_000) };
  }
  const reason: SessionState["reason"] = close == null ? (now.weekday === 0 || now.weekday === 6 ? "weekend" : "holiday") : now.minutes < d.open ? "before" : "after";
  // Probe each coming day at its opening time (well away from midnight, so a
  // clock change can't skip a date), then correct for any clock change.
  let next: number | null = null;
  const base = t - (t % 60_000);
  for (let k = close != null && now.minutes < d.open ? 0 : 1; next == null && k <= 10; k++) {
    let guess = base + (k * 1440 + d.open - now.minutes) * 60_000;
    const at = localParts(guess, d.tz);
    if (closeOn(d, at.date, at.weekday) == null) continue;
    guess += (d.open - at.minutes) * 60_000;
    next = guess;
  }
  return { market, label: d.label, open: false, next, reason };
}

/** "Closes in 2h 10m", "Opens Mon 08:00", "Open 24/7". */
export function describeSession(s: SessionState, t: number, viewerTz?: string): string {
  if (s.market === "CRYPTO") return "Trades 24/7";
  if (s.next == null) return s.open ? "Open" : "Closed";
  const mins = Math.max(0, Math.round((s.next - t) / 60_000));
  const span = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  if (s.open) return `Open · closes in ${span}`;
  if (mins < 12 * 60) return `Closed · opens in ${span}`;
  const when = new Date(s.next).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: viewerTz });
  return `Closed · opens ${when}`;
}
