import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../lib/adminAuth";
import { createServiceClient } from "../../../lib/supabase-admin";
import type { StagedComponentRow } from "../../../lib/rows";

const migrateBodySchema = z.object({
  stagedIds: z.array(z.string().max(200)).min(1).max(100),
  // Existing catalog ids are skipped unless the admin explicitly overwrites.
  overwrite: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { data, error } = await parseBody(req, migrateBodySchema);
  if (error) return error;

  const db = createServiceClient();
  const { data: stagedData, error: stagedError } = await db
    .from("staged_components")
    .select("*")
    .in("id", data.stagedIds);
  if (stagedError) {
    return Response.json({ error: stagedError.message }, { status: 500 });
  }
  const staged = (stagedData ?? []) as StagedComponentRow[];

  const { data: existingData } = await db
    .from("components")
    .select("id")
    .in("id", data.stagedIds);
  const existingIds = new Set((existingData ?? []).map((r) => r.id as string));

  const migrated: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const id of data.stagedIds) {
    const row = staged.find((s) => s.id === id);
    if (!row) {
      skipped.push({ id, reason: "not found" });
      continue;
    }
    if (row.review_status !== "approved") {
      skipped.push({ id, reason: `review_status is '${row.review_status}', not 'approved'` });
      continue;
    }
    if (existingIds.has(id) && !data.overwrite) {
      skipped.push({ id, reason: "id already exists in catalog (pass overwrite to replace, or edit the slug)" });
      continue;
    }

    const { error: upsertError } = await db.from("components").upsert(
      {
        id: row.id,
        name: row.name,
        category: row.category,
        manufacturer: row.manufacturer,
        specs: row.specs,
        notes: row.notes,
        image_url: row.image_url,
        verified: false,
      },
      { onConflict: "id" }
    );
    if (upsertError) {
      skipped.push({ id, reason: upsertError.message });
      continue;
    }

    await db
      .from("staged_components")
      .update({ review_status: "migrated", migrated_at: new Date().toISOString() })
      .eq("id", id);
    if (row.discovered_id) {
      await db.from("discovered_components").update({ status: "migrated" }).eq("id", row.discovered_id);
    }
    migrated.push(id);
  }

  // Audit trail
  await db.from("admin_scrape_runs").insert({
    kind: "migration",
    status: skipped.length > 0 && migrated.length === 0 ? "failed" : "succeeded",
    params: { stagedIds: data.stagedIds, overwrite: data.overwrite ?? false },
    stats: { migrated, skipped },
    finished_at: new Date().toISOString(),
  });

  return Response.json({ migrated, skipped });
}
