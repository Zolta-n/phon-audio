import Link from "next/link";
import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import type { StagedComponentRow } from "../../lib/rows";

export const dynamic = "force-dynamic";

const REVIEW_BADGE: Record<string, string> = {
  pending: "adm-badge-warn",
  approved: "adm-badge-ok",
  rejected: "adm-badge-err",
  migrated: "adm-badge-info",
};

export default async function StagedPage() {
  await requireAdminPage();
  const db = createServiceClient();

  const { data } = await db
    .from("staged_components")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as StagedComponentRow[];

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Staged components</h1>
      <p className="text-sm text-adm-muted mb-6">
        Collected data awaiting review. Approve, then migrate into the live catalog.
      </p>

      {rows.length === 0 ? (
        <div className="adm-card p-6 text-sm text-adm-muted">
          Nothing staged yet. Run collection first.
        </div>
      ) : (
        <div className="adm-card overflow-x-auto">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Manufacturer</th>
                <th>Category</th>
                <th>Missing</th>
                <th>To verify</th>
                <th>Review</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const verifyCount = Object.values(r.field_meta ?? {}).filter(
                  (m) => m.status === "verify"
                ).length;
                const missingCount = (r.missing_fields ?? []).length;
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/staged/${r.id}`} className="font-medium text-adm-accent hover:underline">
                        {r.name}
                      </Link>
                      <div className="text-xs text-adm-muted">{r.id}</div>
                    </td>
                    <td>{r.manufacturer ?? "—"}</td>
                    <td className="text-adm-muted">{r.category}</td>
                    <td>
                      {missingCount > 0 ? (
                        <span className="adm-badge adm-badge-err">{missingCount} missing</span>
                      ) : (
                        <span className="adm-badge adm-badge-ok">complete</span>
                      )}
                    </td>
                    <td>
                      {verifyCount > 0 ? (
                        <span className="adm-badge adm-badge-warn">{verifyCount} to verify</span>
                      ) : (
                        <span className="text-adm-muted text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`adm-badge ${REVIEW_BADGE[r.review_status] ?? ""}`}>
                        {r.review_status}
                      </span>
                    </td>
                    <td className="text-adm-muted">{new Date(r.updated_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
