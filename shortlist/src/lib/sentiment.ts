// Client sentiment — the "% of clients long vs short" gauge IG shows on every
// market. We have no order flow to aggregate, so this is a stable, deterministic
// read derived from each instrument's seed and its recent move: the crowd gets
// longer after a rally and shorter after a sell-off, like real client books do.

import { getInstrument } from "./instruments";

export interface Sentiment {
  longPct: number;
  shortPct: number;
  label: string; // "Clients are net long" etc
  contrarian: string; // the IG-style caveat
}

export function clientSentiment(symbol: string, dayChangePct: number, now: number): Sentiment {
  const seed = getInstrument(symbol)?.seed ?? 1;
  const hour = Math.floor(now / 3600_000);
  const base = 50 + (Math.sin(seed * 1.7) * 18 + Math.sin(hour / 7 + seed) * 6);
  const tilt = Math.max(-12, Math.min(12, dayChangePct * 3));
  const longPct = Math.round(Math.max(8, Math.min(92, base + tilt)));
  const shortPct = 100 - longPct;
  const label = longPct >= 60 ? "Clients are net long" : longPct <= 40 ? "Clients are net short" : "Clients are evenly split";
  const contrarian =
    longPct >= 70
      ? "A crowded long: a lot of buyers already in, so good news may be priced in."
      : longPct <= 30
        ? "A crowded short: positive surprises can squeeze the crowd."
        : "No strong crowding either way.";
  return { longPct, shortPct, label, contrarian };
}
