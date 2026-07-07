import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { createServiceClient } from "../../../../lib/supabase-admin";

const selectBodySchema = z.object({
  ids: z.array(z.string().max(200)).min(1).max(200),
  status: z.enum(["selected", "rejected", "discovered"]),
});

export async function POST(req: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { data, error } = await parseBody(req, selectBodySchema);
  if (error) return error;

  const db = createServiceClient();
  const { error: dbError, count } = await db
    .from("discovered_components")
    .update({ status: data.status }, { count: "exact" })
    .in("id", data.ids)
    // Don't let a stale UI resurrect items already in the pipeline.
    .in("status", ["discovered", "selected", "rejected"]);

  if (dbError) {
    return Response.json({ error: dbError.message }, { status: 500 });
  }
  return Response.json({ updated: count ?? 0 });
}
