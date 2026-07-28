import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase-admin";
import { getViewer, canEditComponent } from "@/lib/entitlements";

// Server-side gate for /components/[id]/recollect. The page fires the collect
// request on mount, so an ungated navigation would spend LLM + search budget
// before any permission check — this refuses it first.
export default async function RecollectComponentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/login?next=/components/${id}/recollect`);
  if (!viewer.canSubmit) redirect(`/components/${id}?upgrade=recollect`);

  const { data: row } = await createServiceClient()
    .from("components")
    .select("created_by, verified")
    .eq("id", id)
    .single();
  if (!row) notFound();
  if (!canEditComponent(viewer, row)) redirect(`/components/${id}`);

  return <>{children}</>;
}
