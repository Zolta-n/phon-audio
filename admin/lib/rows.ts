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

/** Per-field provenance, keyed by spec path e.g. "outputs.0.gainDb". */
export interface FieldMeta {
  source?: string;
  confidence: "measured" | "rated" | "inferred";
  status: "filled" | "verify";
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
