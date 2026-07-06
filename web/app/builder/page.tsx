import ChainBuilder from "@/components/ChainBuilder";
import { getComponents } from "@/lib/getComponents";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function loadSavedChain(chainId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // RLS enforces this too, but keep the owner/public rule explicit in-query.
    let query = supabase
      .from("chains")
      .select("name, context, chain_nodes(position, cable, component:components(id, name, category, specs, manufacturer, affiliate_url, image_url, notes))")
      .eq("id", chainId);
    query = user
      ? query.or(`user_id.eq.${user.id},is_public.eq.true`)
      : query.eq("is_public", true);

    const { data } = await query.single();
    if (!data) return null;
    // The untyped supabase client types the FK join as an array; at runtime a
    // to-one join is a single object — normalize the shape for ChainBuilder.
    const nodes = [...(data.chain_nodes ?? [])]
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((n) => ({
        component: (n.component ?? null) as unknown as { id: string } | null,
        cable: (n.cable ?? null) as { kind: string; lengthM: number } | null,
      }));
    return {
      name: data.name as string,
      context: data.context as { targetSplDb?: number; crestFactorDb?: number; distanceM?: number; roomGainDb?: number } | null,
      nodes,
    };
  } catch {
    return null;
  }
}

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; load?: string }>;
}) {
  const { demo, load } = await searchParams;
  const catalog = await getComponents();

  let savedChain = null;
  if (load) {
    savedChain = await loadSavedChain(load);
  }
  const loadFailed = Boolean(load) && !savedChain;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - var(--pa-nav-h))" }}>
      {/* Header band (with the live score chip) is rendered inside ChainBuilder. */}
      <ChainBuilder catalog={catalog} initialDemo={demo} savedChain={savedChain} loadFailed={loadFailed} />
    </div>
  );
}
