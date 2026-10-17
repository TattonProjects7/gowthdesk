"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Send } from "lucide-react";
import { Segmented } from "@/components/ui";
import { broker, setMode, useBroker } from "@/lib/broker/client";
import { realTradable } from "@/lib/broker/tickers";
import type { RealOrderType, RealSide } from "@/lib/broker/types";
import { celebrateTrade, originOf } from "@/lib/effects";
import { fmtGbp, fmtNative, getInstrument } from "@/lib/instruments";
import { previewOrder, type Pricer } from "@/lib/portfolio";
import { warningHaptic } from "@/lib/native";

// The real-money deal ticket: orders go to the connected Trading 212 account.
// Quantities are in shares (Trading 212 sizes orders by quantity), every order
// is reviewed on a confirm screen first, and prices are labelled indicative
// whenever the app is showing simulated market data.
export default function RealDealTicket({ symbol, pricer, defaultSide = "buy", priceLive }: { symbol: string; pricer: Pricer; defaultSide?: RealSide; priceLive: boolean }) {
  const i = getInstrument(symbol)!;
  const { account, status } = useBroker();
  const [side, setSide] = useState<RealSide>(defaultSide);
  const [type, setType] = useState<RealOrderType>("market");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const live = status?.env === "live";
  const position = account?.positions.find((p) => p.symbol === i.symbol);
  const q = parseFloat(qty) || 0;
  const px = pricer.price(i.symbol);
  const est = useMemo(() => previewOrder({ symbol: i.symbol, side, qty: q }, pricer), [i.symbol, side, q, pricer]);
  const accent = live ? "from-amber-400 to-orange-500" : "from-violet-400 to-sky-400";

  if (!realTradable(i.symbol)) {
    return (
      <div className="rounded-3xl border border-white/10 bg-ink-900/70 p-5 shadow-card">
        <p className="text-sm font-semibold text-white">{i.name} isn&apos;t available for real trading</p>
        <p className="mt-1 text-sm text-ink-400">Trading 212&apos;s API covers shares and ETFs in Invest and Stocks ISA accounts, not crypto. You can still practise it in demo mode.</p>
        <button onClick={() => setMode("demo")} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-950">
          Switch to demo
        </button>
      </div>
    );
  }

  const valid = q > 0 && (type === "market" || parseFloat(price) > 0) && !(side === "sell" && position && q > (position.maxSell ?? position.quantity) + 1e-9);

  const place = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const o = await broker.place({ symbol: i.symbol, side, type, quantity: q, limitPrice: type === "limit" ? parseFloat(price) : undefined, stopPrice: type === "stop" ? parseFloat(price) : undefined });
      setReview(false);
      setMsg({ ok: true, text: `Sent to Trading 212: ${side} ${o.quantity} ${i.symbol} (${o.type.toLowerCase()}, ${o.status.toLowerCase()}).` });
      celebrateTrade(
        type === "market"
          ? { kind: side, symbol: i.symbol, name: i.name, qty: q, valueGbp: est.valueGbp, priceLabel: `≈ ${fmtNative(px, i.currency)}`, account: live ? "Trading 212 · Live" : "Trading 212 · Practice", real: live, origin: originOf(btn.current) }
          : { kind: "working", symbol: i.symbol, real: live, detail: `${type === "limit" ? "Limit" : "Stop"} ${side} for ${q} at ${fmtNative(parseFloat(price), i.currency)} is working at Trading 212.`, origin: originOf(btn.current) },
      );
    } catch (e) {
      warningHaptic();
      setMsg({ ok: false, text: e instanceof Error ? e.message : "The order didn't go through." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-ink-900/80 p-4 shadow-card sm:p-5 ${live ? "border-amber-400/30" : "border-violet-400/30"}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="mb-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${accent} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-950`}>
          <span className="h-1.5 w-1.5 rounded-full bg-ink-950" /> {live ? "Real money" : "Trading 212 practice"}
        </span>
        {account && <span className="text-xs text-ink-400">{fmtGbp(account.cash.free)} free</span>}
      </div>

      {!review ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {(["buy", "sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSide(s);
                  setMsg(null);
                }}
                className={`rounded-2xl py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${side === s ? (s === "buy" ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-ink-950 shadow-glow-emerald" : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-glow-rose") : "bg-white/[0.04] text-ink-300 hover:text-white"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Order</span>
            <Segmented size="sm" value={type} onChange={(v) => setType(v)} options={[{ id: "market", label: "Market" }, { id: "limit", label: "Limit" }, { id: "stop", label: "Stop" }]} />
          </div>
          {type !== "market" && (
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`${type === "limit" ? "Limit" : "Stop"} price (${i.currency === "GBX" ? "pence" : i.currency})`}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm text-white placeholder-ink-500 focus:border-white/30 focus:outline-none"
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Quantity (shares)</span>
            {side === "sell" && position && (
              <button onClick={() => setQty(String(position.maxSell ?? position.quantity))} className="text-xs font-semibold text-ink-300 hover:text-white">
                Sell all ({position.quantity})
              </button>
            )}
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="Quantity in shares"
            className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-2.5 text-sm text-white focus:border-white/30 focus:outline-none"
          />
          <div className="mt-2 flex gap-1.5">
            {[0.5, 1, 5, 10].map((v) => (
              <button key={v} onClick={() => setQty(String(v))} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-ink-300 hover:bg-white/5">
                {v}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-1 rounded-2xl bg-white/[0.03] p-3 text-sm">
            <Row k={priceLive ? "Price" : "Price (indicative)"} v={fmtNative(px, i.currency)} />
            <Row k="Est. value" v={fmtGbp(est.valueGbp)} strong />
            {position && <Row k="You hold" v={`${position.quantity} ${position.quantity === 1 ? "share" : "shares"}`} />}
            {!priceLive && (
              <p className="flex items-start gap-1.5 pt-1 text-[11px] text-amber-200/90">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> This app is showing simulated prices. Market orders fill at Trading 212&apos;s live price.
              </p>
            )}
          </div>

          <button ref={btn} disabled={!valid} onClick={() => setReview(true)} className={`mt-3 w-full rounded-2xl bg-gradient-to-r ${accent} py-3.5 text-sm font-bold text-ink-950 transition-transform active:scale-[0.98] disabled:opacity-40`}>
            Review {side} order
          </button>
        </>
      ) : (
        <div className="fade-in">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Check before you send</p>
          <p className="mt-2 text-xl font-bold text-white">
            {side === "buy" ? "Buy" : "Sell"} {q} {i.symbol}
          </p>
          <p className="text-sm text-ink-300">
            {type === "market" ? "At market price" : `${type === "limit" ? "Limit" : "Stop"} at ${fmtNative(parseFloat(price), i.currency)}, good for the day`}
          </p>
          <div className="mt-3 space-y-1 rounded-2xl bg-white/[0.03] p-3 text-sm">
            <Row k="Estimated value" v={fmtGbp(est.valueGbp)} strong />
            <Row k="Account" v={live ? "Trading 212 · Live" : "Trading 212 · Practice"} />
            <Row k="Instrument" v={i.name} />
          </div>
          {live && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-3 text-xs text-amber-100">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> This is a real order with real money. It can&apos;t be undone once it fills.
            </p>
          )}
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button onClick={() => setReview(false)} disabled={busy} className="flex items-center gap-1 rounded-2xl bg-white/[0.06] px-4 text-sm font-semibold text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button ref={btn} onClick={place} disabled={busy} className={`flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${accent} py-3.5 text-sm font-bold text-ink-950 transition-transform active:scale-[0.98] disabled:opacity-60`}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {live ? "Place real order" : "Place practice order"}
            </button>
          </div>
        </div>
      )}

      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">Orders go to your own Trading 212 account, which holds your money and executes the trade. Shortlist is not a broker and doesn&apos;t give advice. Capital at risk.</p>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-400">{k}</span>
      <span className={`num text-right ${strong ? "font-bold text-white" : "text-ink-200"}`}>{v}</span>
    </div>
  );
}
