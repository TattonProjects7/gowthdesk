"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { PUBLIC } from "@/lib/config";

// Is the current user "Pro"? When billing isn't configured, everything is
// unlocked (demo mode). When it is, Pro requires an active/trialing sub.
export function useSubscription(): { pro: boolean; loading: boolean; billingEnabled: boolean } {
  const { supabase, user } = useAuth();
  const billingEnabled = PUBLIC.hasStripe;
  const [pro, setPro] = useState(!billingEnabled);
  const [loading, setLoading] = useState(billingEnabled);

  useEffect(() => {
    if (!billingEnabled) {
      setPro(true);
      setLoading(false);
      return;
    }
    if (!(supabase && user)) {
      setPro(false);
      setLoading(false);
      return;
    }
    let active = true;
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
  }, [billingEnabled, supabase, user]);

  return { pro, loading, billingEnabled };
}
