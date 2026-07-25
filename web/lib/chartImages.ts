// Pure chart-image finder (cheerio only, no server-only deps) so it stays
// unit-testable from the root runner, separate from graphExtract's fetch/vision
// path which pulls in the SSRF guard (server-only).

import * as cheerio from "cheerio";

// Chart images name the measurement; junk images (logos, avatars, ads) don't.
const CHART_HINT = /frequency|impedance|response|thd|distortion|spinorama|harmonic|\bcsd\b|\bfr\b|waterfall|sensitivity/i;
const JUNK_HINT = /logo|icon|avatar|sprite|banner|ad[-_]|thumb|emoji|badge|favicon/i;
const IMAGE_URL = /\.(png|jpe?g|gif|webp)(\?|$)/i;

/**
 * Extract candidate measurement-chart image URLs from a page's HTML. Pure — no
 * I/O. Keeps `<img>` whose src/alt/class names a measurement and skips obvious
 * chrome; resolves to absolute URLs against `baseUrl`; deduped and capped at 6.
 */
export function findChartImages(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();

  $("img").each((_, el) => {
    if (urls.length >= 6) return;
    const rawSrc = ($(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "").trim();
    if (!rawSrc || rawSrc.startsWith("data:")) return;
    const hint = `${rawSrc} ${$(el).attr("alt") ?? ""} ${$(el).attr("class") ?? ""} ${$(el).attr("title") ?? ""}`;
    if (!CHART_HINT.test(hint) || JUNK_HINT.test(hint)) return;

    let abs: string;
    try {
      abs = new URL(rawSrc, baseUrl).toString();
    } catch {
      return;
    }
    // Keep only real image URLs (extension present) — avoids tracking pixels and
    // SPA route links that happen to match a hint word.
    if (!abs.startsWith("http") || !IMAGE_URL.test(abs)) return;
    if (seen.has(abs)) return;
    seen.add(abs);
    urls.push(abs);
  });

  return urls;
}
