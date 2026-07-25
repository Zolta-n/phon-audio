import { enrichWithWebSearch } from "@/lib/scrapeOne";
import { fillDacFromChipset } from "@/lib/chipsets";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getComponentById } from "@/lib/getComponents";
import { rateLimit } from "@/lib/rateLimit";

// Same budget as the scrape route — cheap passes only (no PDF/vision).
export const maxDuration = 60;

// Re-run collection on an EXISTING catalog component with the current tools,
// filling only fields that are still empty. Returns the enriched component for
// the client to review and save via PUT — no DB write happens here.
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
  const component = await getComponentById(id);
  if (!component) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    // Fill-missing only: applyFieldPatches is null-guarded, so nothing already
    // set (incl. human-corrected values) is overwritten. Cheap passes only.
    const enriched = await enrichWithWebSearch(component, { pdf: false, graph: false });
    fillDacFromChipset(enriched.dac);
    return Response.json({ component: enriched });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Re-collect failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
