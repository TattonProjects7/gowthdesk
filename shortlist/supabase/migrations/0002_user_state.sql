-- Shortlist: generic per-user document store.
--
-- The investing features (paper portfolio with accounts/orders/holdings,
-- watchlists, price alerts, savings plans, settings) each persist as one JSON
-- document keyed by name. Offline-first in the browser; mirrored here when the
-- user is signed in so everything follows them across devices.
-- Run after 0001_init.sql.

create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_state enable row level security;

create policy "own state" on public.user_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists user_state_updated_idx on public.user_state (user_id, updated_at desc);
