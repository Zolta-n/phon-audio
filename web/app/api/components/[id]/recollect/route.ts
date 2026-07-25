import { scrapeByQuery, enrichWithWebSearch } from "@/lib/scrapeOne";
import { fillDacFromChipset } from "@/lib/chipsets";
import { applyDerivedSpecs } from "@/lib/deriveSpecs";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getComponentById } from "@/lib/getComponents";
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`recollect:${user.id}`, 5, 5 * 60_000)) {
    return Response.json(
      { error: "Too many re-collect requests — try again in a few minutes" },
      { status: 429 },
    );
  }

  const { id } = await params;
  const existing = await getComponentById(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    // Fresh collect by brand + model (cheap passes), then physics-derived fills +
    // chipset baseline — same path as by-name Add New.
    const fresh = await scrapeByQuery(existing.manufacturer ?? "", existing.name);
    const enriched = await enrichWithWebSearch(fresh, { pdf: false, graph: false });
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
