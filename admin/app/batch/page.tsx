import { requireAdminPage } from "../../lib/adminAuth";
import { CATEGORIES } from "@/lib/validation";
import { BatchRunner } from "./BatchRunner";

export const dynamic = "force-dynamic";

export default async function BatchPage() {
  await requireAdminPage();

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Batch mining</h1>
      <p className="text-sm text-adm-muted mb-6">
        Enter a brand + category to enumerate its models, confirm the list, then collect them
        all in one run. Each item reuses the same scrape → enrich → stage pipeline; the queue
        runs sequentially in your browser and the whole batch is reviewable together in Staged.
      </p>
      <BatchRunner categories={[...CATEGORIES]} />
    </div>
  );
}
