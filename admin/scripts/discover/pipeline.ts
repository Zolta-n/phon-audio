// Shared discovery pipeline: sources → LLM extraction → aggregation →
// catalog matching → upsert into discovered_brands / discovered_components.
// Called by both the CLI (scripts/discover/run.ts) and the admin UI
// (app/api/discover/route.ts). Progress is written to admin_scrape_runs
// (stats.stage + counters) so the UI can poll along.

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

import { HTML_SOURCES, REDDIT_SUBS, fetchHtmlSourceSnippets, type Snippet } from "./sources";
import { fetchSubredditSnippets } from "./reddit";
import { extractMentions } from "./extract";
import { aggregateMentions } from "./aggregate";
import { loadCatalog, matchAgainstCatalog } from "./match";
import type { DiscoveredBrandRow, DiscoveredComponentRow } from "../../lib/rows";

export const SOURCE_IDS = ["reddit", ...HTML_SOURCES.map((s) => s.id)];

export interface DiscoveryOptions {
  sources?: string[] | null;
  subs?: string[] | null;
  limit?: number | null;
  /** Directory to cache raw snippets in (CLI runs); omit to skip the dump. */
  snapshotDir?: string | null;
  log?: (msg: string) => void;
}

export interface DiscoveryStats {
  snippets: number;
  mentions: number;
  brands: number;
  components: number;
  newComponents: number;
}

async function gatherSnippets(
  sources: string[] | null | undefined,
  subs: string[] | null | undefined,
  limit: number | null | undefined,
  log: (msg: string) => void
): Promise<Snippet[]> {
  const wanted = (id: string) => !sources || sources.includes(id);
  const all: Snippet[] = [];

  if (wanted("reddit")) {
    if (process.env["REDDIT_CLIENT_ID"]) {
      for (const sub of subs ?? REDDIT_SUBS) {
        try {
          all.push(...(await fetchSubredditSnippets(sub, { postLimit: limit ?? 100, log })));
        } catch (e) {
          log(`  reddit r/${sub} failed: ${(e as Error).message}`);
        }
      }
    } else {
      log("  reddit: skipped (REDDIT_CLIENT_ID not set)");
    }
  }

  for (const source of HTML_SOURCES) {
    if (!source.enabled || !wanted(source.id)) continue;
    try {
      const snippets = await fetchHtmlSourceSnippets(source, { log });
      all.push(...(limit ? snippets.slice(0, limit * 3) : snippets));
    } catch (e) {
      log(`  ${source.id} failed: ${(e as Error).message}`);
    }
  }

  return all;
}

/** Read-merge-upsert: accumulate counts across runs, preserve admin decisions. */
async function upsertDiscovered(
  db: SupabaseClient,
  brands: ReturnType<typeof aggregateMentions>["brands"],
  components: ReturnType<typeof aggregateMentions>["components"],
  brandInCatalog: Map<string, boolean>,
  componentMatches: Map<string, string | null>
): Promise<{ newComponents: number }> {
  const now = new Date().toISOString();

  const { data: existingBrands } = await db
    .from("discovered_brands")
    .select("*")
    .in("id", brands.map((b) => b.id));
  const brandById = new Map((existingBrands as DiscoveredBrandRow[] | null)?.map((r) => [r.id, r]) ?? []);

  const brandRows = brands.map((b) => {
    const prev = brandById.get(b.id);
    const sourceCounts = { ...(prev?.source_counts ?? {}) };
    for (const [k, v] of Object.entries(b.sourceCounts)) {
      sourceCounts[k] = (sourceCounts[k] ?? 0) + v;
    }
    return {
      id: b.id,
      name: prev?.name ?? b.name,
      aliases: [...new Set([...(prev?.aliases ?? []), ...b.aliases])],
      mention_count: (prev?.mention_count ?? 0) + b.mentionCount,
      source_counts: sourceCounts,
      popularity: Number(prev?.popularity ?? 0) + b.popularity,
      in_catalog: brandInCatalog.get(b.id) ?? false,
      status: prev?.status ?? "discovered",
      last_seen: now,
    };
  });
  {
    const { error } = await db.from("discovered_brands").upsert(brandRows, { onConflict: "id" });
    if (error) throw new Error(`brand upsert failed: ${error.message}`);
  }

  const { data: existingComps } = await db
    .from("discovered_components")
    .select("*")
    .in("id", components.map((c) => c.id));
  const compById = new Map((existingComps as DiscoveredComponentRow[] | null)?.map((r) => [r.id, r]) ?? []);

  let newComponents = 0;
  const compRows = components.map((c) => {
    const prev = compById.get(c.id);
    if (!prev) newComponents++;
    const sourceCounts = { ...(prev?.source_counts ?? {}) };
    for (const [k, v] of Object.entries(c.sourceCounts)) {
      sourceCounts[k] = (sourceCounts[k] ?? 0) + v;
    }
    return {
      id: c.id,
      brand_id: c.brandId,
      name: prev?.name && prev.name.length >= c.name.length ? prev.name : c.name,
      category_guess: prev?.category_guess ?? c.categoryGuess,
      mention_count: (prev?.mention_count ?? 0) + c.mentionCount,
      source_counts: sourceCounts,
      popularity: Number(prev?.popularity ?? 0) + c.popularity,
      example_urls: [...new Set([...(prev?.example_urls ?? []), ...c.exampleUrls])].slice(0, 10),
      matched_component_id: componentMatches.get(c.id) ?? prev?.matched_component_id ?? null,
      // Never overwrite an admin decision (selected/rejected/…) with 'discovered'.
      status: prev?.status ?? "discovered",
    };
  });
  {
    const { error } = await db.from("discovered_components").upsert(compRows, { onConflict: "id" });
    if (error) throw new Error(`component upsert failed: ${error.message}`);
  }

  return { newComponents };
}

