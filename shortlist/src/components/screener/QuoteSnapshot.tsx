"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Shapes, Table2, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import MiniCandles from "@/components/screener/MiniCandles";
import { Card, H2, Pill } from "@/components/ui";
import { INSTRUMENTS, getInstrument, fmtNative, type Instrument } from "@/lib/instruments";
import { INDEX_LABEL } from "@/lib/universe";
import { useScreener } from "@/lib/screener/useScreener";
import { fmtBig, fmtP, fmtX } from "@/lib/screener/columns";
import { CANDLE_LABEL, type PatternId } from "@/lib/screener/patterns";
import { SIGNAL_LABEL } from "@/lib/screener/filters";
import type { Snapshot } from "@/lib/screener/snapshot";

const EXPLAIN: Record<PatternId, string> = {
  channel_up: "Higher highs and higher lows between two rising, roughly parallel lines. Traders watch the lower line as support while the channel holds.",
  channel_down: "Lower highs and lower lows between two falling lines. Rallies to the upper line have been selling opportunities so far.",
  channel: "Bouncing between a flat ceiling and floor. A clean break of either side is what traders wait for.",
  wedge_up: "Rising, but the lines are converging — buyers are getting less for their effort. Rising wedges often break downwards.",
  wedge_down: "Falling, but the lines are converging — sellers are running out of steam. Falling wedges often break upwards.",
  wedge: "A coiling triangle: lower highs and higher lows. Volatility is shrinking ahead of a move, direction unknown.",
  triangle_asc: "A flat ceiling with rising lows: buyers keep stepping in higher. Often resolves with a break above the ceiling.",
  triangle_desc: "A flat floor with falling highs: sellers keep pushing lower. Often resolves with a break below the floor.",
  double_top: "Two failed attempts at the same high. If the price breaks the dip between them, the textbook calls it a reversal.",
  double_bottom: "Two bounces from the same low — a 'W'. A break above the peak between them is the classic confirmation.",
  multiple_top: "Rejected at the same level three or more times. That ceiling is well defended.",
  multiple_bottom: "Held the same floor three or more times. Buyers keep defending that level.",
  head_shoulders: "A peak between two lower peaks. A break of the 'neckline' below is one of the best-known reversal signals.",
  head_shoulders_inv: "An upside-down head and shoulders: a low between two higher lows. A break above the neckline is the bullish signal.",
};

function peersOf(symbol: string): string[] {
  const i = getInstrument(symbol);
  if (!i || i.type !== "stock") return [];
  const same = (f: (x: Instrument) => boolean) => INSTRUMENTS.filter((x) => x.type === "stock" && x.symbol !== symbol && f(x));
  let list = same((x) => !!i.industry && x.industry === i.industry);
  if (list.length < 4) list = [...list, ...same((x) => x.sector === i.sector && x.industry !== i.industry)];
  // Biggest companies first, by shares × base price as a rough size.
  return list
    .sort((a, b) => (b.sharesM ?? 0) * b.base * (b.currency === "GBX" ? 0.0127 : 1) - (a.sharesM ?? 0) * a.base * (a.currency === "GBX" ? 0.0127 : 1))
    .slice(0, 6)
    .map((x) => x.symbol);
}

