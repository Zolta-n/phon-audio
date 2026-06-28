import { createServiceClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, inputs, outputs, manufacturer, note } = body;

    const supabase = createServiceClient();

    // Build update object with only provided fields
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (manufacturer !== undefined) update.manufacturer = manufacturer;
    if (note !== undefined) update.notes = note;
    if (inputs !== undefined || outputs !== undefined) {
      // Fetch existing specs to merge
      const { data: existing } = await supabase
        .from("components")
        .select("specs")
        .eq("id", id)
        .single();
      const existingSpecs = (existing?.specs as Record<string, unknown>) ?? {};
      update.specs = {
        inputs: inputs ?? existingSpecs.inputs ?? [],
        outputs: outputs ?? existingSpecs.outputs ?? [],
      };
    }

    const { error } = await supabase
      .from("components")
      .update(update)
      .eq("id", id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ id, updated: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update component";
    return Response.json({ error: message }, { status: 500 });
  }
}
