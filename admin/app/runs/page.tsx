import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import type { ScrapeRunRow } from "../../lib/rows";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  running: "adm-badge-warn",
  succeeded: "adm-badge-ok",
  failed: "adm-badge-err",
  cancelled: "",
};

export default async function RunsPage() {
  await requireAdminPage();
  const db = createServiceClient();

  const { data } = await db
    .from("admin_scrape_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);
  const runs = (data ?? []) as ScrapeRunRow[];
  const hasRunning = runs.some((r) => r.status === "running");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Runs</h1>
        <AutoRefresh enabled={hasRunning} />
      </div>

      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Status</th>
              <th>Started</th>
              <th>Finished</th>
              <th>Stats</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td><span className="adm-badge adm-badge-accent">{r.kind}</span></td>
                <td><span className={`adm-badge ${STATUS_BADGE[r.status] ?? ""}`}>{r.status}</span></td>
                <td className="text-adm-muted">{new Date(r.started_at).toLocaleString()}</td>
                <td className="text-adm-muted">
                  {r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}
                </td>
                <td>
                  <code className="text-xs">{JSON.stringify(r.stats)}</code>
                </td>
                <td className="text-adm-err max-w-xs truncate" title={r.error ?? undefined}>
                  {r.error ?? ""}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="text-adm-muted">No runs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
