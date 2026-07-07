// LLM-assisted entity extraction: turn community text snippets into
// (brand, model, category) mentions. Batched to keep token cost down.

import Anthropic from "@anthropic-ai/sdk";
import { SCRAPE_MODEL, stripCodeFences } from "../../../web/lib/scrape-shared";
import { CATEGORIES } from "../../../web/lib/validation";
import type { Snippet } from "./sources";

export interface Mention {
  brand: string;          // canonical brand name, e.g. "Schiit Audio"
  model: string | null;   // product name without brand, e.g. "Modi 3+"
  category: (typeof CATEGORIES)[number] | null;
  sourceId: string;
  url: string;
}

const BATCH_SIZE = 50;

const EXTRACT_PROMPT = `
You are scanning audiophile forum/community text for mentions of audio equipment
BRANDS and specific COMPONENT MODELS (DACs, amps, speakers, headphones, turntables,
streamers, preamps).

You are given numbered snippets. Return ONLY a JSON array; one entry per distinct
brand-or-component mention you find:

[{ "snippet": <number>, "brand": "Canonical Brand Name", "model": "Model Name" | null, "category": <category> | null }]

Rules:
- category must be one of: ${CATEGORIES.join(", ")} — or null if unclear.
- Use the canonical brand name ("Schiit Audio" not "schiit", "Sennheiser" not "senn").
- "model" is the product name WITHOUT the brand ("HD 650", "Modi 3+"). null if only the brand is mentioned.
- Include a component entry once per snippet even if repeated within it.
- IGNORE: music, albums, artists, software, cables, furniture, headphone pads and
  other accessories, retailers, and anything that is not an audio component brand.
- If a snippet has nothing relevant, emit nothing for it.
- Return ONLY the JSON array, no prose, no markdown.
`.trim();

/** Cheap pre-filter: a gear mention needs at least one capitalized/number token. */
function looksRelevant(text: string): boolean {
  return /\b[A-Z][a-zA-Z]+|\b[A-Z]{2,}|\d/.test(text);
}

export async function extractMentions(
  snippets: Snippet[],
  { log = console.log }: { log?: (msg: string) => void } = {}
): Promise<Mention[]> {
  const relevant = snippets.filter((s) => looksRelevant(s.text));
  log(`Extracting from ${relevant.length}/${snippets.length} snippets…`);

  const client = new Anthropic();
  const mentions: Mention[] = [];
  const validCategories = new Set<string>(CATEGORIES);

  for (let i = 0; i < relevant.length; i += BATCH_SIZE) {
    const batch = relevant.slice(i, i + BATCH_SIZE);
    const numbered = batch.map((s, j) => `${j}: ${s.text}`).join("\n");

    let text = "";
    try {
      const message = await client.messages.create({
        model: SCRAPE_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: `${EXTRACT_PROMPT}\n\nSnippets:\n${numbered}` }],
      });
      const block = message.content.find((b) => b.type === "text");
      text = block?.type === "text" ? block.text : "[]";
    } catch (e) {
      log(`  batch ${i / BATCH_SIZE}: LLM call failed (${(e as Error).message}), skipping`);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(text));
    } catch {
      log(`  batch ${i / BATCH_SIZE}: unparseable reply, skipping`);
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    for (const raw of parsed) {
      const entry = raw as { snippet?: number; brand?: string; model?: string | null; category?: string | null };
      const snippet = typeof entry.snippet === "number" ? batch[entry.snippet] : undefined;
      if (!snippet || !entry.brand || typeof entry.brand !== "string") continue;
      mentions.push({
        brand: entry.brand.trim(),
        model: typeof entry.model === "string" && entry.model.trim() ? entry.model.trim() : null,
        category:
          entry.category && validCategories.has(entry.category)
            ? (entry.category as Mention["category"])
            : null,
        sourceId: snippet.sourceId,
        url: snippet.url,
      });
    }
    log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(relevant.length / BATCH_SIZE)}: ${mentions.length} mentions so far`);
  }

  return mentions;
}
