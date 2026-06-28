#!/usr/bin/env tsx
import { execSync } from "node:child_process";
import * as path from "node:path";

const SCRIPTS = path.resolve(import.meta.dirname);

const step = process.argv[2] ?? "all";

function run(script: string, args = ""): void {
  const cmd = `npx tsx ${SCRIPTS}/${script}${args ? ` ${args}` : ""}`;
  console.log(`\n${"=".repeat(60)}\nRunning: ${cmd}\n${"=".repeat(60)}`);
  execSync(cmd, { stdio: "inherit" });
}

switch (step) {
  case "crawl":
    run("crawl.ts", process.argv[3] ?? "");
    break;
  case "normalize":
    run("normalize.ts");
    break;
  case "seed":
    run("seed-db.ts");
    break;
  case "all":
    run("crawl.ts");
    run("normalize.ts");
    run("seed-db.ts");
    break;
  default:
    console.error(
      `Unknown step: ${step}. Use: crawl [mfr-id] | normalize | seed | all`,
    );
    process.exit(1);
}
