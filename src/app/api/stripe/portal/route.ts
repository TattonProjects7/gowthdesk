import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { serverSupabase } from "@/lib/supabase/server";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

// Opens the Stripe billing portal so users can manage/cancel their subscription.
export async function POST() {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Billing not configured" }, { status: 400 });

  const supabase = await serverSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data?.user;
  if (!supabase || !user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const { data: sub } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  const customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/tracker`,
  });
  return NextResponse.json({ url: session.url });
}
