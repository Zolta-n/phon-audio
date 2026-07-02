import { createServiceClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getComponentById } from "@/lib/getComponents";
import { componentUpdateSchema, parseBody } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const component = await getComponentById(id);
  if (!component) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(component);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseError } = await parseBody(req, componentUpdateSchema);
  if (parseError) return parseError;

  try {
    const { id } = await params;
    const { name, category, inputs, outputs, manufacturer, note } = body;

    const supabase = createServiceClient();

    const { data: existing, error: fetchError } = await supabase
      .from("components")
      .select("specs")
      .eq("id", id)
      .single();
    if (fetchError || !existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Build update object with only provided fields
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (manufacturer !== undefined) update.manufacturer = manufacturer;
    if (note !== undefined) update.notes = note;
    if (inputs !== undefined || outputs !== undefined) {
      const existingSpecs = (existing.specs as Record<string, unknown>) ?? {};
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
