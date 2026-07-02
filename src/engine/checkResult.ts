// ---------------------------------------------------------------------------
// Every check returns a structured result (not a string) so the UI and the
// later AI sentiment layer can both consume it cleanly.
// ---------------------------------------------------------------------------

export type Verdict = "pass" | "info" | "warn" | "fail";

export interface CheckResult {
  /** Stable identifier for the check, e.g. "impedance_bridging". */
  id: string;
  /** Human-readable check name. */
  label: string;
  verdict: Verdict;
  /** The computed value this verdict is based on (engine-defined meaning). */
  value?: number;
  /** The threshold the value was compared against, if any. */
  threshold?: number;
  unit?: string;
  /** Plain-English, audience-friendly explanation. */
  explanation: string;
}

export function worstVerdict(results: CheckResult[]): Verdict {
  const order: Verdict[] = ["pass", "info", "warn", "fail"];
  return results.reduce<Verdict>((worst, r) => {
    return order.indexOf(r.verdict) > order.indexOf(worst) ? r.verdict : worst;
  }, "pass");
}

/**
 * Roll-up for the chain's headline verdict. Unlike worstVerdict, "info" is
 * neutral here — informational notes (missing specs, always-info system checks)
 * must not stop a well-matched chain from reading as an overall pass. A chain
 * with no warn/fail is "pass" if anything actually passed, else "info".
 */
export function overallVerdict(results: CheckResult[]): Verdict {
  if (results.some((r) => r.verdict === "fail")) return "fail";
  if (results.some((r) => r.verdict === "warn")) return "warn";
  if (results.some((r) => r.verdict === "pass")) return "pass";
  return "info";
}

/** Shared "spec missing" result so every check reports it identically. */
export function incompleteSpecs(id: string, label: string, explanation: string): CheckResult {
  return { id, label, verdict: "info", explanation };
}
