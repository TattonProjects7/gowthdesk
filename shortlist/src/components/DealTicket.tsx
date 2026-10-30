"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, ChevronUp, Loader2, PiggyBank } from "lucide-react";
import { Button, Input, Segmented, Select } from "@/components/ui";
import { getInstrument, fmtNative, fmtGbp } from "@/lib/instruments";
import { FX_FEE_PCT } from "@/lib/fx";
import { ACCOUNT_META, MIN_ORDER_GBP, holdingFor, previewOrder, type OrderSide, type OrderType, type Pricer } from "@/lib/portfolio";
import { portfolio, usePortfolio } from "@/lib/portfolioStore";
import { warningHaptic } from "@/lib/native";
import { celebrateTrade, originOf } from "@/lib/effects";

// The deal ticket, modelled on IG's: pick the account (GIA / ISA / SIPP), buy
// or sell, market / limit / stop, deal in £ (fractional from £1) or units,
// attach a stop-loss / take-profit / trailing stop, see the full cost preview,
// and — if there isn't enough cash — top up or move funds without leaving the
// ticket. Paper money only.
export default function DealTicket({ symbol, pricer, defaultSide = "buy", compact = false }: { symbol: string; pricer: Pricer; defaultSide?: OrderSide; compact?: boolean }) {
  const i = getInstrument(symbol)!;
  const state = usePortfolio();
  const accounts = state.accounts;

  const [side, setSide] = useState<OrderSide>(defaultSide);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [type, setType] = useState<OrderType>("market");
  const [mode, setMode] = useState<"gbp" | "units">("gbp");
  const [amount, setAmount] = useState("100");
  const [limit, setLimit] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [trailing, setTrailing] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [shortfall, setShortfall] = useState<number | null>(null);
  const [fromAcc, setFromAcc] = useState("");
  const submitRef = useRef<HTMLButtonElement>(null);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const holding = account ? holdingFor(state, account.id, i.symbol) : undefined;
  const price = pricer.price(i.symbol);
  const amt = parseFloat(amount) || 0;

  const preview = useMemo(
    () => previewOrder({ symbol: i.symbol, side, qty: mode === "units" ? amt : undefined, amountGbp: mode === "gbp" ? amt : undefined }, pricer),
    [i.symbol, side, mode, amt, pricer],
  );

  const feeNote = i.currency === "USD" ? `${FX_FEE_PCT}% FX fee on ${i.currency} dealing` : "Commission-free";
  const others = accounts.filter((a) => a.id !== account?.id && a.cash > 0);

  const submit = async () => {
    if (!account) return;
    setBusy(true);
    setMsg(null);
    setShortfall(null);
    const r = portfolio.place(
      {
        accountId: account.id,
        symbol: i.symbol,
        side,
        type,
        qty: mode === "units" ? amt : undefined,
        amountGbp: mode === "gbp" ? amt : undefined,
        limitPrice: type === "market" ? undefined : parseFloat(limit) || undefined,
        stopLoss: side === "buy" && stopLoss ? parseFloat(stopLoss) : undefined,
        takeProfit: side === "buy" && takeProfit ? parseFloat(takeProfit) : undefined,
        trailingPct: side === "buy" && trailing ? parseFloat(trailing) : undefined,
      },
      pricer,
    );
    setBusy(false);
    if (r.error) {
      warningHaptic();
      setMsg({ tone: "err", text: r.error });
      if (r.shortfall) setShortfall(r.shortfall);
      return;
    }
    const o = r.order!;
    const filled = o.status === "filled";
    celebrateTrade(
      filled
        ? { kind: side, symbol: i.symbol, name: i.name, qty: o.fillQty, valueGbp: o.fillValueGbp ?? 0, priceLabel: fmtNative(o.fillPrice ?? price, i.currency), account: account.name, origin: originOf(submitRef.current) }
        : { kind: "working", symbol: i.symbol, detail: `${type === "limit" ? "Limit" : "Stop"} ${side} at ${fmtNative(parseFloat(limit), i.currency)} in your ${account.name}.`, origin: originOf(submitRef.current) },
    );
    setMsg({
      tone: "ok",
      text:
        o.status === "filled"
          ? `${side === "buy" ? "Bought" : "Sold"} ${o.fillQty} ${i.symbol} at ${fmtNative(o.fillPrice ?? price, i.currency)} for ${fmtGbp(o.fillValueGbp ?? 0)} in your ${account.name}.`
          : `${type === "limit" ? "Limit" : "Stop"} order working — fills when ${i.symbol} ${type === "stop" || side === "buy" ? "falls to" : "rises to"} ${fmtNative(parseFloat(limit), i.currency)}.`,
    });
  };

  const topUp = () => {
    if (!account || !shortfall) return;
    portfolio.deposit(account.id, Math.ceil(shortfall));
    setShortfall(null);
    setMsg({ tone: "ok", text: `Added ${fmtGbp(Math.ceil(shortfall))} to ${account.name}. Tap ${side === "buy" ? "Buy" : "Sell"} again to deal.` });
  };

  const move = () => {
    if (!account || !shortfall || !fromAcc) return;
    const err = portfolio.transfer(fromAcc, account.id, Math.ceil(shortfall));
    if (err) setMsg({ tone: "err", text: err });
    else {
      setShortfall(null);
      setMsg({ tone: "ok", text: `Moved ${fmtGbp(Math.ceil(shortfall))} into ${account.name}. Tap ${side === "buy" ? "Buy" : "Sell"} again to deal.` });
    }
  };

  if (!account) return null;

  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-ink-900/80 shadow-card ${side === "buy" ? "border-emerald-400/20" : "border-rose-400/20"} ${compact ? "p-4" : "p-5"}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${side === "buy" ? "from-emerald-400 to-teal-400" : "from-rose-500 to-pink-500"}`} />
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-300 ring-1 ring-white/10">
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-rose-400 to-violet-400" /> Demo money
        </span>
        <span className="text-xs text-ink-400">{fmtGbp(account.cash)} cash</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["buy", "sell"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSide(s);
              setMsg(null);
              setShortfall(null);
              if (s === "sell") setType((t) => (t === "limit" ? "limit" : "market"));
            }}
            className={`rounded-2xl py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
              side === s ? (s === "buy" ? "bg-gradient-to-r from-emerald-400 to-teal-400 text-ink-950 shadow-glow-emerald" : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-glow-rose") : "bg-white/[0.04] text-ink-300 hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Account selector */}
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-ink-500 mb-1">Account</label>
      <Select value={account.id} onChange={(e) => setAccountId(e.target.value)}>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} — {fmtGbp(a.cash)} cash{ACCOUNT_META[a.type].allowance ? ` · ${ACCOUNT_META[a.type].allowance}` : ""}
          </option>
        ))}
      </Select>
      {accounts.length < 3 && (
        <p className="mt-1 text-[11px] text-ink-500">
          Want this in a tax wrapper?{" "}
          <Link href="/portfolio?tab=accounts" className="text-rose-400 hover:underline">
            Open an ISA or SIPP
          </Link>
        </p>
      )}

      {/* Order type */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">Order</label>
        <Segmented
          size="sm"
          value={type}
          onChange={(v) => setType(v)}
          options={side === "buy" ? [{ id: "market", label: "Market" }, { id: "limit", label: "Limit" }] : [{ id: "market", label: "Market" }, { id: "limit", label: "Limit" }, { id: "stop", label: "Stop" }]}
        />
      </div>
      {type !== "market" && (
        <div className="mt-2">
          <Input type="number" inputMode="decimal" step="any" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={`${type === "limit" ? "Limit" : "Stop"} price (${i.currency === "GBX" ? "pence" : i.currency})`} />
          <p className="mt-1 text-[11px] text-ink-500">
            {type === "limit" && side === "buy" && "Buys only if the price falls to your limit or better."}
            {type === "limit" && side === "sell" && "Sells only if the price rises to your limit or better."}
            {type === "stop" && "Sells automatically if the price falls to your stop — a safety net."}
          </p>
        </div>
      )}

      {/* Amount */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{side === "buy" ? "Invest" : "Sell"}</label>
        <Segmented size="sm" value={mode} onChange={(v) => setMode(v)} options={[{ id: "gbp", label: "£ amount" }, { id: "units", label: i.type === "crypto" ? "Coins" : "Units" }]} />
      </div>
      <div className="mt-2 flex gap-2">
        <Input type="number" inputMode="decimal" step="any" min={mode === "gbp" ? MIN_ORDER_GBP : 0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={mode === "gbp" ? "Amount in £" : "Number of units"} />
        {side === "sell" && holding && (
          <Button variant="ghost" onClick={() => { setMode("units"); setAmount(String(holding.qty)); }} className="whitespace-nowrap">
            Sell all
          </Button>
        )}
      </div>
      {mode === "gbp" && side === "buy" && (
        <div className="mt-2 flex gap-1.5">
          {[25, 100, 250, 1000].map((v) => (
            <button key={v} onClick={() => setAmount(String(v))} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:bg-white/5">
              £{v}
            </button>
          ))}
          <button onClick={() => setAmount(String(Math.floor(account.cash)))} className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:bg-white/5">
            Max
          </button>
        </div>
      )}

      {/* Protections */}
      {side === "buy" && (
        <div className="mt-4">
          <button onClick={() => setAdvanced((v) => !v)} className="flex w-full items-center justify-between text-xs font-semibold text-ink-300 hover:text-white">
            <span>Stop-loss · take-profit · trailing stop</span>
            {advanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {advanced && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-ink-500 mb-1">Stop-loss</p>
                <Input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder={fmtNative(price * 0.9, i.currency)} />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-1">Take-profit</p>
                <Input type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder={fmtNative(price * 1.2, i.currency)} />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-1">Trailing %</p>
                <Input type="number" step="any" value={trailing} onChange={(e) => setTrailing(e.target.value)} placeholder="10" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="mt-4 rounded-2xl bg-white/[0.03] p-3 text-sm space-y-1 ring-1 ring-white/[0.05]">
        <Row k="Price" v={fmtNative(price, i.currency)} />
        <Row k={mode === "gbp" ? `Est. ${i.type === "crypto" ? "coins" : "units"}` : "Value"} v={mode === "gbp" ? preview.qty.toLocaleString(undefined, { maximumFractionDigits: 6 }) : fmtGbp(preview.valueGbp)} />
        <Row k={preview.feeGbp ? `FX fee (${FX_FEE_PCT}%)` : "Commission"} v={preview.feeGbp ? fmtGbp(preview.feeGbp) : "£0.00"} muted />
        <div className="border-t border-ink-800 pt-1 mt-1">
          <Row k={side === "buy" ? "Total cost" : "You receive"} v={fmtGbp(preview.totalGbp)} strong />
        </div>
        <p className="text-[11px] text-ink-500 pt-1">
          {feeNote} · {side === "buy" ? `${fmtGbp(account.cash)} available` : holding ? `You hold ${holding.qty.toLocaleString(undefined, { maximumFractionDigits: 6 })} in this account` : "No holding in this account"}
        </p>
      </div>

      <Button ref={submitRef} variant={side} onClick={submit} disabled={busy || amt <= 0 || (side === "sell" && !holding)} className="mt-3 w-full rounded-2xl py-3.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : side === "buy" ? "Buy" : "Sell"} {i.symbol}
        {type !== "market" ? ` (${type})` : ""}
      </Button>

      {msg && <p className={`mt-3 text-sm ${msg.tone === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{msg.text}</p>}

      {shortfall && (
        <div className="mt-3 rounded-xl border border-amber-900 bg-amber-950/30 p-3 space-y-2">
          <p className="text-xs text-amber-200">You’re {fmtGbp(shortfall)} short. Add funds without leaving the ticket:</p>
          <Button variant="ghost" onClick={topUp} className="w-full">
            <PiggyBank className="h-4 w-4" /> Top up {fmtGbp(Math.ceil(shortfall))} (virtual funds)
          </Button>
          {others.length > 0 && (
            <div className="flex gap-2">
              <Select value={fromAcc} onChange={(e) => setFromAcc(e.target.value)}>
                <option value="">Move from…</option>
                {others.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({fmtGbp(a.cash)})
                  </option>
                ))}
              </Select>
              <Button variant="ghost" onClick={move} disabled={!fromAcc}>
                <ArrowLeftRight className="h-4 w-4" /> Move
              </Button>
            </div>
          )}
        </div>
      )}

      {msg?.tone === "ok" && (
        <Link href="/portfolio" className="mt-2 inline-flex items-center gap-1 text-xs text-ink-400 hover:text-white">
          <Check className="h-3.5 w-3.5" /> View in portfolio
        </Link>
      )}
    </div>
  );
}

function Row({ k, v, muted, strong }: { k: string; v: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-ink-500" : "text-ink-400"}>{k}</span>
      <span className={`font-mono ${strong ? "font-bold text-white" : muted ? "text-ink-400" : "text-ink-200"}`}>{v}</span>
    </div>
  );
}
