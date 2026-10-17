"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { FxEngine } from "./engine";
import { sfx, unlockAudio } from "./sound";
import { fxPrefsStore, useTradeFxListener, type TradeFx } from "@/lib/effects";
import { impactHaptic, successHaptic } from "@/lib/native";
import { fmtGbp } from "@/lib/instruments";

// Mounted once in the layout. Listens for trades and plays the celebration:
//   buy        → confetti pop from the button, corner cannons, fireworks
//   sell       → cash bundles and notes raining, a coin fountain, cha-ching
//   working    → a sparkle and a soft blip (limit / stop order placed)
//   rebalance  → confetti and a couple of fireworks
// plus an "order filled" card with an animated tick and a count-up amount.
// The card never blocks the screen: there is no modal backdrop, it auto-closes,
// and you can keep trading underneath it.

type Active = TradeFx & { id: number };
const SHOW_MS = 4600;

export default function TradeCelebration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<FxEngine | null>(null);
  const [cur, setCur] = useState<Active | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const e = new FxEngine(canvasRef.current);
    engine.current = e;
    const onResize = () => e.resize();
    window.addEventListener("resize", onResize);
    // Browsers only allow sound after a gesture: unlock on the first tap.
    const unlock = () => {
      if (fxPrefsStore.get()?.sounds !== false) unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      e.destroy();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const close = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setCur(null);
  }, []);

  const onTrade = useCallback((t: Active) => {
    const prefs = fxPrefsStore.get() ?? { celebrations: true, sounds: true };
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const e = engine.current;
    const sound = prefs.sounds !== false;
    const fx = prefs.celebrations !== false && !reduced ? e : null;

    if (e) {
      e.onBurst = () => {
        if (sound) sfx.burst();
        impactHaptic("medium");
      };
    }
    const w = typeof window !== "undefined" ? window.innerWidth : 400;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const o = t.origin ?? { x: w / 2, y: h * 0.62 };
    const big = Math.min(7, 2 + Math.floor(Math.log10(Math.max(10, t.valueGbp ?? 100))));

    if (t.kind === "buy") {
      if (fx) {
        fx.confetti(o.x, o.y, { count: 140, spread: 80 });
        fx.cannons(80);
        fx.fireworks(big, 360);
      }
      if (sound) sfx.buy();
      successHaptic();
    } else if (t.kind === "sell") {
      if (fx) {
        fx.cashRain(Math.min(40, 16 + big * 4));
        fx.coins(o.x, o.y, 34);
      }
      if (sound) sfx.sell();
      successHaptic();
    } else if (t.kind === "rebalance") {
      if (fx) {
        fx.cannons(70);
        fx.fireworks(3, 420);
      }
      if (sound) sfx.buy();
      successHaptic();
    } else {
      if (fx) fx.sparkle(o.x, o.y, 46);
      if (sound) sfx.placed();
      impactHaptic("light");
    }

    if (timer.current) clearTimeout(timer.current);
    setCur(t);
    timer.current = setTimeout(() => setCur(null), t.kind === "working" ? 3200 : SHOW_MS);
  }, []);

  useTradeFxListener(onTrade);

  return (
    <>
      {cur && <CelebrationCard key={cur.id} t={cur} onClose={close} />}
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[97]" />
    </>
  );
}

