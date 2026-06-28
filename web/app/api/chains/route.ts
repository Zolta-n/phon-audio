import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chains")
    .select("*, chain_nodes(*, component:components(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    name: string;
    context: object;
    nodes: { componentId: string; cable?: object }[];
    isPublic?: boolean;
  };

  // Insert chain
  const { data: chain, error: chainError } = await supabase
    .from("chains")
    .insert({
      user_id: user.id,
      name: body.name,
      context: body.context,
      is_public: body.isPublic ?? false,
    })
    .select()
    .single();
  if (chainError)
    return Response.json({ error: chainError.message }, { status: 500 });

  // Insert nodes
  const nodes = body.nodes.map((n, i) => ({
    chain_id: chain.id,
    position: i,
    component_id: n.componentId,
    cable: n.cable ?? null,
  }));
  const { error: nodesError } = await supabase.from("chain_nodes").insert(nodes);
  if (nodesError)
    return Response.json({ error: nodesError.message }, { status: 500 });

  return Response.json({ id: chain.id }, { status: 201 });
}
