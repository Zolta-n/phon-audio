import { createServerSupabaseClient } from "@/lib/supabase";
import { SEED_CATALOG } from "@/lib/seedCatalog";
import { rowToComponent } from "@/lib/getComponents";

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.length > 0 && !url.includes("YOUR_PROJECT");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const component = SEED_CATALOG.find((c) => c.id === id);
    if (!component) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(component);
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("components")
    .select("id, name, category, specs, affiliate_url, image_url, manufacturer, notes")
    .eq("id", id)
    .single();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(rowToComponent(data));
}
