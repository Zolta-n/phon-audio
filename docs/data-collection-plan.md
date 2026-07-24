# Plan: Improve spec collection quality, then add admin batch mining

## Context

phon.audio's compatibility engine only produces trustworthy answers when each component's `specs` are **complete** and **verified**. Manufacturer pages publish only 2-4 of the ~8-15 fields the port model (`src/types.ts`) needs per component, so the catalog is sparse. The repo already has a working end-to-end pipeline (admin app: Discovery → Selection → Collection → Staged review → Migration, with per-field provenance in `staged_components.field_meta` and a `verified` flag on the public `components` table). The gap is **sourcing depth and verification rigor**, not architecture.

This plan does two things, in order (quality first, then batch):

1. **Improve collection quality** on the single-collect path, split into:
   - **Phase 1a** (ship first): shared `collectOne` refactor, site-scoped bench-source targeting, richer confidence tiers, derived fields, and a multi-source cross-check.
   - **Phase 1b** (after 1a is validated): PDF/manual mining and graph digitization + chipset inference — heavier, no existing scaffolding (current fetch path is HTML-only).
2. **Add an admin-only Batch mining tab** to the existing admin app that mines a whole brand+category slice (e.g. "Fezz tube amps", "KEF shelf speakers") in one operation.

Deferred for later (revisit based on effectiveness): direct manufacturer outreach, crowdsourcing/browser-extension, and data-licensing partnerships.

---

## Phase 1a — Collection quality: refactor, sourcing, tiers, verify (ship first)

All of this improves the logic currently inlined in `admin/app/api/collect/route.ts`, which drives `web/lib/scrapeOne.ts`. **First refactor**: extract the collect body (pick URL → `scrapeUrl`/`scrapeByQuery` → `enrichWithWebSearch` → `findMissingSpecs` → build `field_meta` → upsert `staged_components` → update run/status) into a shared server helper `collectOne(db, discoveredId, runId)` in `admin/lib/` (or `web/lib/`), so both the single-collect route and the later batch loop share one implementation. `scrapeOne.ts` functions already return a `UIComponent` in memory and do no DB writes, so they're cleanly reusable.

> **Sequencing note:** §1 (site-scoped bench-source search) must land before §2 (confidence tiers) and §3 (verify layer) have anything to weight — the `measured` tier and source-authority ranking are meaningless until bench sources actually populate `measured` data.

### 1. Source targeting (better than manufacturer pages)
In `web/lib/scrapeOne.ts` (`enrichWithWebSearch` / `findMissingSpecs`):
- Drive **site-scoped searches per missing field** against known bench-measurement sources instead of generic DuckDuckGo web search, which mostly returns retailer copy echoing the manufacturer. Maintain a per-category source list, e.g.:
  - amps/DACs/preamps: `audiosciencereview.com`, `stereophile.com` (Measurements sidebars), `audioholics.com`, `whathifi.com` lab reports, `erinsaudiocorner.com`
  - headphones: `squig.link` (Crinacle), `rtings.com`, `headphones.com`
  - speakers: `erinsaudiocorner.com`, `audioholics.com`, SoundStage!/NRC anechoic
  - phono cartridges: `vinylengine.com`
- Weight these as `confidence: "measured"` above manufacturer `"rated"` claims when reconciling.

### 2. Confidence tiers + derived fields
- **Reconcile with the existing enum first.** The `field_meta` confidence enum already defined in `admin/lib/rows.ts` is `measured | rated | inferred` — `measured` is defined but currently *unused* (collect only ever writes `rated` and `inferred`). So this is an *extension of an existing enum*, not a fresh one. Decide the fate of `inferred`: either **rename it to `derived`** (and migrate existing `staged_components.field_meta` rows) or keep both with a documented distinction. Then add the remaining new tiers: `estimated_typical` (and, once Phase 1b lands, `estimated_from_graph` and `typical_for_chipset`).
- **Derived fields**: where a missing field is computable from known fields using the engine's own physics already in `src/` (impedance bridging, gain math, dB/mW ↔ dB/V sensitivity conversion given impedance), compute and store it tagged `"derived"` instead of leaving it null. Reuse existing conversion helpers in `src/units.ts` (`dbPerVFromDbPerMw`, `dbPerMwFromDbPerV`, `sensitivityDbPer1W`, `ampPowerAtImpedance`) rather than re-deriving.
- Never let an estimated/derived value overwrite a real sourced value.

