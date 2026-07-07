import { z } from "zod";
import { parseBody, CATEGORIES } from "@/lib/validation";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { createServiceClient } from "../../../../lib/supabase-admin";

const stagedUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(CATEGORIES).optional(),
  manufacturer: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  // Engine specs are validated structurally, like componentBodySchema does.
  specs: z
    .object({
      inputs: z.array(z.object({}).passthrough()).max(20).optional(),
      outputs: z.array(z.object({}).passthrough()).max(20).optional(),
      dac: z.object({}).passthrough().nullable().optional(),
    })
    .optional(),
  review_status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { id } = await params;
  const { data, error } = await parseBody(req, stagedUpdateSchema);
  if (error) return error;
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Empty update" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: existing } = await db
    .from("staged_components")
    .select("review_status")
    .eq("id", id)
    .single();
  if (!existing) {
    return Response.json({ error: "Staged component not found" }, { status: 404 });
  }
  if (existing.review_status === "migrated") {
    return Response.json({ error: "Already migrated — edit it in the main catalog instead" }, { status: 409 });
  }

  const { error: dbError } = await db.from("staged_components").update(data).eq("id", id);
  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
