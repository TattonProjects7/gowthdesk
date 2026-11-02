// The Signal hunter's outside evidence, turned into dated events. Pure
// functions over what Finnhub returns (company news, insider filings, analyst
// recommendation trends), so they're testable without the network. Only real
// data goes in; with no data feed there are simply no events.

import type { MarketEvent } from "./pipeline";

const DAY = 86400_000;

export interface Headline {
  headline: string;
  url?: string;
  at: number;
}

// Headline wording that signals bad news for the share price. Matched against
// the headline only (summaries are noisier), newest first, one event per kind.
const NEWS_RULES: { re: RegExp; label: string; phrase: string; weight: number }[] = [
  { re: /\bprofit warning\b|\bwarns? (on|of) (profit|earnings|sales)|\b(cuts?|lowers?|slashes|trims) (its |full[- ]year |annual )?(guidance|forecast|outlook)/i, label: "Cut its outlook", phrase: "it has just cut its outlook", weight: 8 },
  { re: /\b(short[- ]seller|short report)\b|\bhindenburg\b|\bmuddy waters\b/i, label: "Short-seller report", phrase: "a short seller has published a report", weight: 8 },
  { re: /\bmiss(es|ed)? (estimates|expectations|forecasts)\b|\bfalls? short of (estimates|expectations|forecasts)\b/i, label: "Missed expectations", phrase: "results missed expectations", weight: 7 },
  { re: /\b(investigation|probe|subpoena|fraud|class action|lawsuit|sued)\b/i, label: "Legal or regulatory trouble", phrase: "it faces legal or regulatory trouble", weight: 6 },
  { re: /\b(dividend cut|cuts? (its )?dividend|suspends? (its )?dividend)\b/i, label: "Dividend cut", phrase: "it has cut its dividend", weight: 6 },
  { re: /\bdowngrade[sd]?\b|\bcut to (sell|underperform|underweight|neutral|hold)\b/i, label: "Downgraded", phrase: "it has been downgraded", weight: 6 },
  { re: /\b(recall|recalls|recalled)\b/i, label: "Product recall", phrase: "it has a product recall", weight: 5 },
  { re: /\b(ceo|cfo|chief executive|finance chief)\b.*\b(resigns|steps down|quits|ousted|departs)\b/i, label: "Leadership exit", phrase: "a top executive has left", weight: 5 },
];

export function newsEvents(news: Headline[], now: number, days = 7): MarketEvent[] {
  const recent = news.filter((n) => n.at && now - n.at <= days * DAY && now - n.at >= -DAY).sort((a, b) => b.at - a.at);
  const out: MarketEvent[] = [];
  for (const rule of NEWS_RULES) {
    const hit = recent.find((n) => rule.re.test(n.headline));
    if (hit) out.push({ kind: "bad_news", label: rule.label, detail: hit.headline.slice(0, 160), phrase: rule.phrase, weight: rule.weight, at: hit.at, url: hit.url });
  }
  return out;
}

export interface InsiderTx {
  name: string;
  change: number; // shares; negative for a sale
  transactionCode: string; // "S" open-market sale, "P" open-market purchase
  transactionPrice: number;
  transactionDate: string; // YYYY-MM-DD
}

/** Several insiders selling on the open market, with little or no buying, in the last 60 days. */
export function insiderEvent(txs: InsiderTx[], now: number, days = 60): MarketEvent | null {
  const since = now - days * DAY;
  const recent = txs.filter((t) => {
    const at = Date.parse(t.transactionDate);
    return Number.isFinite(at) && at >= since && at <= now + DAY;
  });
  const value = (t: InsiderTx) => Math.abs(t.change) * Math.max(0, t.transactionPrice || 0);
  const sales = recent.filter((t) => t.transactionCode === "S" && t.change < 0);
  const buys = recent.filter((t) => t.transactionCode === "P" && t.change > 0);
  const sold = sales.reduce((s, t) => s + value(t), 0);
  const bought = buys.reduce((s, t) => s + value(t), 0);
  const sellers = new Set(sales.map((t) => t.name)).size;
  if (sellers < 2 || sold < 1_000_000 || sold < bought * 3) return null;
  const latest = Math.max(...sales.map((t) => Date.parse(t.transactionDate)));
  const m = sold >= 10_000_000 ? `$${Math.round(sold / 1_000_000)}m` : `$${(sold / 1_000_000).toFixed(1)}m`;
  return {
    kind: "insider_selling",
    label: "Insiders selling",
    detail: `${sellers} insiders sold about ${m} of shares in the last ${days} days, with ${bought > 0 ? "little" : "no"} buying.`,
    phrase: "insiders have been selling",
    weight: 8,
    at: latest,
  };
}

export interface RecTrend {
  period: string; // YYYY-MM-DD, first day of the month
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

/** Analysts turning more cautious: buy ratings falling, or sell ratings rising, over the last few months. */
export function downgradeEvent(trend: RecTrend[]): MarketEvent | null {
  const t = [...trend].filter((x) => x.period).sort((a, b) => b.period.localeCompare(a.period));
  if (t.length < 2) return null;
  const now = t[0];
  const then = t[Math.min(2, t.length - 1)];
  const total = (x: RecTrend) => x.strongBuy + x.buy + x.hold + x.sell + x.strongSell;
  if (total(now) < 3 || total(then) < 3) return null;
  const bull = (x: RecTrend) => (x.strongBuy + x.buy) / total(x);
  const sells = (x: RecTrend) => x.sell + x.strongSell;
  const drop = bull(then) - bull(now);
  if (drop < 0.1 && sells(now) - sells(then) < 2) return null;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return {
    kind: "downgrade",
    label: "Analysts turning cautious",
    detail:
      drop >= 0.1
        ? `Buy ratings fell from ${pct(bull(then))} to ${pct(bull(now))} of analysts in the last few months.`
        : `Sell ratings rose from ${sells(then)} to ${sells(now)} in the last few months.`,
    phrase: "analysts are turning cautious",
    weight: 7,
    at: Date.parse(now.period) || 0,
  };
}
