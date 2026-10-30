import { NextResponse } from "next/server";
import { serverSupabase, serviceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Permanently deletes the signed-in user and all their data. Apple (5.1.1(v))
// requires in-app account deletion when an app supports account creation.
// Tracked shorts, alerts and subscriptions cascade via their FK to auth.users.
export async function POST() {
  const supabase = await serverSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data?.user;
  if (!supabase || !user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = serviceSupabase();
  if (!admin) return NextResponse.json({ error: "Account deletion not configured" }, { status: 400 });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
