-- Admin data-pipeline staging schema (discovery → collection → migration).
-- Run in Supabase SQL editor AFTER schema.sql. Safe to re-run.
--
-- Access model: RLS is enabled with NO policies on every table below, so the
-- anon and authenticated keys can do nothing. Only the service-role key (used
-- server-side by the admin app and the discovery scripts) can read/write.

create extension if not exists pg_trgm; -- fuzzy name matching against components

-- Job log for discovery / collection / migration runs. Doubles as the
-- migration audit trail (stats lists the migrated component ids).
create table if not exists public.admin_scrape_runs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('discovery','collection','migration')),
  status      text not null default 'running'
              check (status in ('running','succeeded','failed','cancelled')),
  params      jsonb not null default '{}',  -- e.g. {"sources":["reddit"],"limit":25}
  stats       jsonb not null default '{}',  -- counters, updated as the run progresses
  error       text,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- Brands surfaced by the discovery pipeline, ranked by community popularity.
create table if not exists public.discovered_brands (
  id            text primary key,             -- kebab slug, e.g. "schiit"
  name          text not null,                -- canonical display name "Schiit Audio"
  aliases       text[] not null default '{}',
  mention_count int  not null default 0,
  source_counts jsonb not null default '{}',  -- {"reddit":412,"head-fi":88,...}
  popularity    numeric not null default 0,   -- weighted score, recomputed each run
  in_catalog    boolean not null default false, -- matches an existing components.manufacturer
  status        text not null default 'discovered'
                check (status in ('discovered','selected','rejected')),
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

-- Individual components surfaced by discovery. matched_component_id null
-- means the item is NOT in the app catalog yet.
create table if not exists public.discovered_components (
  id             text primary key,            -- kebab slug "schiit-modi-3-plus"
  brand_id       text references public.discovered_brands(id) on delete set null,
  name           text not null,               -- "Modi 3+"
  category_guess text check (category_guess is null or category_guess in (
    'source','turntable','dac','preamp','power_amp','tube_amp_se','tube_amp_pp',
    'integrated','headphone_amp','speaker','headphone')),
  mention_count  int  not null default 0,
  source_counts  jsonb not null default '{}',
  popularity     numeric not null default 0,
  example_urls   text[] not null default '{}', -- sample mention/review URLs, seeds collection
  matched_component_id text references public.components(id) on delete set null,
  status         text not null default 'discovered'
                 check (status in ('discovered','selected','collecting','staged','migrated','rejected')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Collected data awaiting human review before it enters public.components.
create table if not exists public.staged_components (
  id            text primary key,             -- future components.id slug
  discovered_id text references public.discovered_components(id) on delete set null,
  name          text not null,
  category      text not null check (category in (
    'source','turntable','dac','preamp','power_amp','tube_amp_se','tube_amp_pp',
    'integrated','headphone_amp','speaker','headphone')),
  manufacturer  text,
  specs         jsonb not null default '{}',  -- same shape as components.specs ({inputs,outputs,dac?})
  notes         text,
  image_url     text,
  -- Per-field provenance/confidence, keyed by spec path, e.g.
  -- {"outputs.0.outputImpedanceOhm": {"source":"https://...","confidence":"rated","status":"verify"}}
  field_meta    jsonb not null default '{}',
  -- Output of findMissingSpecs: [{"portType":"outputs","index":0,"field":"gainDb"}]
  missing_fields jsonb not null default '[]',
  sources       jsonb not null default '[]',  -- all URLs consulted during collection
  review_status text not null default 'pending'
                check (review_status in ('pending','approved','rejected','migrated')),
  run_id        uuid references public.admin_scrape_runs(id) on delete set null,
  migrated_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at trigger function. Also defined in schema.sql's hardening section,
-- but (re)created here so this file runs on a database that never got it.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists discovered_components_set_updated_at on public.discovered_components;
create trigger discovered_components_set_updated_at
  before update on public.discovered_components
  for each row execute function public.set_updated_at();

drop trigger if exists staged_components_set_updated_at on public.staged_components;
create trigger staged_components_set_updated_at
  before update on public.staged_components
  for each row execute function public.set_updated_at();

-- RLS: enabled with no policies — service-role access only.
alter table public.admin_scrape_runs     enable row level security;
alter table public.discovered_brands     enable row level security;
alter table public.discovered_components enable row level security;
alter table public.staged_components     enable row level security;

create index if not exists discovered_components_pop_idx
  on public.discovered_components (popularity desc);
create index if not exists discovered_components_status_idx
  on public.discovered_components (status);
create index if not exists discovered_brands_pop_idx
  on public.discovered_brands (popularity desc);
create index if not exists staged_components_review_idx
  on public.staged_components (review_status);
create index if not exists admin_scrape_runs_started_idx
  on public.admin_scrape_runs (started_at desc);
create index if not exists components_name_trgm_idx
  on public.components using gin (name gin_trgm_ops);
