import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { serviceSupabase } from "@/lib/supabase/server";
import { planForPrice } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

// Stripe webhook: keeps the subscriptions table in sync with Stripe. Excluded
// from middleware so the raw body signature stays intact.
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ received: true });

  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const db = serviceSupabase();
  if (!db) return NextResponse.json({ received: true });

  const upsert = async (userId: string, customerId: string, sub: Stripe.Subscription) => {
    // `current_period_end` lives on the subscription in older API versions and on
    // the first item in newer ones — read whichever is present.
    const periodEndSecs =
      (sub as unknown as { current_period_end?: number }).current_period_end ??
      (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
    // The ad-free plan is an entitlement shared with the app stores; Pro keeps
    // its original subscriptions row.
    const priceId = sub.items?.data?.[0]?.price?.id;
    if (planForPrice(priceId, { adFreePrice: process.env.NEXT_PUBLIC_STRIPE_ADFREE_PRICE_ID }) === "ad_free") {
      await db.from("entitlements").upsert(
        {
          user_id: userId,
          entitlement: "ad_free",
          source: "stripe",
          active: ["active", "trialing", "past_due"].includes(sub.status),
          expires_at: periodEndSecs ? new Date(periodEndSecs * 1000).toISOString() : null,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,entitlement,source" },
      );
      return;
    }
    await db.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        status: sub.status,
        current_period_end: periodEndSecs ? new Date(periodEndSecs * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  };

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.metadata?.user_id;
      if (userId && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(s.subscription as string);
        await upsert(userId, s.customer as string, sub);
      }
    } else if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) await upsert(userId, sub.customer as string, sub);
    }
  } catch {
    return new NextResponse("handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
