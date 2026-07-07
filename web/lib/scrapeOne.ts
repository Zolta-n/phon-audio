import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import type { UIComponent } from "@/types";
import { safeFetch } from "@/lib/urlGuard";
import {
  USER_AGENT,
  SCRAPE_MODEL,
  extractSpecs,
  extractComponentJson,
  stripCodeFences,
  isAllowedByRobots,
  mapWithConcurrency,
} from "@/lib/scrape-shared";



// ─── Web search enrichment ───────────────────────────────────────────

const ENRICH_PROMPT = `
You are filling in MISSING audio component specs using data from review/measurement pages.
You are given:
1. The component (name, category, current ports with some null spec fields)
2. Text extracted from review and measurement web pages

Your job: return a JSON object with ONLY the fields that were null and that you can now fill in.
Use this exact structure:

{
  "inputs": { "<index>": { "<specField>": value, ... }, ... },
  "outputs": { "<index>": { "<specField>": value, ... }, ... }
}

Where <index> is the 0-based port index, and <specField> is the specific null field name.

Rules:
- Extract values from the review/measurement text. If a value is mentioned anywhere in the text, USE it.
- If a general "input impedance" is given without specifying which input, apply it to ALL line inputs.
- If a general "output impedance" is given, apply it to ALL line/headphone outputs.
- If "gain" or "voltage gain" is mentioned, apply to the relevant outputs.
- For amplifiers: "output voltage" or "max output" for pre-out/line-out is maxOutputVrms.
- For speaker amps: damping factor × speaker impedance = rough output impedance estimate is NOT valid — only use directly stated values.
- Convert units: kΩ → ohms (×1000), mV → Vrms (÷1000), A → mA (×1000), dBV → approximate dB/V.
- Look for measurement data: "measured output impedance", "measured gain", "measured power" etc.
- If a review mentions both measured and rated specs, prefer the measured value.
- Also look for specs in comparison tables, spec boxes, "at a glance" sections.
- If power output at 4 ohms is mentioned and powerW is missing that entry, include it.
- Return {} if no missing specs could be found.
- Return ONLY JSON, no prose, no markdown.
`.trim();

/** Identify null spec fields across all ports */
export function findMissingSpecs(component: UIComponent): { portType: "inputs" | "outputs"; index: number; field: string }[] {
  const missing: { portType: "inputs" | "outputs"; index: number; field: string }[] = [];

  const checkPorts = (ports: UIComponent["inputs"] | UIComponent["outputs"], portType: "inputs" | "outputs") => {
    ports.forEach((port, index) => {
      const specs = (port.specs ?? {}) as Record<string, unknown>;
      const kind = specs.kind as string | undefined;
      let expectedFields: string[] = [];

      if (kind === "line_in") expectedFields = ["inputImpedanceOhm", "inputSensitivityVrms", "maxInputVrms"];
      else if (kind === "line_out") expectedFields = ["outputImpedanceOhm", "maxOutputVrms", "gainDb"];
      else if (kind === "phono_in") expectedFields = ["inputImpedanceOhm", "gainDb"];
      else if (kind === "phono_out") expectedFields = ["outputVoltageMv", "cartridgeType"];
      else if (kind === "speaker_out") expectedFields = ["powerW", "ratedMinImpedanceOhm", "outputImpedanceOhm", "gainDb", "inputSensitivityVrms"];
      else if (kind === "headphone_out") expectedFields = ["outputImpedanceOhm", "maxVrms", "maxCurrentMa", "gainDb"];
      else if (kind === "headphone_load") expectedFields = ["nominalImpedanceOhm", "sensitivity"];
      else if (kind === "speaker_load") expectedFields = ["nominalImpedanceOhm", "minImpedanceOhm", "sensitivityDb_2_83V_1m", "powerHandlingW"];
      else if (kind === "digital_in" || kind === "digital_out") expectedFields = ["maxSampleRateKhz", "maxBitDepth", "formats"];

      for (const field of expectedFields) {
        if (specs[field] == null) {
          missing.push({ portType, index, field });
        }
      }
    });
  };

  checkPorts(component.inputs ?? [], "inputs");
  checkPorts(component.outputs ?? [], "outputs");
  return missing;
}

