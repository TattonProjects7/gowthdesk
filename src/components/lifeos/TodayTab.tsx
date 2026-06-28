"use client";

import { Check, Sparkles, Smile } from "lucide-react";
import type { Profile } from "@/lib/lifeos/types";
import { buildBrief, buildNudges } from "@/lib/lifeos/derive";
import { iconFor, TONE_TEXT, TONE_ICON } from "./icons";

interface Props {
  profile: Profile;
  now: Date;
  setProfile: (p: Profile) => void;
}

const MOODS = ["😞", "😐", "🙂", "😄", "🤩"];

export default function TodayTab({ profile, now, setProfile }: Props) {
  const brief = buildBrief(profile, now);
  const nudges = buildNudges(profile, now);
  const { checkin } = profile;
  const checkable = brief.filter(b => b.checkable);
  const doneCount = checkin.done.length;

  function toggle(id: string) {
    const done = checkin.done.includes(id)
      ? checkin.done.filter(x => x !== id)
      : [...checkin.done, id];
    setProfile({ ...profile, checkin: { ...checkin, done } });
  }
  function setSteps(steps: number) {
    setProfile({ ...profile, checkin: { ...checkin, steps } });
  }
  function setMood(mood: 1 | 2 | 3 | 4 | 5) {
    setProfile({ ...profile, checkin: { ...checkin, mood } });
  }

  const greeting = hourGreeting(now);
  const stepPct = Math.min(100, Math.round((checkin.steps / Math.max(1, checkin.stepGoal)) * 100));

  return (
    <div className="space-y-6 pb-4">
      <div>
        <p className="text-sm text-ink-400">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="text-2xl font-bold">{greeting}, {profile.name}.</h1>
        <p className="text-ink-400 text-sm">Here&apos;s everything that matters today.</p>
      </div>

      {/* Brief */}
      <section>
        <div className="rounded-2xl border border-ink-700 bg-ink-900 divide-y divide-ink-800 overflow-hidden">
          {brief.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink-500 text-center">Nothing scheduled. Add key dates and bills in setup.</p>
          )}
          {brief.map(item => {
            const Icon = iconFor(item.icon);
            const done = checkin.done.includes(item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {item.checkable ? (
                  <button
                    onClick={() => toggle(item.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${done ? "border-emerald-500 bg-emerald-500" : "border-ink-600"}`}
                  >
                    {done && <Check className="h-3 w-3 text-white" />}
                  </button>
                ) : (
                  <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON[item.tone]}`} />
                )}
                <span className={`text-sm flex-1 ${done ? "text-ink-500 line-through" : TONE_TEXT[item.tone]}`}>{item.text}</span>
                {item.when && (
                  <span className="shrink-0 rounded-md bg-ink-800 px-2 py-0.5 text-[11px] font-medium text-ink-400">{item.when}</span>
                )}
              </div>
            );
          })}
        </div>
        {checkable.length > 0 && (
          <p className="mt-2 text-xs text-ink-500">{doneCount} of {checkable.length} ticked off today</p>
        )}
      </section>

      {/* Proactive nudges */}
      {nudges.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-ink-500">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" /> LifeOS suggests
          </h2>
          <div className="space-y-2">
            {nudges.map(n => {
              const Icon = iconFor(n.icon);
              return (
                <div key={n.id} className="flex gap-3 rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-900 to-ink-800 p-3.5">
                  <Icon className={`h-5 w-5 shrink-0 ${TONE_ICON[n.tone]}`} />
                  <div>
                    <p className="text-sm font-semibold text-ink-100">{n.title}</p>
                    <p className="text-xs text-ink-400 leading-relaxed">{n.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Daily check-in: steps + mood */}
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-500">Daily check-in</h2>
        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-ink-200">Steps</span>
              <span className="text-sm font-semibold text-ink-100">{checkin.steps.toLocaleString()} <span className="text-ink-500">/ {checkin.stepGoal.toLocaleString()}</span></span>
            </div>
            <div className="h-2 rounded-full bg-ink-800 overflow-hidden">
              <div className={`h-full rounded-full ${stepPct >= 100 ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${stepPct}%` }} />
            </div>
            <input
              type="range" min={0} max={Math.max(checkin.stepGoal, 12000)} step={100}
              value={checkin.steps}
              onChange={e => setSteps(Number(e.target.value))}
              className="mt-2 w-full accent-violet-500"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Smile className="h-4 w-4 text-ink-400" />
              <span className="text-sm text-ink-200">How are you feeling?</span>
            </div>
            <div className="flex gap-2">
              {MOODS.map((emoji, i) => {
                const val = (i + 1) as 1 | 2 | 3 | 4 | 5;
                const active = checkin.mood === val;
                return (
                  <button
                    key={i}
                    onClick={() => setMood(val)}
                    className={`flex-1 rounded-xl border py-2 text-xl transition-colors ${active ? "border-violet-500 bg-violet-500/15" : "border-ink-700 hover:border-ink-500"}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function hourGreeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
