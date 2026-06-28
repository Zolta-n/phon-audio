import { NextRequest } from "next/server";
import { evaluateChain } from "@/lib/engine";
import type { Chain, Component, Cable, ListeningContext } from "@/lib/engine";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      nodes: { component: Component; cableToNext?: Cable }[];
      context: ListeningContext;
    };
    // body.nodes contains full Component objects (sent from client)
    const chain: Chain = { context: body.context, nodes: body.nodes };
    const report = evaluateChain(chain);
    return Response.json(report);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 400 });
  }
}
