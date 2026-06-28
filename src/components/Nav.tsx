"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TrendingDown, Radar, ListChecks, Bell, Target, ShieldX, Sparkles, BellRing, User as UserIcon, LogOut, Crown } from "lucide-react";
import { useAlerts, type Alert } from "@/lib/alerts";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";

const LINKS = [
  { href: "/", label: "Scanner", icon: Radar },
  { href: "/tracker", label: "My shorts", icon: ListChecks },
];

export default function Nav() {
  const path = usePathname();
  const { alerts, unseen, mounted, markAllSeen, clear } = useAlerts();
  const { enabled, user, signOut } = useAuth();
  const { pro, billingEnabled } = useSubscription();
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unseen > 0) markAllSeen();
  };

  const enableNotifications = () => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/85 backdrop-blur px-5 sm:px-8 py-3.5 flex items-center gap-3">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
          <TrendingDown className="h-5 w-5" />
        </div>
        <span className="font-bold text-lg tracking-tight text-white">Shortlist</span>
      </Link>
      <span className="hidden sm:inline ml-1 rounded-full bg-rose-950 px-2.5 py-0.5 text-xs text-rose-300 border border-rose-900">
        risk small · win big
      </span>

      <nav className="ml-auto flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-ink-800 text-white" : "text-ink-300 hover:text-white hover:bg-ink-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}

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
              <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
                  <p className="text-sm font-semibold text-white">Alerts</p>
                  <div className="flex items-center gap-2">
                    <button onClick={enableNotifications} className="text-ink-400 hover:text-violet-300" title="Enable browser notifications">
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
                    <p className="px-4 py-6 text-center text-sm text-ink-500">
                      No alerts yet. Track a short or wait for an A-grade setup to appear.
                    </p>
                  ) : (
                    alerts.map((a) => <AlertRow key={a.id} a={a} />)
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-ink-700 bg-ink-900 shadow-2xl p-1.5">
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
                    <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-200 hover:bg-ink-800">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500">
              Sign in
            </Link>
          )
        ) : null}
      </nav>
    </header>
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

function AlertRow({ a }: { a: Alert }) {
  const Icon = a.type === "target" ? Target : a.type === "stop" ? ShieldX : Sparkles;
  const color = a.type === "target" ? "text-emerald-400" : a.type === "stop" ? "text-rose-400" : "text-violet-400";
  return (
    <Link
      href={`/short/${a.symbol}`}
      className={`flex gap-3 border-b border-ink-800 px-4 py-3 hover:bg-ink-800/60 ${a.seen ? "opacity-70" : ""}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm text-ink-200 leading-snug">{a.message}</p>
        <p className="mt-0.5 text-[11px] text-ink-500">{ago(a.ts)}</p>
      </div>
    </Link>
  );
}

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
