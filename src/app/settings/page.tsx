"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Cloud, Fingerprint, Lock, RefreshCw, ScanFace, Settings as SettingsIcon, ShieldCheck, Trash2, User } from "lucide-react";
import Nav from "@/components/Nav";
import { Button, Card, H2, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useAppLock, biometricsAvailable, enableBiometric, enablePin, disableAppLock, setLockAfter } from "@/lib/applock";
import { portfolio } from "@/lib/portfolioStore";
import { cloudAttached } from "@/lib/docstore";

// Settings — app lock (Face ID / Touch ID or PIN), notifications, account and
// data. The security features are what IG and ii lead with in their stores.
export default function SettingsPage() {
  const { enabled, user, signOut } = useAuth();
  const lock = useAppLock();
  const [bio, setBio] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [notif, setNotif] = useState<string>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    biometricsAvailable().then(setBio);
    if (typeof Notification !== "undefined") setNotif(Notification.permission);
  }, []);

  const setupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== pin2) return setMsg("PINs don’t match.");
    const ok = await enablePin(pin);
    setMsg(ok ? "PIN lock enabled." : "Use 4–8 digits.");
    setPin("");
    setPin2("");
  };

  const setupBio = async () => {
    const r = await enableBiometric();
    setMsg(r.ok ? "Face ID / Touch ID enabled." : r.message ?? "Could not enable.");
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 sm:px-8 py-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
          <SettingsIcon className="h-6 w-6 text-ink-300" /> Settings
        </h1>
        <p className="text-sm text-ink-400">Security, notifications, account and data.</p>

        {/* App lock */}
        <H2>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-4 w-4" /> App lock
          </span>
        </H2>
        <Card>
          {mounted && lock.enabled ? (
            <div>
              <p className="flex items-center gap-2 text-sm text-emerald-300 font-semibold">
                <ShieldCheck className="h-4 w-4" /> {lock.method === "biometric" ? "Face ID / Touch ID" : "PIN"} lock is on
              </p>
              <p className="mt-1 text-xs text-ink-400">Shortlist locks when opened and after it has been in the background.</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-ink-400">Re-lock after</label>
                <Select value={String(lock.lockAfterSeconds)} onChange={(e) => setLockAfter(Number(e.target.value))} className="!w-auto">
                  <option value="0">Immediately</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                  <option value="900">15 minutes</option>
                </Select>
                <Button variant="danger" onClick={() => disableAppLock()}>
                  Turn off
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ScanFace className="h-4 w-4 text-rose-400" /> Face ID / Touch ID
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  {bio ? "Uses your device’s biometric authenticator. Nothing leaves the device." : "Not available in this browser. On iPhone, use the installed app or Safari."}
                </p>
                <Button className="mt-3" onClick={setupBio} disabled={!bio}>
                  Enable biometrics
                </Button>
              </div>
              <form onSubmit={setupPin}>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Fingerprint className="h-4 w-4 text-rose-400" /> PIN
                </p>
                <p className="mt-1 text-xs text-ink-400">4–8 digits, stored hashed on this device only.</p>
                <div className="mt-3 flex gap-2">
                  <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="PIN" />
                  <Input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="Repeat" />
                </div>
                <Button type="submit" variant="ghost" className="mt-2" disabled={pin.length < 4}>
                  Enable PIN
                </Button>
              </form>
            </div>
          )}
          {msg && <p className="mt-3 text-sm text-ink-200">{msg}</p>}
        </Card>

        {/* Notifications */}
        <H2>
          <span className="inline-flex items-center gap-1.5">
            <Bell className="h-4 w-4" /> Notifications
          </span>
        </H2>
        <Card>
          <p className="text-sm text-ink-300">
            Price alerts, order fills, stop-loss triggers, savings-plan runs and dividends appear in the alert feed (bell icon). Allow notifications to also get them as pop-ups
            {" "}— on iPhone/Android the installed app uses push.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className={`text-xs font-semibold ${notif === "granted" ? "text-emerald-300" : notif === "denied" ? "text-rose-300" : "text-ink-400"}`}>
              {notif === "granted" ? "Allowed" : notif === "denied" ? "Blocked in browser settings" : "Not yet allowed"}
            </span>
            {notif === "default" && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (typeof Notification !== "undefined") Notification.requestPermission().then(setNotif);
                }}
              >
                Allow notifications
              </Button>
            )}
          </div>
        </Card>

        {/* Account & sync */}
        <H2>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" /> Account & sync
          </span>
        </H2>
        <Card>
          {!enabled ? (
            <p className="text-sm text-ink-300">
              Accounts aren’t enabled in this deployment — your portfolio, watchlists and alerts live in this browser. Add Supabase keys (see SETUP.md) to sync across devices.
            </p>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{user.email}</p>
                <p className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Cloud className="h-3.5 w-3.5" /> {mounted && cloudAttached() ? "Portfolio, watchlists and alerts sync to your account." : "Connecting…"}
                </p>
              </div>
              <Button variant="ghost" onClick={() => signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex-1 text-sm text-ink-300">Sign in to sync your portfolio, watchlists and alerts across devices.</p>
              <Link href="/login" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
                Sign in
              </Link>
            </div>
          )}
        </Card>

        {/* Data */}
        <H2>
          <span className="inline-flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4" /> Paper portfolio
          </span>
        </H2>
        <Card>
          <p className="text-sm text-ink-300">Start again with a fresh £10,000 of virtual funds. This clears accounts, holdings, orders and history (watchlists and alerts are kept).</p>
          <Button
            variant="danger"
            className="mt-3"
            onClick={() => {
              if (window.confirm("Reset your paper portfolio? This can’t be undone.")) {
                portfolio.reset();
                setMsg("Portfolio reset.");
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Reset portfolio
          </Button>
        </Card>

        <p className="mt-8 text-xs text-ink-600">
          <Link href="/privacy" className="hover:text-ink-300">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-ink-300">
            Terms
          </Link>{" "}
          · Shortlist is a research and paper-trading app, not a broker or adviser.
        </p>
      </main>
    </div>
  );
}
