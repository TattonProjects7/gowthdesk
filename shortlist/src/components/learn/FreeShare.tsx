"use client";

import { useState } from "react";
import { Gift, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { getInstrument, fmtGbp, fmtNative } from "@/lib/instruments";
import { learn, useLearn } from "@/lib/learn/store";
import { celebrate } from "@/lib/celebrate";
import type { Pricer } from "@/lib/portfolio";

// Claim a free practice share — Robinhood's claim-a-stock, on paper money.
// Pick one of three face-down cards; it flips to reveal your share.
export function FreeShareBanner({ pricer }: { pricer: Pricer }) {
  const s = useLearn();
  const [open, setOpen] = useState(false);
  // Keep the reveal open after claiming; hide the banner itself once claimed.
  if (s.freeShare.claimed && !open) return null;
  return (
    <>
      {!s.freeShare.claimed && (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex w-full items-center gap-3 overflow-hidden rounded-3xl border border-emerald-800/70 bg-gradient-to-r from-emerald-950/70 via-emerald-900/30 to-ink-900 p-4 text-left transition-colors hover:border-emerald-600"
      >
        <span className="gift-wiggle flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl">🎁</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">Claim your free practice share</span>
          <span className="block text-xs text-emerald-200/80">Pick a card to reveal a free share — most are everyday UK names, a lucky few are big ones.</span>
        </span>
        <span className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-ink-950">Claim</span>
      </button>
      )}
      {open && <FreeShareModal pricer={pricer} onClose={() => setOpen(false)} />}
    </>
  );
}

export function FreeShareModal({ pricer, onClose }: { pricer: Pricer; onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<{ symbol: string; valueGbp: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const r = learn.claimFreeShare(pricer);
    setTimeout(() => {
      setResult(r);
      if (!r) setFailed(true);
      if (r) {
        const inst = getInstrument(r.symbol);
        celebrate({ emoji: "🎁", title: `You got 1 share of ${inst?.name ?? r.symbol}!`, subtitle: `Worth ${fmtGbp(r.valueGbp)} · added to your General account`, big: true });
      }
    }, 650);
  };

  const inst = result ? getInstrument(result.symbol) : undefined;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button className="absolute inset-0 bg-black/70 fade-in" aria-label="Close" onClick={onClose} />
      <div className="sheet-up relative w-full max-w-md rounded-t-3xl border border-ink-700 bg-ink-950 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-ink-400 hover:bg-ink-800" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-300">
          <Gift className="h-4 w-4" /> Free practice share
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">{result ? "It's yours!" : "Pick a card"}</h2>
        <p className="mt-1 text-sm text-ink-400">{result ? "Track it, learn from it, or sell it — it's practice money." : "Most cards hold an everyday UK share. A lucky few hold a big name."}</p>

        <div className="mt-6 grid grid-cols-3 gap-3" style={{ perspective: 800 }}>
          {[0, 1, 2].map((i) => {
            const flipped = picked === i && result;
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={picked !== null}
                className={`relative aspect-[3/4] rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : picked === i ? "scale-105" : picked !== null ? "opacity-40" : "hover:-translate-y-1"}`}
                aria-label={`Card ${i + 1}`}
              >
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl border border-emerald-700 bg-gradient-to-br from-emerald-600 to-teal-800 text-4xl shadow-xl [backface-visibility:hidden]">
                  {picked === i && !result ? <span className="animate-spin">✨</span> : "?"}
                </span>
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-600 bg-ink-900 p-2 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {result && inst && (
                    <>
                      <Avatar symbol={result.symbol} size={36} />
                      <span className="text-sm font-bold text-white">{result.symbol}</span>
                      <span className="font-mono text-xs text-emerald-300">{fmtGbp(result.valueGbp)}</span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {result && inst && (
          <div className="fade-in mt-6 flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-3">
            <Avatar symbol={result.symbol} size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white">1 share of {inst.name}</p>
              <p className="text-xs text-ink-400">
                {fmtNative(pricer.price(result.symbol), inst.currency)} · in your General account
              </p>
            </div>
            <a href={`/i/${result.symbol}`} className="rounded-xl bg-brand shadow-glow-rose px-3 py-2 text-sm font-semibold text-white">
              View
            </a>
          </div>
        )}
        {picked !== null && !result && !failed && <p className="mt-4 text-center text-sm text-ink-400">Revealing…</p>}
        {failed && <p className="mt-4 text-center text-sm text-amber-300">Your free share has already been claimed on this account.</p>}
      </div>
    </div>
  );
}
