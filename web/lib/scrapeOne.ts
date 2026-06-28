import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";
import type { UIComponent } from "@/types";

const SCHEMA_PROMPT = `
You are extracting audio component specs from a manufacturer's product page.
Return a single JSON object matching this TypeScript interface (no prose, no markdown):

{
  "id": "kebab-case-slug",
  "name": "Full Product Name",
  "category": "dac" | "headphone_amp" | "preamp" | "power_amp" | "tube_amp_se" | "tube_amp_pp" | "integrated" | "turntable" | "source" | "headphone" | "speaker",
  "manufacturer": "Brand Name",
  "inputs": [
    {
      "domain": "digital" | "line" | "phono" | "speaker" | "headphone",
      "connector": "usb" | "coax" | "optical" | "aes" | "i2s" | "rca" | "xlr" | "trs" | "xlr4" | "speaker_binding",
      "balanced": true | false,
      "specs": { ... }
    }
  ],
  "outputs": [ ... same Port structure ... ],
  "notes": "any relevant caveats"
}

Port specs by domain:
- digital input:    { "kind": "digital_in",      "formats": ["pcm"] or ["pcm","dsd"], "maxSampleRateKhz": number, "maxBitDepth": number }
- digital output:   { "kind": "digital_out",     "formats": [...], "maxSampleRateKhz": number, "maxBitDepth": number }
- line input:       { "kind": "line_in",         "inputImpedanceOhm": number, "inputSensitivityVrms": number, "maxInputVrms": number | null }
- line output:      { "kind": "line_out",        "outputImpedanceOhm": number, "maxOutputVrms": number, "gainDb": number | null }
- phono input:      { "kind": "phono_in",        "cartridgeType": "mm" | "mc" | "both", "inputImpedanceOhm": number, "inputCapacitancePf": number | null, "gainDb": number }
- phono output:     { "kind": "phono_out",       "cartridgeType": "mm" | "mc", "outputVoltageMv": number, "internalImpedanceOhm": number | null, "recommendedLoadImpedanceOhm": number | null, "recommendedLoadCapacitancePf": number | null }
- speaker output:   { "kind": "speaker_out",     "powerW": [{"ohm":8,"watts":N},{"ohm":4,"watts":N}], "ratedMinImpedanceOhm": number, "outputImpedanceOhm": number, "gainDb": number, "inputSensitivityVrms": number }
- headphone output: { "kind": "headphone_out",   "outputImpedanceOhm": number, "maxVrms": number, "maxCurrentMa": number, "gainDb": number | null }
- headphone load:   { "kind": "headphone_load",  "nominalImpedanceOhm": number, "sensitivity": {"value": number, "unit": "dB/mW" | "dB/V"} }
- speaker load:     { "kind": "speaker_load",    "nominalImpedanceOhm": number, "minImpedanceOhm": number, "sensitivityDb_2_83V_1m": number, "powerHandlingW": number }

IMPORTANT extraction rules:
- Populate EVERY numeric spec field you can find on the page. Do NOT leave a field null if the value exists anywhere on the page.

PHONO RULES (critical — do NOT model phono as line):
- Phono inputs (MM/MC) MUST use domain "phono" with kind "phono_in" — NOT "line".
- If the amp has switchable MM/MC, set cartridgeType to "both".
- Phono impedance (e.g. 47kΩ) goes into the phono_in port, NOT into line inputs.
- Phono sensitivity (e.g. 3mV) is the cartridge output the stage expects — set gainDb based on type: ~40 dB for MM, ~60 dB for MC (use exact value if stated).
- For turntables/cartridges: category is "turntable", output domain is "phono" with kind "phono_out".

LINE INPUT RULES:
- Line input impedance is often listed separately from phono impedance. Do NOT use phono impedance for line inputs.
- If no line input impedance is stated on the page, use null — do NOT copy from the phono section.
- General "input impedance" in a non-phono context applies to line inputs.

AMP/OUTPUT RULES:
- For integrated/power amps: ALWAYS create a speaker_out output port with the power ratings.
- If a line output section mentions both "fixed" and "variable" outputs, create TWO separate line_out ports.
- The "preamp output" or "pre out" or "variable output" is a line_out port.
- General specs like "output impedance" that aren't tied to a specific port should be applied to ALL relevant output ports.

CATEGORY RULES:
- Turntables → "turntable"
- Standalone phono preamps → "preamp" (with phono_in input and line_out output)

Unit conversion rules:
- kOhms/kΩ → multiply by 1000 (47kΩ = 47000)
- mV to Vrms → divide by 1000 (3mV = 0.003 Vrms)
- A to mA → multiply by 1000
- Vp-p to Vrms → Vpp / 2.83
- If a spec is genuinely not found anywhere on the page, use null.
- If the page is for an accessory or non-audio component, return { "skip": true }.
`.trim();

