"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { broker, setMode, useBroker } from "@/lib/broker/client";
import { fmtGbp, fmtNative, getInstrument } from "@/lib/instruments";

// Real mode's portfolio: cash, positions and working orders straight from the
// connected Trading 212 account.
export default function RealPortfolio() {
  const { account, status, loading, error } = useBroker();
  const live = status?.env === "live";
  const accent = live ? "from-amber-400 to-orange-500" : "from-blue-400 to-sky-400";

  useEffect(() => {
    void broker.refreshAccount();
  }, []);

  if (!account) {
    return (
      <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-6 shadow-card">
        {error ? (
          <>
            <p className="font-semibold text-white">Couldn&apos;t load your Trading 212 account</p>
            <p className="mt-1 text-sm text-rose-300">{error}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => broker.refreshAccount()} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-950">
                Try again
              </button>
              <button onClick={() => setMode("demo")} className="rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white">
                Back to demo
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3" aria-busy>
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-56 animate-pulse rounded bg-white/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/[0.06]" />
          </div>
        )}
      </div>
    );
  }

  const { cash, positions, orders } = account;
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 p-5 shadow-card sm:p-6">
        <div className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${accent} opacity-25 blur-3xl`} />
        <div className="relative flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${accent} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950`}>
            <span className="h-1.5 w-1.5 rounded-full bg-ink-950" /> {live ? "Real money" : "Trading 212 practice"}
          </span>
          <button onClick={() => broker.refreshAccount()} className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-ink-300 hover:text-white" aria-label="Refresh account">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
          </button>
        </div>
        <p className="relative mt-4 text-xs font-medium text-ink-400">Trading 212 account value</p>
        <p className="relative mt-1 text-4xl font-bold tracking-tight text-white num sm:text-5xl">{fmtGbp(cash.total)}</p>
        <p className={`relative mt-1 text-sm font-semibold num ${cash.ppl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {fmtGbp(cash.ppl, { sign: true })} unrealised
        </p>
        <div className="relative mt-5 grid grid-cols-3 gap-2">
          <Tile k="Free cash" v={fmtGbp(cash.free)} />
          <Tile k="Invested" v={fmtGbp(cash.invested)} />
          <Tile k="Realised" v={fmtGbp(cash.result, { sign: true })} tone={cash.result >= 0 ? "up" : "down"} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-ink-900/70 p-2 shadow-card">
        <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Positions</h2>
        {positions.length === 0 ? (
          <p className="px-3 pb-4 pt-2 text-sm text-ink-400">No positions yet. Open any share or ETF and place a real order.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {positions.map((p) => {
              const inst = p.symbol ? getInstrument(p.symbol) : undefined;
              const body = (
                <div className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/[0.03]">
                  {inst ? <Avatar symbol={inst.symbol} size={36} /> : <div className="h-9 w-9 rounded-full bg-white/10" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{inst?.name ?? p.ticker}</p>
                    <p className="text-xs text-ink-400 num">
                      {p.quantity} · avg {inst ? fmtNative(p.averagePrice, inst.currency) : p.averagePrice}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white num">{inst ? fmtNative(p.currentPrice, inst.currency) : p.currentPrice}</p>
                    <p className={`text-xs font-semibold num ${p.ppl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtGbp(p.ppl, { sign: true })}</p>
                  </div>
                </div>
              );
              return <li key={p.ticker}>{inst ? <Link href={`/i/${inst.symbol}`}>{body}</Link> : body}</li>;
            })}
          </ul>
        )}
      </section>

      {orders.length > 0 && (
        <section className="rounded-3xl border border-white/10 bg-ink-900/70 p-2 shadow-card">
          <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Working orders</h2>
          <ul className="divide-y divide-white/5">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-3 py-3">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${o.side === "buy" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{o.side}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {o.quantity} {o.symbol ?? o.ticker}
                  </p>
                  <p className="text-xs text-ink-400">
                    {o.type.toLowerCase()} {o.limitPrice ? `@ ${o.limitPrice}` : o.stopPrice ? `stop ${o.stopPrice}` : ""} · {o.status.toLowerCase()}
                  </p>
                </div>
                <button onClick={() => broker.cancel(o.id).catch(() => {})} className="flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-ink-300 hover:text-white" aria-label={`Cancel order ${o.id}`}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="text-sm text-rose-300">{error}</p>}
      <p className="text-[11px] leading-relaxed text-ink-500">
        Balances and positions come from your Trading 212 account and refresh every 15 seconds. Shortlist is not a broker and doesn&apos;t give advice. Automation, analytics and Learn &amp; Earn work on your demo portfolio — switch to Demo to use them.
      </p>
    </div>
  );
}

function Tile({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3">
      <p className="text-[11px] text-ink-400">{k}</p>
      <p className={`mt-0.5 text-sm font-bold num ${tone === "up" ? "text-emerald-300" : tone === "down" ? "text-rose-300" : "text-white"}`}>{v}</p>
    </div>
  );
}
