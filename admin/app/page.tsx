import Link from "next/link";
import { requireAdminPage } from "../lib/adminAuth";
import { createServiceClient } from "../lib/supabase-admin";
import type { ScrapeRunRow } from "../lib/rows";

export const dynamic = "force-dynamic";

async function count(
  db: ReturnType<typeof createServiceClient>,
  table: string,
  filter?: { column: string; value: string }
): Promise<number> {
  let q = db.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.column, filter.value);
  const { count: n } = await q;
  return n ?? 0;
}

export default async function DashboardPage() {
  const user = await requireAdminPage();
  const db = createServiceClient();

  const [
    brands,
    discovered,
    notInDb,
    selected,
    staged,
    approved,
    catalog,
    lastRunRes,
  ] = await Promise.all([
    count(db, "discovered_brands"),
    count(db, "discovered_components"),
    db
      .from("discovered_components")
      .select("*", { count: "exact", head: true })
      .is("matched_component_id", null)
      .then((r) => r.count ?? 0),
    count(db, "discovered_components", { column: "status", value: "selected" }),
    count(db, "staged_components", { column: "review_status", value: "pending" }),
    count(db, "staged_components", { column: "review_status", value: "approved" }),
    count(db, "components"),
    db
      .from("admin_scrape_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1),
  ]);

  const lastRun = (lastRunRes.data?.[0] ?? null) as ScrapeRunRow | null;

  const tiles = [
    { label: "Catalog components", value: catalog, href: null },
    { label: "Discovered brands", value: brands, href: "/discovery" },
    { label: "Discovered components", value: discovered, href: "/discovery" },
    { label: "Not in catalog", value: notInDb, href: "/discovery?inDb=no" },
    { label: "Queued for collection", value: selected, href: "/collection" },
    { label: "Staged (pending review)", value: staged, href: "/staged" },
    { label: "Approved (ready to migrate)", value: approved, href: "/staged" },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <span className="text-sm text-adm-muted">{user.email}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {tiles.map((t) => {
          const inner = (
            <div className="adm-card p-4 h-full">
              <div className="text-2xl font-bold">{t.value}</div>
              <div className="text-xs text-adm-muted mt-1">{t.label}</div>
            </div>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="hover:opacity-90">
              {inner}
            </Link>
          ) : (
            <div key={t.label}>{inner}</div>
          );
        })}
      </div>

      <div className="adm-card p-4">
        <h2 className="text-sm font-semibold mb-2">Last run</h2>
        {lastRun ? (
          <div className="text-sm text-adm-muted">
            <span className="adm-badge adm-badge-accent mr-2">{lastRun.kind}</span>
            <span
              className={`adm-badge mr-2 ${
                lastRun.status === "succeeded"
                  ? "adm-badge-ok"
                  : lastRun.status === "failed"
                    ? "adm-badge-err"
                    : "adm-badge-warn"
              }`}
            >
              {lastRun.status}
            </span>
            started {new Date(lastRun.started_at).toLocaleString()}
            {lastRun.error && <p className="text-adm-err mt-2">{lastRun.error}</p>}
          </div>
        ) : (
          <p className="text-sm text-adm-muted">
            No runs yet. Start discovery from the terminal:{" "}
            <code className="text-adm-text">cd admin && npm run discover</code>
          </p>
        )}
      </div>
    </div>
  );
}
