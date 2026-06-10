import type { CheckResult } from "./checkResult";
import type { Chain, Component } from "../types";

/** Pull a numeric gainDb off whatever output port a component exposes. */
function componentGainDb(component: Component): number {
  for (const port of component.outputs) {
    const s = port.specs as { gainDb?: number };
    if (typeof s.gainDb === "number") return s.gainDb;
  }
  return 0;
}

/**
 * Overall gain structure: too much cumulative gain pushes the noise floor up and
 * leaves a tiny usable volume range; too little and you can't reach target. This
 * is an informational sanity check, not a hard pass/fail.
 */
export function gainStructure(chain: Chain): CheckResult {
  const totalGainDb = chain.nodes.reduce((sum, n) => sum + componentGainDb(n.component), 0);
  const verdict = totalGainDb > 40 ? "warn" : "info";
  return {
    id: "system_gain_structure",
    label: "Overall gain structure",
    verdict,
    value: Number(totalGainDb.toFixed(1)),
    unit: "dB",
    explanation:
      verdict === "warn"
        ? `Cumulative voltage gain ~${totalGainDb.toFixed(0)} dB across the chain is high — expect an audible noise floor and a cramped usable volume range. Consider a lower-gain amp or a passive/lower-gain preamp.`
        : `Cumulative voltage gain ~${totalGainDb.toFixed(0)} dB across the chain — reasonable.`,
  };
}

/**
 * End-to-end SPL reach: roll up the terminal power/drive check into one headline
 * statement of whether the system can hit the target level.
 */
export function endToEndSpl(terminalPowerCheck: CheckResult | undefined): CheckResult {
  if (!terminalPowerCheck) {
    return {
      id: "system_spl_reach",
      label: "Target SPL reachable",
      verdict: "info",
      explanation: "No terminal load (speaker/headphone) in the chain to evaluate level.",
    };
  }
  const reachable = terminalPowerCheck.verdict === "pass" || terminalPowerCheck.verdict === "info";
  return {
    id: "system_spl_reach",
    label: "Target SPL reachable",
    verdict: reachable ? "pass" : terminalPowerCheck.verdict,
    explanation: reachable
      ? "The chain can reach the target listening level with appropriate headroom."
      : `Target level is the binding constraint here: ${terminalPowerCheck.explanation}`,
  };
}
