// Plain-English screen building. "Cheap UK dividend payers near their lows"
// becomes a set of screener tokens. The server asks Claude when a key is set
// (see /api/screener/ai); this keyword parser is the offline fallback, and it
// also catches the obvious phrases instantly.

import { FILTERS, SIGNALS, allTokens, tokenLabel, type Screen } from "./filters";
import type { SignalId } from "./snapshot";

export interface ParsedScreen extends Screen {
  sort?: string;
  explanation: string;
  source: "ai" | "offline";
}

const RULES: [RegExp, string[], string?][] = [
  // asset types and places
  [/\b(etfs?|funds?|trackers?)\b/, ["type:etf"]],
  [/\b(crypto|bitcoin|coins?)\b/, ["type:crypto"]],
  [/\b(shares|stocks|companies)\b/, ["type:stock"]],
  [/\b(uk|british|london|ftse|lse)\b/, ["exch:lse"]],
  [/\b(american|wall street|s&p|nasdaq|nyse)\b/, ["geo:us"]],
  [/\bftse ?100\b/, ["idx:ukx"]],
  [/\bftse ?250\b/, ["idx:mcx"]],
  [/\bdow\b/, ["idx:dji"]],
  [/\bnasdaq[- ]?100\b/, ["idx:ndx"]],
  [/\bs&p ?500\b/, ["idx:spx"]],
  // size
  [/\b(mega[- ]?caps?|giants?|biggest)\b/, ["cap:mega"]],
  [/\b(large[- ]?caps?|blue[- ]?chips?|big compan)/, ["cap:largeover"]],
  [/\bmid[- ]?caps?\b/, ["cap:mid"]],
  [/\bsmall(er)?[- ]?caps?\b/, ["cap:u10b"]],
  // value and quality
  [/\b(cheap|undervalued|bargains?|value|low p\/?e)\b/, ["pe:u15", "pe:profitable"]],
  [/\b(expensive|pricey|high p\/?e)\b/, ["pe:high"]],
  [/\b(profitable|making money|earners?)\b/, ["nm:pos"]],
  [/\b(loss[- ]?making|unprofitable|losing money)\b/, ["pe:neg"]],
  [/\b(quality|high return|moat)\b/, ["roe:o15", "nm:o10"]],
  [/\b(growth|growing|fast[- ]growing)\b/, ["sales:o10", "epsny:o10"]],
  [/\b(low debt|strong balance sheet|no debt)\b/, ["de:low"]],
  [/\b(high|big|juicy|generous) (dividend|yield)s?\b|\bhigh[- ]yield/, ["div:o4"]],
  [/\b(dividends?|income|yield|payers?)\b/, ["div:o2"]],
  [/\bno dividend/, ["div:none"]],
  [/\b(analysts? (like|love|rate)|strong buy|buy rated)\b/, ["recom:b"]],
  [/\b(upside to target|below target|target price)\b/, ["target:a10"]],
  [/\b(heavily shorted|most shorted|high short|short squeeze)\b/, ["short:o10"]],
  // technicals and momentum
  [/\b(momentum|winners|strong|trending up|uptrend|leaders?)\b/, ["perfh:o20", "sma200:pa"]],
  [/\b(downtrend|falling|weak|losers)\b/, ["perfh:d10", "sma200:pb"]],
  [/\b(oversold|beaten[- ]down|sold off|bounce)\b/, ["rsi:os30"]],
  [/\b(overbought|stretched|overextended)\b/, ["rsi:ob70"]],
  [/\b(near|at|close to) (their |the |a )?(52[- ]?week|yearly|year) highs?|new highs?|all[- ]time highs?/, ["hl52:b5"]],
  [/\b(near|at|close to) (their |the |a )?(52[- ]?week|yearly|year) lows?|new lows?/, ["hl52:a5"]],
  [/\babove (the |their )?200[- ]?day/, ["sma200:pa"]],
  [/\bbelow (the |their )?200[- ]?day/, ["sma200:pb"]],
  [/\bgolden cross/, ["sma50:a200"]],
  [/\b(low[- ]volatility|calm|steady|defensive|safe)\b/, ["volat:u3", "beta:u1"]],
  [/\b(volatile|wild|risky|high[- ]beta)\b/, ["volat:o4"]],
  [/\b(busy|unusual volume|heavy volume|volume spike)\b/, ["relvol:o2"]],
  [/\b(gapp?ing up|gap up)\b/, ["gap:u2"]],
  [/\b(gapp?ing down|gap down)\b/, ["gap:d2"]],
  [/\b(up|rising|green) today\b/, ["chg:up"]],
  [/\b(down|falling|red) today\b/, ["chg:down"]],
  [/\b(earnings|results|reporting) (this|next) week\b|\breport(ing)? soon\b/, ["earn:week"]],
  [/\b(double bottom)\b/, ["pattern:double_bottom"]],
  [/\b(double top)\b/, ["pattern:double_top"]],
  [/\b(head and shoulders)\b/, ["pattern:head_shoulders"]],
  [/\b(channel up|rising channel)\b/, ["pattern:channel_up"]],
  [/\b(wedge)\b/, ["pattern:wedge"]],
  [/\b(triangle)\b/, ["pattern:triangle_asc"]],
];

