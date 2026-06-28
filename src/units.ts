// ---------------------------------------------------------------------------
// Unit conversions & audio math helpers.
//
// The single most common bug in headphone/amp calculators is mishandling the
// two sensitivity conventions (dB/mW vs dB/V). Everything is normalized here.
// ---------------------------------------------------------------------------

const COPPER_RESISTIVITY = 0.01724; // Ω·mm²/m at ~20 °C

/** dB/mW → dB/V for a given impedance.  dB/V = dB/mW + 10·log10(1000 / Z). */
export function dbPerVFromDbPerMw(sensDbMw: number, impedanceOhm: number): number {
  return sensDbMw + 10 * Math.log10(1000 / impedanceOhm);
}

/** dB/V → dB/mW for a given impedance. */
export function dbPerMwFromDbPerV(sensDbV: number, impedanceOhm: number): number {
  return sensDbV - 10 * Math.log10(1000 / impedanceOhm);
}

/** Normalize any headphone sensitivity spec to dB/mW. */
export function toDbPerMw(
  sensitivity: { value: number; unit: "dB/mW" | "dB/V" },
  impedanceOhm: number,
): number {
  return sensitivity.unit === "dB/mW"
    ? sensitivity.value
    : dbPerMwFromDbPerV(sensitivity.value, impedanceOhm);
}

/**
 * Speaker sensitivity is published as dB @ 2.83 V / 1 m. 2.83 V into 8 Ω is 1 W,
 * but into 4 Ω it is 2 W — so the "per-watt" sensitivity of a 4 Ω speaker is
 * ~3 dB lower than its 2.83 V figure. Convert to true dB / 1 W / 1 m so power
 * math is in real watts.
 */
export function sensitivityDbPer1W(sens2_83V: number, impedanceOhm: number): number {
  const powerAt2_83V = (2.83 * 2.83) / impedanceOhm; // watts
  return sens2_83V - 10 * Math.log10(powerAt2_83V);
}

/** Conductor diameter (mm) for a given AWG. */
export function awgDiameterMm(awg: number): number {
  return 0.127 * Math.pow(92, (36 - awg) / 39);
}

/** Round-trip (out + return) resistance of a speaker cable run, in ohms. */
export function speakerCableResistanceOhm(awg: number, lengthM: number): number {
  const d = awgDiameterMm(awg);
  const areaMm2 = (Math.PI / 4) * d * d;
  const ohmPerMeter = COPPER_RESISTIVITY / areaMm2;
  return ohmPerMeter * lengthM * 2;
}

/** Power (W) required to produce `targetSpl` from a `sensitivity1W` driver. */
export function powerForSpl(targetSplDb: number, sensitivity1W: number): number {
  return Math.pow(10, (targetSplDb - sensitivity1W) / 10);
}

/** Inverse-square distance attenuation (free-field) in dB for a given distance. */
export function distanceAttenuationDb(distanceM: number): number {
  return 20 * Math.log10(Math.max(distanceM, 0.01));
}

/** Linearly interpolate/extrapolate amp power at an arbitrary impedance. */
export function ampPowerAtImpedance(
  powerW: { ohm: number; watts: number }[],
  impedanceOhm: number,
): number {
  if (!powerW || powerW.length === 0) return NaN;
  // Exact match first.
  const exact = powerW.find((p) => p.ohm === impedanceOhm);
  if (exact) return exact.watts;
  // Sort by impedance and interpolate; clamp to nearest outside the range.
  const sorted = [...powerW].sort((a, b) => a.ohm - b.ohm);
  if (impedanceOhm <= sorted[0]!.ohm) return sorted[0]!.watts;
  const last = sorted[sorted.length - 1]!;
  if (impedanceOhm >= last.ohm) return last.watts;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i]!;
    const hi = sorted[i + 1]!;
    if (impedanceOhm >= lo.ohm && impedanceOhm <= hi.ohm) {
      const t = (impedanceOhm - lo.ohm) / (hi.ohm - lo.ohm);
      return lo.watts + t * (hi.watts - lo.watts);
    }
  }
  return last.watts;
}
