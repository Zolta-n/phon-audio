#!/usr/bin/env tsx
// CLI wrapper for the discovery pipeline (see pipeline.ts, shared with the
// admin UI's /api/discover route).
//
//   npm run discover                                   # all enabled sources
//   npm run discover -- --sources=reddit --subs=audiophile --limit=25
//   npm run discover -- --sources=head-fi,stereophile
//
// Runs under plain tsx with the service-role key; progress is logged to the
// admin_scrape_runs table so the UI can follow along.

import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });

import { startDiscovery } from "./pipeline";

const db = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_KEY"]!, // service role bypasses RLS
);

function parseFlags(): { sources: string[] | null; subs: string[] | null; limit: number | null } {
  const flags: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([a-z-]+)=(.*)$/);
    if (m) flags[m[1]!] = m[2]!;
  }
  return {
    sources: flags["sources"] ? flags["sources"].split(",").map((s) => s.trim()) : null,
    subs: flags["subs"] ? flags["subs"].split(",").map((s) => s.trim()) : null,
    limit: flags["limit"] ? parseInt(flags["limit"], 10) : null,
  };
}

async function main() {
  const { sources, subs, limit } = parseFlags();
  const { done } = await startDiscovery(db, {
    sources,
    subs,
    limit,
    snapshotDir: path.resolve(import.meta.dirname, "output"),
  });
  await done;
}

main().catch((e) => {
  console.error("\nDiscovery failed:", e);
  process.exit(1);
});
