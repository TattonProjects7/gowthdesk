// Market Pulse: plain-English notes written from today's market data — who's
// moving, on what volume, through which levels. Every sentence is computed
// from the numbers, so it's true to the data shown and never invents a cause.

import type { Snapshot } from "./snapshot";
import { fmtP } from "./columns";

export interface PulseNote {
  id: string;
  symbol?: string;
  headline: string;
  detail: string;
  tone: "up" | "down" | "neutral";
}

const name = (s: Snapshot) => s.i.name;

function moveNote(s: Snapshot): PulseNote {
  const up = s.change >= 0;
  const bits: string[] = [];
  if (s.relVolume >= 1.8) bits.push(`on ${s.relVolume.toFixed(1)}× its usual volume for this time of day`);
  if (s.signals.includes("new_high")) bits.push("hitting a new 52-week high");
  else if (s.signals.includes("new_low")) bits.push("at a new 52-week low");
  else if (s.signals.includes("breakout")) bits.push("breaking above its 20-day high");
  if (Math.abs(s.gap) >= 1.5) bits.push(`after opening ${s.gap > 0 ? "up" : "down"} ${Math.abs(s.gap).toFixed(1)}%`);
  if (s.earnings?.daysUntil === 0) bits.push(`with results due ${s.earnings.timing === "Before open" ? "this morning" : "after the close"}`);
  const why = bits.length ? `, ${bits.join(", ")}` : "";
  const context =
    s.perfM != null
      ? ` Over the past month it's ${s.perfM >= 0 ? "up" : "down"} ${Math.abs(s.perfM).toFixed(1)}%, and RSI is ${s.rsi.toFixed(0)}${s.rsi >= 70 ? " (overbought)" : s.rsi <= 30 ? " (oversold)" : ""}.`
      : "";
  return {
    id: `move:${s.symbol}`,
    symbol: s.symbol,
    headline: `${name(s)} ${up ? "rises" : "falls"} ${fmtP(Math.abs(s.change), 1)}${why}`,
    detail: `${s.symbol} trades at ${s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}${s.i.currency === "GBX" ? "p" : s.i.currency === "GBP" ? " GBP" : " USD"}.${context}`,
    tone: up ? "up" : "down",
  };
}

/** Today's pulse, most newsworthy first. */
export function pulseNotes(snaps: Snapshot[], limit = 14): PulseNote[] {
  const stocks = snaps.filter((s) => s.i.type === "stock");
  if (!stocks.length) return [];
  const notes: PulseNote[] = [];

  // 1. The tape: breadth and the leading and lagging sectors.
  const up = stocks.filter((s) => s.change > 0).length;
  const bySector = new Map<string, { w: number; v: number }>();
  for (const s of stocks) {
    const e = bySector.get(s.i.sector) ?? { w: 0, v: 0 };
    const w = s.marketCapUsd ?? 1;
    e.w += w;
    e.v += s.change * w;
    bySector.set(s.i.sector, e);
  }
  const sectors = [...bySector].map(([k, e]) => ({ k, v: e.v / e.w })).sort((a, b) => b.v - a.v);
  const best = sectors[0];
  const worst = sectors[sectors.length - 1];
  const share = up / stocks.length;
  notes.push({
    id: "breadth",
    headline: share >= 0.62 ? `A broad rally: ${up} of ${stocks.length} shares are up` : share <= 0.38 ? `Sellers in charge: ${stocks.length - up} of ${stocks.length} shares are down` : `A mixed market: ${up} shares up, ${stocks.length - up} down`,
    detail: `${best.k} leads (${fmtP(best.v, 2, true)}, weighted by size) and ${worst.k} lags (${fmtP(worst.v, 2, true)}).`,
    tone: share >= 0.55 ? "up" : share <= 0.45 ? "down" : "neutral",
  });

  // 2. The biggest movers, with the context the numbers support.
  const movers = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 8);
  for (const s of movers) notes.push(moveNote(s));

  // 3. Unusual volume that isn't already a big mover.
  for (const s of stocks.filter((x) => x.relVolume >= 2 && !movers.includes(x)).slice(0, 3)) {
    notes.push({ id: `vol:${s.symbol}`, symbol: s.symbol, headline: `Heavy trading in ${name(s)}: ${s.relVolume.toFixed(1)}× normal volume`, detail: `The price is ${fmtP(s.change, 2, true)} so far. Unusual volume often comes before or after news — worth a look.`, tone: "neutral" });
  }

  // 4. Fresh trend signals on large companies.
  for (const s of stocks.filter((x) => x.signals.includes("golden_cross") && (x.marketCapUsd ?? 0) > 50e9).slice(0, 2)) {
    notes.push({ id: `gc:${s.symbol}`, symbol: s.symbol, headline: `Golden cross in ${name(s)}`, detail: "Its 50-day average has just crossed above the 200-day — a widely watched sign the longer trend has turned up.", tone: "up" });
  }
  for (const s of stocks.filter((x) => x.signals.includes("death_cross") && (x.marketCapUsd ?? 0) > 50e9).slice(0, 2)) {
    notes.push({ id: `dc:${s.symbol}`, symbol: s.symbol, headline: `Death cross in ${name(s)}`, detail: "Its 50-day average has just crossed below the 200-day — a widely watched sign the longer trend has weakened.", tone: "down" });
  }

  // 5. Who reports today.
  const reporting = stocks.filter((s) => s.earnings?.daysUntil === 0).sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
  if (reporting.length) {
    notes.push({
      id: "earnings",
      headline: `Reporting today: ${reporting.slice(0, 4).map((s) => s.symbol).join(", ")}${reporting.length > 4 ? ` and ${reporting.length - 4} more` : ""}`,
      detail: "Results days bring the biggest moves of the quarter. See the calendar for times.",
      tone: "neutral",
    });
  }

  return notes.slice(0, limit);
}
