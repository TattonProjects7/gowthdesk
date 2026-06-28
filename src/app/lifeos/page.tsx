"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain, Home, CalendarRange, Wallet, MessageCircleQuestion,
  Settings2, X, RotateCcw, Sparkles, ArrowLeft,
} from "lucide-react";
import type { Profile } from "@/lib/lifeos/types";
import { loadProfile, saveProfile, clearProfile, createSampleProfile } from "@/lib/lifeos/store";
import Onboarding from "@/components/lifeos/Onboarding";
import TodayTab from "@/components/lifeos/TodayTab";
import TimelineTab from "@/components/lifeos/TimelineTab";
import MoneyTab from "@/components/lifeos/MoneyTab";
import AskTab from "@/components/lifeos/AskTab";

type Tab = "today" | "timeline" | "money" | "ask";

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: "today",    label: "Today",    icon: Home },
  { key: "timeline", label: "Timeline", icon: CalendarRange },
  { key: "money",    label: "Money",    icon: Wallet },
  { key: "ask",      label: "Ask",      icon: MessageCircleQuestion },
];

export default function LifeOSPage() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [onboarding, setOnboarding] = useState(false);
  const [settings, setSettings] = useState(false);
  const [now] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);
    setProfile(loadProfile());
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  function update(p: Profile) {
    setProfile(p);
    saveProfile(p);
  }
  function reset() {
    clearProfile();
    setProfile(null);
    setSettings(false);
    setOnboarding(false);
    setTab("today");
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-ink-950 to-black flex flex-col items-center sm:py-6">
      {/* Tiny top strip (desktop only) linking back to GrowthDesk */}
      <div className="hidden sm:flex w-full max-w-[440px] items-center justify-between px-2 pb-3">
        <Link href="/" className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> GrowthDesk
        </Link>
        <span className="text-xs text-ink-600">LifeOS · mobile preview</span>
      </div>

      {/* Phone frame */}
      <div className="relative flex w-full max-w-[440px] flex-1 flex-col overflow-hidden bg-ink-950 text-white sm:flex-none sm:h-[860px] sm:rounded-[2.5rem] sm:border-4 sm:border-ink-800 sm:shadow-2xl">
        {!mounted ? (
          <div className="flex flex-1 items-center justify-center">
            <Brain className="h-8 w-8 animate-pulse text-violet-500" />
          </div>
        ) : onboarding ? (
          <Onboarding
            onComplete={(p) => { update(p); setOnboarding(false); setTab("today"); }}
            onCancel={profile ? () => setOnboarding(false) : undefined}
          />
        ) : !profile ? (
          <Welcome
            onSetup={() => setOnboarding(true)}
            onSample={() => update(createSampleProfile())}
          />
        ) : (
          <>
            {/* App header */}
            <header className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold tracking-tight">LifeOS</span>
              <button onClick={() => setSettings(true)} className="ml-auto text-ink-400 hover:text-white">
                <Settings2 className="h-5 w-5" />
              </button>
            </header>

            {/* Sample-data banner */}
            {profile.isSample && (
              <button
                onClick={() => setOnboarding(true)}
                className="flex w-full items-center gap-2 bg-amber-950/60 px-4 py-2 text-left text-xs text-amber-300 hover:bg-amber-950"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span><strong>Sample life</strong> — these numbers are a demo. Tap to enter your own.</span>
              </button>
            )}

            {/* Tab content */}
            <main className="flex-1 overflow-y-auto px-4 py-5">
              {tab === "today"    && <TodayTab profile={profile} now={now} setProfile={update} />}
              {tab === "timeline" && <TimelineTab profile={profile} now={now} />}
              {tab === "money"    && <MoneyTab profile={profile} now={now} />}
              {tab === "ask"      && <AskTab profile={profile} now={now} />}
            </main>

            {/* Bottom nav */}
            <nav className="grid grid-cols-4 border-t border-ink-800 bg-ink-950/95 backdrop-blur">
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = tab === key;
                return (
                  <button key={key} onClick={() => setTab(key)}
                    className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${active ? "text-violet-400" : "text-ink-500 hover:text-ink-300"}`}>
                    <Icon className={`h-5 w-5 ${active ? "text-violet-400" : ""}`} />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Settings sheet */}
            {settings && (
              <div className="absolute inset-0 z-10 flex items-end bg-black/60" onClick={() => setSettings(false)}>
                <div className="w-full rounded-t-3xl border-t border-ink-700 bg-ink-900 p-5" onClick={e => e.stopPropagation()}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="font-bold">Settings</span>
                    <button onClick={() => setSettings(false)} className="text-ink-400 hover:text-white"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => { setSettings(false); setOnboarding(true); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 px-4 py-3 text-left text-sm hover:border-ink-500">
                      <Sparkles className="h-4 w-4 text-violet-400" /> Edit my life details
                    </button>
                    <button onClick={reset}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink-700 bg-ink-800 px-4 py-3 text-left text-sm text-rose-300 hover:border-rose-700">
                      <RotateCcw className="h-4 w-4" /> Reset LifeOS (clears local data)
                    </button>
                  </div>
                  <p className="mt-4 text-center text-[11px] text-ink-600">Your data is stored only on this device.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Welcome({ onSetup, onSample }: { onSetup: () => void; onSample: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-900/40">
        <Brain className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold">LifeOS</h1>
      <p className="mt-1 text-sm text-ink-400">An AI operating system for your whole life. Your second brain — knows your dates, money and plans, and tells you what matters today.</p>
      <button onClick={onSetup}
        className="mt-7 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold hover:bg-violet-500">
        Set up my life
      </button>
      <button onClick={onSample}
        className="mt-3 w-full rounded-xl border border-ink-700 py-3.5 text-sm font-semibold text-ink-300 hover:text-white hover:border-ink-500">
        Explore with sample data
      </button>
      <p className="mt-5 text-[11px] text-ink-600">Everything stays on your device. No account needed.</p>
    </div>
  );
}
