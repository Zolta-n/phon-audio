import "server-only";
import { toKebabCase } from "@/lib/strings";
import {
  scrapeUrl,
  scrapeByQuery,
  enrichWithWebSearch,
  findMissingSpecs,
  type EnrichProvenance,
} from "@/lib/scrapeOne";
import { deriveSpecs } from "@/lib/deriveSpecs";
import { confidenceForUrl } from "@/lib/sources";
import type { UIComponent } from "@/types";
import type { createServiceClient } from "./supabase-admin";
import type { DiscoveredComponentRow, FieldMeta } from "./rows";

type Db = ReturnType<typeof createServiceClient>;

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
function specFieldPaths(component: UIComponent): Set<string> {
  const paths = new Set<string>();
  const walk = (ports: UIComponent["inputs"], portType: "inputs" | "outputs") => {
    ports.forEach((port, index) => {
      for (const [field, value] of Object.entries(port.specs ?? {})) {
        if (field !== "kind" && value != null) {
          paths.add(`${portType}.${index}.${field}`);
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

export interface CollectResult {
  stagedId: string;
  missingFields: number;
  sources: number;
}

/**
 * Collect one discovered component into `staged_components`: base extraction
 * (manufacturer page or web search) → web-search enrichment with per-field
 * provenance → physics-derived fills → build field_meta → upsert staged row.
 *
 * Shared by the single-collect route and the batch runner. Owns the per-item
 * discovered-status transitions (collecting → staged, rollback to selected on
 * error) but NOT the `admin_scrape_runs` lifecycle — the caller creates/finishes
 * the run row and passes its id to stamp on the staged row. Throws on failure.
 */
export async function collectOne(db: Db, discoveredId: string, runId?: string): Promise<CollectResult> {
  const { data: rowData, error: rowError } = await db
    .from("discovered_components")
    .select("*")
    .eq("id", discoveredId)
    .single();
  if (rowError || !rowData) {
    throw new Error("Discovered component not found");
  }
  const row = rowData as DiscoveredComponentRow;
  if (!["selected", "collecting", "staged"].includes(row.status)) {
    throw new Error(`Cannot collect an item with status '${row.status}'`);
  }

  const { data: brandRow } = row.brand_id
    ? await db.from("discovered_brands").select("name").eq("id", row.brand_id).single()
    : { data: null };
  const brandName = (brandRow?.name as string | undefined) ?? row.brand_id ?? "";

  await db.from("discovered_components").update({ status: "collecting" }).eq("id", row.id);

  try {
    // 1. Base extraction: manufacturer page if one was discovered, else web search.
    const productUrl = findManufacturerUrl(row, brandName);
    const base = productUrl ? await scrapeUrl(productUrl) : await scrapeByQuery(brandName, row.name);

    const baseSource = productUrl ?? "web-search";
    const fieldMeta: Record<string, FieldMeta> = {};
    for (const path of specFieldPaths(base)) {
      fieldMeta[path] = { source: baseSource, confidence: "rated", status: "filled" };
    }

    // 2. Fill remaining nulls from reviews/measurements. Provenance tells us the
    //    source per field (→ measured vs inferred) and cross-check agreement.
    const provenance: EnrichProvenance = {};
    const enriched = await enrichWithWebSearch(base, { provenance });
    const enrichSources = urlsFromNote(enriched.note).filter((u) => u !== productUrl);
    for (const path of specFieldPaths(enriched)) {
      if (!fieldMeta[path]) {
        const prov = provenance[path];
        const source = prov?.source ?? enrichSources[0];
        fieldMeta[path] = {
          source,
          confidence: confidenceForUrl(source),
          status: "verify",
          corroborated: (prov?.agreedSources ?? 1) >= 2,
        };
      }
    }

    // 3. Derive still-null fields from other known fields on the same port.
    for (const d of deriveSpecs(enriched)) {
      const port = (d.portType === "inputs" ? enriched.inputs : enriched.outputs)[d.index];
      const specs = port?.specs as Record<string, unknown> | undefined;
      if (specs && specs[d.field] == null) {
        specs[d.field] = d.value;
        fieldMeta[`${d.portType}.${d.index}.${d.field}`] = {
          source: `derived: ${d.basis}`,
          confidence: "derived",
          status: "verify",
        };
      }
    }

    // 4. Whatever is still null gets flagged for the review UI.
    const missing = findMissingSpecs(enriched);

    const stagedId = enriched.id || toKebabCase(`${brandName} ${row.name}`);
    // Sources = every http provenance URL, plus any URLs the extractor recorded
    // in the note (covers the web-search base path, whose base source is a
    // "web-search" sentinel rather than a URL).
    const sources = [
      ...new Set([
        ...Object.values(fieldMeta)
          .map((m) => m.source)
          .filter((s): s is string => !!s && s.startsWith("http")),
        ...urlsFromNote(enriched.note),
      ]),
    ];

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

    const { error: upsertError } = await db.from("staged_components").upsert(stagedRow, { onConflict: "id" });
    if (upsertError) throw new Error(`staging upsert failed: ${upsertError.message}`);

    await db.from("discovered_components").update({ status: "staged" }).eq("id", row.id);

    return { stagedId, missingFields: missing.length, sources: sources.length };
  } catch (e) {
    // Roll back to selected so the item can be retried.
    await db.from("discovered_components").update({ status: "selected" }).eq("id", row.id);
    throw e;
  }
}
