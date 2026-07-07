// Normalize + score mentions into brand/component aggregates ready to upsert.

import { toKebabCase } from "../../../web/lib/strings";
import { MANUFACTURERS } from "../../../web/scripts/scrape/manufacturers";
import { SOURCE_WEIGHTS } from "./sources";
import type { Mention } from "./extract";
import type { ComponentCategory } from "../../../web/types";

export interface BrandAggregate {
  id: string;
  name: string;
  aliases: string[];
  mentionCount: number;
  sourceCounts: Record<string, number>;
  popularity: number;
}

export interface ComponentAggregate {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  categoryGuess: ComponentCategory | null;
  mentionCount: number;
  sourceCounts: Record<string, number>;
  popularity: number;
  exampleUrls: string[];
}

// Seed alias map from the batch-pipeline brand registry, so "Schiit" and
// "Schiit Audio" collapse onto one slug. Keyed by lowercase alias.
function buildAliasMap(): Map<string, { id: string; name: string }> {
  const map = new Map<string, { id: string; name: string }>();
  for (const mfr of MANUFACTURERS) {
    const entry = { id: mfr.id, name: mfr.name };
    map.set(mfr.id.toLowerCase(), entry);
    map.set(mfr.name.toLowerCase(), entry);
    // First word of a multi-word brand ("Schiit Audio" → "schiit")
    const first = mfr.name.split(/\s+/)[0]!.toLowerCase();
    if (first.length > 2) map.set(first, entry);
  }
  return map;
}

function canonicalBrand(raw: string, aliasMap: Map<string, { id: string; name: string }>) {
  const hit = aliasMap.get(raw.toLowerCase()) ?? aliasMap.get(toKebabCase(raw));
  if (hit) return hit;
  return { id: toKebabCase(raw), name: raw };
}

/** Normalize a model name for dedup: lowercase, strip punctuation/spacing noise. */
function modelKey(model: string): string {
  return model
    .toLowerCase()
    .replace(/\bplus\b/g, "+")
    .replace(/[^a-z0-9+]+/g, "");
}

function bump(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function weightOf(sourceId: string): number {
  return SOURCE_WEIGHTS[sourceId] ?? 1.0;
}

export function aggregateMentions(mentions: Mention[]): {
  brands: BrandAggregate[];
  components: ComponentAggregate[];
} {
  const aliasMap = buildAliasMap();
  const brands = new Map<string, BrandAggregate>();
  const components = new Map<string, ComponentAggregate>();

  for (const m of mentions) {
    if (!m.brand || m.brand.length < 2) continue;
    const brand = canonicalBrand(m.brand, aliasMap);

    let b = brands.get(brand.id);
    if (!b) {
      b = { id: brand.id, name: brand.name, aliases: [], mentionCount: 0, sourceCounts: {}, popularity: 0 };
      brands.set(brand.id, b);
    }
    b.mentionCount++;
    bump(b.sourceCounts, m.sourceId);
    b.popularity += weightOf(m.sourceId);
    if (!b.aliases.includes(m.brand) && m.brand !== b.name) b.aliases.push(m.brand);

    if (!m.model) continue;
    const key = `${brand.id}::${modelKey(m.model)}`;
    let c = components.get(key);
    if (!c) {
      c = {
        id: toKebabCase(`${brand.id} ${m.model}`),
        brandId: brand.id,
        brandName: brand.name,
        name: m.model,
        categoryGuess: null,
        mentionCount: 0,
        sourceCounts: {},
        popularity: 0,
        exampleUrls: [],
      };
      components.set(key, c);
    }
    c.mentionCount++;
    bump(c.sourceCounts, m.sourceId);
    c.popularity += weightOf(m.sourceId);
    // Keep the most informative display name (longest variant).
    if (m.model.length > c.name.length) c.name = m.model;
    if (m.category) c.categoryGuess = m.category; // last non-null wins; ties are rare
    if (c.exampleUrls.length < 10 && !c.exampleUrls.includes(m.url)) {
      c.exampleUrls.push(m.url);
    }
  }

  return {
    brands: [...brands.values()].sort((a, b) => b.popularity - a.popularity),
    components: [...components.values()].sort((a, b) => b.popularity - a.popularity),
  };
}
