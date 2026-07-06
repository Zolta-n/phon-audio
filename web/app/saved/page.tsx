import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import SavedChainsList, { type SavedChain } from "@/components/SavedChainsList";

export default async function SavedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-pa-text mb-2">Saved Chains</h1>
        <p className="text-pa-muted mb-8">
          Sign in to save your signal chains and access them from any device.
        </p>
        <div className="bg-pa-cream rounded-xl border border-pa-border p-10 text-center text-pa-muted">
          <p className="text-pa-accent text-4xl mb-4" style={{ fontFamily: "var(--pa-font-display)" }}>&Omega;</p>
          <p className="font-medium text-pa-text mb-4">Sign in to view saved chains</p>
          <Link
            href="/login"
            className="pa-btn pa-btn-primary"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const { data: chains } = await supabase
    .from("chains")
    .select("id, name, is_public, created_at, context, chain_nodes(position, component:components(id, name, category, manufacturer))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-pa-text mb-1">My Chains</h1>
          <p className="text-pa-muted text-sm">
            {chains?.length ?? 0} saved chain{(chains?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/builder"
          className="pa-btn pa-btn-primary"
        >
          New Chain
        </Link>
      </div>

      {!chains?.length ? (
        <div className="bg-pa-cream rounded-xl border border-pa-border p-10 text-center text-pa-muted">
          <p className="text-pa-accent text-3xl mb-3" style={{ fontFamily: "var(--pa-font-display)" }}>&Omega;</p>
          <p className="font-medium text-pa-text mb-2">No chains yet</p>
          <p className="text-sm text-pa-muted mb-4">
            Build a signal chain in the builder and click Save to keep it here.
          </p>
          <Link
            href="/builder"
            className="text-pa-accent hover:text-pa-accent-deep text-sm font-medium underline"
          >
            Go to Builder
          </Link>
        </div>
      ) : (
        <SavedChainsList chains={chains as unknown as SavedChain[]} />
      )}
    </div>
  );
}
