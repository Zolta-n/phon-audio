import type { SystemReport, Verdict } from "@/types";

export function computeScore(report: SystemReport): number {
  let score = 100;
  for (const link of report.links) {
    for (const r of link.results) {
      if (r.verdict === "fail") score -= 20;
      else if (r.verdict === "warn") score -= 5;
    }
  }
  for (const r of report.system) {
    if (r.verdict === "fail") score -= 20;
    else if (r.verdict === "warn") score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent pairing";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Fair match";
  return "Compatibility issues";
}

export interface TopCheck {
  label: string;
  verdict: Verdict;
  valueStr: string;
}

export function getTopChecks(report: SystemReport): TopCheck[] {
  const all: TopCheck[] = [];
  for (const link of report.links) {
    for (const r of link.results) {
      if (r.verdict === "info") continue; // skip info-level
      const valueStr = r.value != null && r.unit ? `${r.value.toFixed(1)}${r.unit}` : "";
      all.push({ label: r.label, verdict: r.verdict, valueStr });
    }
  }
  // Sort: fails first, then warns, then passes. Take top 4.
  const order = { fail: 0, warn: 1, pass: 2, info: 3 };
  all.sort((a, b) => order[a.verdict] - order[b.verdict]);
  return all.slice(0, 4);
}