const SIGNAL_RULES: [RegExp, SignalId][] = [
  [/\b(top gainers|biggest risers|best performers today)\b/, "top_gainers"],
  [/\b(top losers|biggest fallers|worst performers today)\b/, "top_losers"],
  [/\b(most active|most traded)\b/, "most_active"],
  [/\b(breakouts?|breaking out)\b/, "breakout"],
  [/\b(pullbacks?|dips? in an uptrend|buy the dip)\b/, "pullback_uptrend"],
];

const SECTOR_WORDS: [RegExp, string][] = [
  [/\b(tech|technology|software|chips?|semis?|semiconductors?)\b/, "sector:technology"],
  [/\b(banks?|financials?|insurers?|insurance)\b/, "sector:financials"],
  [/\b(oil|gas|energy)\b/, "sector:energy"],
  [/\b(pharma|drugs?|health ?care|biotech|medical)\b/, "sector:healthcare"],
  [/\b(miners?|mining|materials|metals?|gold|copper)\b/, "sector:materials"],
  [/\b(utilities|utility|power companies)\b/, "sector:utilities"],
  [/\b(property|real estate|reits?|landlords?)\b/, "sector:real-estate"],
  [/\b(retail(ers)?|consumer discretionary|restaurants?|cars?|autos?)\b/, "sector:consumer-discretionary"],
  [/\b(staples|food|drinks|tobacco|supermarkets?|grocers?)\b/, "sector:consumer-staples"],
  [/\b(telecoms?|media|communication)\b/, "sector:communication-services"],
  [/\b(industrials?|defen[cs]e|aerospace|airlines?|engineering)\b/, "sector:industrials"],
];

export function parseScreenOffline(q: string): ParsedScreen {
  const text = ` ${q.toLowerCase().replace(/[’']/g, "'")} `;
  const valid = new Set(allTokens());
  const out = new Set<string>();
  for (const [re, toks] of RULES) if (re.test(text)) toks.forEach((t) => valid.has(t) && out.add(t));
  for (const [re, tok] of SECTOR_WORDS) if (re.test(text) && valid.has(tok)) out.add(tok);
  // "US" only counts in capitals, so "show us…" doesn't filter to America.
  if (/\b(US|USA|U\.S\.)\b/.test(q)) out.add("geo:us");
  // A specific index or "shares" beats the generic "stocks" type when ETFs/crypto are named.
  if (out.has("type:etf") || out.has("type:crypto")) out.delete("type:stock");
  // "US" and "UK" in one request means both: drop the narrower listing filter.
  if (out.has("exch:lse") && out.has("geo:us")) {
    out.delete("exch:lse");
    out.delete("geo:us");
  }
  // "high dividend" also matched the generic "dividend" rule — keep the stronger one.
  if (out.has("div:o4")) out.delete("div:o2");
  let signal: SignalId | "" = "";
  for (const [re, id] of SIGNAL_RULES) if (re.test(text)) signal = id;
  const filters = [...out];
  const parts = filters.map(tokenLabel).filter(Boolean) as string[];
  if (signal) parts.unshift(`Signal: ${SIGNALS.find((s) => s.id === signal)?.label}`);
  return {
    filters,
    signal,
    explanation: parts.length ? `Looking for ${parts.join("; ")}.` : "I couldn't match that to any filters. Try words like cheap, dividend, UK, tech, oversold or near 52-week highs.",
    source: "offline",
  };
}

/** Compact catalogue of every filter and signal, for the AI prompt. */
export function catalogue(): string {
  const lines = FILTERS.map((d) => `${d.id} (${d.label}): ${d.options.map((o) => `${o.id}=${o.label}`).join(" | ")}`);
  lines.push(`signals: ${SIGNALS.map((s) => `${s.id}=${s.label}`).join(" | ")}`);
  return lines.join("\n");
}
