-- Shortlist schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Row-level security ensures every user only ever sees their own rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Auto-create a profile whenever a new auth user appears.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tracked_shorts: the user's tracked setups (cloud version of localStorage).
-- ---------------------------------------------------------------------------
create table if not exists public.tracked_shorts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  name text not null,
  entry numeric not null,
  stop numeric not null,
  target numeric not null,
  shares integer not null,
  max_loss numeric not null,
  max_gain numeric not null,
  reward_risk numeric not null,
  opened_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table public.tracked_shorts enable row level security;
create policy "own shorts" on public.tracked_shorts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- alerts: per-user alert feed.
-- ---------------------------------------------------------------------------
create table if not exists public.alerts (
  id text not null,                 -- client-supplied dedupe key
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  symbol text not null,
  message text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.alerts enable row level security;
create policy "own alerts" on public.alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- subscriptions: Stripe subscription status, written by the webhook.
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',  -- active | trialing | past_due | canceled | inactive
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
-- Users may read their own subscription; only the service role writes it.
create policy "own subscription read" on public.subscriptions for select using (auth.uid() = user_id);
