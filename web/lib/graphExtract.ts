// Graph digitization (vision).
//
// Frequency-response, impedance, and THD data on measurement pages often exist
// only as chart images. This module finds those charts and reads approximate key
// values off them with a vision call. Digitized values are the weakest sourced
// tier (`estimated_from_graph`) — a rough read, clearly below a stated number,
// but better than null for a reviewer to confirm.
//
// `findChartImages` is pure (HTML string → URLs) and unit-testable from the root
// runner; the vision call is best-effort and returns empty patches on any failure.

import Anthropic from "@anthropic-ai/sdk";
import type { UIComponent } from "../types";
import { safeFetch } from "./urlGuard";
import { USER_AGENT, SCRAPE_MODEL, stripCodeFences, isAllowedByRobots } from "./scrape-shared";
import { findChartImages } from "./chartImages";

export { findChartImages };

/** Patch table shape (structurally compatible with scrapeOne's SpecPatches). */
export interface GraphPatches {
  inputs?: Record<string, Record<string, unknown>>;
  outputs?: Record<string, Record<string, unknown>>;
  provenance?: Record<string, { source?: string; agreedSources?: number }>;
}

type MissingField = { portType: "inputs" | "outputs"; index: number; field: string };

const OK_MEDIA = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type ImageBlock = { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; data: string } };

/** Fetch one image as a base64 vision block (robots + SSRF guarded); null on failure. */
async function fetchImageBlock(url: string): Promise<ImageBlock | null> {
  try {
    if (!(await isAllowedByRobots(url))) return null;
    const res = await safeFetch(url, { headers: { "User-Agent": USER_AGENT } }, { timeoutMs: 10000 });
    if (!res.ok) return null;
    const mediaType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!OK_MEDIA.has(mediaType)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType as ImageBlock["source"]["media_type"], data: buf.toString("base64") },
    };
  } catch {
    return null;
  }
}

const GRAPH_PROMPT = `
You are reading APPROXIMATE values off audio measurement charts (frequency response,
impedance, THD, sensitivity) to fill MISSING spec fields. The images are the charts.

Return ONLY JSON, no prose:
{ "inputs": { "<index>": { "<specField>": value } }, "outputs": { ... },
  "provenance": { "<inputs|outputs>.<index>.<specField>": { "agreedSources": 1 } } }

Rules:
- Fill only the listed missing fields, and ONLY when a chart clearly shows the value.
- Read minimum impedance from an impedance curve; nominal impedance from its flat region;
  -3 dB points / bandwidth from a frequency-response curve; sensitivity from an SPL chart.
- These are ESTIMATES read off a plot — approximate to a sensible precision, do not invent.
- Return {} if the charts don't show any of the missing fields.
`.trim();

/**
 * Read approximate values for missing fields off measurement-chart images via a
 * Claude vision call. Best-effort — returns empty patches on any failure. Caller
 * applies the patches (filling nulls only) and tags them `estimated_from_graph`.
 */
export async function extractFromGraphImages(
  component: UIComponent,
  missing: MissingField[],
  imageUrls: string[],
): Promise<{ patches: GraphPatches; sourceUrl?: string }> {
  const blocks: ImageBlock[] = [];
  let sourceUrl: string | undefined;
  for (const url of imageUrls) {
    const block = await fetchImageBlock(url);
    if (block) {
      blocks.push(block);
      sourceUrl ??= url;
      if (blocks.length >= 3) break;
    }
  }
  if (blocks.length === 0) return { patches: {} };

  const missingDescription = missing
    .map((m) => {
      const port = (m.portType === "inputs" ? component.inputs : component.outputs)[m.index];
      const specs = (port?.specs ?? {}) as Record<string, unknown>;
      return `${m.portType}[${m.index}] (${specs.kind}, ${port?.connector}): missing ${m.field}`;
    })
    .join("\n");

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: SCRAPE_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            ...blocks,
            { type: "text", text: `${GRAPH_PROMPT}\n\nComponent: ${component.manufacturer ?? ""} ${component.name} (${component.category})\n\nMissing spec fields:\n${missingDescription}` },
          ],
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "{}";
    return { patches: JSON.parse(stripCodeFences(text)) as GraphPatches, sourceUrl };
  } catch {
    return { patches: {}, sourceUrl };
  }
}
