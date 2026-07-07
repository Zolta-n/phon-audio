import { z } from "zod";

// Request-body schemas for the mutating API routes. Engine specs are validated
// structurally (kind + passthrough) — the engine treats missing numbers as
// "spec not available" and reports info verdicts, so deep validation lives there.

export const CATEGORIES = [
  "source", "turntable", "dac", "preamp", "power_amp",
  "tube_amp_se", "tube_amp_pp", "integrated",
  "headphone_amp", "speaker", "headphone",
] as const;

const portSchema = z.object({
  domain: z.enum(["digital", "line", "phono", "speaker", "headphone"]),
  connector: z.string().max(50),
  balanced: z.boolean(),
  specs: z.object({ kind: z.string().max(50) }).passthrough(),
});

export const componentBodySchema = z.object({
  id: z.string().max(200).optional(),
  name: z.string().min(1).max(200),
  category: z.enum(CATEGORIES),
  manufacturer: z.string().max(200).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
  inputs: z.array(portSchema).max(20).optional(),
  outputs: z.array(portSchema).max(20).optional(),
  // Internal D/A stage specs (DacSection) — validated structurally like port specs.
  dac: z.object({}).passthrough().optional().nullable(),
});

export const componentUpdateSchema = componentBodySchema
  .partial()
  .omit({ id: true });

export const chainBodySchema = z.object({
  name: z.string().min(1).max(200),
  context: z.object({
    targetSplDb: z.number().min(0).max(140),
    crestFactorDb: z.number().min(0).max(40),
    distanceM: z.number().min(0).max(50).optional(),
    roomGainDb: z.number().min(-20).max(20).optional(),
  }),
  nodes: z
    .array(z.object({ componentId: z.string().max(200), cable: z.object({}).passthrough().optional().nullable() }))
    .min(1)
    .max(20),
  isPublic: z.boolean().optional(),
});

const cableSchema = z.object({
  kind: z.enum(["digital", "interconnect", "speaker"]),
  lengthM: z.number().min(0).max(100),
}).passthrough();

export const evaluateBodySchema = z.object({
  context: z.object({
    targetSplDb: z.number().min(0).max(140),
    crestFactorDb: z.number().min(0).max(40),
    distanceM: z.number().min(0).max(50).optional(),
    roomGainDb: z.number().min(-20).max(20).optional(),
  }),
  nodes: z
    .array(
      z.object({
        component: z.object({
          id: z.string().max(200),
          name: z.string().max(200),
          category: z.string().max(50),
          inputs: z.array(portSchema).max(20),
          outputs: z.array(portSchema).max(20),
        }).passthrough(),
        cableToNext: cableSchema.optional().nullable(),
      })
    )
    .min(1)
    .max(20),
});

export const scrapeBodySchema = z.object({
  url: z.string().url().max(2000),
  enrich: z.boolean().optional(),
});

/** Parse a request body against a schema; returns data or a 400 Response. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { data: null, error: Response.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") || "body";
    return {
      data: null,
      error: Response.json({ error: `Invalid request: ${path}: ${issue?.message}` }, { status: 400 }),
    };
  }
  return { data: result.data, error: null };
}
