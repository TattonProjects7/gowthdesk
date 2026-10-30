"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, ShieldOff } from "lucide-react";
import Nav from "@/components/Nav";
import { useAuth } from "@/lib/auth";
import { refreshSubscription, useSubscription } from "@/lib/subscription";
import { isNative } from "@/lib/platform";
import { purchaseAdFree, purchasePro, restorePurchases } from "@/lib/iap";
import { AD_FREE_PRICE } from "@/lib/ads";

const FREE = ["UK & US shares, ETFs and crypto with live charts", "Paper portfolio: GIA, ISA & SIPP, fractional from £1", "Watchlists, price alerts & market calendar", "Savings plans, AutoInvest & one-click rebalance", "Look-through analytics & income projection", "Short scanner, squeeze radar & tracker", "Shortlist Academy, missions & AI coach", "Demo and real modes with Trading 212"];
const PRO = ["Everything in Free", "No adverts, on the web and in the apps", "AI bear + steel-manned bull thesis", "Defined-risk put alternatives", "Real-time alerts across devices", "Priority data refresh"];
const AD_FREE = ["Everything in Free", "No adverts anywhere in Shortlist", "Works on the web, iPhone and Android", "One subscription for every device you sign in to", "Cancel any time"];

export default function Pricing() {
  const { enabled, user } = useAuth();
  const { pro, adFree, billingEnabled, adFreeBilling } = useSubscription();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const native = typeof window !== "undefined" && isNative();

  const upgrade = async () => {
    setBusy(true);
    setErr(null);
    try {
      // Native: App Store / Play Store in-app purchase via RevenueCat.
      if (native) {
        const r = await purchasePro();
        if (r.ok) {
          router.push("/tracker");
          router.refresh();
        } else {
          setErr(r.message || "Purchase failed.");
        }
        return;
      }
      // Web: Stripe Checkout (requires an account).
      if (!user) {
        router.push("/login");
        return;
      }
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

  // The £6.99/month ad-free plan: App Store / Google Play in the apps, Stripe on the web.
  const goAdFree = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (native) {
        const r = await purchaseAdFree();
        if (r.ok) {
          refreshSubscription();
          router.push("/settings?adfree=1");
        } else setErr(r.message || "Purchase failed.");
        return;
      }
      if (!user) {
        router.push("/login");
        return;
      }
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "ad_free" }) });
      const j = await res.json();
      if (j.url) window.location.href = j.url;
      else setErr(j.error || "Could not start checkout.");
    } catch {
      setErr("Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setErr(null);
    const ok = await restorePurchases();
    setBusy(false);
    if (ok) {
      router.push("/tracker");
      router.refresh();
    } else {
      setErr("No previous purchase found to restore.");
    }
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Trade smarter, not more.</h1>
          <p className="mt-2 text-ink-300">Start free. Remove the adverts for {AD_FREE_PRICE} a month, or go Pro for the AI thesis, put structures, cross-device alerts and no adverts.</p>
          {!billingEnabled && (
            <p className="mt-3 inline-block rounded-full border border-amber-900 bg-amber-950/40 px-3 py-1 text-xs text-amber-300">
              Billing not configured — all Pro features are unlocked in demo mode.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Plan name="Free" price="£0" tagline="Everything you need to learn, invest and research, with adverts." features={FREE} cta={<Link href="/markets" className="block rounded-lg border border-ink-700 px-4 py-2.5 text-center text-sm font-semibold text-ink-200 hover:bg-ink-800">Explore markets</Link>} />

          <div id="ad-free" className="relative scroll-mt-24 rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/40 to-ink-900 p-6">
            <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-400 to-sky-400 px-3 py-0.5 text-xs font-bold text-ink-950">
              <ShieldOff className="h-3 w-3" /> AD-FREE
            </span>
            <h2 className="text-lg font-bold text-white">Ad-free</h2>
            <p className="mt-1 text-3xl font-bold text-white">
              {AD_FREE_PRICE}
              <span className="text-base font-normal text-ink-400">/mo</span>
            </p>
            <p className="mt-1 text-sm text-ink-300">Shortlist without the adverts, everywhere you use it.</p>
            <ul className="mt-4 space-y-2">
              {AD_FREE.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-200">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {adFree ? (
                <div className="rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-2.5 text-center text-sm font-semibold text-emerald-300">{pro && billingEnabled ? "Included with Pro ✓" : "You’re ad-free ✓"}</div>
              ) : (
                <button
                  onClick={goAdFree}
                  disabled={busy || !adFreeBilling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-400 to-sky-400 px-4 py-2.5 text-sm font-bold text-ink-950 hover:brightness-105 disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!adFreeBilling ? "Coming soon" : native ? `Go ad-free · ${AD_FREE_PRICE}/mo` : !user ? "Sign in to go ad-free" : `Go ad-free · ${AD_FREE_PRICE}/mo`}
                </button>
              )}
              <p className="mt-2 text-center text-[11px] text-ink-500">{native ? "Billed by the App Store or Google Play. Sign in to remove ads on the web too." : "Billed monthly by Stripe. Sign in on the apps to remove ads there too."}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-800 bg-gradient-to-br from-rose-950/40 to-ink-900 p-6 relative">
            <span className="absolute -top-3 left-6 rounded-full bg-brand shadow-glow-rose px-3 py-0.5 text-xs font-bold text-white">PRO</span>
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
                <>
                  <button
                    onClick={upgrade}
                    disabled={busy || !billingEnabled}
                    className="w-full rounded-lg bg-brand shadow-glow-rose px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {native ? "Upgrade to Pro" : !enabled ? "Sign-in required" : !user ? "Sign in to upgrade" : "Upgrade to Pro"}
                  </button>
                  {native && billingEnabled && (
                    <button onClick={restore} disabled={busy} className="mt-2 w-full text-center text-xs text-ink-400 hover:text-white">
                      Restore purchases
                    </button>
                  )}
                </>
              )}
              {err && <p className="mt-2 text-sm text-rose-400">{err}</p>}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-ink-500">
          Subscriptions renew monthly until cancelled. Cancel any time: on the web from Settings → Manage billing, in the apps from your App Store or Google Play subscriptions. Paid plans apply to your Shortlist account on every device you sign in to. See the <Link href="/terms" className="underline">terms</Link>.
        </p>
      </main>
    </div>
  );
}

function Plan({ name, price, tagline, features, cta }: { name: string; price: string; tagline: string; features: string[]; cta: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 shadow-card p-6">
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
