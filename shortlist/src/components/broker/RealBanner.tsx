"use client";

import { setMode, useBroker, useMode } from "@/lib/broker/client";
import { fmtGbp } from "@/lib/instruments";

// A slim strip under the top bar whenever real mode is on, so it's always
// obvious whether you're trading practice or real money.
export default function RealBanner() {
  const mode = useMode();
  const { status, account } = useBroker();
  if (mode !== "real") return null;
  const live = status?.env === "live";
  return (
    <div role="status" className={`flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-semibold text-ink-950 bg-gradient-to-r ${live ? "from-amber-300 via-orange-400 to-amber-300" : "from-blue-300 via-sky-300 to-blue-300"}`}>
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-950" />
      <span className="uppercase tracking-wider">{live ? "Real money" : "Trading 212 practice"}</span>
      {account && <span className="hidden sm:inline">· {fmtGbp(account.cash.free)} free to invest</span>}
      <button onClick={() => setMode("demo")} className="ml-1 rounded-full bg-ink-950/15 px-2 py-0.5 hover:bg-ink-950/25">
        Switch to demo
      </button>
    </div>
  );
}
