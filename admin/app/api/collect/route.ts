import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { toKebabCase } from "@/lib/strings";
import { scrapeUrl, scrapeByQuery, enrichWithWebSearch, findMissingSpecs } from "@/lib/scrapeOne";
import type { UIComponent } from "@/types";
import { requireAdminApi } from "../../../lib/adminAuth";
import { createServiceClient } from "../../../lib/supabase-admin";
import { rateLimit } from "../../../lib/rateLimit";
import type { DiscoveredComponentRow, FieldMeta } from "../../../lib/rows";

// One component per request (~30–90 s): the UI drives the queue sequentially.
export const maxDuration = 300;

const collectBodySchema = z.object({
  discoveredId: z.string().max(200),
});

/** Domains that are community/review sites, never manufacturer product pages. */
const COMMUNITY_HOSTS =
  /\b(reddit|head-fi|audiosciencereview|stevehoffman|stereophile|whathifi|darko|youtube|audiogon)\b/i;

function findManufacturerUrl(row: DiscoveredComponentRow, brandName: string): string | null {
  const brandToken = toKebabCase(brandName.split(/\s+/)[0] ?? "");
  if (brandToken.length < 3) return null;
  for (const url of row.example_urls) {
    try {
      const host = new URL(url).hostname;
      if (!COMMUNITY_HOSTS.test(host) && host.replace(/[^a-z0-9]/g, "").includes(brandToken.replace(/-/g, ""))) {
        return url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** field_meta entries for every populated spec field of every port. */
function specFieldPaths(component: UIComponent): Map<string, unknown> {
  const paths = new Map<string, unknown>();
  const walk = (ports: UIComponent["inputs"], portType: "inputs" | "outputs") => {
    ports.forEach((port, index) => {
      for (const [field, value] of Object.entries(port.specs ?? {})) {
        if (field !== "kind" && value != null) {
          paths.set(`${portType}.${index}.${field}`, value);
        }
      }
    });
  };
  walk(component.inputs ?? [], "inputs");
  walk(component.outputs ?? [], "outputs");
  return paths;
}

function urlsFromNote(note: string | undefined): string[] {
  if (!note) return [];
  return [...note.matchAll(/https?:\/\/[^\s,)]+/g)].map((m) => m[0]);
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!rateLimit(`collect:${user.id}`, 30, 5 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, collectBodySchema);
  if (error) return error;

  const db = createServiceClient();
  const { data: rowData, error: rowError } = await db
    .from("discovered_components")
    .select("*")
    .eq("id", data.discoveredId)
    .single();
  if (rowError || !rowData) {
    return Response.json({ error: "Discovered component not found" }, { status: 404 });
  }
  const row = rowData as DiscoveredComponentRow;
  if (!["selected", "collecting", "staged"].includes(row.status)) {
    return Response.json({ error: `Cannot collect an item with status '${row.status}'` }, { status: 409 });
  }

  const { data: brandRow } = row.brand_id
    ? await db.from("discovered_brands").select("name").eq("id", row.brand_id).single()
    : { data: null };
  const brandName = (brandRow?.name as string | undefined) ?? row.brand_id ?? "";

  await db.from("discovered_components").update({ status: "collecting" }).eq("id", row.id);

  const { data: runRow } = await db
    .from("admin_scrape_runs")
    .insert({ kind: "collection", params: { discoveredId: row.id } })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  try {
    // 1. Base extraction: manufacturer page if one was discovered, else web search.
    const productUrl = findManufacturerUrl(row, brandName);
    const base = productUrl
      ? await scrapeUrl(productUrl)
      : await scrapeByQuery(brandName, row.name);

    const baseSource = productUrl ?? "web-search";
    const fieldMeta: Record<string, FieldMeta> = {};
    for (const path of specFieldPaths(base).keys()) {
      fieldMeta[path] = { source: baseSource, confidence: "rated", status: "filled" };
    }

    // 2. Fill remaining nulls from reviews/measurements — these need human eyes.
    const enriched = await enrichWithWebSearch(base);
    const enrichSources = urlsFromNote(enriched.note).filter((u) => u !== productUrl);
    for (const path of specFieldPaths(enriched).keys()) {
      if (!fieldMeta[path]) {
        fieldMeta[path] = { source: enrichSources[0], confidence: "inferred", status: "verify" };
      }
    }

    // 3. Whatever is still null gets flagged for the review UI.
    const missing = findMissingSpecs(enriched);

    const stagedId = enriched.id || toKebabCase(`${brandName} ${row.name}`);
    const sources = [...new Set([baseSource, ...enrichSources].filter((s) => s !== "web-search"))];

    const stagedRow = {
      id: stagedId,
      discovered_id: row.id,
      name: enriched.name || row.name,
      category: enriched.category ?? row.category_guess ?? "source",
      manufacturer: enriched.manufacturer ?? brandName ?? null,
      specs: { inputs: enriched.inputs, outputs: enriched.outputs, ...(enriched.dac ? { dac: enriched.dac } : {}) },
      notes: enriched.note ?? null,
      field_meta: fieldMeta,
      missing_fields: missing,
      sources,
      review_status: "pending",
      run_id: runId ?? null,
    };

    const { error: upsertError } = await db
      .from("staged_components")
      .upsert(stagedRow, { onConflict: "id" });
    if (upsertError) throw new Error(`staging upsert failed: ${upsertError.message}`);

    await db.from("discovered_components").update({ status: "staged" }).eq("id", row.id);
    if (runId) {
      await db
        .from("admin_scrape_runs")
        .update({
          status: "succeeded",
          stats: { stagedId, missingFields: missing.length, sources: sources.length },
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return Response.json({ stagedId, missingFields: missing.length });
  } catch (e) {
    const message = (e as Error).message;
    // Roll back to selected so the item can be retried.
    await db.from("discovered_components").update({ status: "selected" }).eq("id", row.id);
    if (runId) {
      await db
        .from("admin_scrape_runs")
        .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
