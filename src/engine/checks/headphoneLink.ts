import type { CheckResult } from "../checkResult";
import { incompleteSpecs } from "../checkResult";
import { THRESHOLDS as T } from "../thresholds";
import type { HeadphoneLoad, HeadphoneOut, ListeningContext } from "../../types";
import { toDbPerMw } from "../../units";

/**
 * Can the headphone amp deliver the voltage AND current needed for target peak
 * SPL? High-impedance phones are voltage-limited; low-impedance, low-sensitivity
 * planars are current-limited — so we check both.
 */
export function headphoneDrive(
  hp: HeadphoneLoad,
  amp: HeadphoneOut,
  context: ListeningContext,
): CheckResult {
  if (!hp?.sensitivity || !hp?.nominalImpedanceOhm || !amp?.maxVrms || !amp?.maxCurrentMa) {
    return incompleteSpecs("headphone_drive", "Drive capability", "Incomplete specs — cannot calculate drive requirements.");
  }
  const peakSpl = context.targetSplDb + context.crestFactorDb;
  const sensDbMw = toDbPerMw(hp.sensitivity, hp.nominalImpedanceOhm);

  const powerNeededMw = Math.pow(10, (peakSpl - sensDbMw) / 10);
  const powerNeededW = powerNeededMw / 1000;
  const vNeeded = Math.sqrt(powerNeededW * hp.nominalImpedanceOhm);
  const iNeededMa = (vNeeded / hp.nominalImpedanceOhm) * 1000;

  const voltageOk = vNeeded <= amp.maxVrms;
  const currentOk = iNeededMa <= amp.maxCurrentMa;
  const verdict = voltageOk && currentOk ? "pass" : "fail";

  const limit = !voltageOk ? "voltage" : !currentOk ? "current" : "none";

  return {
    id: "headphone_drive",
    label: "Drive capability",
    verdict,
    value: Number(vNeeded.toFixed(3)),
    unit: "Vrms",
    explanation:
      verdict === "pass"
        ? `Needs ${vNeeded.toFixed(2)} V / ${iNeededMa.toFixed(1)} mA for ${peakSpl} dB peaks; amp supplies up to ${amp.maxVrms} V / ${amp.maxCurrentMa} mA — comfortable.`
        : `Needs ${vNeeded.toFixed(2)} V / ${iNeededMa.toFixed(1)} mA for ${peakSpl} dB peaks, but the amp is ${limit}-limited (${amp.maxVrms} V / ${amp.maxCurrentMa} mA) — underdriven on peaks.`,
  };
}

/**
 * Output-impedance rule: amp output impedance should be ≤ 1/8 of the headphone
 * impedance, or the amp's output impedance interacts with the headphone's
 * impedance curve and shifts frequency response (worst on multi-driver/low-Z).
 */
export function headphoneOutputImpedance(hp: HeadphoneLoad, amp: HeadphoneOut): CheckResult {
  // A 0 Ω amp output is a valid (ideal) value, not missing data.
  if (!hp?.nominalImpedanceOhm || amp?.outputImpedanceOhm == null) {
    return incompleteSpecs("headphone_output_impedance", "Output-impedance ratio", "Impedance data not available.");
  }
  if (amp.outputImpedanceOhm === 0) {
    return {
      id: "headphone_output_impedance",
      label: "Output-impedance ratio",
      verdict: "pass",
      threshold: T.headphoneZRatioPass,
      unit: "x",
      explanation: "Amp output impedance is effectively 0 Ω — frequency response stays neutral into any headphone.",
    };
  }
  const ratio = hp.nominalImpedanceOhm / amp.outputImpedanceOhm;
  const verdict = ratio >= T.headphoneZRatioPass ? "pass" : ratio >= T.headphoneZRatioWarn ? "warn" : "fail";
  return {
    id: "headphone_output_impedance",
    label: "Output-impedance ratio",
    verdict,
    value: Number(ratio.toFixed(1)),
    threshold: T.headphoneZRatioPass,
    unit: "x",
    explanation:
      verdict === "pass"
        ? `Headphone is ${ratio.toFixed(1)}× the amp's output impedance — frequency response stays neutral.`
        : verdict === "warn"
          ? `Headphone is ${ratio.toFixed(1)}× the amp's output impedance; aim for ≥${T.headphoneZRatioPass}× to avoid tonal shifts.`
          : `Headphone is only ${ratio.toFixed(1)}× the amp's output impedance — expect audible frequency-response changes, especially on multi-driver IEMs.`,
  };
}
