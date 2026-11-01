"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button, Card, H2 } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { isNative, platformName } from "@/lib/platform";
import { AD_CONFIG, AD_FREE_PRICE } from "@/lib/ads";

// Settings → Adverts: plan status, upgrade, manage, and (in the apps) the
// consent choices Google's privacy form records.
export default function AdSettings() {
  const { user } = useAuth();
  const { adFree, pro, billingEnabled, adFreeBilling, loading } = useSubscription();
  const [native, setNative] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  const [justBought, setJustBought] = useState(false);
  useEffect(() => {
    setNative(isNative());
    setPlatform(platformName());
    setJustBought(new URLSearchParams(window.location.search).get("adfree") === "1");
  }, []);

  const manage = async () => {
    if (native) {
      window.open(platform === "ios" ? "https://apps.apple.com/account/subscriptions" : "https://play.google.com/store/account/subscriptions", "_blank");
      return;
    }
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (j.url) window.location.href = j.url;
  };

  const privacy = async () => {
    try {
      const { AdMob } = await import("@capacitor-community/admob");
      await AdMob.showPrivacyOptionsForm();
    } catch {
      /* not available until AdMob is set up */
    }
  };

  return (
    <>
      <H2>
        <span className="inline-flex items-center gap-1.5">
          <ShieldOff className="h-4 w-4" /> Adverts
        </span>
      </H2>
      <Card>
        {justBought && !loading && adFree && <p className="mb-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">Thanks — you’re ad-free. It can take a minute to apply on your other devices.</p>}
        {adFree ? (
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{pro && billingEnabled ? "No adverts — included with Pro" : "You’re ad-free"}</p>
              <p className="text-xs text-ink-400">No adverts on the web or in the apps for {user?.email ?? "this account"}.</p>
            </div>
            <Button variant="ghost" onClick={manage} className="!py-1.5 text-xs">
              Manage
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Free, with adverts</p>
              <p className="text-xs text-ink-400">Adverts appear on research and learning screens, never on trading, account or real-money screens. Remove them everywhere for {AD_FREE_PRICE} a month.</p>
            </div>
            <Link href="/pricing#ad-free" className="rounded-xl bg-gradient-to-r from-blue-400 to-sky-400 px-4 py-2 text-sm font-bold text-ink-950">
              {adFreeBilling ? `Go ad-free · ${AD_FREE_PRICE}` : "See plans"}
            </Link>
          </div>
        )}
        {native && (AD_CONFIG.admobBannerIos || AD_CONFIG.admobBannerAndroid) && (
          <button onClick={privacy} className="mt-3 text-xs font-semibold text-blue-300 hover:underline">
            Ad privacy choices
          </button>
        )}
      </Card>
    </>
  );
}
