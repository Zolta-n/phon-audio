// ---------------------------------------------------------------------------
// Shared scrape logic — single source of truth for the batch pipeline
// (scripts/scrape/*) and the on-demand scraper (lib/scrapeOne.ts). Both must
// produce identically-shaped components, so the prompt, the HTML spec
// extractor, and the Claude call live here and nowhere else.
//
// No `server-only` import here: the scripts run under plain tsx.
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import * as cheerio from "cheerio";

/** Honest, identifying UA for all outbound scraping. */
export const USER_AGENT =
  "Mozilla/5.0 (compatible; PhonAudioBot/1.0; +https://phon-audio.com/bot)";

/** One model for both pipelines so batch and on-demand output match. */
export const SCRAPE_MODEL = "claude-sonnet-4-6";

export interface RawProduct {
  manufacturer: string;
  url: string;
  title: string;
  specsText: string; // extracted spec table/list text
  fullText: string; // full page text for AI fallback
  scrapedAt: string;
}

export const SCHEMA_PROMPT = `
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

/** Extract title + spec-ish text chunks from a product page's HTML. */
export function extractSpecs(html: string): { title: string; specsText: string; fullText: string } {
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

/** Strip a single wrapping markdown code fence, if present. */
export function stripCodeFences(text: string): string {
  return text.replace(/^```[a-z]*\n?/m, "").replace(/\n?```$/m, "").trim();
}

/**
 * Run the shared extraction prompt over page text and parse the JSON reply.
 * Returns the raw parsed object; callers check for the `{ skip: true }` sentinel.
 */
export async function extractComponentJson(
  inputText: string,
  { maxTokens = 4096 }: { maxTokens?: number } = {},
): Promise<Record<string, unknown>> {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: SCRAPE_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "user", content: `${SCHEMA_PROMPT}\n\nProduct page content:\n${inputText}` },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";
  return JSON.parse(stripCodeFences(text)) as Record<string, unknown>;
}

// ─── robots.txt ──────────────────────────────────────────────────────

const robotsCache = new Map<string, { fetchedAt: number; groups: RobotsGroup[] }>();
const ROBOTS_TTL_MS = 60 * 60_000;

interface RobotsGroup {
  agents: string[];
  rules: { allow: boolean; path: string }[];
}

function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;
    const value = rest.join(":").trim();
    const field = key.trim().toLowerCase();
    if (field === "user-agent") {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "disallow" || field === "allow") && current) {
      current.rules.push({ allow: field === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

/**
 * Best-effort robots.txt check for our bot. Longest-prefix-match of allow /
 * disallow rules in the most specific matching group. Unreachable or missing
 * robots.txt counts as allowed.
 */
export async function isAllowedByRobots(rawUrl: string, botToken = "phonaudiobot"): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  const origin = url.origin;
  let entry = robotsCache.get(origin);
  if (!entry || Date.now() - entry.fetchedAt > ROBOTS_TTL_MS) {
    let groups: RobotsGroup[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) groups = parseRobots(await res.text());
    } catch {
      // Unreachable robots.txt → treat as allowed
    }
    entry = { fetchedAt: Date.now(), groups };
    robotsCache.set(origin, entry);
  }

  const specific = entry.groups.filter((g) => g.agents.some((a) => a.includes(botToken)));
  const applicable = specific.length > 0 ? specific : entry.groups.filter((g) => g.agents.includes("*"));
  if (applicable.length === 0) return true;

  const pathname = url.pathname || "/";
  let best: { allow: boolean; length: number } | null = null;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (rule.path === "") continue; // "Disallow:" (empty) = allow all
      if (pathname.startsWith(rule.path) && (!best || rule.path.length > best.length)) {
        best = { allow: rule.allow, length: rule.path.length };
      }
    }
  }
  return best ? best.allow : true;
}

/** Map with bounded concurrency and an optional delay between task starts. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  delayMs = 0,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      if (delayMs > 0 && i >= limit) await new Promise((r) => setTimeout(r, delayMs));
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
