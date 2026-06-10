import type { CheckResult } from "../checkResult";
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
  const ratio = hp.nominalImpedanceOhm / amp.outputImpedanceOhm;
  const verdict = ratio >= 8 ? "pass" : ratio >= 4 ? "warn" : "fail";
  return {
    id: "headphone_output_impedance",
    label: "Output-impedance ratio",
    verdict,
    value: Number(ratio.toFixed(1)),
    threshold: 8,
    unit: "x",
    explanation:
      verdict === "pass"
        ? `Headphone is ${ratio.toFixed(1)}× the amp's output impedance — frequency response stays neutral.`
        : verdict === "warn"
          ? `Headphone is ${ratio.toFixed(1)}× the amp's output impedance; aim for ≥8× to avoid tonal shifts.`
          : `Headphone is only ${ratio.toFixed(1)}× the amp's output impedance — expect audible frequency-response changes, especially on multi-driver IEMs.`,
  };
}
