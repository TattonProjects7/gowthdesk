// Screener table columns and the Finviz-style views that group them.

import { fmtNative } from "../instruments";
import { CANDLE_LABEL } from "./patterns";
import type { Snapshot } from "./snapshot";

export function fmtBig(n: number | null | undefined, prefix = ""): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${prefix}${(n / 1e9).toFixed(a >= 1e11 ? 0 : 1)}B`;
  if (a >= 1e6) return `${prefix}${(n / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `${prefix}${(n / 1e3).toFixed(0)}K`;
  return `${prefix}${Math.round(n)}`;
}

export const fmtX = (n: number | null | undefined, dp = 2) => (n == null || !Number.isFinite(n) ? "—" : n.toFixed(dp));
export const fmtP = (n: number | null | undefined, dp = 2, sign = false) => (n == null || !Number.isFinite(n) ? "—" : `${sign && n > 0 ? "+" : ""}${n.toFixed(dp)}%`);

export interface Column {
  id: string;
  label: string;
  /** Value used for sorting (numbers sort numerically, strings alphabetically). */
  get: (s: Snapshot) => number | string | null | undefined;
  fmt: (s: Snapshot) => string;
  /** Colour green/red by sign. */
  signed?: boolean;
  align?: "left" | "right";
  help?: string;
}

const f = (s: Snapshot) => s.fund;

export const COLUMNS: Column[] = [
  { id: "ticker", label: "Ticker", get: (s) => s.symbol, fmt: (s) => s.symbol, align: "left" },
  { id: "company", label: "Company", get: (s) => s.i.name, fmt: (s) => s.i.name, align: "left" },
  { id: "sector", label: "Sector", get: (s) => s.i.sector, fmt: (s) => s.i.sector, align: "left" },
  { id: "industry", label: "Industry", get: (s) => s.i.industry ?? s.i.sector, fmt: (s) => s.i.industry ?? (s.i.type === "etf" ? "Exchange traded fund" : s.i.sector), align: "left" },
  { id: "country", label: "Country", get: (s) => s.i.country ?? s.i.region, fmt: (s) => s.i.country ?? (s.i.region === "US" ? "USA" : s.i.region), align: "left" },
  { id: "cap", label: "Market cap", get: (s) => s.marketCapUsd, fmt: (s) => fmtBig(s.marketCapUsd, "$") },
  { id: "pe", label: "P/E", get: (s) => f(s)?.pe, fmt: (s) => fmtX(f(s)?.pe) },
  { id: "fpe", label: "Fwd P/E", get: (s) => f(s)?.fwdPe, fmt: (s) => fmtX(f(s)?.fwdPe) },
  { id: "peg", label: "PEG", get: (s) => f(s)?.peg, fmt: (s) => fmtX(f(s)?.peg) },
  { id: "ps", label: "P/S", get: (s) => f(s)?.ps, fmt: (s) => fmtX(f(s)?.ps) },
  { id: "pb", label: "P/B", get: (s) => f(s)?.pb, fmt: (s) => fmtX(f(s)?.pb) },
  { id: "eps", label: "EPS (ttm)", get: (s) => f(s)?.eps, fmt: (s) => fmtX(f(s)?.eps) },
  { id: "epsy", label: "EPS this Y", get: (s) => f(s)?.epsGrowthThisY, fmt: (s) => fmtP(f(s)?.epsGrowthThisY, 1), signed: true },
  { id: "epsny", label: "EPS next Y", get: (s) => f(s)?.epsGrowthNextY, fmt: (s) => fmtP(f(s)?.epsGrowthNextY, 1), signed: true },
  { id: "sales", label: "Sales growth", get: (s) => f(s)?.salesGrowth, fmt: (s) => fmtP(f(s)?.salesGrowth, 1), signed: true },
  { id: "div", label: "Dividend", get: (s) => f(s)?.dividendYield ?? s.i.dividendYieldPct, fmt: (s) => fmtP(f(s)?.dividendYield ?? s.i.dividendYieldPct) },
  { id: "roe", label: "ROE", get: (s) => f(s)?.roe, fmt: (s) => fmtP(f(s)?.roe, 1) },
  { id: "roa", label: "ROA", get: (s) => f(s)?.roa, fmt: (s) => fmtP(f(s)?.roa, 1) },
  { id: "cr", label: "Curr R", get: (s) => f(s)?.currentRatio, fmt: (s) => fmtX(f(s)?.currentRatio) },
  { id: "de", label: "Debt/Eq", get: (s) => f(s)?.debtEq, fmt: (s) => fmtX(f(s)?.debtEq) },
  { id: "gm", label: "Gross M", get: (s) => f(s)?.grossMargin, fmt: (s) => fmtP(f(s)?.grossMargin, 1) },
  { id: "om", label: "Oper M", get: (s) => f(s)?.operMargin, fmt: (s) => fmtP(f(s)?.operMargin, 1) },
  { id: "nm", label: "Profit M", get: (s) => f(s)?.netMargin, fmt: (s) => fmtP(f(s)?.netMargin, 1) },
  { id: "payout", label: "Payout", get: (s) => f(s)?.payout, fmt: (s) => fmtP(f(s)?.payout, 0) },
  { id: "insider", label: "Insider own", get: (s) => f(s)?.insiderOwn, fmt: (s) => fmtP(f(s)?.insiderOwn, 1) },
  { id: "inst", label: "Inst own", get: (s) => f(s)?.instOwn, fmt: (s) => fmtP(f(s)?.instOwn, 1) },
  { id: "short", label: "Short float", get: (s) => f(s)?.shortFloat, fmt: (s) => fmtP(f(s)?.shortFloat, 1) },
  { id: "recom", label: "Recom", get: (s) => f(s)?.recom, fmt: (s) => fmtX(f(s)?.recom, 1) },
  { id: "target", label: "Target", get: (s) => f(s)?.targetUpside, fmt: (s) => fmtP(f(s)?.targetUpside, 1, true), signed: true },
  { id: "earn", label: "Earnings", get: (s) => s.earnings?.daysUntil ?? null, fmt: (s) => (s.earnings ? (s.earnings.daysUntil === 0 ? `Today ${s.earnings.timing === "Before open" ? "BO" : "AC"}` : `${s.earnings.daysUntil}d`) : "—") },
  { id: "perfw", label: "Perf W", get: (s) => s.perfW, fmt: (s) => fmtP(s.perfW), signed: true },
  { id: "perfm", label: "Perf M", get: (s) => s.perfM, fmt: (s) => fmtP(s.perfM), signed: true },
  { id: "perfq", label: "Perf Q", get: (s) => s.perfQ, fmt: (s) => fmtP(s.perfQ), signed: true },
  { id: "perfh", label: "Perf H", get: (s) => s.perfH, fmt: (s) => fmtP(s.perfH), signed: true },
  { id: "perfytd", label: "Perf YTD", get: (s) => s.perfYtd, fmt: (s) => fmtP(s.perfYtd), signed: true },
  { id: "perfy", label: "Perf Y", get: (s) => s.perfY, fmt: (s) => fmtP(s.perfY), signed: true },
  { id: "volw", label: "Volat W", get: (s) => s.volW, fmt: (s) => fmtP(s.volW) },
  { id: "volm", label: "Volat M", get: (s) => s.volM, fmt: (s) => fmtP(s.volM) },
  { id: "beta", label: "Beta", get: (s) => s.beta, fmt: (s) => fmtX(s.beta) },
  { id: "atr", label: "ATR", get: (s) => s.atr, fmt: (s) => fmtX(s.atr) },
  { id: "sma20", label: "SMA20", get: (s) => s.sma20Pct, fmt: (s) => fmtP(s.sma20Pct), signed: true },
  { id: "sma50", label: "SMA50", get: (s) => s.sma50Pct, fmt: (s) => fmtP(s.sma50Pct), signed: true },
  { id: "sma200", label: "SMA200", get: (s) => s.sma200Pct, fmt: (s) => fmtP(s.sma200Pct), signed: true },
  { id: "hi52", label: "52W high", get: (s) => s.fromHigh52, fmt: (s) => fmtP(s.fromHigh52), signed: true },
  { id: "lo52", label: "52W low", get: (s) => s.fromLow52, fmt: (s) => fmtP(s.fromLow52), signed: true },
  { id: "rsi", label: "RSI", get: (s) => s.rsi, fmt: (s) => s.rsi.toFixed(1) },
  { id: "gap", label: "Gap", get: (s) => s.gap, fmt: (s) => fmtP(s.gap), signed: true },
  { id: "chgopen", label: "From open", get: (s) => s.changeOpen, fmt: (s) => fmtP(s.changeOpen), signed: true },
  { id: "avgvol", label: "Avg volume", get: (s) => s.avgVolume, fmt: (s) => fmtBig(s.avgVolume) },
  { id: "relvol", label: "Rel volume", get: (s) => s.relVolume, fmt: (s) => s.relVolume.toFixed(2) },
  { id: "pattern", label: "Pattern", get: (s) => s.pattern?.label ?? null, fmt: (s) => s.pattern?.label ?? "—", align: "left" },
  { id: "candle", label: "Candle", get: (s) => (s.candle ? CANDLE_LABEL[s.candle] : null), fmt: (s) => (s.candle ? CANDLE_LABEL[s.candle] : "—"), align: "left" },
  { id: "price", label: "Price", get: (s) => s.price, fmt: (s) => fmtNative(s.price, s.i.currency) },
  { id: "change", label: "Change", get: (s) => s.change, fmt: (s) => fmtP(s.change, 2, true), signed: true },
  { id: "volume", label: "Volume", get: (s) => s.volume, fmt: (s) => fmtBig(s.volume) },
];

const BY_ID = new Map(COLUMNS.map((c) => [c.id, c]));
export const getColumn = (id: string) => BY_ID.get(id);

export type ViewId = "overview" | "valuation" | "financial" | "ownership" | "performance" | "technical" | "charts";

export const VIEWS: { id: ViewId; label: string; cols: string[] }[] = [
  { id: "overview", label: "Overview", cols: ["ticker", "company", "sector", "industry", "country", "cap", "pe", "price", "change", "volume"] },
  { id: "valuation", label: "Valuation", cols: ["ticker", "cap", "pe", "fpe", "peg", "ps", "pb", "eps", "epsy", "epsny", "sales", "price", "change"] },
  { id: "financial", label: "Financial", cols: ["ticker", "cap", "div", "roa", "roe", "cr", "de", "gm", "om", "nm", "payout", "earn", "price", "change"] },
  { id: "ownership", label: "Ownership", cols: ["ticker", "cap", "insider", "inst", "short", "recom", "target", "avgvol", "price", "change", "volume"] },
  { id: "performance", label: "Performance", cols: ["ticker", "perfw", "perfm", "perfq", "perfh", "perfytd", "perfy", "volw", "volm", "relvol", "avgvol", "price", "change"] },
  { id: "technical", label: "Technical", cols: ["ticker", "beta", "atr", "sma20", "sma50", "sma200", "hi52", "lo52", "rsi", "price", "change", "gap", "pattern", "candle"] },
  { id: "charts", label: "Charts", cols: [] },
];

export const SORTABLE = COLUMNS.map((c) => c.id);

export function sortSnaps(snaps: Snapshot[], sort: string): Snapshot[] {
  const desc = sort.startsWith("-");
  const col = getColumn(desc ? sort.slice(1) : sort) ?? getColumn("cap")!;
  return [...snaps].sort((a, b) => {
    const va = col.get(a);
    const vb = col.get(b);
    // Missing values always sink to the bottom, whichever way you sort.
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return desc ? -c : c;
  });
}

/** CSV of the visible rows and columns, for spreadsheets. */
export function toCsv(snaps: Snapshot[], cols: string[]): string {
  const cs = cols.map((c) => getColumn(c)).filter((c): c is Column => !!c);
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = cs.map((c) => esc(c.label)).join(",");
  const rows = snaps.map((s) =>
    cs
      .map((c) => {
        const v = c.get(s);
        return esc(v == null ? "" : typeof v === "number" ? String(Math.round(v * 10000) / 10000) : String(v));
      })
      .join(","),
  );
  return [head, ...rows].join("\n");
}
