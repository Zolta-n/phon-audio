import { getComponents } from "@/lib/getComponents";
import { createServiceClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { componentBodySchema, parseBody } from "@/lib/validation";
import { toKebabCase } from "@/lib/strings";

export async function GET() {
  const components = await getComponents();
  return Response.json(components);
}

export async function POST(req: Request) {
  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseError } = await parseBody(req, componentBodySchema);
  if (parseError) return parseError;

  try {
    const { id, name, category, inputs, outputs, manufacturer, note } = body;

    const componentId = id || toKebabCase(`${manufacturer ?? ""} ${name}`);

    const supabase = createServiceClient();

    // Check if component already exists
    const { data: existing } = await supabase
      .from("components")
      .select("id")
      .eq("id", componentId)
      .single();

    if (existing) {
      return Response.json(
        { error: `Component with ID "${componentId}" already exists` },
        { status: 409 },
      );
    }

    const row = {
      id: componentId,
      name,
      category,
      manufacturer: manufacturer ?? null,
      specs: { inputs: inputs ?? [], outputs: outputs ?? [] },
      notes: note ?? null,
      verified: false,
    };

    const { error } = await supabase.from("components").insert(row);
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ id: componentId, saved: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save component";
    return Response.json({ error: message }, { status: 500 });
  }
}
