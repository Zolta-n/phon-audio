import type { CheckResult } from "../checkResult";
import type { PhonoOut, PhonoIn, InterconnectCable } from "../../types";

/**
 * Cartridge type compatibility: an MM phono stage can't properly handle MC
 * output (too low), and an MC-only stage will overload on MM output.
 */
export function phonoCartridgeMatch(
  cart: PhonoOut,
  stage: PhonoIn,
): CheckResult {
  const ok =
    stage.cartridgeType === "both" ||
    stage.cartridgeType === cart.cartridgeType;

  return {
    id: "phono_cartridge_match",
    label: "Cartridge type",
    verdict: ok ? "pass" : "fail",
    explanation: ok
      ? `Phono stage accepts ${stage.cartridgeType.toUpperCase()} — matches ${cart.cartridgeType.toUpperCase()} cartridge.`
      : `Cartridge is ${cart.cartridgeType.toUpperCase()} but phono stage only supports ${stage.cartridgeType.toUpperCase()} — incompatible.`,
  };
}

/**
 * Impedance loading: for MM cartridges the standard load is 47 kΩ. If the
 * cartridge specifies a recommended load, we check it matches. For MC the
 * load impedance matters more (typically 10–1000 Ω) and should be ≥10× the
 * cartridge's internal impedance.
 */
export function phonoImpedanceLoading(
  cart: PhonoOut,
  stage: PhonoIn,
): CheckResult {
  if (!stage.inputImpedanceOhm) {
    return {
      id: "phono_impedance",
      label: "Impedance loading",
      verdict: "info",
      explanation: "Phono stage input impedance not available.",
    };
  }

  // MM: standard is 47 kΩ — check if stage provides it
  if (cart.cartridgeType === "mm") {
    if (cart.recommendedLoadImpedanceOhm) {
      const ratio = stage.inputImpedanceOhm / cart.recommendedLoadImpedanceOhm;
      const ok = ratio >= 0.8 && ratio <= 1.2; // within 20%
      return {
        id: "phono_impedance",
        label: "Impedance loading",
        verdict: ok ? "pass" : "warn",
        value: stage.inputImpedanceOhm,
        unit: "Ω",
        explanation: ok
          ? `Phono stage loads at ${stage.inputImpedanceOhm.toLocaleString()} Ω — matches the cartridge's recommended ${cart.recommendedLoadImpedanceOhm.toLocaleString()} Ω.`
          : `Phono stage loads at ${stage.inputImpedanceOhm.toLocaleString()} Ω but cartridge recommends ${cart.recommendedLoadImpedanceOhm.toLocaleString()} Ω — may affect tonal balance.`,
      };
    }
    // Standard 47 kΩ check for MM
    const isStandard = stage.inputImpedanceOhm >= 40000 && stage.inputImpedanceOhm <= 50000;
    return {
      id: "phono_impedance",
      label: "Impedance loading",
      verdict: isStandard ? "pass" : "warn",
      value: stage.inputImpedanceOhm,
      unit: "Ω",
      explanation: isStandard
        ? `Phono stage provides standard ${(stage.inputImpedanceOhm / 1000).toFixed(0)} kΩ loading for MM cartridge.`
        : `Phono stage loads at ${stage.inputImpedanceOhm.toLocaleString()} Ω — non-standard for MM (expected ~47 kΩ); may alter frequency response.`,
    };
  }

  // MC: input impedance should be ≥10× cartridge internal impedance
  if (cart.internalImpedanceOhm) {
    const ratio = stage.inputImpedanceOhm / cart.internalImpedanceOhm;
    const verdict = ratio >= 10 ? "pass" : ratio >= 5 ? "warn" : "fail";
    return {
      id: "phono_impedance",
      label: "Impedance loading",
      verdict,
      value: Number(ratio.toFixed(1)),
      threshold: 10,
      unit: "x",
      explanation:
        verdict === "pass"
          ? `Load is ${ratio.toFixed(1)}× cartridge impedance — well matched for MC.`
          : `Load is only ${ratio.toFixed(1)}× cartridge impedance (aim for ≥10×) — may damp transient response.`,
    };
  }

  return {
    id: "phono_impedance",
    label: "Impedance loading",
    verdict: "pass",
    value: stage.inputImpedanceOhm,
    unit: "Ω",
    explanation: `Phono stage input impedance is ${stage.inputImpedanceOhm.toLocaleString()} Ω. Cartridge internal impedance unknown — cannot verify ratio.`,
  };
}

/**
 * Capacitance loading (MM only): total capacitance (cable + phono stage
 * internal) affects MM cartridge frequency response. Ideal range is typically
 * 100–300 pF total, but depends on cartridge. Too high causes a resonance peak
 * in the treble; too low makes the sound thin.
 */
