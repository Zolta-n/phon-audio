// Declarative registry of discovery sources (modeled on
// web/scripts/scrape/manufacturers.ts). Two kinds:
//   - reddit: official API, handled by reddit.ts
//   - html:   forum/magazine listing pages, fetched politely with cheerio
//
// This module runs under plain tsx — it may only import web/lib/scrape-shared
// (deliberately server-only-free), never web/lib/scrapeOne or urlGuard.

import * as cheerio from "cheerio";
import {
  USER_AGENT,
  isAllowedByRobots,
  mapWithConcurrency,
} from "../../../web/lib/scrape-shared";

/** A unit of community text to run entity extraction over. */
export interface Snippet {
  text: string;
  url: string; // where the mention was seen (thread/article)
  sourceId: string;
}

export interface HtmlSource {
  id: string;
  name: string;
  kind: "forum" | "magazine";
  /** Popularity weight: editorial mentions score higher than forum chatter. */
  weight: number;
  /** Listing/index pages whose item titles we harvest. */
  urls: string[];
  /**
   * CSS selector for one item title (thread row / article headline). The
   * nearest ancestor/self <a> supplies the mention URL.
   */
  titleSelector: string;
  enabled: boolean;
  rateLimitMs: number;
}

export const SOURCE_WEIGHTS: Record<string, number> = {
  reddit: 1.0,
  "head-fi": 0.8,
  asr: 0.8,
  hoffman: 0.8,
  stereophile: 1.2,
  whathifi: 1.2,
  darko: 1.2,
};

export const REDDIT_SUBS = [
  "audiophile",
  "headphones",
  "BudgetAudiophile",
  "StereoAdvice",
];

export const HTML_SOURCES: HtmlSource[] = [
  // ── Forums (XenForo thread lists) ─────────────────────────────────
  {
    id: "head-fi",
    name: "Head-Fi",
    kind: "forum",
    weight: SOURCE_WEIGHTS["head-fi"],
    urls: [
      "https://www.head-fi.org/forums/headphones-full-size.4/",
      "https://www.head-fi.org/forums/headphone-amps-full-size.5/",
      "https://www.head-fi.org/forums/dedicated-source-components.19/",
    ],
    titleSelector: ".structItem-title a",
    enabled: true,
    rateLimitMs: 2500,
  },
  {
    id: "asr",
    name: "AudioScienceReview",
    kind: "forum",
    weight: SOURCE_WEIGHTS["asr"],
    urls: [
      "https://www.audiosciencereview.com/forum/index.php?forums/audio-science-audiophile-discussions.2/",
      "https://www.audiosciencereview.com/forum/index.php?forums/dac-and-adc.10/",
      "https://www.audiosciencereview.com/forum/index.php?forums/amplifiers-phono-preamps.11/",
      "https://www.audiosciencereview.com/forum/index.php?forums/headphones-iems-headphone-amplifiers.20/",
      "https://www.audiosciencereview.com/forum/index.php?forums/speakers.13/",
    ],
    titleSelector: ".structItem-title a",
    enabled: true,
    rateLimitMs: 2500,
  },
  {
    id: "hoffman",
    name: "Steve Hoffman Forums",
    kind: "forum",
    weight: SOURCE_WEIGHTS["hoffman"],
    urls: ["https://forums.stevehoffman.tv/forums/audio-hardware.19/"],
    titleSelector: ".structItem-title a",
    enabled: true,
    rateLimitMs: 2500,
  },
  // ── Magazines / portals ───────────────────────────────────────────
  {
    id: "stereophile",
    name: "Stereophile",
    kind: "magazine",
    weight: SOURCE_WEIGHTS["stereophile"],
    urls: [
      "https://www.stereophile.com/category/amplification-reviews",
      "https://www.stereophile.com/category/digital-processor-reviews",
      "https://www.stereophile.com/category/loudspeaker-reviews",
      "https://www.stereophile.com/category/headphone-reviews",
    ],
    titleSelector: "h2 a, .views-row .title a",
    enabled: true,
    rateLimitMs: 2500,
  },
  {
    id: "whathifi",
    name: "What Hi-Fi?",
    kind: "magazine",
    weight: SOURCE_WEIGHTS["whathifi"],
    urls: ["https://www.whathifi.com/reviews"],
    titleSelector: "a.article-link h3, .listingResult .article-name",
    enabled: true,
    rateLimitMs: 2500,
  },
  {
    id: "darko",
    name: "Darko.Audio",
    kind: "magazine",
    weight: SOURCE_WEIGHTS["darko"],
    urls: ["https://darko.audio/category/reviews/"],
    titleSelector: "h2.entry-title a, h3.entry-title a",
    enabled: true,
    rateLimitMs: 2500,
  },
];

/** Harvest item titles from one HTML source's listing pages. */
export async function fetchHtmlSourceSnippets(
  source: HtmlSource,
  { log = console.log }: { log?: (msg: string) => void } = {}
): Promise<Snippet[]> {
  const snippets: Snippet[] = [];

  await mapWithConcurrency(
    source.urls,
    1,
    async (url) => {
      if (!(await isAllowedByRobots(url))) {
        log(`  ${source.id}: SKIPPED by robots.txt: ${url}`);
        return;
      }
      let res: Response;
      try {
        res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      } catch (e) {
        log(`  ${source.id}: fetch failed for ${url} (${(e as Error).message})`);
        return;
      }
      if (!res.ok) {
        log(`  ${source.id}: HTTP ${res.status} for ${url}`);
        return;
      }
      const $ = cheerio.load(await res.text());
      let found = 0;
      $(source.titleSelector).each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text.length < 8 || text.length > 250) return;
        const a = $(el).is("a") ? $(el) : $(el).closest("a");
        const href = a.attr("href") ?? "";
        const itemUrl = href ? new URL(href, url).toString() : url;
        snippets.push({ text, url: itemUrl, sourceId: source.id });
        found++;
      });
      log(`  ${source.id}: ${found} titles from ${url}`);
    },
    source.rateLimitMs
  );

  return snippets;
}
