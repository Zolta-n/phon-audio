-- Supabase PostgreSQL schema
-- Run in Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Components catalog (populated by scraper)
create table if not exists public.components (
  id          text primary key,           -- e.g. "sennheiser-hd-650"
  name        text not null,
  category    text not null,              -- matches ComponentCategory from engine types
  specs       jsonb not null,             -- full Component object from engine schema (minus id/name/category)
  affiliate_url text,                     -- Amazon/Crutchfield affiliate link
  image_url   text,
  manufacturer text,
  notes       text,
  verified    boolean default false,      -- human-reviewed flag
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Chains saved by users
create table if not exists public.chains (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null default 'My Chain',
  is_public   boolean default false,
  context     jsonb not null,             -- ListeningContext object
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Ordered nodes in a chain
create table if not exists public.chain_nodes (
  id          uuid primary key default uuid_generate_v4(),
  chain_id    uuid references public.chains(id) on delete cascade,
  position    int not null,               -- 0-indexed order in chain
  component_id text references public.components(id),
  cable       jsonb,                      -- Cable object or null (cableToNext)
  unique(chain_id, position)
);

-- Row-level security
alter table public.components  enable row level security;
alter table public.chains      enable row level security;
alter table public.chain_nodes enable row level security;

-- Components are public-read
create policy "components_public_read" on public.components
  for select using (true);

-- Chains: owner reads/writes; public chains are readable by all
create policy "chains_owner_all" on public.chains
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "chains_public_read" on public.chains
  for select using (is_public = true);

-- Chain nodes follow chain access
create policy "chain_nodes_owner_all" on public.chain_nodes
  for all using (
    exists (select 1 from public.chains where id = chain_id and user_id = auth.uid())
  );
create policy "chain_nodes_public_read" on public.chain_nodes
  for select using (
    exists (select 1 from public.chains where id = chain_id and is_public = true)
  );

-- ---------------------------------------------------------------------------
-- Hardening migration (2026-07) — safe to re-run on an existing database.
-- ---------------------------------------------------------------------------

-- category is written by the scraper/LLM: constrain it to the engine's enum.
alter table public.components
  drop constraint if exists components_category_check;
alter table public.components
  add constraint components_category_check check (category in (
    'source', 'turntable', 'dac', 'preamp', 'power_amp',
    'tube_amp_se', 'tube_amp_pp', 'integrated',
    'headphone_amp', 'speaker', 'headphone'
  ));

-- Keep updated_at fresh on every update/upsert (default only covers inserts).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists components_set_updated_at on public.components;
create trigger components_set_updated_at
  before update on public.components
  for each row execute function public.set_updated_at();

drop trigger if exists chains_set_updated_at on public.chains;
create trigger chains_set_updated_at
  before update on public.chains
  for each row execute function public.set_updated_at();

-- Indexes for the app's query patterns and RLS lookups.
create index if not exists components_category_idx on public.components (category, name);
create index if not exists chains_user_id_idx      on public.chains (user_id);
create index if not exists chain_nodes_chain_id_idx on public.chain_nodes (chain_id);

-- Explicit WITH CHECK on the owner policy (Postgres reuses USING for writes,
-- but stating it makes the write rule auditable). Idempotent re-create:
drop policy if exists "chains_owner_all" on public.chains;
create policy "chains_owner_all" on public.chains
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
