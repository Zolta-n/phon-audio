import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { createServiceClient } from "../../../../lib/supabase-admin";
import { rateLimit } from "../../../../lib/rateLimit";

const patchSchema = z.object({ active: z.boolean() });

/** Deactivate (soft delete) or reactivate a production catalog component. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!rateLimit(`admin-components:${user.id}`, 60, 5 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const { id } = await params;
  const db = createServiceClient();
  const { error: updateError } = await db
    .from("components")
    .update({ active: data.active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  return Response.json({ id, active: data.active });
}

/** Hard-delete a component. Fails if it's referenced by a saved chain (no cascade
 * on chain_nodes) — the caller should deactivate instead in that case. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;
  if (!rateLimit(`admin-components:${user.id}`, 60, 5 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { id } = await params;
  const db = createServiceClient();
  const { error: deleteError } = await db.from("components").delete().eq("id", id);
  if (deleteError) {
    // 23503 = foreign_key_violation (component is used in a saved chain).
    const inUse = deleteError.code === "23503" || /foreign key/i.test(deleteError.message);
    return Response.json(
      { error: inUse ? "This component is used in a saved chain — deactivate it instead of deleting." : deleteError.message },
      { status: inUse ? 409 : 500 },
    );
  }
  return Response.json({ id, deleted: true });
}