/**
 * Search DuckDuckGo's HTML endpoint and return result URLs (skips PDFs and
 * manual-library sites). NOTE: this scrapes an HTML page that offers no API
 * guarantee — it is a deliberately isolated, best-effort fallback and may break
 * or be blocked at any time. Failures degrade to "no results", never an error.
 */
async function webSearch(query: string, maxResults = 5): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  let res: Response;
  try {
    res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
      headers: { "User-Agent": USER_AGENT },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const urls: string[] = [];

  // Sites that block scraping or serve PDFs — skip them
  const skipDomains = /\b(manualslib|manualzilla|manualshelf|manymanuals|manual\.nz|hifiengine)\b/i;

  $("a.result__a").each((_, el) => {
    if (urls.length >= maxResults) return;
    const href = $(el).attr("href") ?? "";
    const match = href.match(/uddg=([^&]+)/);
    const actualUrl = match ? decodeURIComponent(match[1]) : href;
    if (actualUrl.startsWith("http") && !actualUrl.endsWith(".pdf") && !skipDomains.test(actualUrl)) {
      urls.push(actualUrl);
    }
  });

  return urls;
}

/** Fetch a page and extract text content (best-effort, with timeout + SSRF + robots guard) */
async function fetchPageText(url: string): Promise<string> {
  try {
    if (!(await isAllowedByRobots(url))) return "";
    const res = await safeFetch(url, { headers: { "User-Agent": USER_AGENT } }, { timeoutMs: 10000 });
    if (!res.ok) return "";
    const contentType = res.headers.get("content-type") ?? "";
    // Skip PDFs and binary content
    if (contentType.includes("pdf") || contentType.includes("octet-stream")) return "";
    const html = await res.text();
    const $ = cheerio.load(html);
    $("nav, header, footer, script, style, noscript, svg, .ad, .sidebar").remove();
    // ASR and review sites have longer measurement sections - allow more text
    const isReviewSite = /audiosciencereview|stereophile|soundnews|head-fi/i.test(url);
    const maxLen = isReviewSite ? 15000 : 10000;
    return $("body").text().replace(/\s+/g, " ").trim().slice(0, maxLen);
  } catch {
    return "";
  }
}

