-- One row per Google Play purchase token (a resubscribe or plan change gets a new token).
-- Written only by the server after it checks the token with the Play Developer API;
-- users can read their own rows to know whether they're Premium.
create table if not exists public.play_subscriptions (
  purchase_token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null,
  base_plan_id text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists play_subscriptions_user_id_idx on public.play_subscriptions (user_id);

alter table public.play_subscriptions enable row level security;

drop policy if exists "Users can read their own Play subscriptions" on public.play_subscriptions;
create policy "Users can read their own Play subscriptions"
  on public.play_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.play_subscriptions to service_role;
grant select on public.play_subscriptions to authenticated;
