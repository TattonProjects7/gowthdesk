"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { PUBLIC } from "@/lib/config";
import { isNative } from "@/lib/platform";
import { iapConfigured, linkIapUser, nativeEntitlements } from "@/lib/iap";
import { isActive } from "@/lib/entitlements";

// What has the current user paid for? Pro (£12/month) and the ad-free plan
// (£6.99/month), from whichever store they bought it in:
//   • App Store / Google Play via RevenueCat, on the device;
//   • Stripe on the web, mirrored to Supabase by the webhook;
//   • App-store purchases mirrored to Supabase by the RevenueCat webhook.
// So one purchase, made anywhere, removes ads on the web and in the apps for
// that signed-in account. Pro includes ad-free.
//
// When no billing is configured at all, Pro features are unlocked (demo mode),
// but ads still show: being ad-free always means someone actually paid.

export interface SubscriptionState {
  pro: boolean;
  adFree: boolean;
  loading: boolean;
  billingEnabled: boolean;
  /** Can the ad-free plan be bought on this platform right now? */
  adFreeBilling: boolean;
}

interface Paid {
  pro: boolean;
  adFree: boolean;
}

// Shared across components on a page so the header, ad slots and settings don't each query.
let cache: { key: string; at: number; paid: Paid } | null = null;
let inflight: { key: string; p: Promise<Paid> } | null = null;

export function useSubscription(): SubscriptionState {
  const { supabase, user } = useAuth();
  const native = typeof window !== "undefined" && isNative();
  const nativeBilling = native && iapConfigured();
  const webBilling = !native && PUBLIC.hasStripe;
  const billingEnabled = nativeBilling || webBilling;
  const adFreeBilling = native ? nativeBilling : Boolean(process.env.NEXT_PUBLIC_STRIPE_ADFREE_PRICE_ID) && PUBLIC.hasSupabase;
  const key = `${native ? "n" : "w"}:${user?.id ?? "anon"}`;

  const [paid, setPaid] = useState<Paid>(cache?.key === key ? cache.paid : { pro: false, adFree: false });
  const [loading, setLoading] = useState(cache?.key !== key);

  useEffect(() => {
    let active = true;
    if (cache && cache.key === key && Date.now() - cache.at < 60_000) {
      setPaid(cache.paid);
      setLoading(false);
      return;
    }
    const load = async (): Promise<Paid> => {
      const out: Paid = { pro: false, adFree: false };
      if (nativeBilling) {
        if (user) await linkIapUser(user.id);
        const n = await nativeEntitlements();
        out.pro ||= n.pro;
        out.adFree ||= n.adFree;
      }
      if (supabase && user) {
        const [{ data: sub }, { data: ents }] = await Promise.all([
          supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
          supabase.from("entitlements").select("entitlement,active,expires_at").eq("user_id", user.id),
        ]);
        if (sub && ["active", "trialing"].includes(sub.status as string)) out.pro = true;
        for (const e of (ents ?? []) as { entitlement: string; active: boolean; expires_at: string | null }[]) {
          if (!isActive(e)) continue;
          if (e.entitlement === "pro") out.pro = true;
          if (e.entitlement === "ad_free") out.adFree = true;
        }
      }
      return out;
    };
    if (!inflight || inflight.key !== key) inflight = { key, p: load().catch(() => ({ pro: false, adFree: false })) };
    inflight.p.then((p) => {
      cache = { key, at: Date.now(), paid: p };
      if (!active) return;
      setPaid(p);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [key, nativeBilling, supabase, user]);

  return {
    // Demo mode (no billing anywhere) unlocks Pro features, as before.
    pro: billingEnabled ? paid.pro : true,
    // Ad-free needs a real purchase: the ad-free plan, or real (paid) Pro.
    adFree: paid.adFree || paid.pro,
    loading,
    billingEnabled,
    adFreeBilling,
  };
}

/** Forget the cached entitlement, e.g. right after a purchase. */
export function refreshSubscription(): void {
  cache = null;
  inflight = null;
}
