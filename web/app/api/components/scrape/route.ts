import { scrapeUrl, scrapeByQuery, enrichWithWebSearch } from "@/lib/scrapeOne";
import { fillDacFromChipset } from "@/lib/chipsets";
import { applyDerivedSpecs } from "@/lib/deriveSpecs";
import { getViewer } from "@/lib/entitlements";
import { parseBody, scrapeBodySchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl, UrlGuardError } from "@/lib/urlGuard";

// Vercel Pro caps non-streaming functions at 60s; Hobby needs Fluid compute for >10s.
export const maxDuration = 60;

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  // Every call fans out into page fetches, search queries and LLM requests, all
  // billed to us — entitlement gates the spend, the rate limit bounds it.
  if (!viewer.canSubmit) {
    return Response.json(
      { error: "Collecting component specs requires a paid plan", code: "upgrade_required" },
      { status: 403 },
    );
  }

  if (!rateLimit(`scrape:${viewer.user.id}`, 5, 5 * 60_000)) {
    return Response.json(
      { error: "Too many scrape requests — try again in a few minutes" },
      { status: 429 },
    );
  }

  const { data: body, error: parseError } = await parseBody(req, scrapeBodySchema);
  if (parseError) return parseError;

  try {
    // Base extraction: a product URL if given, else brand + model via web search.
    let component;
    if (body.url) {
      await assertPublicUrl(body.url);
      component = await scrapeUrl(body.url);
    } else {
      component = await scrapeByQuery(body.manufacturer!.trim(), body.name!.trim());
    }

    // Enrich with web search if requested (default: true). Public route runs only
    // the cheap passes — the slow/costly PDF + vision-graph passes are admin-only.
    if (body.enrich !== false) {
      component = await enrichWithWebSearch(component, { pdf: false, graph: false, modelKnowledge: body.modelKnowledge });
    }
    // Physics-derived fills (gain↔sensitivity, ratedMin from power rungs, …) +
    // DAC chipset baseline — both cheap/deterministic, fill nulls only.
    applyDerivedSpecs(component);
    fillDacFromChipset(component.dac);

    return Response.json({ component });
  } catch (err) {
    if (err instanceof UrlGuardError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Scraping failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