export function phonoCapacitanceLoading(
  cart: PhonoOut,
  stage: PhonoIn,
  cable?: InterconnectCable,
): CheckResult {
  // Capacitance only matters for MM cartridges
  if (cart.cartridgeType !== "mm") {
    return {
      id: "phono_capacitance",
      label: "Capacitance loading",
      verdict: "pass",
      explanation: "Capacitance loading is not critical for MC cartridges.",
    };
  }

  const cableCap = cable ? cable.capacitancePfPerM * cable.lengthM : 0;
  const stageCap = stage.inputCapacitancePf ?? 0;
  const totalPf = cableCap + stageCap;

  if (totalPf === 0) {
    return {
      id: "phono_capacitance",
      label: "Capacitance loading",
      verdict: "info",
      explanation: "Cable and/or phono stage capacitance not known — cannot evaluate.",
    };
  }

  // If cartridge specifies recommended range, use that
  if (cart.recommendedLoadCapacitancePf) {
    const target = cart.recommendedLoadCapacitancePf;
    const low = target * 0.7;
    const high = target * 1.4;
    const ok = totalPf >= low && totalPf <= high;
    return {
      id: "phono_capacitance",
      label: "Capacitance loading",
      verdict: ok ? "pass" : "warn",
      value: totalPf,
      threshold: target,
      unit: "pF",
      explanation: ok
        ? `Total capacitance ~${totalPf.toFixed(0)} pF (cable ${cableCap.toFixed(0)} + stage ${stageCap}) — within range for this cartridge.`
        : `Total capacitance ~${totalPf.toFixed(0)} pF vs recommended ${target} pF — may cause treble peak or thinness.`,
    };
  }

  // Generic MM range: 100–300 pF is usually safe
  const verdict = totalPf >= 100 && totalPf <= 300 ? "pass" : totalPf >= 50 && totalPf <= 400 ? "info" : "warn";
  return {
    id: "phono_capacitance",
    label: "Capacitance loading",
    verdict,
    value: totalPf,
    unit: "pF",
    explanation:
      verdict === "pass"
        ? `Total capacitance ~${totalPf.toFixed(0)} pF — within typical MM range (100–300 pF).`
        : verdict === "info"
          ? `Total capacitance ~${totalPf.toFixed(0)} pF — slightly outside the 100–300 pF sweet spot; check cartridge specs.`
          : `Total capacitance ~${totalPf.toFixed(0)} pF — far from the 100–300 pF range; expect frequency response anomalies.`,
  };
}

/**
 * Phono gain adequacy: is the phono stage gain appropriate for the cartridge's
 * output voltage? MM typically needs ~40 dB, MC needs ~60 dB.
 */
export function phonoGainAdequacy(
  cart: PhonoOut,
  stage: PhonoIn,
): CheckResult {
  if (!cart.outputVoltageMv || !stage.gainDb) {
    return {
      id: "phono_gain",
      label: "Phono gain",
      verdict: "info",
      explanation: "Cartridge output voltage or phono stage gain not available.",
    };
  }

  // Calculate output level: cartridge mV × gain = output Vrms
  // Standard line level is ~0.5–2 Vrms
  const outputVrms = (cart.outputVoltageMv / 1000) * Math.pow(10, stage.gainDb / 20);
  const outputMv = outputVrms * 1000;

  // Too low: won't reach usable line level (< 200 mV)
  // Good: 300 mV – 3000 mV (0.3–3 Vrms)
  // Too high: risk of overloading downstream (> 5 Vrms)
  let verdict: CheckResult["verdict"];
  let explanation: string;

  if (outputVrms < 0.2) {
    verdict = "fail";
    explanation = `Phono stage output will be only ~${outputMv.toFixed(0)} mV — too low for line-level inputs. Need more gain.`;
  } else if (outputVrms < 0.3) {
    verdict = "warn";
    explanation = `Phono stage output ~${outputMv.toFixed(0)} mV — on the low side for line level. May need to turn up the volume.`;
  } else if (outputVrms <= 3) {
    verdict = "pass";
    explanation = `Phono stage output ~${outputVrms.toFixed(1)} Vrms — good line-level output from ${cart.outputVoltageMv} mV cartridge with ${stage.gainDb} dB gain.`;
  } else if (outputVrms <= 5) {
    verdict = "info";
    explanation = `Phono stage output ~${outputVrms.toFixed(1)} Vrms — on the high side; monitor for clipping downstream.`;
  } else {
    verdict = "warn";
    explanation = `Phono stage output ~${outputVrms.toFixed(1)} Vrms — risk of overloading the next stage. Consider reducing gain.`;
  }

  return {
    id: "phono_gain",
    label: "Phono gain",
    verdict,
    value: Number(outputVrms.toFixed(2)),
    unit: "Vrms",
    explanation,
  };
}
