import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import SavedChainsList, { type SavedChain } from "@/components/SavedChainsList";

export default async function SavedPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Saved Chains</h1>
        <p className="text-slate-500 mb-8">
          Sign in to save your signal chains and access them from any device.
        </p>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <p className="text-4xl mb-4">&#x1f512;</p>
          <p className="font-medium text-slate-600 mb-4">Sign in to view saved chains</p>
          <Link
            href="/login"
            className="bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors inline-block"
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">My Chains</h1>
          <p className="text-slate-500 text-sm">
            {chains?.length ?? 0} saved chain{(chains?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/builder"
          className="bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          New Chain
        </Link>
      </div>

      {!chains?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <p className="text-3xl mb-3">&#x1f517;</p>
          <p className="font-medium text-slate-600 mb-2">No chains yet</p>
          <p className="text-sm text-slate-400 mb-4">
            Build a signal chain in the builder and click Save to keep it here.
          </p>
          <Link
            href="/builder"
            className="text-amber-600 hover:text-amber-500 text-sm font-medium underline"
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
