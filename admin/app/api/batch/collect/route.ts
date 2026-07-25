import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { createServiceClient } from "../../../../lib/supabase-admin";
import { rateLimit } from "../../../../lib/rateLimit";
import { collectOne } from "../../../../lib/collectOne";

// One component per request (~30–90 s); the Batch page drives the queue.
export const maxDuration = 300;

const batchCollectBodySchema = z.object({
  discoveredId: z.string().max(200),
  runId: z.string().uuid(),
});

/** Read-modify-write the batch run's counters (sequential calls → no race). */
async function bumpRunStats(
  db: ReturnType<typeof createServiceClient>,
  runId: string,
  outcome: "staged" | "failed",
): Promise<void> {
  const { data } = await db.from("admin_scrape_runs").select("stats").eq("id", runId).single();
  const stats = (data?.stats ?? {}) as { total?: number; done?: number; staged?: number; failed?: number };
  const done = (stats.done ?? 0) + 1;
  const next = {
    ...stats,
    done,
    staged: (stats.staged ?? 0) + (outcome === "staged" ? 1 : 0),
    failed: (stats.failed ?? 0) + (outcome === "failed" ? 1 : 0),
  };
  const finished = typeof stats.total === "number" && done >= stats.total;
  await db
    .from("admin_scrape_runs")
    .update({
      stats: next,
      ...(finished ? { status: "succeeded", finished_at: new Date().toISOString() } : {}),
    })
    .eq("id", runId);
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  // A full batch is up to 30 items × 1 call; allow headroom for retries.
  if (!rateLimit(`batch-collect:${user.id}`, 60, 10 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, batchCollectBodySchema);
  if (error) return error;

  const db = createServiceClient();
  try {
    const result = await collectOne(db, data.discoveredId, data.runId);
    await bumpRunStats(db, data.runId, "staged");
    return Response.json({ stagedId: result.stagedId, missingFields: result.missingFields });
  } catch (e) {
    // A mid-batch failure marks this item failed but never aborts the run — the
    // client moves on to the next item.
    await bumpRunStats(db, data.runId, "failed");
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