async function runPipeline(
  db: SupabaseClient,
  runId: string,
  { sources, subs, limit, snapshotDir, log = console.log }: DiscoveryOptions
): Promise<DiscoveryStats> {
  const updateRun = (patch: Record<string, unknown>) =>
    db.from("admin_scrape_runs").update(patch).eq("id", runId);

  try {
    log("\n[1/4] Gathering snippets…");
    const snippets = await gatherSnippets(sources, subs, limit, log);
    log(`  total: ${snippets.length} snippets`);
    await updateRun({ stats: { stage: "extracting", snippets: snippets.length } });

    // Cache raw snippets so extraction can be tweaked without re-fetching.
    if (snapshotDir) {
      try {
        await fs.mkdir(snapshotDir, { recursive: true });
        const dump = path.join(snapshotDir, `snippets-${runId}.json`);
        await fs.writeFile(dump, JSON.stringify(snippets, null, 2));
        log(`  raw snippets cached: ${dump}`);
      } catch (e) {
        log(`  snippet cache skipped: ${(e as Error).message}`);
      }
    }

    log("\n[2/4] Extracting brand/model mentions (LLM)…");
    const mentions = await extractMentions(snippets, { log });
    log(`  ${mentions.length} mentions`);
    await updateRun({
      stats: { stage: "matching", snippets: snippets.length, mentions: mentions.length },
    });

    log("\n[3/4] Aggregating + matching against catalog…");
    const { brands, components } = aggregateMentions(mentions);
    const catalog = await loadCatalog(db);
    const { brandInCatalog, componentMatches } = matchAgainstCatalog(catalog, brands, components);
    log(`  ${brands.length} brands, ${components.length} components (catalog: ${catalog.length})`);

    log("\n[4/4] Upserting discovered rows…");
    const { newComponents } = await upsertDiscovered(db, brands, components, brandInCatalog, componentMatches);

    const stats: DiscoveryStats = {
      snippets: snippets.length,
      mentions: mentions.length,
      brands: brands.length,
      components: components.length,
      newComponents,
    };
    await updateRun({ status: "succeeded", stats, finished_at: new Date().toISOString() });
    log(`\nDiscovery complete: ${JSON.stringify(stats)}`);
    return stats;
  } catch (e) {
    await updateRun({
      status: "failed",
      error: (e as Error).message,
      finished_at: new Date().toISOString(),
    });
    throw e;
  }
}

/**
 * Create the run row and kick off the pipeline. Returns immediately with the
 * run id; `done` settles when the pipeline finishes. The CLI awaits `done`;
 * the API route lets it run and has the UI poll admin_scrape_runs instead.
 * Failures are always recorded on the run row before `done` rejects.
 */
export async function startDiscovery(
  db: SupabaseClient,
  opts: DiscoveryOptions = {}
): Promise<{ runId: string; done: Promise<DiscoveryStats> }> {
  const params = {
    sources: opts.sources ?? "all",
    subs: opts.subs ?? REDDIT_SUBS,
    limit: opts.limit ?? null,
  };
  const { data: runRow, error: runErr } = await db
    .from("admin_scrape_runs")
    .insert({ kind: "discovery", params, stats: { stage: "gathering" } })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(`could not create run row: ${runErr?.message}`);
  const runId = runRow.id as string;
  (opts.log ?? console.log)(`Discovery run ${runId} started ${JSON.stringify(params)}`);

  return { runId, done: runPipeline(db, runId, opts) };
}
