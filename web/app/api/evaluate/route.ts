import { NextRequest } from "next/server";
import { evaluateChain } from "@/lib/engine";
import type { Chain } from "@/lib/engine";
import { evaluateBodySchema, parseBody } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { data: body, error: parseError } = await parseBody(req, evaluateBodySchema);
  if (parseError) return parseError;

  try {
    // Schema validates shape and bounds; the engine handles missing/partial
    // specs internally (reports "info" verdicts), so a structural cast is safe.
    const chain = { context: body.context, nodes: body.nodes } as unknown as Chain;
    const report = evaluateChain(chain);
    return Response.json(report);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 400 });
  }
}
