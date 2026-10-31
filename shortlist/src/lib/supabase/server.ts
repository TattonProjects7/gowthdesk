import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseConfigured } from "@/lib/config";

// Server Supabase client bound to the request cookies. Returns null when
// unconfigured. Use in server components, route handlers and server actions.
export async function serverSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component — safe to ignore, middleware refreshes.
        }
      },
    },
  });
}

// Service-role client for trusted server work (e.g. Stripe webhook writes).
// Bypasses RLS, so only ever use it server-side with validated input.
export function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
