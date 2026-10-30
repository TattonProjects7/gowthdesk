// Central "is this service wired up?" checks. Every real-backend feature is
// gated on these so the app runs fully in local-demo mode until you add keys.

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);
}

// Client-safe variants (only NEXT_PUBLIC_* are inlined into the browser bundle).
export const PUBLIC = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "",
  hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  hasStripe: Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID),
};

export function appUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