/** Search the web for missing specs and enrich the component */
export async function enrichWithWebSearch(component: UIComponent): Promise<UIComponent> {
  const missing = findMissingSpecs(component);
  if (missing.length === 0) return component;

  const name = `${component.manufacturer ?? ""} ${component.name}`.trim();

  // Run multiple targeted searches in parallel for better coverage
  // Include site-specific searches for top measurement sites
  const searches = [
    `site:audiosciencereview.com ${name} review`,
    `${name} review measurements output impedance specifications`,
    `${name} specifications input impedance output voltage gain`,
    `${name} review stereophile OR soundnews OR headfi OR head-fi`,
  ];

  const searchResults = await Promise.all(searches.map(q => webSearch(q)));
  // Deduplicate URLs across all searches
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const results of searchResults) {
    for (const u of results) {
      if (!seen.has(u)) { seen.add(u); urls.push(u); }
    }
  }
  if (urls.length === 0) return component;

  // Fetch up to 8 pages, at most 2 at a time with a small delay — polite to hosts.
  const fetched = await mapWithConcurrency(urls.slice(0, 8), 2, async (u) => {
    const text = await fetchPageText(u);
    return { url: u, text };
  }, 500);
  const pageTexts: string[] = [];
  const usedUrls: string[] = [];
  for (const { url: u, text } of fetched) {
    if (text.length > 200) {
      pageTexts.push(`--- Source: ${u} ---\n${text}`);
      usedUrls.push(u);
    }
  }
  if (pageTexts.length === 0) return component;

  // Build context about what's missing
  const missingDescription = missing.map(m => {
    const port = (m.portType === "inputs" ? component.inputs : component.outputs)[m.index];
    const specs = (port.specs ?? {}) as Record<string, unknown>;
    return `${m.portType}[${m.index}] (${specs.kind}, ${port.connector}): missing ${m.field}`;
  }).join("\n");

  const prompt = `${ENRICH_PROMPT}

Component: ${component.manufacturer ?? ""} ${component.name} (${component.category})

Missing spec fields:
${missingDescription}

Review/measurement page content:
${pageTexts.join("\n\n")}`;

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: SCRAPE_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "{}";
    const patches = JSON.parse(stripCodeFences(text)) as {
      inputs?: Record<string, Record<string, unknown>>;
      outputs?: Record<string, Record<string, unknown>>;
    };

    // Apply patches to the component
    const enriched = { ...component, inputs: [...component.inputs], outputs: [...component.outputs] };

    if (patches.inputs) {
      for (const [idx, fields] of Object.entries(patches.inputs)) {
        const i = parseInt(idx);
        if (enriched.inputs[i]) {
          enriched.inputs[i] = {
            ...enriched.inputs[i],
            specs: { ...enriched.inputs[i].specs, ...fields } as typeof enriched.inputs[number]["specs"],
          };
        }
      }
    }
    if (patches.outputs) {
      for (const [idx, fields] of Object.entries(patches.outputs)) {
        const i = parseInt(idx);
        if (enriched.outputs[i]) {
          enriched.outputs[i] = {
            ...enriched.outputs[i],
            specs: { ...enriched.outputs[i].specs, ...fields } as typeof enriched.outputs[number]["specs"],
          };
        }
      }
    }

    // Update the note to indicate enrichment
    const filledCount = Object.values(patches.inputs ?? {}).reduce((n, f) => n + Object.keys(f).length, 0)
      + Object.values(patches.outputs ?? {}).reduce((n, f) => n + Object.keys(f).length, 0);
    if (filledCount > 0) {
      const sources = usedUrls.slice(0, 2).join(", ");
      enriched.note = [
        enriched.note,
        `${filledCount} spec(s) enriched from web reviews (${sources}).`,
      ].filter(Boolean).join(" ");
    }

    return enriched;
  } catch {
    // Enrichment is best-effort; return original on failure
    return component;
  }
}

/** Extract a human-readable product name from a URL slug */
function productNameFromUrl(url: string): string {
  try {
    const segments = new URL(url).pathname.split("/").filter(s => s.length > 0);
    // Walk backwards to find a meaningful slug (skip generic path words)
    const generic = /^(products?|produkte?|shop|item|model|catalog|en|de|fr|es|it|ja|collection)s?$/i;
    for (let i = segments.length - 1; i >= 0; i--) {
      if (!generic.test(segments[i]) && segments[i].length > 2) {
        return segments[i]
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
      }
    }
    return segments[segments.length - 1] ?? "";
  } catch {
    return "";
  }
}

