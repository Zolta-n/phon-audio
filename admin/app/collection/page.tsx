import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import type { DiscoveredBrandRow, DiscoveredComponentRow } from "../../lib/rows";
import { CollectionRunner, type QueueItem } from "./CollectionRunner";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  await requireAdminPage();
  const db = createServiceClient();

  const [compsRes, brandsRes] = await Promise.all([
    db
      .from("discovered_components")
      .select("*")
      .in("status", ["selected", "collecting"])
      .order("popularity", { ascending: false }),
    db.from("discovered_brands").select("id, name"),
  ]);

  const components = (compsRes.data ?? []) as DiscoveredComponentRow[];
  const brands = (brandsRes.data ?? []) as Pick<DiscoveredBrandRow, "id" | "name">[];
  const brandName = new Map(brands.map((b) => [b.id, b.name]));

  const queue: QueueItem[] = components.map((c) => ({
    id: c.id,
    name: c.name,
    brandName: (c.brand_id && brandName.get(c.brand_id)) || c.brand_id || "—",
    categoryGuess: c.category_guess,
    status: c.status,
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Collection</h1>
      <p className="text-sm text-adm-muted mb-6">
        Items queued for data collection. Each item takes ~30–90 s (scrape → enrich → stage);
        the queue runs sequentially and is safe to resume after a refresh.
      </p>
      {queue.length === 0 ? (
        <div className="adm-card p-6 text-sm text-adm-muted">
          Nothing queued. Select items on the Discovery page first.
        </div>
      ) : (
        <CollectionRunner queue={queue} />
      )}
    </div>
  );
}
