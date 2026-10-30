"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, LayoutGrid } from "lucide-react";
import Sparkline from "@/components/Sparkline";
import { Card } from "@/components/ui";
import { useScreener } from "@/lib/screener/useScreener";
import { SIGNALS } from "@/lib/screener/filters";
import { fmtBig, fmtP } from "@/lib/screener/columns";
import { fmtNative } from "@/lib/instruments";
import type { SignalId, Snapshot } from "@/lib/screener/snapshot";

// The Finviz front page, rebuilt for Shortlist: the big indices, market
// breadth, and live signal tables that drop straight into the screener.

const INDICES = [
  { symbol: "VUSA", label: "S&P 500" },
  { symbol: "EQQQ", label: "Nasdaq-100" },
  { symbol: "ISF", label: "FTSE 100" },
  { symbol: "VWRL", label: "All-World" },
  { symbol: "SGLN", label: "Gold" },
  { symbol: "BTC", label: "Bitcoin" },
];

const SIGNAL_TABS: SignalId[] = ["top_gainers", "top_losers", "new_high", "new_low", "unusual_volume", "most_active", "overbought", "oversold", "breakout", "earnings_week"];

export default function MarketPulse() {
  const { mounted, snaps, bySymbol } = useScreener();
  const [tab, setTab] = useState<SignalId>("top_gainers");

  const stocks = useMemo(() => snaps.filter((s) => s.i.type === "stock"), [snaps]);
  const breadth = useMemo(() => {
    const n = stocks.length || 1;
    const count = (f: (s: Snapshot) => boolean) => stocks.filter(f).length;
    return {
      n,
      rows: [
        { label: "Advancing", a: count((s) => s.change > 0), bLabel: "Declining", b: count((s) => s.change < 0) },
        { label: "New high", a: count((s) => s.signals.includes("new_high")), bLabel: "New low", b: count((s) => s.signals.includes("new_low")) },
        { label: "Above SMA50", a: count((s) => (s.sma50Pct ?? 0) > 0), bLabel: "Below SMA50", b: count((s) => (s.sma50Pct ?? 0) < 0) },
        { label: "Above SMA200", a: count((s) => (s.sma200Pct ?? 0) > 0), bLabel: "Below SMA200", b: count((s) => (s.sma200Pct ?? 0) < 0) },
      ],
    };
  }, [stocks]);

  const rows = useMemo(() => {
    const list = snaps.filter((s) => s.signals.includes(tab));
    const key: Record<string, (s: Snapshot) => number> = {
      top_gainers: (s) => -s.change,
      top_losers: (s) => s.change,
      unusual_volume: (s) => -s.relVolume,
      most_active: (s) => -s.turnoverUsd,
      overbought: (s) => -s.rsi,
      oversold: (s) => s.rsi,
      earnings_week: (s) => s.earnings?.daysUntil ?? 99,
    };
    const k = key[tab] ?? ((s: Snapshot) => -(s.marketCapUsd ?? 0));
    return [...list].sort((a, b) => k(a) - k(b)).slice(0, 8);
  }, [snaps, tab]);

  if (!mounted) return <div className="skeleton mb-6 h-72 rounded-3xl" />;

  return (
    <div className="mb-6 space-y-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0">
        {INDICES.map(({ symbol, label }) => {
          const s = bySymbol.get(symbol);
          if (!s) return null;
          const pts = s.bars.slice(-30).map((b) => b.c);
          return (
            <Link key={symbol} href={`/i/${symbol}`} className="min-w-[132px] rounded-2xl border border-white/[0.07] bg-ink-900/70 p-3 shadow-card hover:border-white/15">
              <p className="text-[11px] font-semibold text-ink-400">{label}</p>
              <p className="num mt-0.5 font-mono text-sm font-semibold text-white">{fmtNative(s.price, s.i.currency)}</p>
              <p className={`num font-mono text-xs ${s.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(s.change, 2, true)}</p>
              <div className="mt-1.5">
                <Sparkline points={pts} width={110} height={26} stroke="#34d399" downStroke="#fb7185" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="!p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Market breadth · {breadth.n} shares</p>
            <Link href="/maps" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:underline">
              <LayoutGrid className="h-3.5 w-3.5" /> Heatmap
            </Link>
          </div>
          <div className="space-y-3">
            {breadth.rows.map((r) => {
              const none = r.a + r.b === 0;
              const tot = r.a + r.b || 1;
              return (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-emerald-300">
                      {r.label} <b className="num font-mono">{r.a}</b> <span className="text-ink-500">({Math.round((r.a / tot) * 100)}%)</span>
                    </span>
                    <span className="text-rose-300">
                      <span className="text-ink-500">({Math.round((r.b / tot) * 100)}%)</span> <b className="num font-mono">{r.b}</b> {r.bLabel}
                    </span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-ink-800">
                    {!none && (
                      <>
                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${(r.a / tot) * 100}%` }} />
                        <div className="flex-1 bg-gradient-to-r from-rose-400 to-rose-600" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="!p-4">
          <div className="-mx-1 mb-2 flex gap-1 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Signals">
            {SIGNAL_TABS.map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${tab === id ? "bg-white text-ink-950" : "bg-white/[0.04] text-ink-300 hover:text-white"}`}
              >
                {SIGNALS.find((s) => s.id === id)?.label}
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">Nothing is flashing this signal right now.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>Ticker</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.symbol} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-1.5">
                      <Link href={`/i/${s.symbol}`} className="font-bold text-white hover:underline">
                        {s.symbol}
                      </Link>
                      <span className="ml-2 hidden text-xs text-ink-500 sm:inline">{s.i.name}</span>
                    </td>
                    <td className="num py-1.5 text-right font-mono text-ink-200">{fmtNative(s.price, s.i.currency)}</td>
                    <td className={`num py-1.5 text-right font-mono ${s.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtP(s.change, 2, true)}</td>
                    <td className="num hidden py-1.5 text-right font-mono text-ink-400 sm:table-cell">{tab === "unusual_volume" ? `${s.relVolume.toFixed(1)}×` : tab === "overbought" || tab === "oversold" ? `RSI ${s.rsi.toFixed(0)}` : tab === "earnings_week" ? (s.earnings?.daysUntil === 0 ? "Today" : `${s.earnings?.daysUntil}d`) : fmtBig(s.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link href={`/screener?s=${tab}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-300 hover:underline">
            See all in the screener <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>
    </div>
  );
}
