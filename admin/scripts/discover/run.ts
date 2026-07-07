#!/usr/bin/env tsx
// Discovery orchestrator: sources → LLM extraction → aggregation → catalog
// matching → upsert into discovered_brands / discovered_components.
//
//   npm run discover                                   # all enabled sources
//   npm run discover -- --sources=reddit --subs=audiophile --limit=25
//   npm run discover -- --sources=head-fi,stereophile
//
// Runs under plain tsx with the service-role key; progress is logged to the
// admin_scrape_runs table so the UI can follow along.

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });

import { HTML_SOURCES, REDDIT_SUBS, fetchHtmlSourceSnippets, type Snippet } from "./sources";
import { fetchSubredditSnippets } from "./reddit";
import { extractMentions } from "./extract";
import { aggregateMentions } from "./aggregate";
import { loadCatalog, matchAgainstCatalog } from "./match";
import type { DiscoveredBrandRow, DiscoveredComponentRow } from "../../lib/rows";

const db = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_KEY"]!, // service role bypasses RLS
);

const OUTPUT_DIR = path.resolve(import.meta.dirname, "output");

function parseFlags(): { sources: string[] | null; subs: string[] | null; limit: number | null } {
  const flags: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) flags[m[1]!] = m[2]!;
  }
  return {
    sources: flags["sources"] ? flags["sources"].split(",").map((s) => s.trim()) : null,
    subs: flags["subs"] ? flags["subs"].split(",").map((s) => s.trim()) : null,
    limit: flags["limit"] ? parseInt(flags["limit"], 10) : null,
  };
}

async function updateRun(runId: string, patch: Record<string, unknown>) {
  await db.from("admin_scrape_runs").update(patch).eq("id", runId);
}

async function gatherSnippets(
  sources: string[] | null,
  subs: string[] | null,
  limit: number | null
): Promise<Snippet[]> {
  const wanted = (id: string) => !sources || sources.includes(id);
  const all: Snippet[] = [];

  if (wanted("reddit")) {
    if (process.env["REDDIT_CLIENT_ID"]) {
      for (const sub of subs ?? REDDIT_SUBS) {
        try {
          all.push(...(await fetchSubredditSnippets(sub, { postLimit: limit ?? 100 })));
        } catch (e) {
          console.error(`  reddit r/${sub} failed: ${(e as Error).message}`);
        }
      }
    } else {
      console.log("  reddit: skipped (REDDIT_CLIENT_ID not set)");
    }
  }

  for (const source of HTML_SOURCES) {
    if (!source.enabled || !wanted(source.id)) continue;
    try {
      const snippets = await fetchHtmlSourceSnippets(source);
      all.push(...(limit ? snippets.slice(0, limit * 3) : snippets));
    } catch (e) {
      console.error(`  ${source.id} failed: ${(e as Error).message}`);
    }
  }

  return all;
}

/** Read-merge-upsert: accumulate counts across runs, preserve admin decisions. */
async function upsertDiscovered(
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

async function main() {
  const { sources, subs, limit } = parseFlags();
  const params = { sources: sources ?? "all", subs: subs ?? REDDIT_SUBS, limit };

  const { data: runRow, error: runErr } = await db
    .from("admin_scrape_runs")
    .insert({ kind: "discovery", params })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(`could not create run row: ${runErr?.message}`);
  const runId = runRow.id as string;
  console.log(`Discovery run ${runId} started`, params);

  try {
    console.log("\n[1/4] Gathering snippets…");
    const snippets = await gatherSnippets(sources, subs, limit);
    console.log(`  total: ${snippets.length} snippets`);
    await updateRun(runId, { stats: { snippets: snippets.length } });

    // Cache raw snippets so extraction can be tweaked without re-fetching.
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    const dump = path.join(OUTPUT_DIR, `snippets-${runId}.json`);
    await fs.writeFile(dump, JSON.stringify(snippets, null, 2));
    console.log(`  raw snippets cached: ${dump}`);

    console.log("\n[2/4] Extracting brand/model mentions (LLM)…");
    const mentions = await extractMentions(snippets);
    console.log(`  ${mentions.length} mentions`);
    await updateRun(runId, { stats: { snippets: snippets.length, mentions: mentions.length } });

    console.log("\n[3/4] Aggregating + matching against catalog…");
    const { brands, components } = aggregateMentions(mentions);
    const catalog = await loadCatalog(db);
    const { brandInCatalog, componentMatches } = matchAgainstCatalog(catalog, brands, components);
    console.log(`  ${brands.length} brands, ${components.length} components (catalog: ${catalog.length})`);

    console.log("\n[4/4] Upserting discovered rows…");
    const { newComponents } = await upsertDiscovered(brands, components, brandInCatalog, componentMatches);

    const stats = {
      snippets: snippets.length,
      mentions: mentions.length,
      brands: brands.length,
      components: components.length,
      newComponents,
    };
    await updateRun(runId, { status: "succeeded", stats, finished_at: new Date().toISOString() });
    console.log("\nDiscovery complete:", stats);
  } catch (e) {
    await updateRun(runId, {
      status: "failed",
      error: (e as Error).message,
      finished_at: new Date().toISOString(),
    });
    throw e;
  }
}

main().catch((e) => {
  console.error("\nDiscovery failed:", e);
  process.exit(1);
});
