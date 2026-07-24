import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import type { DiscoveredBrandRow, DiscoveredComponentRow, ScrapeRunRow } from "../../lib/rows";
import { HTML_SOURCES } from "../../scripts/discover/sources";
import { DiscoveryTable, type DiscoveryRow } from "./DiscoveryTable";
import { DiscoveryRunner, type SourceOption } from "./DiscoveryRunner";

export const dynamic = "force-dynamic";

const SOURCE_OPTIONS: SourceOption[] = [
  { id: "reddit", name: "Reddit" },
  ...HTML_SOURCES.filter((s) => s.enabled).map((s) => ({ id: s.id, name: s.name })),
];

export default async function DiscoveryPage() {
  await requireAdminPage();
  const db = createServiceClient();

  const [compsRes, brandsRes, runRes] = await Promise.all([
    db
      .from("discovered_components")
      .select("*")
      .order("popularity", { ascending: false })
      .limit(1000),
    db.from("discovered_brands").select("id, name"),
    db
      .from("admin_scrape_runs")
      .select("*")
      .eq("kind", "discovery")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const components = (compsRes.data ?? []) as DiscoveredComponentRow[];
  const brands = (brandsRes.data ?? []) as Pick<DiscoveredBrandRow, "id" | "name">[];
  const brandName = new Map(brands.map((b) => [b.id, b.name]));

  // Resolve matched catalog names so the admin can judge fuzzy matches.
  const matchedIds = [...new Set(components.map((c) => c.matched_component_id).filter(Boolean))] as string[];
  const matchedNames = new Map<string, string>();
  if (matchedIds.length > 0) {
    const { data } = await db.from("components").select("id, name").in("id", matchedIds);
    for (const row of data ?? []) matchedNames.set(row.id, row.name);
  }

  const rows: DiscoveryRow[] = components.map((c) => ({
    ...c,
    brandName: (c.brand_id && brandName.get(c.brand_id)) || c.brand_id || "—",
    matchedName: c.matched_component_id ? (matchedNames.get(c.matched_component_id) ?? c.matched_component_id) : null,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Discovery</h1>
      <p className="text-sm text-adm-muted mb-6">
        Community-ranked components. Queue items not yet in the catalog for data collection.
      </p>
      <DiscoveryRunner
        sources={SOURCE_OPTIONS}
        redditConfigured={Boolean(process.env.REDDIT_CLIENT_ID)}
        initialRun={(runRes.data as ScrapeRunRow | null) ?? null}
      />
      {rows.length === 0 ? (
        <div className="adm-card p-6 text-sm text-adm-muted">
          Nothing discovered yet. Start a discovery run above (or{" "}
          <code className="text-adm-text">cd admin && npm run discover</code> from the CLI).
        </div>
      ) : (
        <DiscoveryTable rows={rows} />
      )}
    </div>
  );
}
