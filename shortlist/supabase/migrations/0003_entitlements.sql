-- Entitlements: what a user has paid for, from any store, in one place.
--
-- One purchase should unlock the same thing on the web and in the apps, so the
-- Stripe webhook (web) and the RevenueCat webhook (App Store / Google Play)
-- both write here, and the app reads it for the signed-in user.
--
--   entitlement: 'ad_free' (the £6.99/month plan) or 'pro'
--   source:      'stripe' | 'app_store' | 'play_store' | …

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  source text not null,
  active boolean not null default false,
  expires_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement, source)
);

alter table public.entitlements enable row level security;
-- Users may read their own entitlements; only the service role (webhooks) writes.
create policy "own entitlements read" on public.entitlements for select using (auth.uid() = user_id);

create index if not exists entitlements_user_idx on public.entitlements (user_id);
