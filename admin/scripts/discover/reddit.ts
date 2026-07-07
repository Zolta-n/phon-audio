// Reddit official API client (OAuth2 client-credentials "script" app).
// Plain fetch, no SDK. Respects Reddit's rate guidance: sequential requests
// with a delay, honest User-Agent, aggregate counts only stored downstream.

import type { Snippet } from "./sources";

const REDDIT_UA = "PhonAudioBot/1.0 (component discovery; contact via phon-audio.com)";
const DELAY_MS = 1100; // < 60 req/min, well under the 100 QPM cap

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  permalink: string;
  num_comments: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const id = process.env["REDDIT_CLIENT_ID"];
  const secret = process.env["REDDIT_CLIENT_SECRET"];
  if (!id || !secret) {
    throw new Error("REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET not set in admin/.env.local");
  }
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_UA,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Reddit token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cachedToken.token;
}

async function apiGet(path: string): Promise<unknown> {
  const token = await getToken();
  await new Promise((r) => setTimeout(r, DELAY_MS));
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": REDDIT_UA },
  });
  if (!res.ok) throw new Error(`Reddit API ${path} failed: ${res.status}`);
  return res.json();
}

function postsFromListing(json: unknown): RedditPost[] {
  const listing = json as { data?: { children?: { data: RedditPost }[] } };
  return (listing.data?.children ?? []).map((c) => c.data);
}

/**
 * Top posts of the past month for a subreddit, as extraction snippets:
 * the post title+selftext, plus top-level comment bodies for the most
 * commented posts.
 */
export async function fetchSubredditSnippets(
  sub: string,
  { postLimit = 100, commentPosts = 10, log = console.log }: {
    postLimit?: number;
    commentPosts?: number;
    log?: (msg: string) => void;
  } = {}
): Promise<Snippet[]> {
  log(`  r/${sub}: fetching top ${postLimit} posts (month)…`);
  const listing = await apiGet(`/r/${sub}/top?t=month&limit=${Math.min(postLimit, 100)}`);
  const posts = postsFromListing(listing);

  const snippets: Snippet[] = posts.map((p) => ({
    text: `${p.title}. ${p.selftext}`.slice(0, 600),
    url: `https://www.reddit.com${p.permalink}`,
    sourceId: "reddit",
  }));

  // Comments of the most-discussed posts carry the actual gear recommendations.
  const busiest = [...posts]
    .sort((a, b) => b.num_comments - a.num_comments)
    .slice(0, commentPosts);
  for (const post of busiest) {
    try {
      const thread = (await apiGet(
        `/r/${sub}/comments/${post.id}?limit=100&depth=2`
      )) as unknown[];
      const commentListing = thread[1];
      const comments = postsFromListing(commentListing) as unknown as { body?: string }[];
      for (const c of comments) {
        if (c.body && c.body.length > 20) {
          snippets.push({
            text: c.body.slice(0, 400),
            url: `https://www.reddit.com${post.permalink}`,
            sourceId: "reddit",
          });
        }
      }
    } catch (e) {
      log(`  r/${sub}: comments for ${post.id} failed (${(e as Error).message}), continuing`);
    }
  }

  log(`  r/${sub}: ${snippets.length} snippets`);
  return snippets;
}
