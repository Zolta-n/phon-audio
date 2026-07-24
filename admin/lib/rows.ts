// Row shapes for the staging tables in db/admin-schema.sql. Plain types only —
// imported by both the Next app and the tsx discovery scripts.

import type { ComponentCategory, UIComponent } from "../../web/types";

export type RunKind = "discovery" | "collection" | "migration";
export type RunStatus = "running" | "succeeded" | "failed" | "cancelled";

export interface ScrapeRunRow {
  id: string;
  kind: RunKind;
  status: RunStatus;
  params: Record<string, unknown>;
  stats: Record<string, unknown>;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export type BrandStatus = "discovered" | "selected" | "rejected";

export interface DiscoveredBrandRow {
  id: string;
  name: string;
  aliases: string[];
  mention_count: number;
  source_counts: Record<string, number>;
  popularity: number;
  in_catalog: boolean;
  status: BrandStatus;
  first_seen: string;
  last_seen: string;
}

export type DiscoveredStatus =
  | "discovered" | "selected" | "collecting" | "staged" | "migrated" | "rejected";

export interface DiscoveredComponentRow {
  id: string;
  brand_id: string | null;
  name: string;
  category_guess: ComponentCategory | null;
  mention_count: number;
  source_counts: Record<string, number>;
  popularity: number;
  example_urls: string[];
  matched_component_id: string | null;
  status: DiscoveredStatus;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected" | "migrated";

/**
 * Confidence tier for a spec value, ordered weakest → strongest sourcing.
 * Kept in sync with `Confidence` in web/lib/sources.ts (CONFIDENCE_RANK there is
 * the single source of authority ordering).
 */
export type Confidence =
  | "estimated_typical"
  | "typical_for_chipset"
  | "estimated_from_graph"
  | "derived"
  | "inferred"
  | "rated"
  | "measured";

/** Per-field provenance, keyed by spec path e.g. "outputs.0.gainDb". */
export interface FieldMeta {
  source?: string;
  confidence: Confidence;
  status: "filled" | "verify";
  /**
   * True when ≥2 independent sources agreed on this value within tolerance
   * (the auto-corroboration signal). Distinct from the human-only `verified`
   * flag on the public `components` table — corroboration is a hint for the
   * reviewer, not a substitute for human review.
   */
  corroborated?: boolean;
}

export interface MissingField {
  portType: "inputs" | "outputs";
  index: number;
  field: string;
}

export interface StagedComponentRow {
  id: string;
  discovered_id: string | null;
  name: string;
  category: ComponentCategory;
  manufacturer: string | null;
  specs: {
    inputs?: UIComponent["inputs"];
    outputs?: UIComponent["outputs"];
    dac?: UIComponent["dac"];
  };
  notes: string | null;
  image_url: string | null;
  field_meta: Record<string, FieldMeta>;
  missing_fields: MissingField[];
  sources: string[];
  review_status: ReviewStatus;
  run_id: string | null;
  migrated_at: string | null;
  created_at: string;
  updated_at: string;
}
