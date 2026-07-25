import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import { CatalogManager, type CatalogRow } from "./CatalogManager";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  await requireAdminPage();
  const db = createServiceClient();
  const { data } = await db
    .from("components")
    .select("id, name, category, manufacturer, active, verified")
    .order("category")
    .order("name");
  const rows = (data ?? []) as CatalogRow[];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Catalog</h1>
      <p className="text-sm text-adm-muted mb-6">
        Live components in the public catalog. <strong>Deactivate</strong> to hide one from users
        without losing it (safe, reversible — keeps saved chains working). <strong>Delete</strong>{" "}
        removes it permanently and is blocked if any saved chain uses it.
      </p>
      {rows.length === 0 ? (
        <div className="adm-card p-6 text-sm text-adm-muted">No components in the catalog yet.</div>
      ) : (
        <CatalogManager rows={rows} />
      )}
    </div>
  );
}
