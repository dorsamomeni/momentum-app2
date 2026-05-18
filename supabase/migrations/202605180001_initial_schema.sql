create extension if not exists "pgcrypto";

create table if not exists public.documents (
  collection_name text not null,
  id text not null,
  owner_id uuid references auth.users(id) on delete set null default auth.uid(),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_name, id)
);

create index if not exists documents_collection_idx
  on public.documents (collection_name);

create index if not exists documents_data_gin_idx
  on public.documents using gin (data);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "Authenticated users can read MVP documents" on public.documents;
create policy "Authenticated users can read MVP documents"
  on public.documents for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert MVP documents" on public.documents;
create policy "Authenticated users can insert MVP documents"
  on public.documents for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update MVP documents" on public.documents;
create policy "Authenticated users can update MVP documents"
  on public.documents for update
  to authenticated
  using (true)
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can delete MVP documents" on public.documents;
create policy "Authenticated users can delete MVP documents"
  on public.documents for delete
  to authenticated
  using (true);

drop policy if exists "Users can read their subscription" on public.subscriptions;
create policy "Users can read their subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can create their subscription placeholder" on public.subscriptions;
create policy "Users can create their subscription placeholder"
  on public.subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their subscription placeholder" on public.subscriptions;
create policy "Users can update their subscription placeholder"
  on public.subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
