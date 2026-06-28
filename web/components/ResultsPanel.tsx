"use client";

import type { SystemReport, LinkReport, CheckResult, Verdict } from "@/types";
import ParameterExplainer from "@/components/ParameterExplainer";

const VERDICT_ICON: Record<Verdict, string>  = { pass: "✅", info: "ℹ️",  warn: "⚠️",  fail: "❌" };
const VERDICT_BG:   Record<Verdict, string>  = {
  pass: "bg-green-50 border-green-200 text-green-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warn: "bg-amber-50 border-amber-200 text-amber-800",
  fail: "bg-red-50 border-red-200 text-red-800",
};

function CheckRow({ result }: { result: CheckResult }) {
  return (
    <div className="flex gap-3 items-start px-4 py-3 border-b border-slate-50 last:border-0 text-sm">
      <span className="shrink-0 w-5 text-base leading-5">{VERDICT_ICON[result.verdict]}</span>
      <div className="min-w-0">
        <span className="font-medium text-slate-800">{result.label}:</span>{" "}
        <span className="text-slate-600">{result.explanation}</span>
        {result.value != null && result.threshold != null && (
          <span className="ml-2 text-xs text-slate-400 tabular-nums">
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
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="font-semibold text-slate-800 text-sm flex-1">
          {link.from} → {link.to}
        </span>
        <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase">
          {link.domain}
        </span>
        <span>{VERDICT_ICON[link.verdict]}</span>
      </div>
      {link.results.map((r) => <CheckRow key={r.id} result={r} />)}
    </div>
  );
}

function SystemBlock({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="border border-blue-100 rounded-lg overflow-hidden mb-3 bg-blue-50/30">
      <div className="flex items-center px-4 py-2.5 bg-blue-50 border-b border-blue-100">
        <span className="font-semibold text-slate-800 text-sm">System</span>
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
        {VERDICT_ICON[report.overall]} Overall: {report.overall.toUpperCase()}
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
