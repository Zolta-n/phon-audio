import { redirect } from "next/navigation";
import { getViewer } from "@/lib/entitlements";

// Server-side gate for the whole /components/add segment. The page itself is a
// client component, so hiding the entry-point link is not enough — a direct
// navigation has to be refused here too.
export default async function AddComponentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login?next=/components/add");
  if (!viewer.canSubmit) redirect("/components?upgrade=add");
  return <>{children}</>;
}
