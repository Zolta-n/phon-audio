import type { CheckResult } from "../checkResult";
import type { SpeakerLoad, SpeakerOut, SpeakerCable, ListeningContext } from "../../types";
import {
  ampPowerAtImpedance,
  distanceAttenuationDb,
  powerForSpl,
  sensitivityDbPer1W,
  speakerCableResistanceOhm,
} from "../../units";

/**
 * Power / headroom: can the amp produce the target peak SPL at the listening
 * distance, given the speaker's sensitivity and impedance?
 */
export function speakerPowerHeadroom(
  speaker: SpeakerLoad,
  amp: SpeakerOut,
  context: ListeningContext,
): CheckResult {
  if (!speaker?.sensitivityDb_2_83V_1m || !speaker?.nominalImpedanceOhm || !amp?.powerW) {
    return { id: "speaker_power_headroom", label: "Power / headroom", verdict: "info", explanation: "Incomplete specs — cannot calculate power headroom." };
  }
  const distanceM = context.distanceM ?? 1;
  const roomGainDb = context.roomGainDb ?? 0;
  const peakSpl = context.targetSplDb + context.crestFactorDb;

  const sens1W = sensitivityDbPer1W(speaker.sensitivityDb_2_83V_1m, speaker.nominalImpedanceOhm);
  // Effective sensitivity at the listening seat (1 W reference).
  const effSens = sens1W - distanceAttenuationDb(distanceM) + roomGainDb;
  const powerNeededW = powerForSpl(peakSpl, effSens);
  const ampPowerW = ampPowerAtImpedance(amp.powerW, speaker.nominalImpedanceOhm);
  const headroomDb = 10 * Math.log10(ampPowerW / powerNeededW);

  const verdict =
    headroomDb < 0 ? "fail" : headroomDb < 3 ? "warn" : headroomDb <= 12 ? "pass" : "info";

  return {
    id: "speaker_power_headroom",
    label: "Power / headroom",
    verdict,
    value: Number(headroomDb.toFixed(1)),
    threshold: 3,
    unit: "dB",
    explanation:
      verdict === "fail"
        ? `Needs ~${powerNeededW.toFixed(1)} W for ${peakSpl} dB peaks at ${distanceM} m, but the amp gives ~${ampPowerW.toFixed(0)} W into ${speaker.nominalImpedanceOhm} Ω — underpowered, you'll clip before reaching target.`
        : verdict === "warn"
          ? `Only ${headroomDb.toFixed(1)} dB of power headroom — fine for moderate levels, marginal for dynamic peaks.`
          : verdict === "pass"
            ? `${headroomDb.toFixed(1)} dB of headroom for ${peakSpl} dB peaks — comfortably matched.`
            : `${headroomDb.toFixed(1)} dB of headroom — far more power than needed (not harmful, just unnecessary).`,
  };
}

/** Amp must be stable into the speaker's minimum impedance dip. */
export function speakerImpedanceStability(speaker: SpeakerLoad, amp: SpeakerOut): CheckResult {
  if (!speaker?.minImpedanceOhm || !amp?.ratedMinImpedanceOhm) {
    return { id: "impedance_stability", label: "Impedance stability", verdict: "info", explanation: "Impedance data not available." };
  }
  const ok = speaker.minImpedanceOhm >= amp.ratedMinImpedanceOhm;
  return {
    id: "impedance_stability",
    label: "Impedance stability",
    verdict: ok ? "pass" : "fail",
    value: speaker.minImpedanceOhm,
    threshold: amp.ratedMinImpedanceOhm,
    unit: "Ω",
    explanation: ok
      ? `Speaker dips to ${speaker.minImpedanceOhm} Ω; amp is rated to ${amp.ratedMinImpedanceOhm} Ω — within spec.`
      : `Speaker dips to ${speaker.minImpedanceOhm} Ω but the amp is only rated to ${amp.ratedMinImpedanceOhm} Ω — risk of current limiting, protection trips, or instability.`,
  };
}

/**
 * Damping factor = speakerZ / (ampOutputZ + cable resistance). Low damping
 * loosens bass control. The speaker cable's series resistance feeds in here.
 */
export function dampingFactor(
  speaker: SpeakerLoad,
  amp: SpeakerOut,
  cable?: SpeakerCable,
): CheckResult {
  if (!speaker?.nominalImpedanceOhm || !amp?.outputImpedanceOhm) {
    return { id: "damping_factor", label: "Damping factor", verdict: "info", explanation: "Impedance data not available." };
  }
  const cableR = cable ? speakerCableResistanceOhm(cable.awg, cable.lengthM) : 0;
  const df = speaker.nominalImpedanceOhm / (amp.outputImpedanceOhm + cableR);
  const verdict = df >= 20 ? "pass" : df >= 8 ? "info" : "warn";
  return {
    id: "damping_factor",
    label: "Damping factor",
    verdict,
    value: Number(df.toFixed(0)),
    threshold: 8,
    unit: "x",
    explanation:
      verdict === "pass"
        ? `Damping factor ~${df.toFixed(0)} — tight, well-controlled bass.`
        : verdict === "info"
          ? `Damping factor ~${df.toFixed(0)} — adequate control (≥8). Common with tube amps; some find it tonally pleasant.`
          : `Damping factor ~${df.toFixed(0)} — low; bass may sound loose or boomy, and the amp's output impedance will interact with the speaker's impedance curve.`,
  };
}

/** Compare amp clean power to speaker power handling. */
export function powerHandling(speaker: SpeakerLoad, amp: SpeakerOut): CheckResult {
  if (!amp?.powerW || !speaker?.powerHandlingW || !speaker?.nominalImpedanceOhm) {
    return { id: "power_handling", label: "Power handling", verdict: "info", explanation: "Power specs not available." };
  }
  const ampPowerW = ampPowerAtImpedance(amp.powerW, speaker.nominalImpedanceOhm);
  const ratio = ampPowerW / speaker.powerHandlingW;
  let verdict: CheckResult["verdict"] = "pass";
  let explanation = `Amp ~${ampPowerW.toFixed(0)} W vs speaker handling ${speaker.powerHandlingW} W — well matched.`;
  if (ampPowerW < speaker.powerHandlingW * 0.25) {
    verdict = "warn";
    explanation = `Amp ~${ampPowerW.toFixed(0)} W is well under the speaker's ${speaker.powerHandlingW} W rating — the real danger is clipping a small amp, which damages tweeters. Avoid driving it hard.`;
  } else if (ratio > 2) {
    verdict = "info";
    explanation = `Amp ~${ampPowerW.toFixed(0)} W exceeds the ${speaker.powerHandlingW} W rating — fine if you avoid sustained high levels; clean power is safer than a clipping small amp.`;
  }
  return {
    id: "power_handling",
    label: "Power handling",
    verdict,
    value: Number(ampPowerW.toFixed(0)),
    threshold: speaker.powerHandlingW,
    unit: "W",
    explanation,
  };
}
