"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  TrendingDown,
  Radar,
  Bell,
  Target,
  ShieldX,
  Sparkles,
  BellRing,
  User as UserIcon,
  LogOut,
  Crown,
  Globe,
  Wallet,
  Star,
  Settings,
  Receipt,
  Coins,
  Repeat,
  Shield,
  GraduationCap,
  Flame,
  SlidersHorizontal,
} from "lucide-react";
import { useAlerts, type Alert } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { timeAgo } from "@/components/ui";
import { tapHaptic } from "@/lib/native";
import { useCoach } from "@/components/coach/CoachProvider";
import { useLearn } from "@/lib/learn/store";
import { liveStreak } from "@/lib/learn/progress";
import ModeSwitch from "@/components/broker/ModeSwitch";
import RealBanner from "@/components/broker/RealBanner";

// Primary navigation: Markets · Portfolio · Watchlist · Shorts, plus the alert
// bell, account menu and settings. On phones the same destinations become a
// bottom tab bar, as in the IG / ii / InvestEngine apps.
// The market tools (screener, heatmap, groups, calendar) live under Markets; on
// desktop the screener also gets its own tab. Phones reach them from the
// Markets sub-navigation, keeping the bottom bar at five tabs.
const LINKS: { href: string; label: string; icon: React.ElementType; match?: string[]; desktopOnly?: boolean }[] = [
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/markets", label: "Markets", icon: Globe, match: ["/markets", "/i/", "/maps", "/groups", "/calendar", "/screener", "/charts", "/news"] },
  { href: "/screener", label: "Screener", icon: SlidersHorizontal, match: ["/screener"], desktopOnly: true },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/scan", label: "Shorts", icon: Radar, match: ["/scan", "/short", "/tracker"] },
];

