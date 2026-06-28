import { chromium } from "playwright";
import * as cheerio from "cheerio";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { MANUFACTURERS } from "./manufacturers.js";
import type { ManufacturerConfig } from "./manufacturers.js";

const OUTPUT_DIR = path.resolve(import.meta.dirname, "output/raw");

interface RawProduct {
  manufacturer: string;
  url: string;
  title: string;
  specsText: string;   // extracted spec table/list text
  fullText: string;    // full page text for AI fallback
  scrapedAt: string;
}

async function extractSpecs(
  html: string,
): Promise<{ title: string; specsText: string; fullText: string }> {
  const $ = cheerio.load(html);

  // Remove nav, header, footer, scripts, styles
  $("nav, header, footer, script, style, noscript, svg").remove();

  // Extract spec tables and definition lists
  const specChunks: string[] = [];

  $("table").each((_, el) => {
    specChunks.push($(el).text().replace(/\s+/g, " ").trim());
  });

  $("dl").each((_, el) => {
    specChunks.push($(el).text().replace(/\s+/g, " ").trim());
  });

  $("[class*='spec'], [class*='Spec'], [id*='spec'], [id*='Spec']").each(
    (_, el) => {
      specChunks.push($(el).text().replace(/\s+/g, " ").trim());
    },
  );

  const title =
    $("h1").first().text().trim() || $("title").text().split("|")[0].trim();
  const specsText = specChunks.join("\n\n");
  const fullText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);

  return { title, specsText, fullText };
}

async function crawlManufacturer(config: ManufacturerConfig): Promise<void> {
  console.log(`\nCrawling ${config.name}...`);
  const outDir = path.join(OUTPUT_DIR, config.id);
  await fs.mkdir(outDir, { recursive: true });

  const browser = config.needsPlaywright
    ? await chromium.launch({ headless: true })
    : null;

  const productUrls = new Set<string>();

  for (const listingUrl of config.listingUrls) {
    try {
      let html: string;
      if (browser) {
        const page = await browser.newPage();
        await page.goto(listingUrl, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        html = await page.content();
        await page.close();
      } else {
        const res = await fetch(listingUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; PhonAudioBot/1.0; +https://phon-audio.com/bot)",
          },
        });
        html = await res.text();
      }

      const $ = cheerio.load(html);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href") ?? "";
        const fullUrl = href.startsWith("http")
          ? href
          : new URL(href, listingUrl).toString();
        if (
          fullUrl.includes(config.productLinkPattern) &&
          !productUrls.has(fullUrl)
        ) {
          productUrls.add(fullUrl);
        }
      });

      console.log(`  Found ${productUrls.size} products on ${listingUrl}`);
      await new Promise<void>((r) => setTimeout(r, config.rateLimit));
    } catch (e) {
      console.error(`  Error crawling ${listingUrl}:`, e);
    }
  }

  for (const url of productUrls) {
    const slug =
      url.split("/").filter(Boolean).pop() ??
      url.replace(/[^a-z0-9]/gi, "-");
    const outFile = path.join(outDir, `${slug}.json`);

    // Skip if already crawled
    try {
      await fs.access(outFile);
      console.log(`  Skip (exists): ${slug}`);
      continue;
    } catch {
      // file does not exist — proceed
    }

    try {
      let html: string;
      if (browser) {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        html = await page.content();
        await page.close();
      } else {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; PhonAudioBot/1.0; +https://phon-audio.com/bot)",
          },
        });
        html = await res.text();
      }

      const { title, specsText, fullText } = await extractSpecs(html);
      const raw: RawProduct = {
        manufacturer: config.name,
        url,
        title,
        specsText,
        fullText,
        scrapedAt: new Date().toISOString(),
      };

      await fs.writeFile(outFile, JSON.stringify(raw, null, 2));
      console.log(`  Saved: ${title || slug}`);
      await new Promise<void>((r) => setTimeout(r, config.rateLimit));
    } catch (e) {
      console.error(`  Error on ${url}:`, e);
    }
  }

  if (browser) await browser.close();
}

// CLI: npx tsx crawl.ts [manufacturer-id]
const target = process.argv[2];
const targets = target
  ? MANUFACTURERS.filter((m) => m.id === target)
  : MANUFACTURERS;

if (targets.length === 0) {
  console.error(
    `Manufacturer "${target}" not found. Available: ${MANUFACTURERS.map((m) => m.id).join(", ")}`,
  );
  process.exit(1);
}

async function main() {
  for (const config of targets) {
    await crawlManufacturer(config);
  }
  console.log("\nCrawl complete.");
}
main();