export default function QuoteSnapshot({ symbol }: { symbol: string }) {
  const peers = useMemo(() => peersOf(symbol), [symbol]);
  const subset = useMemo(() => [symbol, ...peers], [symbol, peers]);
  const { mounted, bySymbol } = useScreener(subset);
  const s = bySymbol.get(symbol);
  if (!mounted || !s) return null;
  const f = s.fund;

  const pairs: [string, string, number | null | undefined][] = [
    ["Index", (s.i.indices ?? []).map((k) => INDEX_LABEL[k]).join(", ") || "—", null],
    ["Market cap", fmtBig(s.marketCapUsd, "$"), null],
    ["P/E", fmtX(f?.pe), null],
    ["Forward P/E", fmtX(f?.fwdPe), null],
    ["PEG", fmtX(f?.peg), null],
    ["P/S", fmtX(f?.ps), null],
    ["P/B", fmtX(f?.pb), null],
    ["EPS (ttm)", fmtX(f?.eps), null],
    ["EPS this Y", fmtP(f?.epsGrowthThisY, 1, true), f?.epsGrowthThisY],
    ["EPS next Y", fmtP(f?.epsGrowthNextY, 1, true), f?.epsGrowthNextY],
    ["Sales growth", fmtP(f?.salesGrowth, 1, true), f?.salesGrowth],
    ["Dividend", fmtP(f?.dividendYield ?? s.i.dividendYieldPct), null],
    ["ROE", fmtP(f?.roe, 1), null],
    ["ROA", fmtP(f?.roa, 1), null],
    ["Gross margin", fmtP(f?.grossMargin, 1), null],
    ["Oper. margin", fmtP(f?.operMargin, 1), null],
    ["Profit margin", fmtP(f?.netMargin, 1), f?.netMargin],
    ["Debt/Eq", fmtX(f?.debtEq), null],
    ["Current ratio", fmtX(f?.currentRatio), null],
    ["Payout", fmtP(f?.payout, 0), null],
    ["Insider own", fmtP(f?.insiderOwn, 1), null],
    ["Inst own", fmtP(f?.instOwn, 1), null],
    ["Short float", fmtP(f?.shortFloat, 1), null],
    ["Recom", f?.recom ? `${f.recom.toFixed(1)} ${f.recom <= 2 ? "(buy)" : f.recom <= 3 ? "(hold)" : "(sell)"}` : "—", null],
    ["Target price", f?.targetPrice ? `${fmtNative(f.targetPrice, s.i.currency)} (${fmtP(f.targetUpside, 0, true)})` : "—", f?.targetUpside],
    ["Earnings", s.earnings ? (s.earnings.daysUntil === 0 ? `Today, ${s.earnings.timing.toLowerCase()}` : `In ${s.earnings.daysUntil} days`) : "—", null],
    ["52W range", `${fmtNative(s.low52, s.i.currency)} – ${fmtNative(s.high52, s.i.currency)}`, null],
    ["52W high", fmtP(s.fromHigh52, 1), s.fromHigh52],
    ["52W low", fmtP(s.fromLow52, 1, true), s.fromLow52],
    ["Perf week", fmtP(s.perfW, 1, true), s.perfW],
    ["Perf month", fmtP(s.perfM, 1, true), s.perfM],
    ["Perf quarter", fmtP(s.perfQ, 1, true), s.perfQ],
    ["Perf half", fmtP(s.perfH, 1, true), s.perfH],
    ["Perf YTD", fmtP(s.perfYtd, 1, true), s.perfYtd],
    ["Perf year", fmtP(s.perfY, 1, true), s.perfY],
    ["Beta", fmtX(s.beta), null],
    ["ATR (14)", `${fmtX(s.atr)} (${s.atrPct.toFixed(1)}%)`, null],
    ["Volatility", `${s.volW.toFixed(1)}% · ${s.volM.toFixed(1)}%`, null],
    ["RSI (14)", s.rsi.toFixed(1), null],
    ["SMA20", fmtP(s.sma20Pct, 1, true), s.sma20Pct],
    ["SMA50", fmtP(s.sma50Pct, 1, true), s.sma50Pct],
    ["SMA200", fmtP(s.sma200Pct, 1, true), s.sma200Pct],
    ["Prev close", fmtNative(s.prevClose, s.i.currency), null],
    ["Day range", `${fmtNative(s.low, s.i.currency)} – ${fmtNative(s.high, s.i.currency)}`, null],
    ["Gap", fmtP(s.gap, 2, true), s.gap],
    ["Rel volume", s.relVolume.toFixed(2), null],
    ["Avg volume", fmtBig(s.avgVolume), null],
    ["Volume", fmtBig(s.volume), null],
  ];
  const visible = s.i.type === "stock" ? pairs : pairs.filter(([k]) => !["P/E", "Forward P/E", "PEG", "P/S", "P/B", "EPS (ttm)", "EPS this Y", "EPS next Y", "Sales growth", "ROE", "ROA", "Gross margin", "Oper. margin", "Profit margin", "Debt/Eq", "Current ratio", "Payout", "Insider own", "Inst own", "Short float", "Recom", "Target price", "Earnings", "Index"].includes(k) && !(k === "Market cap" && !s.marketCapUsd));

  const flags = s.signals.filter((g) => !g.startsWith("p_")).map((g) => SIGNAL_LABEL.get(g)).filter(Boolean) as string[];
  const peerRows = peers.map((p) => bySymbol.get(p)).filter((x): x is Snapshot => !!x);

  return (
    <>
      <H2>
        <span className="inline-flex items-center gap-1.5">
          <Shapes className="h-4 w-4" /> Chart pattern
        </span>
      </H2>
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {s.pattern ? (
            <>
              <span className="font-semibold text-white">{s.pattern.label}</span>
              <Pill tone={s.pattern.bias === "bullish" ? "emerald" : s.pattern.bias === "bearish" ? "rose" : "amber"}>{s.pattern.bias}</Pill>
            </>
          ) : (
            <span className="font-semibold text-white">No clear pattern right now</span>
          )}
          {s.candle && <Pill tone="sky">Today: {CANDLE_LABEL[s.candle]}</Pill>}
          {flags.slice(0, 4).map((x) => (
            <Pill key={x}>{x}</Pill>
          ))}
        </div>
        <MiniCandles bars={s.bars} pattern={s.pattern} level={s.srLevel} height={200} count={110} />
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-ink-500">
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-blue-400 align-middle" />
            20-day average
          </span>
          <span>
            <span className="mr-1 inline-block h-0.5 w-3 bg-sky-400 align-middle" />
            50-day average
          </span>
          {(s.pattern || s.srLevel) && (
            <span>
              <span className="mr-1 inline-block h-0.5 w-3 border-t border-dashed border-amber-300 align-middle" />
              Auto-drawn trendlines
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-300">{s.pattern ? EXPLAIN[s.pattern.id] : "The recent price action doesn't form one of the classic shapes. That's normal — most charts, most of the time, don't."}</p>
        <p className="mt-1 text-xs text-ink-500">Patterns are found automatically from the last few months of prices. They describe what has happened, not what will.</p>
      </Card>

      <H2
        right={
          s.i.type === "stock" && s.fund?.source !== "live" ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">Demo fundamentals</span>
          ) : undefined
        }
      >
        <span className="inline-flex items-center gap-1.5">
          <Table2 className="h-4 w-4" /> Snapshot
        </span>
      </H2>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-4">
        {visible.map(([k, v, n]) => (
          <div key={k} className="flex items-center justify-between gap-2 bg-ink-900 px-3 py-2">
            <span className="shrink-0 text-[11px] text-ink-400">{k}</span>
            <span className={`num min-w-0 break-words text-right font-mono text-xs leading-tight ${typeof n === "number" ? (n > 0 ? "text-emerald-300" : n < 0 ? "text-rose-300" : "text-ink-100") : "text-ink-100"}`}>{v}</span>
          </div>
        ))}
      </div>

      {peerRows.length > 0 && (
        <>
          <H2
            right={
              s.i.industry ? (
                <Link href={`/screener?f=ind:${s.i.industry.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} className="text-xs font-semibold text-blue-300 hover:underline">
                  Screen the industry
                </Link>
              ) : undefined
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Peers
            </span>
          </H2>
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07] bg-ink-900/70">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-ink-400">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    Company
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Mkt cap
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    P/E
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Year
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">
                    Today
                  </th>
                </tr>
              </thead>
              <tbody>
                {[s, ...peerRows].map((p) => (
                  <tr key={p.symbol} className={`border-b border-white/[0.04] last:border-0 ${p.symbol === s.symbol ? "bg-white/[0.04]" : ""}`}>
                    <td className="px-3 py-2">
                      <Link href={`/i/${p.symbol}`} className="flex items-center gap-2 hover:underline">
                        <Avatar symbol={p.symbol} size={22} />
                        <span className="font-semibold text-white">{p.symbol}</span>
                        <span className="truncate text-xs text-ink-400">{p.i.name}</span>
                      </Link>
                    </td>
                    <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtBig(p.marketCapUsd, "$")}</td>
                    <td className="num px-3 py-2 text-right font-mono text-ink-200">{fmtX(p.fund?.pe, 1)}</td>
                    <td className={`num px-3 py-2 text-right font-mono ${(p.perfY ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(p.perfY, 1, true)}</td>
                    <td className={`num px-3 py-2 text-right font-mono ${p.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(p.change, 2, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
