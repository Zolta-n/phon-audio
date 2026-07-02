"use client";

import type { SystemReport, LinkReport, CheckResult, Verdict } from "@/types";
import ParameterExplainer from "@/components/ParameterExplainer";

const VERDICT_DOT: Record<Verdict, string> = {
  pass: "#16a34a",
  info: "var(--pa-accent-deep)",
  warn: "var(--pa-accent)",
  fail: "#c0392b",
};
const VERDICT_BG: Record<Verdict, string> = {
  pass: "bg-green-50 border-green-200 text-green-800",
  info: "bg-pa-surface border-pa-border text-pa-accent-deep",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  fail: "bg-red-50 border-red-200 text-red-800",
};

function VerdictDot({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className="shrink-0 w-5 text-base leading-5 text-center"
      style={{ color: VERDICT_DOT[verdict] }}
      title={verdict}
    >
      ●
    </span>
  );
}

function CheckRow({ result }: { result: CheckResult }) {
  return (
    <div className="flex gap-3 items-start px-4 py-3 border-b border-pa-border/50 last:border-0 text-sm">
      <VerdictDot verdict={result.verdict} />
      <div className="min-w-0">
        <span className="font-medium text-pa-text">{result.label}:</span>{" "}
        <span className="text-pa-muted">{result.explanation}</span>
        {result.value != null && result.threshold != null && (
          <span className="ml-2 text-xs text-pa-muted/70 tabular-nums">
            ({result.value.toFixed(1)} {result.unit ?? ""} vs {result.threshold.toFixed(1)})
          </span>
        )}
        <ParameterExplainer id={result.id} />
      </div>
    </div>
  );
}

function LinkBlock({ link }: { link: LinkReport }) {
  return (
    <div className="border border-pa-border rounded-lg overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-pa-surface border-b border-pa-border">
        <span className="font-semibold text-pa-text text-sm flex-1">
          {link.from} → {link.to}
        </span>
        <span className="text-xs font-bold bg-pa-border/60 text-pa-muted px-2 py-0.5 rounded-full uppercase">
          {link.domain}
        </span>
        <VerdictDot verdict={link.verdict} />
      </div>
      {link.results.map((r) => <CheckRow key={r.id} result={r} />)}
    </div>
  );
}

function SystemBlock({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="border border-pa-border rounded-lg overflow-hidden mb-3 bg-pa-cream/50">
      <div className="flex items-center px-4 py-2.5 bg-pa-surface border-b border-pa-border">
        <span className="font-semibold text-pa-text text-sm">System</span>
      </div>
      {checks.map((r) => <CheckRow key={r.id} result={r} />)}
    </div>
  );
}

export default function ResultsPanel({ report }: { report: SystemReport }) {
  return (
    <div>
      {/* Overall badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold mb-5 ${VERDICT_BG[report.overall]}`}>
        <VerdictDot verdict={report.overall} /> Overall: {report.overall.toUpperCase()}
      </div>

      {/* Per-link results */}
      {report.links.map((link, i) => (
        <LinkBlock key={i} link={link} />
      ))}

      {/* System checks */}
      <SystemBlock checks={report.system} />
    </div>
  );
}
