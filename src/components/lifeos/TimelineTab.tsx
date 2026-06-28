"use client";

import type { Profile } from "@/lib/lifeos/types";
import { buildTimeline, formatGBP, relativeLabel, spendableBalance, projectCashflow } from "@/lib/lifeos/derive";
import { iconFor } from "./icons";

interface Props {
  profile: Profile;
  now: Date;
}

export default function TimelineTab({ profile, now }: Props) {
  const entries = buildTimeline(profile, now, 30);
  const proj = projectCashflow(profile, now, 30);
  const start = spendableBalance(profile);

  // Group by relative bucket for headers
  let lastBucket = "";

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold">Next 30 days</h1>
        <p className="text-ink-400 text-sm">Money, dates and renewals merged into one view.</p>
      </div>

      {/* Projection summary */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Now" value={formatGBP(start)} tone="neutral" />
        <Stat label="Lowest" value={formatGBP(proj.low)} tone={proj.low < 200 ? "warn" : "neutral"} />
        <Stat label="In 30 days" value={formatGBP(proj.end)} tone={proj.end >= start ? "good" : "warn"} />
      </div>

      {entries.length === 0 && (
        <p className="rounded-2xl border border-dashed border-ink-700 px-5 py-8 text-center text-sm text-ink-500">
          Nothing in the next 30 days yet. Add dates and bills to fill your timeline.
        </p>
      )}

      <div className="relative">
        {entries.map((e, idx) => {
          const Icon = iconFor(e.icon);
          const bucket = relativeLabel(e.daysFromNow);
          const showBucket = bucket !== lastBucket;
          lastBucket = bucket;
          const isMoney = e.kind !== "date";
          return (
            <div key={e.id}>
              {showBucket && (
                <p className={`text-[11px] font-semibold uppercase tracking-widest text-ink-500 ${idx === 0 ? "" : "mt-5"} mb-2`}>{bucket}</p>
              )}
              <div className="flex items-center gap-3 py-2">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  e.kind === "money-in" ? "border-emerald-700 bg-emerald-950 text-emerald-400"
                  : e.kind === "money-out" ? "border-ink-700 bg-ink-800 text-ink-300"
                  : "border-violet-800 bg-violet-950 text-violet-300"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-100">{e.label}</p>
                  <p className="text-[11px] text-ink-500">
                    {new Date(e.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                    {isMoney && e.balanceAfter !== undefined && ` · balance ${formatGBP(e.balanceAfter)}`}
                  </p>
                </div>
                {isMoney && e.amount !== undefined && (
                  <span className={`shrink-0 text-sm font-semibold ${e.amount >= 0 ? "text-emerald-400" : "text-ink-300"}`}>
                    {formatGBP(e.amount)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "warn" | "good" }) {
  const color = tone === "warn" ? "text-amber-400" : tone === "good" ? "text-emerald-400" : "text-ink-100";
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  );
}
