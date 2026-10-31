"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Lock, ScanFace } from "lucide-react";
import { useAppLock, verifyBiometric, verifyPin } from "@/lib/applock";

// Full-screen lock shown on launch and after the app has been backgrounded
// longer than the configured grace period. Only renders when the lock is on.
export default function AppLock() {
  const s = useAppLock();
  const [locked, setLocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Lock on first load if enabled.
  useEffect(() => {
    setMounted(true);
    if (s.enabled) setLocked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.enabled]);

  // Re-lock after time in the background.
  useEffect(() => {
    if (!s.enabled) return;
    let hiddenAt = 0;
    const onVis = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > s.lockAfterSeconds * 1000) setLocked(true);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [s.enabled, s.lockAfterSeconds]);

  // Prompt biometrics automatically when locked.
  useEffect(() => {
    if (!locked || s.method !== "biometric") return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const ok = await verifyBiometric();
      if (!cancelled) {
        setBusy(false);
        if (ok) setLocked(false);
        else setErr("Not recognised — try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locked, s.method]);

  if (!mounted || !s.enabled || !locked) return null;

  const submitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await verifyPin(pin);
    setBusy(false);
    if (ok) {
      setLocked(false);
      setPin("");
      setErr(null);
    } else {
      setErr("Wrong PIN");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-950 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-glow-rose mb-5">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-white">Shortlist is locked</h1>
      <p className="mt-1 text-sm text-ink-400">
        {s.method === "biometric" ? "Use Face ID / Touch ID to continue." : "Enter your PIN to continue."}
      </p>

      {s.method === "biometric" ? (
        <button
          onClick={async () => {
            setBusy(true);
            setErr(null);
            const ok = await verifyBiometric();
            setBusy(false);
            if (ok) setLocked(false);
            else setErr("Not recognised — try again.");
          }}
          disabled={busy}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink-800 px-5 py-3 text-sm font-semibold text-white hover:bg-ink-700 disabled:opacity-60"
        >
          <ScanFace className="h-5 w-5" /> {busy ? "Checking…" : "Unlock"}
        </button>
      ) : (
        <form onSubmit={submitPin} className="mt-6 w-full max-w-xs">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="PIN"
            className="w-full rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-rose-600 focus:outline-none"
          />
          <button type="submit" disabled={busy || pin.length < 4} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand shadow-glow-rose px-5 py-3 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
            <Fingerprint className="h-4 w-4" /> Unlock
          </button>
        </form>
      )}
      {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
    </div>
  );
}