### 3. Trust / verify layer
> **Design decision — `verified` semantics.** Today **nothing in the codebase sets `verified: true`**: `admin/app/api/migrate/route.ts:63` hardcodes `verified: false` and `db/schema.sql:16` comments it as a *human-reviewed* flag. Do **not** repurpose `verified` to mean "≥2 scrapers agreed" — that silently redefines a human-review signal as an automated one. Instead:
> - Keep `verified` = **human-reviewed** (flipped by a human in the reviewer UI / dashboard, not by migration).
> - Add a **separate** auto-corroboration signal for the ≥2-source cross-check — either a per-field flag inside `field_meta` (e.g. `corroborated: true`) or a new column (e.g. `components.auto_corroborated boolean`). The reviewer UI surfaces this so a human can promote it to `verified` quickly.

- **Multi-source cross-check**: require ≥2 independent `sources` agreeing within tolerance on high-impact fields (impedance, sensitivity); record agreement in the auto-corroboration signal above (not in `verified`). Disagreement is flagged for human review.
- **Source authority ranking**: formalize `measured > datasheet > retailer/manufacturer copy > forum` so the extraction agent and the reviewer UI apply the same weighting. Surface the winning source + confidence per field in `StagedEditor.tsx`.
- Add a `rateLimit(...)` call to `migrate/route.ts` if you extend it — it is currently the one mutating admin route *without* rate limiting (collect/discover already have it).

**Critical files (Phase 1a):** `web/lib/scrapeOne.ts`, `web/lib/scrape-shared.ts`, `web/lib/urlGuard.ts`, `admin/app/api/collect/route.ts` (refactor into new `collectOne` helper), `admin/lib/rows.ts` (confidence enum), `admin/app/api/migrate/route.ts`, `admin/app/staged/[id]/StagedEditor.tsx`, plus reuse of conversion utilities in `src/units.ts`.

---

## Phase 1b — PDF/manual mining + graph digitization (after 1a is validated)

These add fetch/extraction paths that **do not exist today** (current `safeFetch` usage is HTML-only; there is no PDF-text or image-extraction path), so they are deliberately deferred until Phase 1a is proven.

### 1. PDF / manual mining
Add a step (in `enrichWithWebSearch`, gated by remaining missing fields) that searches `filetype:pdf <brand> <model> (service manual OR datasheet OR white paper)`, fetches the PDF (via the existing `safeFetch` SSRF guard in `web/lib/urlGuard.ts` + `isAllowedByRobots` in `web/lib/scrape-shared.ts`), extracts text, and feeds it to the same Claude extraction call. Service manuals/white papers frequently list full electrical specs absent from the consumer page.

### 2. Graph digitization + chipset inference
- **Graph digitization**: frequency-response / impedance / THD are often only chart images. Add a vision-based extraction call (image → key values like min impedance, -3dB points) tagged with a new `"estimated_from_graph"` confidence tier.
- **Chipset inference**: `DacSection.chipset` is already captured. When a chipset is known (e.g. ES9038PRO, PCM5122), pull baseline THD+N / dynamic-range from the chip datasheet as a `"typical_for_chipset"` tier — clearly below product-specific measurement but better than null.

**Critical files (Phase 1b):** `web/lib/scrapeOne.ts`, `web/lib/scrape-shared.ts`, `web/lib/urlGuard.ts`, `admin/lib/rows.ts` (add `estimated_from_graph`, `typical_for_chipset` tiers).

---

## Phase 2 — Admin-only Batch mining tab

**Placement:** a new **"Batch" tab** in the existing admin app nav (`admin/app/layout.tsx`: Dashboard / Discovery / Collection / Staged / Runs / **Batch**). Reuses the app's per-route auth gating, Supabase service client, UI shell, and the downstream Staged → Review → Migrate flow. Admin-gated like every other page.

