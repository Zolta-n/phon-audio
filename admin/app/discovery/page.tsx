import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import type { DiscoveredBrandRow, DiscoveredComponentRow } from "../../lib/rows";
import { DiscoveryTable, type DiscoveryRow } from "./DiscoveryTable";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  await requireAdminPage();
  const db = createServiceClient();

  const [compsRes, brandsRes] = await Promise.all([
    db
      .from("discovered_components")
      .select("*")
      .order("popularity", { ascending: false })
      .limit(1000),
    db.from("discovered_brands").select("id, name"),
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
      {rows.length === 0 ? (
        <div className="adm-card p-6 text-sm text-adm-muted">
          Nothing discovered yet. Run{" "}
          <code className="text-adm-text">cd admin && npm run discover</code> first.
        </div>
      ) : (
        <DiscoveryTable rows={rows} />
      )}
    </div>
  );
}
