# Phon.Audio Admin — discovery → collection → migration pipeline

Standalone internal tool (never linked from the consumer app) that finds popular
audiophile gear in community sources, collects specs for admin-selected items,
and migrates reviewed records into the live `components` catalog.

## Pipeline

1. **Discovery** ("Run discovery" on `/discovery`, or `npm run discover` in a
   terminal): scrapes Reddit (official API), forums (Head-Fi, ASR, Steve
   Hoffman) and magazines (Stereophile, What Hi-Fi, Darko.Audio) → LLM entity
   extraction → popularity-ranked `discovered_brands` / `discovered_components`,
   fuzzy-matched against the existing catalog (`matched_component_id` null =
   not in the app yet). Both entry points call
   `scripts/discover/pipeline.ts`; the UI route (`POST /api/discover`) starts
   the run in the background and the page polls `admin_scrape_runs` until it
   settles (one discovery run at a time — concurrent runs would double counts).
2. **Selection** (`/discovery`): filter by category / status / in-DB, queue
   items for collection or reject them.
3. **Collection** (`/collection`): sequential queue; per item ~30–90 s —
   manufacturer page scrape (or web-search fallback) → review enrichment →
   staged with per-field provenance (`field_meta`) and `missing_fields`.
4. **Review** (`/staged`, `/staged/[id]`): missing fields red, review-sourced
   fields amber with source link; edit, Approve / Reject / Re-collect.
5. **Migration** (`Migrate to catalog` on an approved item): upsert into
   `public.components` with `verified: false`; id conflicts are skipped unless
   overwritten; every migration is logged as an `admin_scrape_runs` row.

## Setup

1. Apply `db/admin-schema.sql` in the Supabase SQL editor (idempotent).
   The staging tables have RLS enabled with **no** policies — service-role only.
2. `npm install` here **and** in `web/` (shared modules resolve their deps from
   `web/node_modules`).
3. `.env.local`: same keys as `web/.env.local` plus
   - `ADMIN_EMAILS` — comma-separated allowlist checked on every page/route
   - `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — a free "script" app from
     https://www.reddit.com/prefs/apps (discovery skips Reddit if unset)
4. `npm run dev` → http://localhost:3100 (sign in with an allowlisted email).

## Discovery flags

```
npm run discover                                    # all enabled sources
npm run discover -- --sources=reddit --subs=audiophile --limit=25   # smoke test
npm run discover -- --sources=head-fi,stereophile
```

CLI runs cache raw snippets under `scripts/discover/output/` (gitignored;
UI-triggered runs skip the dump); runs are tracked in `admin_scrape_runs` and
visible on `/runs`.

## Architecture notes

- **Code sharing:** `@/*` in `admin/tsconfig.json` points at `../web/*`, the same
  cross-package convention `web/` uses for the engine. Substantial logic is
  imported from `web/lib` (`scrape-shared`, `scrapeOne`, `validation`, `strings`);
  the tiny Next-coupled helpers (`supabase-*`, `rateLimit`) are **copied** into
  `admin/lib` so each app bundles its own `next`/`react` — importing web's copy
  would break Next's request-context storage.
- **server-only split:** discovery runs as plain `tsx` scripts and may only
  import `web/lib/scrape-shared` (deliberately server-only-free). Collection
  needs `web/lib/scrapeOne` (server-only via urlGuard) and therefore runs inside
  route handlers, one component per request; the browser drives the queue.
- **Auth:** Supabase email+password + `ADMIN_EMAILS` (password login, not
  magic-link — the admin box may not have inbox access; set/rotate the password
  with `auth.admin.updateUserById` via the service key). `proxy.ts` (Next 16 replaced
  `middleware.ts`) only redirects logged-out visitors; real authorization is
  `requireAdminPage()` / `requireAdminApi()` in every page and route handler.
- **Politeness:** all HTML fetching honors robots.txt (`isAllowedByRobots`) with
  the identifying PhonAudioBot UA; Reddit is sequential and well under rate
  limits; only aggregate counts + URLs are stored from community content.
