import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../lib/adminAuth";
import { createServiceClient } from "../../../lib/supabase-admin";
import { rateLimit } from "../../../lib/rateLimit";
import { collectOne } from "../../../lib/collectOne";

// One component per request (~30–90 s): the UI drives the queue sequentially.
export const maxDuration = 300;

const collectBodySchema = z.object({
  discoveredId: z.string().max(200),
});

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!rateLimit(`collect:${user.id}`, 30, 5 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, collectBodySchema);
  if (error) return error;

  const db = createServiceClient();

  // Per-item run row for the audit trail / live progress. collectOne owns the
  // scrape→stage work and the discovered-status transitions; the route owns the
  // run-row lifecycle so the batch runner can reuse collectOne under one run.
  const { data: runRow } = await db
    .from("admin_scrape_runs")
    .insert({ kind: "collection", params: { discoveredId: data.discoveredId } })
    .select("id")
    .single();
  const runId = runRow?.id as string | undefined;

  try {
    const result = await collectOne(db, data.discoveredId, runId);
    if (runId) {
      await db
        .from("admin_scrape_runs")
        .update({
          status: "succeeded",
          stats: { stagedId: result.stagedId, missingFields: result.missingFields, sources: result.sources },
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return Response.json({ stagedId: result.stagedId, missingFields: result.missingFields });
  } catch (e) {
    const message = (e as Error).message;
    // Preserve the route's original precondition codes.
    const status = /not found/.test(message) ? 404 : /Cannot collect/.test(message) ? 409 : 500;
    if (runId) {
      await db
        .from("admin_scrape_runs")
        .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
        .eq("id", runId);
    }
    return Response.json({ error: message }, { status });
  }
}
