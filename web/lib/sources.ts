// Source targeting + authority ranking for spec collection.
//
// Manufacturer pages publish only a fraction of the fields the port model needs,
// and generic web search mostly returns retailer copy echoing those same rated
// numbers. This module drives *site-scoped* searches against known
// bench-measurement sources per category, and gives the extraction/verify layer
// a single, shared notion of how much to trust a given host.
//
// Pure module (no I/O, no Next deps) so it is unit-testable from the root runner.

import type { ComponentCategory } from "../types";

/**
 * Confidence tier for a spec value, ordered weakest → strongest sourcing.
 * Mirrors FieldMeta["confidence"] in admin/lib/rows.ts — keep the two in sync.
 */
export type Confidence =
  | "estimated_typical" // ballpark from category norms; last resort
  | "typical_for_chipset" // baseline pulled from a DAC chip datasheet
  | "estimated_from_graph" // digitized from a chart image (Phase 1b)
  | "derived" // computed from other known fields via src/units.ts
  | "inferred" // pulled from prose/reviews, needs human eyes
  | "rated" // manufacturer-stated spec
  | "measured"; // independent bench measurement

/** Higher wins when two sources disagree. Also drives the reviewer UI badges. */
export const CONFIDENCE_RANK: Record<Confidence, number> = {
  estimated_typical: 0,
  typical_for_chipset: 1,
  estimated_from_graph: 2,
  derived: 3,
  inferred: 4,
  rated: 5,
  measured: 6,
};

/**
 * Bench-measurement / datasheet hosts worth searching per category, best-first.
 * Values found on these hosts are treated as `measured` rather than `rated`.
 */
const MEASUREMENT_SOURCES: Record<ComponentCategory, string[]> = {
  source: ["audiosciencereview.com", "stereophile.com"],
  turntable: ["stereophile.com", "audiosciencereview.com", "vinylengine.com"],
  dac: ["audiosciencereview.com", "stereophile.com", "audioholics.com", "whathifi.com"],
  preamp: ["audiosciencereview.com", "stereophile.com", "audioholics.com"],
  power_amp: ["audiosciencereview.com", "audioholics.com", "stereophile.com"],
  tube_amp_se: ["stereophile.com", "audiosciencereview.com"],
  tube_amp_pp: ["stereophile.com", "audiosciencereview.com"],
  integrated: ["audiosciencereview.com", "stereophile.com", "audioholics.com", "whathifi.com"],
  headphone_amp: ["audiosciencereview.com", "headphones.com", "stereophile.com"],
  speaker: ["erinsaudiocorner.com", "audioholics.com", "audiosciencereview.com"],
  headphone: ["squig.link", "rtings.com", "headphones.com", "audiosciencereview.com"],
};

/** All measurement hosts, deduped — used to tag a fetched URL as `measured`. */
export const ALL_MEASUREMENT_HOSTS: string[] = [
  ...new Set(Object.values(MEASUREMENT_SOURCES).flat()),
];

/**
 * Measurement hosts for a category, used as the search backend's `include_domains`
 * bias (falls back to a broad set). Callers keep a broad, unfiltered query too so
 * good sources outside this list still surface.
 */
export function measurementSourcesFor(category: ComponentCategory | undefined): string[] {
  if (category && MEASUREMENT_SOURCES[category]) return MEASUREMENT_SOURCES[category];
  return ["audiosciencereview.com", "stereophile.com", "audioholics.com"];
}

/** True when a URL's host is one of our known bench-measurement sources. */
export function isMeasurementUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
  return ALL_MEASUREMENT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Confidence a value should carry given the URL it came from: measurement hosts
 * yield `measured`, everything else stays `inferred` (prose that needs review).
 */
export function confidenceForUrl(url: string | undefined): Confidence {
  return url && isMeasurementUrl(url) ? "measured" : "inferred";
}

/** Pick the higher-authority of two confidence tiers. */
export function strongerConfidence(a: Confidence, b: Confidence): Confidence {
  return CONFIDENCE_RANK[a] >= CONFIDENCE_RANK[b] ? a : b;
}
