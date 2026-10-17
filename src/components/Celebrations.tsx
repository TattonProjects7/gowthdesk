"use client";

import { useEffect, useRef } from "react";
import { useCelebrationQueue } from "@/lib/celebrate";

// Toast + confetti for learning milestones. Mounted once in the layout.
// Respects prefers-reduced-motion (no particles, just the toast).
export default function Celebrations() {
  const [current, done] = useCelebrationQueue();

  useEffect(() => {
    if (!current) return;
    const t = setTimeout(done, current.big ? 3200 : 2600);
    return () => clearTimeout(t);
  }, [current, done]);

  // The live region stays mounted so screen readers announce each toast.
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-start justify-center pt-[max(4.5rem,env(safe-area-inset-top))]" aria-live="polite">
      {current?.big && <Confetti key={current.id} />}
      {current && (
        <button
          onClick={done}
          className="pointer-events-auto sheet-pop mx-4 flex max-w-sm items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900/95 px-4 py-3 shadow-2xl backdrop-blur"
        >
          <span className="text-3xl leading-none">{current.emoji}</span>
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold text-white">{current.title}</span>
            {current.subtitle && <span className="block truncate text-xs text-ink-400">{current.subtitle}</span>}
            {(current.xp || current.cash) && (
              <span className="mt-1 flex gap-1.5">
                {current.xp ? <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-bold text-amber-300">+{current.xp} XP</span> : null}
                {current.cash ? <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">+£{current.cash} practice cash</span> : null}
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}

const COLORS = ["#fb7185", "#fbbf24", "#34d399", "#38bdf8", "#a78bfa", "#f472b6"];

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.2,
      y: h * 0.28,
      vx: (Math.random() - 0.5) * 18 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      size: (Math.random() * 6 + 4) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - frame / 150);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (frame < 150) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" />;
}