export default function Nav() {
  const path = usePathname();
  const { alerts, unseen, mounted, markAllSeen, clear } = useAlerts();
  const { enabled, user, signOut } = useAuth();
  const { pro, billingEnabled } = useSubscription();
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(false);
  const coach = useCoach();
  const learnState = useLearn();
  const streak = mounted ? liveStreak(learnState.streak, Date.now()) : 0;

  // The most specific matching tab wins, so /screener lights Screener rather than Markets on desktop.
  const isActive = (l: (typeof LINKS)[number]) => {
    const hit = (x: (typeof LINKS)[number]) => (x.match ?? [x.href]).some((m) => path.startsWith(m));
    if (!hit(l)) return false;
    return !LINKS.some((o) => o !== l && o.desktopOnly && hit(o) && !l.desktopOnly);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unseen > 0) markAllSeen();
  };

  const enableNotifications = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
  };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all your data? This can’t be undone.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      await signOut();
      window.location.href = "/";
    } else {
      window.alert("Couldn’t delete the account. Please try again.");
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30">
      <header className="glass border-b border-white/[0.06] px-4 sm:px-8 py-2.5 flex items-center gap-2 sm:gap-3 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <Link href="/portfolio" className="flex items-center gap-2.5" aria-label="Shortlist home">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-glow-rose">
            <TrendingDown className="h-5 w-5" />
          </div>
          <span className="hidden sm:inline font-bold text-lg tracking-tight text-white">Shortlist</span>
        </Link>
        <ModeSwitch className="ml-1 sm:ml-3" />

        <nav className="ml-auto flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1">
            {LINKS.map((l) => {
              const Icon = l.icon;
              const active = isActive(l);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  title={l.label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-all xl:px-3 ${
                    active ? "bg-white/[0.09] text-white ring-1 ring-white/10" : "text-ink-300 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {/* Icons only on tablets, so the bar never overflows; labels from 1280px. */}
                  <span className="sr-only xl:not-sr-only">{l.label}</span>
                  {l.href === "/learn" && streak > 0 && (
                    <span className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 text-[10px] font-bold text-orange-300">
                      <Flame className="h-3 w-3" />
                      {streak}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Alerts bell */}
          <div className="relative">
            <button
              onClick={toggle}
              className="relative flex items-center rounded-lg px-2.5 py-1.5 text-ink-300 hover:text-white hover:bg-ink-900 transition-colors"
              aria-label="Alerts"
            >
              <Bell className="h-4 w-4" />
              {mounted && unseen > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unseen > 9 ? "9+" : unseen}
                </span>
              )}
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-900/95 backdrop-blur-xl shadow-2xl">
                  <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
                    <p className="text-sm font-semibold text-white">Alerts</p>
                    <div className="flex items-center gap-2">
                      <button onClick={enableNotifications} className="text-ink-400 hover:text-violet-300" title="Enable notifications">
                        <BellRing className="h-3.5 w-3.5" />
                      </button>
                      {alerts.length > 0 && (
                        <button onClick={clear} className="text-xs text-ink-500 hover:text-rose-400">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-ink-500">No alerts yet. Set a price alert, place an order or track a short.</p>
                    ) : (
                      alerts.map((a) => <AlertRow key={a.id} a={a} onClick={() => setOpen(false)} />)
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* AI coach */}
          <button
            onClick={() => {
              tapHaptic();
              coach.open();
            }}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500/20 to-violet-500/20 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-violet-500/30 hover:from-rose-500/30 hover:to-violet-500/30"
            aria-label="Ask the AI coach"
          >
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="hidden md:inline">Coach</span>
          </button>

          <Link href="/settings" className={`flex items-center rounded-lg px-2.5 py-1.5 transition-colors ${path.startsWith("/settings") ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white hover:bg-ink-900"}`} aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>

          {/* Account */}
          {enabled ? (
            user ? (
              <div className="relative">
                <button
                  onClick={() => setAcct((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ink-300 hover:text-white hover:bg-ink-900 transition-colors"
                  aria-label="Account"
                >
                  <UserIcon className="h-4 w-4" />
                  {pro && billingEnabled && <Crown className="h-3.5 w-3.5 text-amber-400" />}
                </button>
                {acct && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAcct(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-ink-900/95 backdrop-blur-xl shadow-2xl p-1.5">
                      <p className="truncate px-3 py-2 text-xs text-ink-400">{user.email}</p>
                      {billingEnabled &&
                        (pro ? (
                          <button onClick={() => openPortal()} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800">
                            Manage billing
                          </button>
                        ) : (
                          <Link href="/pricing" onClick={() => setAcct(false)} className="block rounded-lg px-3 py-2 text-sm text-amber-300 hover:bg-ink-800">
                            Upgrade to Pro
                          </Link>
                        ))}
                      <Link href="/settings" onClick={() => setAcct(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-ink-800">
                        <Settings className="h-4 w-4" /> Settings
                      </Link>
                      <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                      <button onClick={deleteAccount} className="block w-full rounded-lg px-3 py-2 text-left text-xs text-ink-500 hover:bg-ink-800 hover:text-rose-400">
                        Delete account
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" className="rounded-full bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-glow-rose">
                Sign in
              </Link>
            )
          ) : null}
        </nav>
      </header>
      <RealBanner />
      </div>

      {/* Mobile bottom tab bar */}
      {/* Sits above the in-app ad banner when one is showing (see NativeAdBanner). */}
      <nav style={{ bottom: "var(--ad-banner-h, 0px)" }} className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-ink-950/[0.94] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5 px-1 pt-1">
          {LINKS.filter((l) => !l.desktopOnly).map((l) => {
            const Icon = l.icon;
            const active = (l.match ?? [l.href]).some((m) => path.startsWith(m));
            return (
              <Link key={l.href} href={l.href} onClick={() => tapHaptic()} className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold transition-colors ${active ? "text-white" : "text-ink-500"}`}>
                <span className={`flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200 ${active ? "bg-gradient-to-r from-rose-500/30 to-violet-500/30 text-white ring-1 ring-white/10 shadow-[0_6px_20px_-8px_rgba(217,70,239,0.6)]" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

async function openPortal() {
  try {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const j = await res.json();
    if (j.url) window.location.href = j.url;
  } catch {
    /* ignore */
  }
}

const ICONS: Record<Alert["type"], { icon: React.ElementType; color: string }> = {
  target: { icon: Target, color: "text-emerald-400" },
  stop: { icon: ShieldX, color: "text-rose-400" },
  agrade: { icon: Sparkles, color: "text-violet-400" },
  price: { icon: BellRing, color: "text-amber-400" },
  order: { icon: Receipt, color: "text-sky-400" },
  protection: { icon: Shield, color: "text-rose-300" },
  plan: { icon: Repeat, color: "text-violet-300" },
  income: { icon: Coins, color: "text-emerald-300" },
  screen: { icon: SlidersHorizontal, color: "text-sky-300" },
};

function AlertRow({ a, onClick }: { a: Alert; onClick: () => void }) {
  const { icon: Icon, color } = ICONS[a.type] ?? ICONS.agrade;
  const href = a.type === "target" || a.type === "stop" || a.type === "agrade" ? `/short/${a.symbol}` : a.symbol ? `/i/${a.symbol}` : "/portfolio";
  return (
    <Link href={href} onClick={onClick} className={`flex gap-3 border-b border-ink-800 px-4 py-3 hover:bg-ink-800/60 ${a.seen ? "opacity-70" : ""}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm text-ink-200 leading-snug">{a.message}</p>
        <p className="mt-0.5 text-[11px] text-ink-500">{timeAgo(a.ts)}</p>
      </div>
    </Link>
  );
}
