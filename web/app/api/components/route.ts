import { getComponents } from "@/lib/getComponents";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const components = await getComponents();
  return Response.json(components);
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, category, inputs, outputs, manufacturer, note } = body;

    if (!name || !category) {
      return Response.json({ error: "name and category are required" }, { status: 400 });
    }

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
