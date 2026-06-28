import { scrapeUrl, enrichWithWebSearch } from "@/lib/scrapeOne";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, enrich } = body as { url?: string; enrich?: boolean };

    if (!url || typeof url !== "string") {
      return Response.json({ error: "Missing 'url' field" }, { status: 400 });
    }

    try {
      new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    let component = await scrapeUrl(url);

    // Enrich with web search if requested (default: true)
    if (enrich !== false) {
      component = await enrichWithWebSearch(component);
    }

    return Response.json({ component });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraping failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
