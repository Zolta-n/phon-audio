import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase-admin";
import { getViewer, canEditComponent } from "@/lib/entitlements";

// Server-side gate for /components/[id]/edit — mirrors the PUT route's rule so
// a direct navigation cannot reach a form whose save would be refused.
export default async function EditComponentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer.user) redirect(`/login?next=/components/${id}/edit`);

  const { data: row } = await createServiceClient()
    .from("components")
    .select("created_by, verified")
    .eq("id", id)
    .single();
  if (!row) notFound();
  if (!canEditComponent(viewer, row)) redirect(`/components/${id}`);

  return <>{children}</>;
}
