import { z } from "zod";
import { parseBody } from "@/lib/validation";
import { requireAdminApi } from "../../../lib/adminAuth";
import { createServiceClient } from "../../../lib/supabase-admin";
import { rateLimit } from "../../../lib/rateLimit";
import { startDiscovery, SOURCE_IDS } from "../../../scripts/discover/pipeline";
import type { ScrapeRunRow } from "../../../lib/rows";

// A full run (fetch + LLM extraction) takes minutes: POST starts it in the
// background and returns the run id; the UI polls GET until it settles.

/** Runs older than this that never finished are presumed dead (server restart). */
const STALE_RUN_MS = 30 * 60_000;

const discoverBodySchema = z.object({
  sources: z
    .array(z.string().refine((s) => SOURCE_IDS.includes(s), { message: "unknown source" }))
    .min(1)
    .max(SOURCE_IDS.length)
    .optional(),
  subs: z.array(z.string().regex(/^[A-Za-z0-9_]{2,30}$/)).min(1).max(10).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!rateLimit(`discover:${user.id}`, 3, 10 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, discoverBodySchema);
  if (error) return error;

  const db = createServiceClient();

  // One discovery at a time: the pipeline's read-merge-upsert would double
  // counts if two runs raced. Reap runs that died without a finished_at first.
  const { data: runningRuns } = await db
    .from("admin_scrape_runs")
    .select("id, started_at")
    .eq("kind", "discovery")
    .eq("status", "running");
  for (const run of runningRuns ?? []) {
    if (Date.now() - new Date(run.started_at).getTime() > STALE_RUN_MS) {
      await db
        .from("admin_scrape_runs")
        .update({ status: "failed", error: "abandoned (server restarted?)", finished_at: new Date().toISOString() })
        .eq("id", run.id);
    } else {
      return Response.json(
        { error: "A discovery run is already in progress", runId: run.id },
        { status: 409 }
      );
    }
  }

  try {
    const { runId, done } = await startDiscovery(db, {
      sources: data.sources ?? null,
      subs: data.subs ?? null,
      limit: data.limit ?? null,
    });
    // Fire-and-forget: failures are recorded on the run row by the pipeline.
    done.catch((e) => console.error(`Discovery run ${runId} failed:`, e));
    return Response.json({ runId }, { status: 202 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const runId = new URL(req.url).searchParams.get("runId");
  const db = createServiceClient();

  let query = db.from("admin_scrape_runs").select("*").eq("kind", "discovery");
  query = runId
    ? query.eq("id", runId)
    : query.order("started_at", { ascending: false }).limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ run: (data as ScrapeRunRow | null) ?? null });
}
