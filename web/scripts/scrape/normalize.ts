import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });

const client = new Anthropic();
const RAW_DIR  = path.resolve(import.meta.dirname, "output/raw");
const NORM_DIR = path.resolve(import.meta.dirname, "output/normalized");

const SCHEMA_PROMPT = `
You are extracting audio component specs from a manufacturer's product page.
Return a single JSON object matching this TypeScript interface (no prose, no markdown):

{
  "id": "kebab-case-slug",
  "name": "Full Product Name",
  "category": "dac" | "headphone_amp" | "preamp" | "power_amp" | "integrated" | "source" | "headphone" | "speaker",
  "manufacturer": "Brand Name",
  "inputs": [
    {
      "domain": "digital" | "line" | "speaker" | "headphone",
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
- speaker output:   { "kind": "speaker_out",     "powerW": [{"ohm":8,"watts":N},{"ohm":4,"watts":N}], "ratedMinImpedanceOhm": number, "outputImpedanceOhm": number, "gainDb": number, "inputSensitivityVrms": number }
- headphone output: { "kind": "headphone_out",   "outputImpedanceOhm": number, "maxVrms": number, "maxCurrentMa": number, "gainDb": number | null }
- headphone load:   { "kind": "headphone_load",  "nominalImpedanceOhm": number, "sensitivity": {"value": number, "unit": "dB/mW" | "dB/V"} }
- speaker load:     { "kind": "speaker_load",    "nominalImpedanceOhm": number, "minImpedanceOhm": number, "sensitivityDb_2_83V_1m": number, "powerHandlingW": number }

Unit conversion rules:
- Convert mA to mA (keep as-is). Convert A to mA (multiply by 1000).
- Convert Vrms from Vp-p: Vrms = Vpp / (2 * sqrt(2)) ≈ Vpp / 2.83
- "Sensitivity" for speakers: find the number in format "XX dB @ 2.83V/1m" or "XX dB/W/m" — use sensitivityDb_2_83V_1m
- If a spec is not found, use null for optional fields. Do not guess.
- If the page is for an accessory or non-audio component, return { "skip": true }.
`.trim();

interface RawProduct {
  manufacturer: string;
  url: string;
  title: string;
  specsText: string;
  fullText: string;
  scrapedAt: string;
}

async function normalizeProduct(
  rawPath: string,
  outPath: string,
): Promise<void> {
  const raw: RawProduct = JSON.parse(await fs.readFile(rawPath, "utf-8"));

  const inputText = [
    `Manufacturer: ${raw.manufacturer}`,
    `Product title: ${raw.title}`,
    `URL: ${raw.url}`,
    `\nSpec section:\n${raw.specsText}`,
    raw.specsText.length < 200 ? `\nFull page text:\n${raw.fullText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${SCHEMA_PROMPT}\n\nProduct page content:\n${inputText}`,
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const text = textBlock?.type === "text" ? textBlock.text : "";

  // Strip markdown code fences if present
  const json = text
    .replace(/^```[a-z]*\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  const result: Record<string, unknown> = JSON.parse(json);
  if (result["skip"]) {
    console.log(`  Skip (not a component): ${raw.title}`);
    return;
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(result, null, 2));
  console.log(`  Normalized: ${result["name"] ?? path.basename(outPath)}`);
}

// Process all raw files
async function main() {
const manufacturerDirs = await fs.readdir(RAW_DIR);

for (const mfr of manufacturerDirs) {
  const mfrDir = path.join(RAW_DIR, mfr);
  const stat = await fs.stat(mfrDir);
  if (!stat.isDirectory()) continue;

  const files = await fs.readdir(mfrDir);
  console.log(`\nNormalizing ${mfr} (${files.length} products)...`);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const rawPath = path.join(mfrDir, file);
    const outPath = path.join(NORM_DIR, mfr, file);

    // Skip if already normalized
    try {
      await fs.access(outPath);
      console.log(`  Skip (exists): ${file}`);
      continue;
    } catch {
      // file does not exist — proceed
    }

    try {
      await normalizeProduct(rawPath, outPath);
      await new Promise<void>((r) => setTimeout(r, 500)); // rate limit API calls
    } catch (e) {
      console.error(`  Error normalizing ${file}:`, e);
    }
  }
}
  console.log("\nNormalization complete.");
} // end main
main();
