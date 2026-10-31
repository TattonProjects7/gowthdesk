import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/supabase/server";
import { rowsFromRevenueCat, type RevenueCatEvent } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// RevenueCat webhook: mirrors App Store and Google Play purchases into the
// entitlements table, so a subscription bought in the app also removes ads on
// the web (and vice versa via Stripe). RevenueCat sends the Authorization
// header you configure in its dashboard; set the same value as
// REVENUECAT_WEBHOOK_AUTH.
export async function POST(req: Request) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) return NextResponse.json({ received: true });
  const got = req.headers.get("authorization") ?? "";
  if (got !== expected && got !== `Bearer ${expected}`) return new NextResponse("Unauthorized", { status: 401 });

  let ev: RevenueCatEvent | undefined;
  try {
    ev = ((await req.json()) as { event?: RevenueCatEvent }).event;
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (!ev) return NextResponse.json({ received: true });

  const db = serviceSupabase();
  if (!db) return NextResponse.json({ received: true });
  const rows = rowsFromRevenueCat(ev);
  if (rows.length) {
    const { error } = await db.from("entitlements").upsert(rows, { onConflict: "user_id,entitlement,source" });
    if (error) return new NextResponse("store error", { status: 500 });
  }
  return NextResponse.json({ received: true, updated: rows.length });
}
