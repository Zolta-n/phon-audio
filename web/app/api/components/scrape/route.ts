import { scrapeUrl, enrichWithWebSearch } from "@/lib/scrapeOne";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { parseBody, scrapeBodySchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { assertPublicUrl, UrlGuardError } from "@/lib/urlGuard";

export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Each scrape fans out into page fetches + LLM calls — keep it bounded per user.
  if (!rateLimit(`scrape:${user.id}`, 5, 5 * 60_000)) {
    return Response.json(
      { error: "Too many scrape requests — try again in a few minutes" },
      { status: 429 },
    );
  }

  const { data: body, error: parseError } = await parseBody(req, scrapeBodySchema);
  if (parseError) return parseError;

  try {
    await assertPublicUrl(body.url);

    let component = await scrapeUrl(body.url);

    // Enrich with web search if requested (default: true)
    if (body.enrich !== false) {
      component = await enrichWithWebSearch(component);
    }

    return Response.json({ component });
  } catch (err) {
    if (err instanceof UrlGuardError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Scraping failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
