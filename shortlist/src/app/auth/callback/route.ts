import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Exchanges the auth code (magic link / email confirmation) for a session,
// then redirects into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/tracker";

  if (code) {
    const supabase = await serverSupabase();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
