import Link from "next/link";
import { requireAdminPage } from "../../lib/adminAuth";
import { createServiceClient } from "../../lib/supabase-admin";
import { SubmissionReview, type SubmissionRow } from "./SubmissionReview";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  created_by: string | null;
  created_at: string | null;
  specs: { inputs?: unknown[]; outputs?: unknown[] } | null;
}

export default async function SubmissionsPage() {
  await requireAdminPage();
  const db = createServiceClient();

  // User submissions awaiting review: created_by set (curated rows are null)
  // and not yet approved. Rejected ones are active = false — excluded here.
  const { data } = await db
    .from("components")
    .select("id, name, category, manufacturer, created_by, created_at, specs")
    .not("created_by", "is", null)
    .neq("verified", true)
    .neq("active", false)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Row[];

  // Resolve submitter emails so the queue shows who to follow up with.
  const emails = new Map<string, string>();
  for (const uid of new Set(rows.map((r) => r.created_by).filter((v): v is string => !!v))) {
    const { data: authUser } = await db.auth.admin.getUserById(uid);
    if (authUser?.user?.email) emails.set(uid, authUser.user.email);
  }

  const reviewRows: SubmissionRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    manufacturer: r.manufacturer,
    created_by: r.created_by,
    created_at: r.created_at,
    submitter_email: r.created_by ? emails.get(r.created_by) ?? null : null,
    port_count: (r.specs?.inputs?.length ?? 0) + (r.specs?.outputs?.length ?? 0),
  }));

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Submissions</h1>
      <p className="text-sm text-adm-muted mb-6">
        Components added by users. Each is visible only to its submitter until you{" "}
        <strong>Approve</strong> it, which publishes it to the public catalog.{" "}
        <strong>Reject</strong> deactivates it instead — reversible from the{" "}
        <Link href="/components" className="underline">Catalog</Link> tab.
      </p>
      <SubmissionReview rows={reviewRows} />
    </div>
  );
}
