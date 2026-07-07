import { createServerSupabaseClient } from "@/lib/supabase-server";
import { SEED_CATALOG } from "@/lib/seedCatalog";
import { isSupabaseConfigured } from "@/lib/env";
import type { UIComponent } from "@/types";

export interface ComponentRow {
  id: string;
  name: string;
  category: string;
  specs: unknown;
  affiliate_url: string | null;
  image_url: string | null;
  manufacturer: string | null;
  notes: string | null;
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
  };
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
      .select("id, name, category, specs, affiliate_url, image_url, manufacturer, notes")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return rowToComponent(data);
  } catch {
    return null;
  }
}

export async function getComponents(): Promise<UIComponent[]> {
  if (!isSupabaseConfigured()) {
    return SEED_CATALOG;
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("components")
      .select("id, name, category, specs, affiliate_url, image_url, manufacturer, notes")
      .order("category")
      .order("name");
    if (error) throw error;
    return (data ?? []).map(rowToComponent);
  } catch {
    return SEED_CATALOG;
  }
}
