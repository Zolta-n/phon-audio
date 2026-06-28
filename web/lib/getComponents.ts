import { createServerSupabaseClient } from "@/lib/supabase";
import { SEED_CATALOG } from "@/lib/seedCatalog";
import type { UIComponent } from "@/types";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.length > 0 && !url.includes("YOUR_PROJECT");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToComponent(row: any): UIComponent {
  const specs = (row.specs as { inputs?: unknown[]; outputs?: unknown[] }) ?? {};
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    inputs: (specs.inputs ?? []) as UIComponent["inputs"],
    outputs: (specs.outputs ?? []) as UIComponent["outputs"],
    note: row.notes ?? undefined,
    manufacturer: row.manufacturer ?? undefined,
    affiliateUrl: row.affiliate_url ?? null,
    imageUrl: row.image_url ?? null,
  };
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
