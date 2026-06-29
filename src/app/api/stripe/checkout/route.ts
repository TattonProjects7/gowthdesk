import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { serverSupabase } from "@/lib/supabase/server";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

// Starts a Stripe Checkout session for the Pro subscription.
export async function POST() {
  const stripe = getStripe();
  const price = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!stripe || !price) return NextResponse.json({ error: "Billing not configured" }, { status: 400 });

  const supabase = await serverSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data?.user;
  if (!supabase || !user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  const { data: existing } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  const customerId = (existing?.stripe_customer_id as string | undefined) || undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl()}/tracker?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
