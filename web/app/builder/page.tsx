import ChainBuilder from "@/components/ChainBuilder";
import { getComponents } from "@/lib/getComponents";
import { createServerSupabaseClient } from "@/lib/supabase-server";

async function loadSavedChain(chainId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("chains")
      .select("name, context, chain_nodes(position, cable, component:components(id, name, category, specs, manufacturer, affiliate_url, image_url, notes))")
      .eq("id", chainId)
      .single();
    if (!data) return null;
    const nodes = [...(data.chain_nodes ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position);
    return { name: data.name, context: data.context, nodes };
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

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 68px)" }}>
      <div style={{
        background: "var(--pa-dark)",
        borderBottom: "1px solid rgba(201,111,18,0.2)",
        padding: "20px 32px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--pa-cream)",
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}>Chain Builder</h1>
        <p style={{
          fontSize: "0.85rem",
          color: "rgba(253,246,236,0.5)",
          fontFamily: "var(--pa-font-ui)",
        }}>
          Add components, set listening context, then evaluate your signal chain.
        </p>
      </div>
      <ChainBuilder catalog={catalog} initialDemo={demo} savedChain={savedChain} />
    </div>
  );
}
