import { unstable_rethrow } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SEED_CATALOG } from "@/lib/seedCatalog";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewer, canViewComponent, type Viewer } from "@/lib/entitlements";
import type { UIComponent } from "@/types";

const COLUMNS =
  "id, name, category, specs, affiliate_url, image_url, manufacturer, notes, created_by, verified";

export interface ComponentRow {
  id: string;
  name: string;
  category: string;
  specs: unknown;
  affiliate_url: string | null;
  image_url: string | null;
  manufacturer: string | null;
  notes: string | null;
  created_by?: string | null;
  verified?: boolean | null;
}

export function rowToComponent(row: ComponentRow): UIComponent {
  const specs = (row.specs as { inputs?: unknown[]; outputs?: unknown[]; dac?: unknown }) ?? {};
  return {
    id: row.id,
    name: row.name,
    category: row.category as UIComponent["category"],
    inputs: (specs.inputs ?? []) as UIComponent["inputs"],
    outputs: (specs.outputs ?? []) as UIComponent["outputs"],
    dac: (specs.dac ?? undefined) as UIComponent["dac"],
    note: row.notes ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    affiliateUrl: row.affiliate_url ?? null,
    imageUrl: row.image_url ?? null,
    pendingReview: row.created_by != null && row.verified !== true,
  };
}

/**
 * PostgREST `or=` filter for what `viewer` may see: curated rows
 * (created_by IS NULL), admin-approved rows, and the viewer's own pending
 * submissions. Returns null for admins, who see everything.
 *
 * Keep in sync with canViewComponent() in lib/entitlements.ts.
 */
function visibilityFilter(viewer: Viewer): string | null {
  if (viewer.admin) return null;
  const clauses = ["created_by.is.null", "verified.is.true"];
  if (viewer.user) clauses.push(`created_by.eq.${viewer.user.id}`);
  return clauses.join(",");
}

/** Fetch a single component by id (seed-catalog fallback when Supabase is unset). */
export async function getComponentById(id: string): Promise<UIComponent | null> {
  if (!isSupabaseConfigured()) {
    return SEED_CATALOG.find((c) => c.id === id) ?? null;
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("components")
      .select(COLUMNS)
      .eq("id", id)
      .single();
    if (error || !data) return null;

    const viewer = await getViewer();
    if (!canViewComponent(viewer, { created_by: data.created_by, verified: data.verified })) {
      return null;
    }
    return rowToComponent(data);
  } catch (err) {
    // Let Next's own control-flow errors (cookies() bailing out of static
    // render, notFound(), redirect()) through instead of reporting them as
    // lookup failures.
    unstable_rethrow(err);
    console.error(`[getComponentById] lookup failed for "${id}":`, err);
    return null;
  }
}

export async function getComponents(): Promise<UIComponent[]> {
  if (!isSupabaseConfigured()) {
    return SEED_CATALOG;
  }
  try {
    const viewer = await getViewer();
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("components")
      .select(COLUMNS)
      // Hide admin-deactivated (soft-deleted) components from the public catalog.
      .neq("active", false);

    const filter = visibilityFilter(viewer);
    if (filter) query = query.or(filter);

    const { data, error } = await query.order("category").order("name");
    if (error) throw error;
    return (data ?? []).map(rowToComponent);
  } catch (err) {
    unstable_rethrow(err);
    // Never fail silently here: a swallowed error looks identical to a working
    // app serving the 12-item seed catalog, which has masked real outages
    // (a paused Supabase project, a missing column) for days at a time.
    console.error("[getComponents] catalog query failed, serving seed catalog:", err);
    return SEED_CATALOG;
  }
}
