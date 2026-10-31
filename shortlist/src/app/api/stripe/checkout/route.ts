import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { serverSupabase } from "@/lib/supabase/server";
import { appUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

// Starts a Stripe Checkout session for Pro or the £6.99/month ad-free plan.
// Body: { plan?: "pro" | "ad_free" } (defaults to Pro).
export async function POST(req: Request) {
  const stripe = getStripe();
  let plan: "pro" | "ad_free" = "pro";
  try {
    const body = (await req.json()) as { plan?: string };
    if (body?.plan === "ad_free") plan = "ad_free";
  } catch {
    /* no body: Pro */
  }
  const price = plan === "ad_free" ? process.env.NEXT_PUBLIC_STRIPE_ADFREE_PRICE_ID : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!stripe || !price) return NextResponse.json({ error: "Billing not configured" }, { status: 400 });

  const supabase = await serverSupabase();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const user = data?.user;
  if (!supabase || !user) return NextResponse.json({ error: "Please sign in first" }, { status: 401 });

  // Reuse the customer from either plan so one person has one Stripe customer.
  const { data: existing } = await supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  const { data: ent } = await supabase.from("entitlements").select("stripe_customer_id").eq("user_id", user.id).eq("source", "stripe").not("stripe_customer_id", "is", null).limit(1).maybeSingle();
  const customerId = ((existing?.stripe_customer_id ?? ent?.stripe_customer_id) as string | undefined) || undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    customer_email: customerId ? undefined : user.email,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: plan === "ad_free" ? `${appUrl()}/settings?adfree=1` : `${appUrl()}/tracker?upgraded=1`,
    cancel_url: `${appUrl()}/pricing`,
    metadata: { user_id: user.id, plan },
    subscription_data: { metadata: { user_id: user.id, plan } },
  });

  return NextResponse.json({ url: session.url });
}