function CelebrationCard({ t, onClose }: { t: Active; onClose: () => void }) {
  const tone = t.kind === "sell" ? "gold" : t.kind === "working" ? "violet" : "emerald";
  const ring = tone === "gold" ? "from-amber-300 via-yellow-200 to-emerald-300" : tone === "violet" ? "from-violet-400 via-sky-300 to-violet-400" : "from-emerald-300 via-teal-200 to-sky-300";
  const label = t.kind === "buy" ? "Order filled" : t.kind === "sell" ? "Cash in!" : t.kind === "rebalance" ? "Rebalanced" : "Order placed";
  const headline =
    t.kind === "buy"
      ? `You bought ${t.symbol}`
      : t.kind === "sell"
        ? `You sold ${t.symbol}`
        : t.kind === "rebalance"
          ? "Your portfolio is back on target"
          : `${t.symbol} order is working`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(5.5rem,env(safe-area-inset-top))] z-[96] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        aria-label={`${label}. ${headline}`}
        className="fx-card pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-ink-900/95 p-5 text-center shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        <div className={`pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-br ${ring} opacity-[0.16]`} />
        <div className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gradient-to-br ${ring} opacity-30 blur-3xl`} />
        <button onClick={onClose} aria-label="Close celebration" className="absolute right-3 top-3 rounded-full p-1.5 text-ink-400 hover:bg-white/5 hover:text-white">
          <X className="h-4 w-4" />
        </button>

        <div className="relative">
          <Badge tone={tone} kind={t.kind} />
          <p className={`mt-3 text-[11px] font-bold uppercase tracking-[0.22em] ${tone === "gold" ? "text-amber-300" : tone === "violet" ? "text-violet-300" : "text-emerald-300"}`}>
            {label}
            {t.real && <span className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] tracking-wider text-amber-200">Real money</span>}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{headline}</h3>
          {t.valueGbp != null && t.kind !== "working" && (
            <p className={`mt-1 bg-gradient-to-r ${ring} bg-clip-text text-4xl font-extrabold tracking-tight text-transparent num`}>
              {t.kind === "sell" ? "+" : ""}
              <CountUp to={t.valueGbp} />
            </p>
          )}
          <p className="mt-1.5 text-sm text-ink-300">
            {t.kind === "working"
              ? t.detail
              : t.kind === "rebalance"
                ? t.detail
                : [t.qty != null ? `${t.qty.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${t.qty === 1 ? "share" : "shares"}` : null, t.priceLabel ? `at ${t.priceLabel}` : null, t.account].filter(Boolean).join(" · ")}
          </p>
          {t.kind === "sell" && <p className="mt-1 text-xs text-amber-200/80">Added to your cash, ready for the next idea.</p>}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/portfolio" onClick={onClose} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15">
              View portfolio
            </Link>
            <button onClick={onClose} className={`rounded-xl bg-gradient-to-r ${ring} px-3 py-2.5 text-sm font-bold text-ink-950`}>
              Keep trading
            </button>
          </div>
        </div>
        <div className={`fx-timer pointer-events-none absolute bottom-0 left-0 h-1 bg-gradient-to-r ${ring}`} style={{ animationDuration: `${t.kind === "working" ? 3200 : SHOW_MS}ms` }} />
      </div>
    </div>
  );
}

function Badge({ tone, kind }: { tone: "gold" | "violet" | "emerald"; kind: TradeFx["kind"] }) {
  const stroke = tone === "gold" ? "#fbbf24" : tone === "violet" ? "#a78bfa" : "#34d399";
  if (kind === "sell") {
    return (
      <svg viewBox="0 0 64 64" className="fx-badge mx-auto h-16 w-16 drop-shadow-[0_0_28px_rgba(251,191,36,0.6)]" aria-hidden>
        <defs>
          <radialGradient id="fx-coin" cx="38%" cy="34%" r="70%">
            <stop offset="0" stopColor="#fef3c7" />
            <stop offset="0.4" stopColor="#fcd34d" />
            <stop offset="0.85" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="29" fill="url(#fx-coin)" stroke="#fbbf24" strokeWidth="3" />
        <circle cx="32" cy="32" r="22.5" fill="none" stroke="#92400e" strokeOpacity="0.4" strokeWidth="1.5" />
        <text x="32" y="33" textAnchor="middle" dominantBaseline="middle" fontSize="30" fontWeight="900" fill="#92400e" fontFamily="system-ui, -apple-system, sans-serif">£</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="fx-badge mx-auto h-16 w-16 drop-shadow-[0_0_24px_rgba(52,211,153,0.55)]" aria-hidden>
      <circle cx="32" cy="32" r="29" fill={`${stroke}22`} stroke={stroke} strokeWidth="3" className="fx-draw-ring" />
      {kind === "working" ? (
        <path d="M32 18v15l10 6" fill="none" stroke={stroke} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="fx-draw-check" />
      ) : (
        <path d="M19 33.5l8.5 8.5L45 24" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="fx-draw-check" />
      )}
    </svg>
  );
}

function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{fmtGbp(v)}</>;
}
