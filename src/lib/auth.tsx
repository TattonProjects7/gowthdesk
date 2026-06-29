"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { browserSupabase } from "@/lib/supabase/client";

interface AuthState {
  enabled: boolean; // is Supabase configured at all?
  user: User | null;
  loading: boolean;
  supabase: SupabaseClient | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ enabled: false, user: null, loading: false, supabase: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => browserSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthState = {
    enabled: Boolean(supabase),
    user,
    loading,
    supabase,
    signOut: async () => {
      await supabase?.auth.signOut();
      setUser(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  return useContext(Ctx);
}
