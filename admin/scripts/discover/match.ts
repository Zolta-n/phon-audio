// Mark discovered brands/components that already exist in the app catalog.
// In-JS trigram similarity over the (small) components table — no RPC needed
// at MVP scale.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BrandAggregate, ComponentAggregate } from "./aggregate";

export interface CatalogRow {
  id: string;
  name: string;
  manufacturer: string | null;
}

function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase().replace(/[^a-z0-9 ]+/g, "")} `;
  const grams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) grams.add(padded.slice(i, i + 3));
  return grams;
}

/** pg_trgm-style similarity: |intersection| / |union|. */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const g of ta) if (tb.has(g)) shared++;
  return shared / (ta.size + tb.size - shared);
}

const MATCH_THRESHOLD = 0.55;

export async function loadCatalog(db: SupabaseClient): Promise<CatalogRow[]> {
  const { data, error } = await db
    .from("components")
    .select("id, name, manufacturer");
  if (error) throw new Error(`Failed to load components catalog: ${error.message}`);
  return (data ?? []) as CatalogRow[];
}

function brandMatches(catalogMfr: string | null, brand: BrandAggregate): boolean {
  if (!catalogMfr) return false;
  const mfr = catalogMfr.toLowerCase();
  if (mfr === brand.name.toLowerCase() || mfr === brand.id) return true;
  if (brand.aliases.some((a) => a.toLowerCase() === mfr)) return true;
  // "Schiit" vs "Schiit Audio": one contains the other's first word
  const brandFirst = brand.name.split(/\s+/)[0]!.toLowerCase();
  const mfrFirst = mfr.split(/\s+/)[0]!;
  return brandFirst.length > 2 && brandFirst === mfrFirst;
}

/** in_catalog per brand + matched_component_id per component (null = new). */
export function matchAgainstCatalog(
  catalog: CatalogRow[],
  brands: BrandAggregate[],
  components: ComponentAggregate[]
): {
  brandInCatalog: Map<string, boolean>;
  componentMatches: Map<string, string | null>; // aggregate id → components.id
} {
  const brandById = new Map(brands.map((b) => [b.id, b]));
  const brandInCatalog = new Map<string, boolean>();
  const catalogByBrand = new Map<string, CatalogRow[]>();

  for (const brand of brands) {
    const rows = catalog.filter((row) => brandMatches(row.manufacturer, brand));
    catalogByBrand.set(brand.id, rows);
    brandInCatalog.set(brand.id, rows.length > 0);
  }

  const componentMatches = new Map<string, string | null>();
  for (const comp of components) {
    const brand = brandById.get(comp.brandId);
    const candidates = brand ? (catalogByBrand.get(brand.id) ?? []) : [];
    let best: { id: string; score: number } | null = null;
    for (const row of candidates) {
      // Compare against the catalog name with and without the brand prefix.
      const bare = row.name.replace(new RegExp(`^${comp.brandName}\\s+`, "i"), "");
      const score = Math.max(
        trigramSimilarity(comp.name, row.name),
        trigramSimilarity(comp.name, bare),
        trigramSimilarity(`${comp.brandName} ${comp.name}`, row.name)
      );
      if (score > MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { id: row.id, score };
      }
    }
    componentMatches.set(comp.id, best?.id ?? null);
  }

  return { brandInCatalog, componentMatches };
}
