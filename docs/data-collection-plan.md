# Plan: Improve spec collection quality, then add admin batch mining

## Context

phon.audio's compatibility engine only produces trustworthy answers when each component's `specs` are **complete** and **verified**. Manufacturer pages publish only 2-4 of the ~8-15 fields the port model (`src/types.ts`) needs per component, so the catalog is sparse. The repo already has a working end-to-end pipeline (admin app: Discovery → Selection → Collection → Staged review → Migration, with per-field provenance in `staged_components.field_meta` and a `verified` flag on the public `components` table). The gap is **sourcing depth and verification rigor**, not architecture.

This plan does two things, in order (quality first, then batch):

1. **Improve collection quality** on the single-collect path: better source targeting, PDF/graph/chipset extraction, richer confidence tiers, and a multi-source verify cross-check.
2. **Add an admin-only Batch mining tab** to the existing admin app that mines a whole brand+category slice (e.g. "Fezz tube amps", "KEF shelf speakers") in one operation.

Deferred for later (revisit based on effectiveness): direct manufacturer outreach, crowdsourcing/browser-extension, and data-licensing partnerships.

---

## Phase 1 — Collection quality (single-collect path)

All of this improves the logic currently inlined in `admin/app/api/collect/route.ts`, which drives `web/lib/scrapeOne.ts`. **First refactor**: extract the collect body (pick URL → `scrapeUrl`/`scrapeByQuery` → `enrichWithWebSearch` → `findMissingSpecs` → build `field_meta` → upsert `staged_components` → update run/status) into a shared server helper `collectOne(db, discoveredId, runId)` in `admin/lib/` (or `web/lib/`), so both the single-collect route and the later batch loop share one implementation. `scrapeOne.ts` functions already return a `UIComponent` in memory and do no DB writes, so they're cleanly reusable.

### 1. Source targeting (better than manufacturer pages)
In `web/lib/scrapeOne.ts` (`enrichWithWebSearch` / `findMissingSpecs`):
- Drive **site-scoped searches per missing field** against known bench-measurement sources instead of generic DuckDuckGo web search, which mostly returns retailer copy echoing the manufacturer. Maintain a per-category source list, e.g.:
  - amps/DACs/preamps: `audiosciencereview.com`, `stereophile.com` (Measurements sidebars), `audioholics.com`, `whathifi.com` lab reports, `erinsaudiocorner.com`
  - headphones: `squig.link` (Crinacle), `rtings.com`, `headphones.com`
  - speakers: `erinsaudiocorner.com`, `audioholics.com`, SoundStage!/NRC anechoic
  - phono cartridges: `vinylengine.com`
- Weight these as `confidence: "measured"` above manufacturer `"rated"` claims when reconciling.

### 2. PDF / manual mining
Add a step (in `enrichWithWebSearch`, gated by remaining missing fields) that searches `filetype:pdf <brand> <model> (service manual OR datasheet OR white paper)`, fetches the PDF (via the existing `safeFetch` SSRF guard + `isAllowedByRobots` in `web/lib/urlGuard.ts` / `scrape-shared.ts`), extracts text, and feeds it to the same Claude extraction call. Service manuals/white papers frequently list full electrical specs absent from the consumer page.

### 3. Graph digitization + chipset inference
- **Graph digitization**: frequency-response / impedance / THD are often only chart images. Add a vision-based extraction call (image → key values like min impedance, -3dB points) tagged with a new `"estimated_from_graph"` confidence tier.
- **Chipset inference**: `DacSection.chipset` is already captured. When a chipset is known (e.g. ES9038PRO, PCM5122), pull baseline THD+N / dynamic-range from the chip datasheet as a `"typical_for_chipset"` tier — clearly below product-specific measurement but better than null.

### 7. Confidence tiers + derived fields
- Extend the `field_meta` confidence enum (used in `admin/app/api/collect/route.ts` and shown in `StagedEditor.tsx`) with: `measured`, `rated` (existing), plus new `derived`, `estimated_from_graph`, `typical_for_chipset`, `estimated_typical`.
- **Derived fields**: where a missing field is computable from known fields using the engine's own physics already in `src/` (impedance bridging, gain math, dB/mW ↔ dB/V sensitivity conversion given impedance), compute and store it tagged `"derived"` instead of leaving it null. Reuse existing conversion helpers in `src/` rather than re-deriving.
- Never let an estimated/derived value overwrite a real sourced value.

### 8. Trust / verify layer
In `admin/app/api/migrate/route.ts` (the staged → `components` upsert that sets `verified`):
- **Multi-source cross-check**: require ≥2 independent `sources` agreeing within tolerance on high-impact fields (impedance, sensitivity) before a component may flip to `verified: true`; disagreement stays `verified: false` and is flagged for human review.
- **Source authority ranking**: formalize `measured > datasheet > retailer/manufacturer copy > forum` so the extraction agent and the reviewer UI apply the same weighting. Surface the winning source + confidence per field in `StagedEditor.tsx`.

