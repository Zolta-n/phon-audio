import type { CheckResult } from "../checkResult";
import { incompleteSpecs } from "../checkResult";
import { THRESHOLDS as T } from "../thresholds";
import type { InterconnectCable } from "../../types";

/**
 * Impedance bridging: we want the downstream input impedance to be at least
 * ~10× the upstream output impedance, or the source can't develop full voltage
 * into the load (bass rolloff / frequency-response shift).
 */
export function impedanceBridging(outputZ: number | null | undefined, inputZ: number | null | undefined): CheckResult {
  // A 0 Ω source is a valid (ideal) value — only null/undefined means "unknown".
  if (outputZ == null || !inputZ) {
    return incompleteSpecs("impedance_bridging", "Impedance bridging", "Impedance data not available for this link.");
  }
  if (outputZ === 0) {
    return {
      id: "impedance_bridging",
      label: "Impedance bridging",
      verdict: "pass",
      threshold: T.lineBridgingPassRatio,
      unit: "x",
      explanation: "Source output impedance is effectively 0 Ω — ideally bridged into any input.",
    };
  }
  const ratio = inputZ / outputZ;
  const verdict = ratio >= T.lineBridgingPassRatio ? "pass" : ratio >= T.lineBridgingWarnRatio ? "warn" : "fail";
  return {
    id: "impedance_bridging",
    label: "Impedance bridging",
    verdict,
    value: Number(ratio.toFixed(1)),
    threshold: 10,
    unit: "x",
    explanation:
      verdict === "pass"
        ? `Input is ${ratio.toFixed(1)}× the source output impedance — well bridged.`
        : verdict === "warn"
          ? `Input is only ${ratio.toFixed(1)}× the source output impedance; aim for ≥${T.lineBridgingPassRatio}× to avoid frequency-response shifts.`
          : `Input is just ${ratio.toFixed(1)}× the source output impedance — expect bass rolloff and tonal change. Avoid.`,
  };
}

/**
 * High-frequency rolloff from interconnect capacitance working against the
 * source's output impedance: f = 1 / (2π · Zout · C_total).
 */
export function hfRolloff(outputZ: number | null | undefined, cable?: InterconnectCable): CheckResult {
  if (!cable || outputZ == null) {
    return incompleteSpecs(
      "hf_rolloff",
      "Cable HF rolloff",
      !cable ? "No analog interconnect on this link — nothing to evaluate." : "Output impedance data not available.",
    );
  }
  const cTotalFarads = cable.capacitancePfPerM * cable.lengthM * 1e-12;
  const cornerHz = cTotalFarads > 0 && outputZ > 0 ? 1 / (2 * Math.PI * outputZ * cTotalFarads) : Infinity;
  const cornerKhz = cornerHz / 1000;
  const verdict =
    cornerKhz >= T.hfCornerPassKhz ? "pass" : cornerKhz >= T.hfCornerInfoKhz ? "info" : cornerKhz >= T.hfCornerWarnKhz ? "warn" : "fail";
  return {
    id: "hf_rolloff",
    label: "Cable HF rolloff",
    verdict,
    value: Number.isFinite(cornerKhz) ? Number(cornerKhz.toFixed(1)) : undefined,
    threshold: T.hfCornerInfoKhz,
    unit: "kHz",
    explanation:
      verdict === "pass"
        ? Number.isFinite(cornerKhz)
          ? `Rolloff corner ~${cornerKhz.toFixed(0)} kHz — far above audibility; cable is electrically neutral here.`
          : "No meaningful cable capacitance — the cable is electrically neutral here."
        : verdict === "info"
          ? `Rolloff corner ~${cornerKhz.toFixed(0)} kHz — above the audible band; negligible effect.`
          : verdict === "warn"
            ? `Rolloff corner ~${cornerKhz.toFixed(1)} kHz — long run + high source impedance is starting to bite. Use a shorter or lower-capacitance cable.`
            : `Rolloff corner ~${cornerKhz.toFixed(1)} kHz — inside the audible band; treble will be audibly rolled off. Use a much shorter or lower-capacitance cable, or a lower-impedance source.`,
  };
}

/**
 * Gain staging on a line link: can the upstream max output reach the voltage
 * the downstream device needs for full output, without overloading its input?
 */
export function gainStaging(
  maxOutputVrms: number | null | undefined,
  inputSensitivityVrms: number | null | undefined,
  maxInputVrms?: number | null,
): CheckResult {
  if (!maxOutputVrms || !inputSensitivityVrms) {
    return incompleteSpecs("gain_staging", "Gain staging", "Gain data not available for this link.");
  }
  const headroomDb = 20 * Math.log10(maxOutputVrms / inputSensitivityVrms);
  let verdict: CheckResult["verdict"] = "pass";
  let explanation = `Source can deliver ${headroomDb.toFixed(1)} dB over what the next stage needs for full output — good gain structure.`;

  if (maxInputVrms != null && maxOutputVrms > maxInputVrms) {
    verdict = "warn";
    explanation = `Source max output (${maxOutputVrms} V) exceeds the downstream overload point (${maxInputVrms} V) — risk of input clipping at high settings.`;
  } else if (headroomDb < 0) {
    verdict = "fail";
    explanation = `Source maxes out ${Math.abs(headroomDb).toFixed(1)} dB below the voltage the next stage needs — you won't reach full output.`;
  } else if (headroomDb < T.gainHeadroomTightDb) {
    verdict = "warn";
    explanation = `Only ${headroomDb.toFixed(1)} dB of gain headroom — workable but tight.`;
  }

  return {
    id: "gain_staging",
    label: "Gain staging",
    verdict,
    value: Number(headroomDb.toFixed(1)),
    threshold: 0,
    unit: "dB",
    explanation,
  };
}