/** Guess manufacturer name from URL hostname */
function manufacturerFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    const brand = host.split(".")[0];
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  } catch {
    return "Unknown";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizedToComponent(raw: Record<string, any>): UIComponent {
  return {
    id: raw.id ?? "",
    name: raw.name ?? "",
    category: raw.category ?? "source",
    inputs: raw.inputs ?? [],
    outputs: raw.outputs ?? [],
    note: raw.notes ?? undefined,
    manufacturer: raw.manufacturer ?? undefined,
  };
}

/** Call Claude with text context and return a UIComponent */
async function extractComponentWithClaude(inputText: string): Promise<UIComponent> {
  const result = await extractComponentJson(inputText);
  if (result["skip"]) {
    throw new Error("This page does not appear to be an audio component.");
  }
  if (!result["name"] || !result["category"]) {
    throw new Error("Could not extract component name or category from the page.");
  }

  return normalizedToComponent(result);
}

/** Fallback: search the web for specs when the product page is unreachable */
async function scrapeViaWebSearch(url: string): Promise<UIComponent> {
  const manufacturer = manufacturerFromUrl(url);
  const product = productNameFromUrl(url);
  return await searchAndExtract(manufacturer, product, url);
}

/**
 * Build a component from web search alone — for items known only by
 * manufacturer + product name (no URL), e.g. the admin discovery pipeline.
 */
export async function scrapeByQuery(manufacturer: string, product: string): Promise<UIComponent> {
  return await searchAndExtract(manufacturer, product);
}

async function searchAndExtract(manufacturer: string, product: string, originUrl?: string): Promise<UIComponent> {
  const query = `${manufacturer} ${product}`.trim();
  const origin = originUrl ? new URL(originUrl).hostname : "the product page";

  if (!query || query.length < 3) {
    throw new Error("Could not determine product name from the URL.");
  }

  // Run targeted searches in parallel
  const searches = [
    `site:audiosciencereview.com "${query}"`,
    `"${query}" specifications review measurements`,
    `"${query}" specs impedance gain power output`,
    `${query} review stereophile OR soundnews OR headfi OR audioholics`,
  ];

  const searchResults = await Promise.all(searches.map(q => webSearch(q)));
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const results of searchResults) {
    for (const u of results) {
      if (!seen.has(u)) { seen.add(u); urls.push(u); }
    }
  }

  if (urls.length === 0) {
    throw new Error(
      `Could not reach ${origin} and no alternative sources found for "${query}". Try Manual Entry instead.`
    );
  }

  // Fetch up to 8 pages, at most 2 at a time with a small delay — polite to hosts.
  const fetched = await mapWithConcurrency(urls.slice(0, 8), 2, async (u) => {
    const text = await fetchPageText(u);
    return { url: u, text };
  }, 500);
  const sources = fetched.filter(s => s.text.length > 200);

  if (sources.length === 0) {
    throw new Error(
      `Could not reach ${origin} and alternative sources were not accessible. Try Manual Entry instead.`
    );
  }

  const inputText = [
    `Manufacturer: ${manufacturer}`,
    `Product: ${product}`,
    originUrl ? `Original URL: ${originUrl}` : "",
    `\nData gathered from web reviews and spec pages:\n`,
    ...sources.map(s => `--- Source: ${s.url} ---\n${s.text}`),
  ].filter(Boolean).join("\n\n");

  const component = await extractComponentWithClaude(inputText);

  const sourceList = sources.slice(0, 3).map(s => s.url).join(", ");
  component.note = [
    component.note,
    originUrl
      ? `Specs extracted from web sources (original site unreachable): ${sourceList}`
      : `Specs extracted from web sources: ${sourceList}`,
  ].filter(Boolean).join(" ");

  return component;
}

/** Scrape a single product URL and normalize via Claude API */
export async function scrapeUrl(url: string): Promise<UIComponent> {
  // Respect the site's robots.txt: don't fetch a disallowed product page
  // directly; use public review/spec sources instead.
  if (!(await isAllowedByRobots(url))) {
    return await scrapeViaWebSearch(url);
  }
  let res: Response;
  try {
    res = await safeFetch(url, { headers: { "User-Agent": USER_AGENT } }, { timeoutMs: 15000 });
  } catch {
    // Primary fetch failed — fall back to web search
    return await scrapeViaWebSearch(url);
  }
  if (!res.ok) {
    // Server returned an error — fall back to web search
    return await scrapeViaWebSearch(url);
  }
  const html = await res.text();
  const { title, specsText, fullText } = extractSpecs(html);

  if (!specsText && !fullText) {
    // Page loaded but had no extractable content (JS-rendered) — fall back
    return await scrapeViaWebSearch(url);
  }

  const manufacturer = manufacturerFromUrl(url);
  const inputText = [
    `Manufacturer: ${manufacturer}`,
    `Product title: ${title}`,
    `URL: ${url}`,
    specsText ? `\nSpec section:\n${specsText}` : "",
    `\nFull page text:\n${fullText}`,
  ]
    .filter(Boolean)
    .join("\n");

  return await extractComponentWithClaude(inputText);
}
