"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PUBLIC } from "@/lib/config";

// Browser Supabase client (cookie-based session). Returns null when Supabase
// isn't configured, so callers fall back to local-only mode.
let cached: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient | null {
  if (!PUBLIC.hasSupabase) return null;
  if (cached) return cached;
  cached = createBrowserClient(PUBLIC.supabaseUrl, PUBLIC.supabaseAnonKey);
  return cached;
}
