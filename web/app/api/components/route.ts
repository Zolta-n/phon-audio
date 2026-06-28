import { getComponents } from "@/lib/getComponents";

export async function GET() {
  const components = await getComponents();
  return Response.json(components);
}

// Single component by ID
export async function GET_BY_ID(id: string): Promise<UIComponent | null> {
  if (!isSupabaseConfigured()) {
    return SEED_CATALOG.find((c) => c.id === id) ?? null;
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("components")
    .select("id, name, category, specs, affiliate_url, image_url, manufacturer, notes")
    .eq("id", id)
    .single();
  return data ? rowToComponent(data) : null;
}
