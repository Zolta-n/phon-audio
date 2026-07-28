import { scrapeByQuery, enrichWithWebSearch } from "@/lib/scrapeOne";
import { fillDacFromChipset } from "@/lib/chipsets";
import { applyDerivedSpecs } from "@/lib/deriveSpecs";
import { createServiceClient } from "@/lib/supabase-admin";
import { getComponentById } from "@/lib/getComponents";
import { getViewer, canEditComponent } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rateLimit";

// Same budget as the scrape route — cheap passes only (no PDF/vision).
export const maxDuration = 60;

// Re-collect an EXISTING catalog component from scratch with the current tools:
// a FRESH by-name collection that produces new spec values (so it can correct a
// wrong stored value, not just fill gaps). Identity is preserved; only the specs
// are re-collected. Returns the fresh component for the client to review and save
// via PUT — no DB write happens here (the review step is the overwrite safety net).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (!viewer.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!viewer.canSubmit) {
    return Response.json(
      { error: "Re-collecting specs requires a paid plan", code: "upgrade_required" },
      { status: 403 },
    );
  }

  const { id } = await params;

  // Check edit rights before spending on collection: the result is saved via
  // PUT, which enforces the same rule, so collecting first would burn LLM and
  // search budget on a write that is going to be refused anyway.
  const { data: row } = await createServiceClient()
    .from("components")
    .select("created_by, verified")
    .eq("id", id)
    .single();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  if (!canEditComponent(viewer, row)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!rateLimit(`recollect:${viewer.user.id}`, 5, 5 * 60_000)) {
    return Response.json(
      { error: "Too many re-collect requests — try again in a few minutes" },
      { status: 429 },
    );
  }

  const existing = await getComponentById(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    // Fresh collect by brand + model (cheap passes), then physics-derived fills +
    // chipset baseline — same path as by-name Add New.
    // Re-collect is a deliberate "improve this component" action (review-gated),
    // so it also pulls well-known specs from model knowledge to fill web gaps.
    const fresh = await scrapeByQuery(existing.manufacturer ?? "", existing.name);
    const enriched = await enrichWithWebSearch(fresh, { pdf: false, graph: false, modelKnowledge: true });
    applyDerivedSpecs(enriched);
    fillDacFromChipset(enriched.dac);

    // Keep the existing identity — only specs are re-collected.
    enriched.id = existing.id;
    enriched.name = existing.name;
    enriched.manufacturer = existing.manufacturer;
    enriched.category = existing.category;

    return Response.json({ component: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Re-collect failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
