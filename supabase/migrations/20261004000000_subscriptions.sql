-- One row per user who has started a Stripe checkout. Written only by the server (secret key);
-- users can read their own row to know whether they're Premium.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- This project doesn't grant new tables to the API roles automatically.
grant select, insert, update, delete on public.subscriptions to service_role;
grant select on public.subscriptions to authenticated;
