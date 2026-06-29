"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { PUBLIC } from "@/lib/config";
import { isNative } from "@/lib/platform";
import { iapConfigured, isProNative } from "@/lib/iap";

// Is the current user "Pro"? Resolves entitlement from the right source for the
// platform: RevenueCat IAP on native, Stripe (via Supabase) on web. When no
// billing is configured at all, everything is unlocked (demo mode).
export function useSubscription(): { pro: boolean; loading: boolean; billingEnabled: boolean } {
  const { supabase, user } = useAuth();
  const native = typeof window !== "undefined" && isNative();
  const nativeBilling = native && iapConfigured();
  const webBilling = !native && PUBLIC.hasStripe;
  const billingEnabled = nativeBilling || webBilling;

  const [pro, setPro] = useState(!billingEnabled);
  const [loading, setLoading] = useState(billingEnabled);

  useEffect(() => {
    let active = true;

    // No billing anywhere → demo, everything unlocked.
    if (!billingEnabled) {
      setPro(true);
      setLoading(false);
      return;
    }

    // Native: entitlement comes from the App Store / Play Store via RevenueCat.
    if (nativeBilling) {
      isProNative().then((p) => {
        if (active) {
          setPro(p);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }

    // Web: entitlement comes from the Stripe-synced subscriptions table.
    if (!(supabase && user)) {
      setPro(false);
      setLoading(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setPro(Boolean(data && ["active", "trialing"].includes(data.status as string)));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [billingEnabled, nativeBilling, supabase, user]);

  return { pro, loading, billingEnabled };
}
