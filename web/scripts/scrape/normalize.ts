import * as fs from "node:fs/promises";
import * as path from "node:path";
import dotenv from "dotenv";
import { extractComponentJson, type RawProduct } from "../../lib/scrape-shared.js";
dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });

const RAW_DIR  = path.resolve(import.meta.dirname, "output/raw");
const NORM_DIR = path.resolve(import.meta.dirname, "output/normalized");

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

  const result = await extractComponentJson(inputText, { maxTokens: 2048 });
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
main().catch((e) => {
  console.error("Normalization failed:", e);
  process.exit(1);
});
