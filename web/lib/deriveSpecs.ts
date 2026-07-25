// Derived spec fields.
//
// A missing field is often *computable* from fields we already have, using the
// same audio math the engine relies on. Rather than leave those null and flag
// them for a human, we compute and tag them `derived` — clearly below a sourced
// value, but far more useful than null. A derived value must NEVER overwrite a
// real sourced value; callers apply it only where the field is currently null.
//
// Pure module (no I/O, no Next deps) so it is unit-testable from the root runner.

type SpecRecord = Record<string, unknown>;
type PortLike = { specs?: SpecRecord };
type ComponentLike = { inputs?: PortLike[]; outputs?: PortLike[] };

/** A single computed field, addressed by the same path used in field_meta. */
export interface DerivedField {
  portType: "inputs" | "outputs";
  index: number;
  field: string;
  value: unknown;
  /** Human-readable note on how it was derived, shown in the source column. */
  basis: string;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Full-output voltage of a power amp, from its rated power into a reference load. */
function fullOutputVrms(powerW: unknown): number | undefined {
  if (!Array.isArray(powerW) || powerW.length === 0) return undefined;
  const entries = powerW
    .map((p) => ({ ohm: num((p as SpecRecord)?.ohm), watts: num((p as SpecRecord)?.watts) }))
    .filter((p): p is { ohm: number; watts: number } => p.ohm != null && p.watts != null && p.ohm > 0);
  if (entries.length === 0) return undefined;
  // Sensitivity is referenced to full rated output; the standard 8 Ω rating is
  // the conventional reference, else fall back to the highest-power entry.
  const ref = entries.find((e) => e.ohm === 8) ?? entries.reduce((a, b) => (b.watts > a.watts ? b : a));
  return Math.sqrt(ref.watts * ref.ohm);
}

/**
 * Compute fields derivable from other known fields on the same port. Only emits
 * a field when it is currently null/absent AND its inputs are present. Does not
 * mutate; returns the list of derivations for the caller to apply.
 */
export function deriveSpecs(component: ComponentLike): DerivedField[] {
  const out: DerivedField[] = [];

  const walk = (ports: PortLike[] | undefined, portType: "inputs" | "outputs") => {
    (ports ?? []).forEach((port, index) => {
      const specs = (port.specs ?? {}) as SpecRecord;
      const kind = specs.kind as string | undefined;
      const push = (field: string, value: number | undefined, basis: string) => {
        if (specs[field] == null && value != null && Number.isFinite(value)) {
          out.push({ portType, index, field, value: round(value), basis });
        }
      };

      // Power amp: voltage gain, input sensitivity, and rated power are locked
      // together — Vout(full) = √(P·Z), gain = 20·log10(Vout / Vin). Knowing any
      // two of {gainDb, inputSensitivityVrms, powerW} yields the third.
      if (kind === "speaker_out") {
        const vout = fullOutputVrms(specs.powerW);
        const gain = num(specs.gainDb);
        const sens = num(specs.inputSensitivityVrms);
        if (vout != null && sens != null && sens > 0) {
          push("gainDb", 20 * Math.log10(vout / sens), `from ${sens} Vrms sensitivity at ${round(vout)} Vrms full output`);
        }
        if (vout != null && gain != null) {
          push("inputSensitivityVrms", vout / Math.pow(10, gain / 20), `from ${gain} dB gain at ${round(vout)} Vrms full output`);
        }
      }

      // Headphone out: if rated power into reference loads is given, the max
      // output voltage is √(mW/1000 · Z) at the load that maximizes it.
      if (kind === "headphone_out" && Array.isArray(specs.powerMw)) {
        let best: number | undefined;
        let bestOhm = 0;
        for (const p of specs.powerMw as SpecRecord[]) {
          const ohm = num(p?.ohm);
          const mw = num(p?.mw);
          if (ohm && mw) {
            const v = Math.sqrt((mw / 1000) * ohm);
            if (best == null || v > best) { best = v; bestOhm = ohm; }
          }
        }
        push("maxVrms", best, `from rated ${round(best ?? 0)} Vrms into ${bestOhm}Ω`);
      }
    });
  };

  walk(component.inputs, "inputs");
  walk(component.outputs, "outputs");
  return out;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
