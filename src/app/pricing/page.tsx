"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";

const FREE = ["Live short scanner & rankings", "Squeeze-risk radar", "Catalyst countdown", "Track shorts & expectancy stats"];
const PRO = ["Everything in Free", "AI bear + steel-manned bull thesis", "Defined-risk put alternatives", "Real-time alerts across devices", "Priority data refresh"];

export default function Pricing() {
  const { enabled, user } = useAuth();
  const { pro, billingEnabled } = useSubscription();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upgrade = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else setErr(j.error || "Could not start checkout.");
    } catch {
      setErr("Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950">
      <Nav />
      <main className="mx-auto max-w-4xl px-5 sm:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Trade smarter, not more.</h1>
          <p className="mt-2 text-ink-300">Start free. Upgrade for the AI thesis, put structures and cross-device alerts.</p>
          {!billingEnabled && (
            <p className="mt-3 inline-block rounded-full border border-amber-900 bg-amber-950/40 px-3 py-1 text-xs text-amber-300">
              Billing not configured — all Pro features are unlocked in demo mode.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Plan name="Free" price="£0" tagline="Everything you need to find and track shorts." features={FREE} cta={<Link href="/scan" className="block rounded-lg border border-ink-700 px-4 py-2.5 text-center text-sm font-semibold text-ink-200 hover:bg-ink-800">Open the scanner</Link>} />

          <div className="rounded-2xl border border-rose-800 bg-gradient-to-br from-rose-950/40 to-ink-900 p-6 relative">
            <span className="absolute -top-3 left-6 rounded-full bg-rose-600 px-3 py-0.5 text-xs font-bold text-white">PRO</span>
            <h2 className="text-lg font-bold text-white">Pro</h2>
            <p className="mt-1 text-3xl font-bold text-white">
              £12<span className="text-base font-normal text-ink-400">/mo</span>
            </p>
            <p className="mt-1 text-sm text-ink-300">For traders who want the full edge.</p>
            <ul className="mt-4 space-y-2">
              {PRO.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {pro && billingEnabled ? (
                <div className="rounded-lg bg-emerald-950 border border-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-emerald-300">
                  You’re on Pro ✓
                </div>
              ) : (
                <button
                  onClick={upgrade}
                  disabled={busy || !billingEnabled}
                  className="w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!enabled ? "Sign-in required" : !user ? "Sign in to upgrade" : "Upgrade to Pro"}
                </button>
              )}
              {err && <p className="mt-2 text-sm text-rose-400">{err}</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Plan({ name, price, tagline, features, cta }: { name: string; price: string; tagline: string; features: string[]; cta: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-6">
      <h2 className="text-lg font-bold text-white">{name}</h2>
      <p className="mt-1 text-3xl font-bold text-white">{price}</p>
      <p className="mt-1 text-sm text-ink-300">{tagline}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-ink-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}
