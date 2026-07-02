import type { ChainEntry } from "@/types";
import { CABLE_BY_ID } from "@/types";

/** Cable object for entry i, or undefined for the terminal node / "none". */
function cableFor(entry: ChainEntry, isLast: boolean) {
  if (isLast) return undefined;
  return CABLE_BY_ID[entry.cableId]?.cable ?? undefined;
}

/** Shape for POST /api/evaluate: full component objects + cables. */
export function toEvaluateNodes(chain: ChainEntry[]) {
  return chain.map((entry, i) => {
    const cable = cableFor(entry, i === chain.length - 1);
    return {
      component: {
        id: entry.component.id,
        name: entry.component.name,
        category: entry.component.category,
        inputs: entry.component.inputs ?? [],
        outputs: entry.component.outputs ?? [],
      },
      ...(cable ? { cableToNext: cable } : {}),
    };
  });
}

/** Shape for POST /api/chains: component ids + cables. */
export function toSaveNodes(chain: ChainEntry[]) {
  return chain.map((entry, i) => ({
    componentId: entry.component.id,
    cable: cableFor(entry, i === chain.length - 1),
  }));
}
