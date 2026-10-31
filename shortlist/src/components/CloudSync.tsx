"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { attachCloud, detachCloud } from "@/lib/docstore";

// Mirrors every document store (portfolio, watchlists, price alerts, settings)
// to Supabase while the user is signed in. No-op without an account.
export default function CloudSync() {
  const { supabase, user } = useAuth();
  useEffect(() => {
    if (supabase && user) attachCloud(supabase, user.id);
    else detachCloud();
  }, [supabase, user]);
  return null;
}
