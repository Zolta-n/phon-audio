import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { parseBody, CATEGORIES } from "@/lib/validation";
import { CATEGORY_LABELS } from "@/types";
import { toKebabCase } from "@/lib/strings";
import { searchWeb } from "@/lib/scrapeOne";
import { SCRAPE_MODEL, stripCodeFences } from "@/lib/scrape-shared";
import { requireAdminApi } from "../../../../lib/adminAuth";
import { createServiceClient } from "../../../../lib/supabase-admin";
import { rateLimit } from "../../../../lib/rateLimit";

// Enumeration touches an LLM + web search: a few seconds, well under the limit.
export const maxDuration = 120;

// Hard cap on models per batch — bounds token/time spend so a runaway
// enumeration can't kick off hundreds of collects.
const MAX_BATCH_ITEMS = 30;

const enumerateBodySchema = z.object({
  brand: z.string().min(1).max(100),
  category: z.enum(CATEGORIES),
  hints: z.string().max(500).optional(),
  // Absent/false → preview (enumerate + dedup, no writes). true → insert the
  // confirmed models + create the batch run row.
  confirm: z.boolean().optional(),
  models: z.array(z.string().min(1).max(120)).max(MAX_BATCH_ITEMS).optional(),
});

const ENUMERATE_PROMPT = `
From the text below, list the distinct product MODEL names for the given brand and
category. Return ONLY a JSON array of strings.

Rules:
- Model name WITHOUT the brand ("SU-9", not "SMSL SU-9").
- Only models actually named in the text — do NOT invent or guess model numbers.
- Include current and discontinued models if present.
- Only models matching the requested category.
`.trim();

/** Discovered-component slug, matching the discovery pipeline's convention. */
function componentSlug(brand: string, model: string): string {
  return toKebabCase(`${brand} ${model}`);
}

async function enumerateModels(brand: string, category: string, hints?: string): Promise<string[]> {
  const label = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category;
  const results = await searchWeb(`${brand} ${label} full lineup all models list ${hints ?? ""}`.trim(), 6);
  const text = results.map((r) => `--- ${r.url} ---\n${r.content}`).join("\n\n").slice(0, 15000);
  if (!text.trim()) return [];

  const client = new Anthropic();
  const message = await client.messages.create({
    model: SCRAPE_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: `${ENUMERATE_PROMPT}\n\nBrand: ${brand}\nCategory: ${label}\n\nText:\n${text}` }],
  });
  const block = message.content.find((b) => b.type === "text");
  const parsed = JSON.parse(stripCodeFences(block?.type === "text" ? block.text : "[]"));
  if (!Array.isArray(parsed)) return [];

  // Dedup case-insensitively, cap.
  const seen = new Set<string>();
  const models: string[] = [];
  for (const raw of parsed) {
    const name = typeof raw === "string" ? raw.trim() : "";
    if (!name || name.length > 120) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    models.push(name);
    if (models.length >= MAX_BATCH_ITEMS) break;
  }
  return models;
}

export async function POST(req: Request) {
  const { user, error: authError } = await requireAdminApi();
  if (authError) return authError;

  if (!rateLimit(`batch-enumerate:${user.id}`, 10, 10 * 60_000)) {
    return Response.json({ error: "Rate limit exceeded. Try again in a few minutes." }, { status: 429 });
  }

  const { data, error } = await parseBody(req, enumerateBodySchema);
  if (error) return error;

  const db = createServiceClient();
  const brandSlug = toKebabCase(data.brand);

  // ── Confirm mode: insert the confirmed models + open the batch run ──
  if (data.confirm) {
    const models = (data.models ?? []).slice(0, MAX_BATCH_ITEMS);
    if (models.length === 0) {
      return Response.json({ error: "No models confirmed." }, { status: 400 });
    }

    await db.from("discovered_brands").upsert(
      { id: brandSlug, name: data.brand, status: "selected" },
      { onConflict: "id" },
    );

    const rows = models.map((name) => ({
      id: componentSlug(data.brand, name),
      brand_id: brandSlug,
      name,
      category_guess: data.category,
      status: "selected",
      example_urls: [],
    }));
    // ignoreDuplicates: never clobber an item already known to discovery
    // (e.g. one already migrated) — collectOne will skip bad-status items.
    const { error: upsertError } = await db
      .from("discovered_components")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    if (upsertError) {
      return Response.json({ error: upsertError.message }, { status: 500 });
    }

    const { data: runRow, error: runError } = await db
      .from("admin_scrape_runs")
      .insert({
        kind: "batch",
        params: { brand: data.brand, category: data.category, hints: data.hints ?? null },
        stats: { total: rows.length, done: 0, staged: 0, failed: 0 },
      })
      .select("id")
      .single();
    if (runError || !runRow) {
      return Response.json({ error: runError?.message ?? "Failed to create run" }, { status: 500 });
    }

    return Response.json(
      { runId: runRow.id as string, items: rows.map((r) => ({ id: r.id, name: r.name })) },
      { status: 202 },
    );
  }

  // ── Preview mode: enumerate + dedup against known items (no writes) ──
  let models: string[];
  try {
    models = await enumerateModels(data.brand, data.category, data.hints);
  } catch (e) {
    return Response.json({ error: `Enumeration failed: ${(e as Error).message}` }, { status: 502 });
  }
  if (models.length === 0) {
    return Response.json({ candidates: [], estimatedCount: 0, cap: MAX_BATCH_ITEMS });
  }

  const ids = models.map((m) => componentSlug(data.brand, m));
  const { data: existing } = await db.from("discovered_components").select("id").in("id", ids);
  const known = new Set((existing ?? []).map((r) => r.id as string));

  const candidates = models.map((name) => ({ name, isNew: !known.has(componentSlug(data.brand, name)) }));
  return Response.json({ candidates, estimatedCount: candidates.length, cap: MAX_BATCH_ITEMS });
}
