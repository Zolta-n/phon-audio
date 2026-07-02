import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: new URL("../../.env.local", import.meta.url).pathname });

const supabase = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_KEY"]!, // service role bypasses RLS
);

const NORM_DIR = path.resolve(import.meta.dirname, "output/normalized");

interface NormalizedComponent {
  id?: string;
  name?: string;
  category?: string;
  manufacturer?: string;
  inputs?: unknown[];
  outputs?: unknown[];
  notes?: string;
}

async function seedManufacturer(mfrDir: string): Promise<void> {
  const files = await fs.readdir(mfrDir);
  const mfrName = path.basename(mfrDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const filePath = path.join(mfrDir, file);
    const component: NormalizedComponent = JSON.parse(
      await fs.readFile(filePath, "utf-8"),
    );

    if (!component.id || !component.name || !component.category) {
      console.log(`  Skip (incomplete): ${file}`);
      continue;
    }

    // Shape for DB: store full specs in a jsonb column
    const row = {
      id: component.id,
      name: component.name,
      category: component.category,
      manufacturer: component.manufacturer ?? mfrName,
      specs: { inputs: component.inputs, outputs: component.outputs },
      notes: component.notes ?? null,
      verified: false,
    };

    const { error } = await supabase
      .from("components")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.error(`  Error seeding ${component.name}:`, error.message);
    } else {
      console.log(`  Seeded: ${component.name}`);
    }
  }
}

async function main() {
  const mfrDirs = await fs.readdir(NORM_DIR);
  for (const mfr of mfrDirs) {
    const mfrPath = path.join(NORM_DIR, mfr);
    const stat = await fs.stat(mfrPath);
    if (!stat.isDirectory()) continue;
    console.log(`\nSeeding ${mfr}...`);
    await seedManufacturer(mfrPath);
  }
  console.log("\nSeed complete.");
}
main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
