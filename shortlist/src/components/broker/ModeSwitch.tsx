"use client";

import { switchMode, useBroker, useMode } from "@/lib/broker/client";
import { tapHaptic } from "@/lib/native";

// Demo | Real toggle in the top bar. Real needs a connected Trading 212 account;
// choosing it without one opens the connect sheet.
export default function ModeSwitch({ className = "" }: { className?: string }) {
  const mode = useMode();
  const { status } = useBroker();
  const live = status?.env === "live";
  return (
    <div role="group" aria-label="Trading mode" className={`relative inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-xs font-semibold ${className}`}>
      {(["demo", "real"] as const).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            aria-pressed={active}
            onClick={() => {
              tapHaptic();
              void switchMode(m);
            }}
            className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 ${
              active
                ? m === "demo"
                  ? "bg-white text-ink-950 shadow-[0_4px_14px_-4px_rgba(255,255,255,0.45)]"
                  : live
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-ink-950 shadow-[0_4px_16px_-4px_rgba(251,146,60,0.7)]"
                    : "bg-gradient-to-r from-blue-400 to-sky-400 text-ink-950 shadow-[0_4px_16px_-4px_rgba(59,130,246,0.7)]"
                : "text-ink-300 hover:text-white"
            }`}
          >
            {m === "real" && <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-ink-950" : live ? "bg-amber-400" : "bg-ink-500"}`} />}
            {m === "demo" ? "Demo" : "Real"}
          </button>
        );
      })}
    </div>
  );
}
