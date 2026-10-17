"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Avatar from "@/components/Avatar";
import Sparkline from "@/components/Sparkline";
import { fmtNative, type Instrument } from "@/lib/instruments";

// One line in any instrument list (markets, watchlist, search): logo avatar,
// symbol + name, sparkline, live price that flashes on change, and a coloured
// day-change pill. `right` adds actions; `sub` replaces the name line.
export default function InstrumentRow({ i, price, closes, rank, right, sub }: { i: Instrument; price: number; closes: number[]; rank?: number; right?: ReactNode; sub?: ReactNode }) {
  const prev = closes.length >= 2 ? closes[closes.length - 2] : 0;
  const chg = prev ? (price / prev - 1) * 100 : 0;
  const flash = usePriceFlash(price);
  const tag = i.type === "etf" ? "ETF" : i.type === "crypto" ? "Crypto" : i.exchange === "LSE" ? "LSE" : "US";
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-800/80 bg-ink-900 px-3.5 py-3 transition-colors hover:border-ink-600 active:bg-ink-800/60">
      {rank !== undefined && <span className="hidden sm:block w-5 text-center text-xs font-semibold text-ink-500">{rank}</span>}
      <Link href={`/i/${i.symbol}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar symbol={i.symbol} size={38} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white">{i.symbol}</span>
            <span className="rounded bg-ink-800 px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-ink-400">{tag}</span>
          </div>
          <p className="truncate text-xs text-ink-400">{sub ?? i.name}</p>
        </div>
      </Link>
      <div className="hidden md:block">
        <Sparkline points={closes} width={84} height={28} />
      </div>
      <div className="text-right">
        <p className={`inline-block font-mono text-[15px] font-semibold text-white rounded px-1 -mx-1 ${flash}`}>{fmtNative(price, i.currency)}</p>
        <div>
          <ChangePill v={chg} />
        </div>
      </div>
      {right}
    </div>
  );
}

export function ChangePill({ v, size = "sm" }: { v: number; size?: "sm" | "md" }) {
  const up = v >= 0;
  return (
    <span
      className={`inline-block rounded-md font-mono font-semibold ${size === "md" ? "px-2 py-0.5 text-sm" : "px-1.5 py-px text-[11px]"} ${
        up ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
      }`}
    >
      {up ? "+" : ""}
      {v.toFixed(2)}%
    </span>
  );
}

// Returns a flash class for one animation cycle whenever the value changes.
export function usePriceFlash(value: number): string {
  const prev = useRef(value);
  const [cls, setCls] = useState("");
  useEffect(() => {
    if (value === prev.current) return;
    setCls(value > prev.current ? "flash-up" : "flash-down");
    prev.current = value;
    const t = setTimeout(() => setCls(""), 700);
    return () => clearTimeout(t);
  }, [value]);
  return cls;
}
