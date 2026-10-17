// Research & news for an instrument.
//
// ii publishes expert articles into its app; IG streams Reuters headlines;
// InvestEngine pulls market news in. We do both: real company news from
// Finnhub when a key is configured (see /api/news), and — always — a set of
// data-driven research notes generated from the signals the app already
// computes, so the page is never empty.

import { getInstrument } from "./instruments";
import { computeSignals } from "./signals";
import { nextCatalyst } from "./catalysts";
import { clientSentiment } from "./sentiment";

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url?: string;
  at: number;
  kind: "news" | "research";
}

export function researchNotes(symbol: string, closes: number[], now: number): NewsItem[] {
  const i = getInstrument(symbol);
  if (!i || closes.length < 2) return [];
  const s = computeSignals(closes);
  const chg = (closes[closes.length - 1] / closes[closes.length - 2] - 1) * 100;
  const notes: NewsItem[] = [];
  const push = (headline: string, summary: string) =>
    notes.push({ id: `r:${symbol}:${notes.length}`, headline, summary, source: "Shortlist Research", at: now - notes.length * 3600_000 * 5, kind: "research" });

  // Trend & momentum
  if (s.trend30 >= 8) push(`${i.name} up ${s.trend30.toFixed(0)}% over 30 days — momentum intact`, `Price sits ${s.zscore.toFixed(1)}σ ${s.zscore >= 0 ? "above" : "below"} its 20-day mean with RSI at ${Math.round(s.rsi)}. ${s.rsi >= 68 ? "Overbought territory — pullbacks are normal here." : "Not yet stretched."}`);
  else if (s.trend30 <= -8) push(`${i.name} down ${Math.abs(s.trend30).toFixed(0)}% over 30 days — is the sell-off done?`, `RSI ${Math.round(s.rsi)}${s.rsi <= 35 ? " signals oversold conditions; bounces from here are common but not guaranteed." : "."} The 10-day average is ${s.belowShortMa ? "below" : "above"} the 30-day.`);
  else push(`${i.name} drifting sideways — range-bound for a month`, `30-day move of ${s.trend30 >= 0 ? "+" : ""}${s.trend30.toFixed(1)}% with ${(s.volatility * 100).toFixed(1)}% daily swings. Range traders' market; trend followers wait.`);

  // Today's move
  if (Math.abs(chg) >= 2) push(`${i.symbol} ${chg >= 0 ? "jumps" : "slides"} ${Math.abs(chg).toFixed(1)}% in today's session`, `${Math.abs(chg) >= 4 ? "An outsized move for the name" : "A notable move"} — check the calendar below for a catalyst and the sentiment gauge for how crowded the trade is.`);

  // Catalyst
  if (i.type === "stock") {
    const c = nextCatalyst(symbol, now);
    push(`${i.name}: ${c.type} in ${c.daysUntil} days`, c.note);
  }

  // Positioning
  const sent = clientSentiment(symbol, chg, now);
  push(`${sent.label} on ${i.symbol} (${sent.longPct}% long)`, sent.contrarian);

  // Income / fund notes
  if (i.type === "etf") push(`${i.symbol} fund check: ${i.ocfPct?.toFixed(2)}% OCF, ${i.dividendYieldPct}% yield`, `${i.description} Top holding: ${i.holdings?.[0]?.name ?? "n/a"}.`);
  else if (i.dividendYieldPct >= 3) push(`${i.name} yields ${i.dividendYieldPct}% — income screen`, `Above the FTSE 100 average. Yield this high can signal value or a dividend at risk; check cover before relying on it.`);

  return notes;
}