**What it does:** operator enters a **brand + category** (e.g. Fezz + `tube_amp_pp`, KEF + `speaker`) and optional model hints, then the feature:
1. **Enumerates models** for that brand+category via an LLM + web-search call (reuse the discovery extraction patterns in `admin/scripts/discover/extract.ts`), producing a candidate model list. **Hallucination guard (required):** an LLM asked to "list all models for a brand" will invent nonexistent ones. Before inserting, **dedup against existing `discovered_components`** (skip models already known) and present the enumerated list to the operator for a **confirm-before-collect** step — do not auto-collect straight from LLM output. Only confirmed rows are inserted as `discovered_components` (status `selected`, `brand_id` + `category_guess` set) tagged to a batch run.
2. **Collects each** confirmed model by calling the shared `collectOne(db, discoveredId, runId)` from Phase 1a — same scrape/enrich/stage logic, so all Phase 1 quality improvements apply automatically.
3. **Stages** every result with `staged_components.run_id` = the batch run id, so the whole batch is reviewable as a group in the existing `/staged` view.

**Run record:** reuse the existing `admin_scrape_runs` table (it already serves as a live-progress job record — discovery writes `stats.stage`+counters and the UI polls it). Store `params:{brand, category, hints}` and `stats:{total, done, staged, failed, currentItem}`. The `kind` CHECK constraint currently allows `discovery|collection|migration`; add `'batch'` to it (small `db/admin-schema.sql` migration) or reuse `'collection'`.

**Cost / scope cap:** a batch is `N items × per-item scrape` (× vision/PDF fetches once Phase 1b lands) — unbounded token/time spend. Enforce a **max-items-per-run cap** and surface the estimated item count to the operator on the confirm step (above) before the run starts, so a runaway enumeration can't kick off hundreds of collects.

**Long-running work / timeout:** a batch of many items × ~60s each exceeds serverless `maxDuration=300`, and there is no durable queue/worker today. Use the **proven client-driven sequential pattern** already in `admin/app/collection/CollectionRunner.tsx`: the server route does the quick enumeration + run-row creation and returns the item list (`202 {runId, items}`); the Batch page then drives collection **one `POST /api/batch/collect` per item sequentially** in the browser, updating the run row and a progress bar as it goes. This sidesteps the timeout, matches an existing pattern, and lets the operator watch/cancel. (A durable background worker is a possible later upgrade but is out of scope here.)

**New/changed files (Phase 2):**
- `admin/app/batch/page.tsx` + `admin/app/batch/BatchRunner.tsx` (new page + client runner, modeled on `CollectionRunner.tsx`)
- `admin/app/api/batch/enumerate/route.ts` (brand+category → model list → `discovered_components` + run row)
- `admin/app/api/batch/collect/route.ts` (per-item collect via shared `collectOne` from Phase 1a; or reuse `api/collect` if signature fits)
- `admin/app/layout.tsx` (add nav link)
- `db/admin-schema.sql` (add `'batch'` to `admin_scrape_runs.kind` CHECK)
- Guard every new route with `requireAdminApi()` and the page with `requireAdminPage()` (from `admin/lib/adminAuth.ts` — no middleware exists), and add a `rateLimit(...)` call like the other mutating routes.

---

## Verification

- **Phase 1a (single collect):** run the existing Collection flow (`admin` app → Collection tab, or `POST /api/collect`) on a component known to have sparse manufacturer specs but good ASR/Stereophile bench data (e.g. a Topping/SMSL DAC). Confirm previously-null fields now populate, `field_meta` shows the new confidence tiers and correct source URLs, derived fields compute correctly via `src/units.ts`, and the ≥2-source cross-check records the auto-corroboration signal (while `verified` stays a human-only flag). Add unit tests for the new derived-field/conversion logic and the source-authority ranking; run the repo's existing test suite.
- **Phase 1b (PDF/graph):** on a component whose specs live in a service-manual PDF or chart image, confirm the PDF/vision path extracts values tagged `estimated_from_graph` / `typical_for_chipset`, and that robots/SSRF guards gate the new fetches.
- **Phase 2 (batch):** from the new Batch tab, run "Fezz" + tube amp and "KEF" + shelf speaker. Confirm: models enumerate, the operator confirm-before-collect step appears with an estimated count and dedups against existing `discovered_components`, the max-items cap holds, each confirmed model collects and stages under one `run_id`, the run row progress updates live, the batch is reviewable as a group in `/staged`, and auth blocks a non-admin session on both the page and the API routes. Verify a mid-batch failure marks that item `failed` without aborting the rest.
- Throughout, confirm robots.txt/SSRF guards (`isAllowedByRobots`, `safeFetch`) still gate every new fetch (PDFs, images, site-scoped searches).
