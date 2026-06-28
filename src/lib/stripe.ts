import Stripe from "stripe";

// Server-side Stripe client. Returns null when unconfigured so billing routes
// can respond cleanly instead of throwing.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}