**Critical files (Phase 1):** `web/lib/scrapeOne.ts`, `web/lib/scrape-shared.ts`, `web/lib/urlGuard.ts`, `admin/app/api/collect/route.ts` (refactor into new `collectOne` helper), `admin/app/api/migrate/route.ts`, `admin/app/staged/[id]/StagedEditor.tsx`, plus reuse of conversion utilities in `src/`.

---

## Phase 2 — Admin-only Batch mining tab

**Placement:** a new **"Batch" tab** in the existing admin app nav (`admin/app/layout.tsx`: Dashboard / Discovery / Collection / Staged / Runs / **Batch**). Reuses the app's per-route auth gating, Supabase service client, UI shell, and the downstream Staged → Review → Migrate flow. Admin-gated like every other page.

**What it does:** operator enters a **brand + category** (e.g. Fezz + `tube_amp_pp`, KEF + `speaker`) and optional model hints, then the feature:
1. **Enumerates models** for that brand+category via an LLM + web-search call (reuse the discovery extraction patterns in `admin/scripts/discover/extract.ts`), producing a candidate model list. Inserts them as `discovered_components` rows (status `selected`, `brand_id` + `category_guess` set) tagged to a batch run.
2. **Collects each** by calling the shared `collectOne(db, discoveredId, runId)` from Phase 1 — same scrape/enrich/stage logic, so all Phase 1 quality improvements apply automatically.
3. **Stages** every result with `staged_components.run_id` = the batch run id, so the whole batch is reviewable as a group in the existing `/staged` view.

**Run record:** reuse the existing `admin_scrape_runs` table (it already serves as a live-progress job record — discovery writes `stats.stage`+counters and the UI polls it). Store `params:{brand, category, hints}` and `stats:{total, done, staged, failed, currentItem}`. The `kind` CHECK constraint currently allows `discovery|collection|migration`; add `'batch'` to it (small `db/admin-schema.sql` migration) or reuse `'collection'`.

**Long-running work / timeout:** a batch of many items × ~60s each exceeds serverless `maxDuration=300`, and there is no durable queue/worker today. Use the **proven client-driven sequential pattern** already in `admin/app/collection/CollectionRunner.tsx`: the server route does the quick enumeration + run-row creation and returns the item list (`202 {runId, items}`); the Batch page then drives collection **one `POST /api/batch/collect` per item sequentially** in the browser, updating the run row and a progress bar as it goes. This sidesteps the timeout, matches an existing pattern, and lets the operator watch/cancel. (A durable background worker is a possible later upgrade but is out of scope here.)

**New/changed files (Phase 2):**
- `admin/app/batch/page.tsx` + `admin/app/batch/BatchRunner.tsx` (new page + client runner, modeled on `CollectionRunner.tsx`)
- `admin/app/api/batch/enumerate/route.ts` (brand+category → model list → `discovered_components` + run row)
- `admin/app/api/batch/collect/route.ts` (per-item collect via shared `collectOne`; or reuse `api/collect` if signature fits)
- `admin/app/layout.tsx` (add nav link)
- `db/admin-schema.sql` (add `'batch'` to `admin_scrape_runs.kind` CHECK)
- Guard every new route with `requireAdminApi()` and the page with `requireAdminPage()` (from `admin/lib/adminAuth.ts` — no middleware exists), and add a `rateLimit(...)` call like the other mutating routes.

---

## Verification

- **Phase 1 (single collect):** run the existing Collection flow (`admin` app → Collection tab, or `POST /api/collect`) on a component known to have sparse manufacturer specs but good ASR/Stereophile bench data (e.g. a Topping/SMSL DAC). Confirm previously-null fields now populate, `field_meta` shows the new confidence tiers and correct source URLs, derived fields compute correctly, and migration only flips `verified: true` when ≥2 sources agree. Add unit tests for the new derived-field/conversion logic and the source-authority ranking; run the repo's existing test suite.
- **Phase 2 (batch):** from the new Batch tab, run "Fezz" + tube amp and "KEF" + shelf speaker. Confirm: models enumerate, each collects and stages under one `run_id`, the run row progress updates live, the batch is reviewable as a group in `/staged`, and auth blocks a non-admin session on both the page and the API routes. Verify a mid-batch failure marks that item `failed` without aborting the rest.
- Throughout, confirm robots.txt/SSRF guards (`isAllowedByRobots`, `safeFetch`) still gate every new fetch (PDFs, images, site-scoped searches).
