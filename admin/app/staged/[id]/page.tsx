import { notFound } from "next/navigation";
import { requireAdminPage } from "../../../lib/adminAuth";
import { createServiceClient } from "../../../lib/supabase-admin";
import type { StagedComponentRow } from "../../../lib/rows";
import { StagedEditor } from "./StagedEditor";

export const dynamic = "force-dynamic";

export default async function StagedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;

  const db = createServiceClient();
  const { data } = await db.from("staged_components").select("*").eq("id", id).single();
  if (!data) notFound();

  return <StagedEditor row={data as StagedComponentRow} />;
}
