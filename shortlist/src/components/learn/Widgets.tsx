"use client";

import { useMemo, useState } from "react";
import AreaChart from "@/components/AreaChart";
import PriceChart from "@/components/PriceChart";
import { getInstrument, fmtGbp } from "@/lib/instruments";
import { useMarket } from "@/lib/useMarket";
import type { Widget } from "@/lib/learn/content";

// Interactive lesson cards — learn by playing with the numbers.
export default function LessonWidget({ kind, symbol }: { kind: Widget; symbol?: string }) {
  if (kind === "compound") return <Compound />;
  if (kind === "fees") return <Fees />;
  if (kind === "sizing") return <Sizing />;
  if (kind === "diversify") return <Diversify />;
  return <LiveChart symbol={symbol ?? "LLOY"} />;
}

function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs text-ink-400">
        <span>{label}</span>
        <span className="font-mono font-semibold text-white">{fmt(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-rose-500" />
    </label>
  );
}

function Compound() {
  const [monthly, setMonthly] = useState(100);
  const [years, setYears] = useState(25);
  const [rate, setRate] = useState(6);
  const { series, paidIn, final } = useMemo(() => {
    const r = rate / 100 / 12;
    const out: number[] = [];
    let v = 0;
    for (let m = 1; m <= years * 12; m++) {
      v = v * (1 + r) + monthly;
      if (m % 12 === 0) out.push(v);
    }
    return { series: [0, ...out], paidIn: monthly * 12 * years, final: v };
  }, [monthly, years, rate]);
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-ink-900 p-2">
          <p className="text-[10px] uppercase text-ink-500">You pay in</p>
          <p className="font-mono font-semibold text-white">{fmtGbp(paidIn, { dp: 0 })}</p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-2">
          <p className="text-[10px] uppercase text-emerald-400">Could grow to</p>
          <p className="font-mono font-semibold text-emerald-300">{fmtGbp(final, { dp: 0 })}</p>
        </div>
      </div>
      <AreaChart points={series} height={90} format={(x) => fmtGbp(x, { dp: 0 })} />
      <Slider label="Each month" value={monthly} min={10} max={1000} step={10} onChange={setMonthly} fmt={(v) => `£${v}`} />
      <Slider label="Years" value={years} min={1} max={40} step={1} onChange={setYears} fmt={(v) => `${v}`} />
      <Slider label="Growth per year" value={rate} min={0} max={10} step={0.5} onChange={setRate} fmt={(v) => `${v}%`} />
      <p className="text-[11px] text-ink-500">Illustration only — returns aren&apos;t guaranteed and can be negative.</p>
    </div>
  );
}

function Fees() {
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(25);
  const grow = (fee: number) => amount * Math.pow(1 + 0.06 - fee / 100, years);
  const cheap = grow(0.07);
  const pricey = grow(1);
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-emerald-500/10 p-2">
          <p className="text-[10px] uppercase text-emerald-400">Tracker 0.07%</p>
          <p className="font-mono font-semibold text-emerald-300">{fmtGbp(cheap, { dp: 0 })}</p>
        </div>
        <div className="rounded-xl bg-rose-500/10 p-2">
          <p className="text-[10px] uppercase text-rose-400">Fund 1.00%</p>
          <p className="font-mono font-semibold text-rose-300">{fmtGbp(pricey, { dp: 0 })}</p>
        </div>
      </div>
      <p className="text-center text-sm text-white">
        Fees cost you <span className="font-bold text-rose-300">{fmtGbp(cheap - pricey, { dp: 0 })}</span>
      </p>
      <Slider label="Invested" value={amount} min={1000} max={100000} step={1000} onChange={setAmount} fmt={(v) => fmtGbp(v, { dp: 0 })} />
      <Slider label="Years" value={years} min={5} max={40} step={1} onChange={setYears} fmt={(v) => `${v}`} />
      <p className="text-[11px] text-ink-500">Assumes 6% a year before fees. Illustration only.</p>
    </div>
  );
}

function Sizing() {
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(100);
  const [stop, setStop] = useState(90);
  const risk = (account * riskPct) / 100;
  const perShare = Math.max(0.01, entry - stop) / 100; // pence → £
  const shares = Math.floor(risk / perShare);
  const cost = (shares * entry) / 100;
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-ink-900 p-2">
          <p className="text-[10px] uppercase text-ink-500">Max loss</p>
          <p className="font-mono font-semibold text-rose-300">{fmtGbp(risk, { dp: 0 })}</p>
        </div>
        <div className="rounded-xl bg-ink-900 p-2">
          <p className="text-[10px] uppercase text-ink-500">Buy</p>
          <p className="font-mono font-semibold text-white">{shares.toLocaleString()} sh</p>
        </div>
        <div className="rounded-xl bg-ink-900 p-2">
          <p className="text-[10px] uppercase text-ink-500">Costs</p>
          <p className="font-mono font-semibold text-white">{fmtGbp(cost, { dp: 0 })}</p>
        </div>
      </div>
      <Slider label="Account" value={account} min={1000} max={50000} step={500} onChange={setAccount} fmt={(v) => fmtGbp(v, { dp: 0 })} />
      <Slider label="Risk per idea" value={riskPct} min={0.5} max={5} step={0.5} onChange={setRiskPct} fmt={(v) => `${v}%`} />
      <Slider label="Entry price" value={entry} min={20} max={500} step={1} onChange={(v) => { setEntry(v); if (stop >= v) setStop(Math.max(1, v - 5)); }} fmt={(v) => `${v}p`} />
      <Slider label="Stop-loss" value={stop} min={1} max={entry - 1} step={1} onChange={setStop} fmt={(v) => `${v}p`} />
      {cost > account && <p className="text-xs text-amber-300">That position costs more than the account — widen the stop or risk less.</p>}
    </div>
  );
}

function Diversify() {
  const [n, setN] = useState(1);
  // One holding halves; spread across n, the same blow-up costs 50%/n.
  const hit = 50 / n;
  return (
    <div className="space-y-3 rounded-2xl border border-ink-800 bg-ink-950/60 p-4">
      <p className="text-sm text-ink-300">One of your companies drops 50% overnight. How much of your portfolio do you lose?</p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: Math.min(n, 40) }).map((_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${i === 0 ? "bg-rose-500" : "bg-emerald-500/70"}`} />
        ))}
        {n > 40 && <span className="text-xs text-ink-500">+{n - 40}</span>}
      </div>
      <p className="text-center text-2xl font-bold text-white">
        −{hit.toFixed(hit < 1 ? 2 : 1)}%
      </p>
      <Slider label="Companies you own (equal weights)" value={n} min={1} max={100} step={1} onChange={setN} fmt={(v) => `${v}`} />
    </div>
  );
}

function LiveChart({ symbol }: { symbol: string }) {
  const { mounted, now, closesFor } = useMarket();
  const i = getInstrument(symbol);
  if (!i) return null;
  return mounted ? <PriceChart closes={closesFor(symbol, 92)} currency={i.currency} now={now} height={160} /> : <div className="h-48 rounded-xl bg-ink-900 animate-pulse" />;
}