/** Extract spec text from raw HTML (enhanced from crawl.ts) */
function extractSpecs(html: string): { title: string; specsText: string; fullText: string } {
  const $ = cheerio.load(html);
  $("nav, header, footer, script, style, noscript, svg").remove();

  const specChunks: string[] = [];

  // 1. Tables and definition lists
  $("table").each((_, el) => {
    specChunks.push($(el).text().replace(/\s+/g, " ").trim());
  });
  $("dl").each((_, el) => {
    specChunks.push($(el).text().replace(/\s+/g, " ").trim());
  });

  // 2. Elements with spec-related class/id
  $("[class*='spec'], [class*='Spec'], [id*='spec'], [id*='Spec']").each((_, el) => {
    specChunks.push($(el).text().replace(/\s+/g, " ").trim());
  });

  // 3. Sections near spec-related headings (Input, Output, Power, etc.)
  const specHeadingRe = /\b(spec|input|output|feature|phono|amplif|power|impedance|frequenc|signal|dac|digital|analog|connect|general)\b/i;
  $("h2, h3, h4").each((_, heading) => {
    const headingText = $(heading).text().trim();
    if (specHeadingRe.test(headingText)) {
      // Grab the heading + all sibling content until the next heading
      let text = headingText + ": ";
      let next = $(heading).next();
      for (let i = 0; i < 10 && next.length; i++) {
        const tag = next.prop("tagName")?.toLowerCase() ?? "";
        if (["h1", "h2", "h3", "h4"].includes(tag)) break;
        text += next.text().replace(/\s+/g, " ").trim() + " ";
        next = next.next();
      }
      if (text.length > 20) specChunks.push(text.trim());
    }
  });

  // 4. Any remaining <ul>/<ol> lists that look like specs (contain numbers/units)
  const unitRe = /\d+\s*(ohm|Ω|hz|khz|mhz|db|watt|w\b|vrms|mv|ma\b|bit)/i;
  $("ul, ol").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (unitRe.test(text) && text.length > 20) {
      specChunks.push(text);
    }
  });

  const title = $("h1").first().text().trim() || $("title").text().split("|")[0].trim();
  const specsText = [...new Set(specChunks)].join("\n\n");
  const fullText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 12000);

  return { title, specsText, fullText };
}

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
function findMissingSpecs(component: UIComponent): { portType: "inputs" | "outputs"; index: number; field: string }[] {
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

/** Search DuckDuckGo and return result URLs (skips PDFs and manual-library sites) */
async function webSearch(query: string, maxResults = 5): Promise<string[]> {
  const encoded = encodeURIComponent(query);
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encoded}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
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

/** Fetch a page and extract text content (best-effort, with timeout) */
async function fetchPageText(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
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

  // Fetch up to 8 pages in parallel for speed
  const fetched = await Promise.all(urls.slice(0, 8).map(async (u) => {
    const text = await fetchPageText(u);
    return { url: u, text };
  }));
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
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "{}";
    const json = text.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();
    const patches = JSON.parse(json) as {
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
  const client = new Anthropic();
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [
      { role: "user", content: `${SCHEMA_PROMPT}\n\nProduct page content:\n${inputText}` },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  const json = text
    .replace(/^```[a-z]*\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  const result: Record<string, unknown> = JSON.parse(json);
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
  const query = `${manufacturer} ${product}`.trim();

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
      `Could not reach ${new URL(url).hostname} and no alternative sources found for "${query}". Try Manual Entry instead.`
    );
  }

  // Fetch up to 8 pages in parallel
  const fetched = await Promise.all(urls.slice(0, 8).map(async (u) => {
    const text = await fetchPageText(u);
    return { url: u, text };
  }));
  const sources = fetched.filter(s => s.text.length > 200);

  if (sources.length === 0) {
    throw new Error(
      `Could not reach ${new URL(url).hostname} and alternative sources were not accessible. Try Manual Entry instead.`
    );
  }

  const inputText = [
    `Manufacturer: ${manufacturer}`,
    `Product: ${product}`,
    `Original URL: ${url}`,
    `\nData gathered from web reviews and spec pages:\n`,
    ...sources.map(s => `--- Source: ${s.url} ---\n${s.text}`),
  ].join("\n\n");

  const component = await extractComponentWithClaude(inputText);

  const sourceList = sources.slice(0, 3).map(s => s.url).join(", ");
  component.note = [
    component.note,
    `Specs extracted from web sources (original site unreachable): ${sourceList}`,
  ].filter(Boolean).join(" ");

  return component;
}

/** Scrape a single product URL and normalize via Claude API */
export async function scrapeUrl(url: string): Promise<UIComponent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    // Primary fetch failed — fall back to web search
    return await scrapeViaWebSearch(url);
  }
  clearTimeout(timeout);
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
