"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CandlestickChart, Globe, LayoutGrid, Layers, Newspaper, SlidersHorizontal } from "lucide-react";

// Sub-navigation for the market tools, shown at the top of each of them.
const TABS = [
  { href: "/markets", label: "Overview", icon: Globe },
  { href: "/screener", label: "Screener", icon: SlidersHorizontal },
  { href: "/maps", label: "Heatmap", icon: LayoutGrid },
  { href: "/groups", label: "Groups", icon: Layers },
  { href: "/charts", label: "Charts", icon: CandlestickChart },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

export default function MarketsTabs() {
  const path = usePathname();
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
        {TABS.map((t) => {
          const active = path === t.href || (t.href !== "/markets" && path.startsWith(t.href));
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${active ? "bg-white text-ink-950" : "text-ink-400 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** "LIVE prices · demo fundamentals" badges, so nobody mistakes sample data for real. */
export function DataBadges({ source, fund, coverage }: { source: "loading" | "simulated" | "live"; fund?: "loading" | "live" | "demo"; coverage?: { have: number; of: number } }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${source === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.04] text-ink-400"}`}>
        {source === "live" ? "Live prices" : source === "loading" ? "…" : "Simulated prices"}
      </span>
      {fund && (
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${fund === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}>
          {fund === "live" ? `Live US fundamentals${coverage && coverage.have < coverage.of ? ` (${coverage.have}/${coverage.of})` : ""}` : fund === "loading" ? "…" : "Demo fundamentals"}
        </span>
      )}
    </div>
  );
}
