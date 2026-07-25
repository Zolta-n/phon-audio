// DAC chipset baseline inference.
//
// When a product's DAC chip is known but its own THD+N / dynamic-range numbers
// aren't, the chip's datasheet gives a defensible baseline — clearly below a
// product-specific measurement (implementation always loses a few dB), but far
// better than null. Values here are conservative, product-typical figures (below
// the datasheet's mono/ideal best case), stored to be tagged `typical_for_chipset`.
//
// Pure module (no I/O) — unit-testable from the root runner.

export interface ChipsetBaseline {
  /** Typical A-weighted dynamic range, dB. */
  dynamicRangeDb?: number;
  /** Typical THD+N as a percentage (e.g. 0.0002 = 0.0002%). */
  thdPlusNPct?: number;
}

// Keyed by a normalized chip id (uppercase alphanumerics). Longer, more specific
// keys are matched first so "ES9038PRO" wins over a bare "ES9038".
const CHIPSETS: Record<string, ChipsetBaseline> = {
  // ESS Sabre
  ES9039PRO: { dynamicRangeDb: 130, thdPlusNPct: 0.00016 },
  ES9038PRO: { dynamicRangeDb: 130, thdPlusNPct: 0.0002 },
  ES9038Q2M: { dynamicRangeDb: 128, thdPlusNPct: 0.0003 },
  ES9028PRO: { dynamicRangeDb: 129, thdPlusNPct: 0.0003 },
  ES9028Q2M: { dynamicRangeDb: 127, thdPlusNPct: 0.0004 },
  ES9018K2M: { dynamicRangeDb: 127, thdPlusNPct: 0.0003 },
  ES9018S: { dynamicRangeDb: 130, thdPlusNPct: 0.0003 },
  ES9016K2M: { dynamicRangeDb: 124, thdPlusNPct: 0.0006 },
  ES9010K2M: { dynamicRangeDb: 122, thdPlusNPct: 0.0008 },
  // AKM Velvet Sound
  AK4499: { dynamicRangeDb: 132, thdPlusNPct: 0.0002 },
  AK4497: { dynamicRangeDb: 128, thdPlusNPct: 0.0004 },
  AK4493: { dynamicRangeDb: 123, thdPlusNPct: 0.0006 },
  AK4490: { dynamicRangeDb: 120, thdPlusNPct: 0.0008 },
  // TI / Burr-Brown
  PCM1794A: { dynamicRangeDb: 129, thdPlusNPct: 0.0004 },
  PCM1794: { dynamicRangeDb: 127, thdPlusNPct: 0.0005 },
  PCM1792A: { dynamicRangeDb: 127, thdPlusNPct: 0.0004 },
  PCM5122: { dynamicRangeDb: 112, thdPlusNPct: 0.002 },
  PCM5102A: { dynamicRangeDb: 112, thdPlusNPct: 0.002 },
  PCM5102: { dynamicRangeDb: 112, thdPlusNPct: 0.002 },
  // Cirrus Logic
  CS43198: { dynamicRangeDb: 130, thdPlusNPct: 0.0003 },
  CS4398: { dynamicRangeDb: 120, thdPlusNPct: 0.0004 },
  CS4399: { dynamicRangeDb: 120, thdPlusNPct: 0.0006 },
};

const NORMALIZED_KEYS = Object.keys(CHIPSETS).sort((a, b) => b.length - a.length);

function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Baseline specs for a chipset string, or null if the chip isn't recognized.
 * Matches the most specific known key contained in the (normalized) input.
 */
export function chipsetBaseline(chipset: string | undefined | null): ChipsetBaseline | null {
  if (!chipset) return null;
  const norm = normalize(chipset);
  if (!norm) return null;
  for (const key of NORMALIZED_KEYS) {
    if (norm.includes(key)) return CHIPSETS[key] ?? null;
  }
  return null;
}
