"use client";

import type { SystemReport, LinkReport, CheckResult, Verdict, Recommendation } from "@/types";
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

const REC_KIND_LABEL: Record<string, string> = {
  da_placement: "D/A Placement",
  digital_connection: "Connection",
};

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const topScore = rec.options[0]?.score ?? 100;
  return (
    <div className="border border-pa-border rounded-lg overflow-hidden mb-3">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-pa-surface border-b border-pa-border">
        <span className="font-semibold text-pa-text text-sm flex-1">{rec.title}</span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full uppercase" style={{
          background: "var(--pa-inset)",
          color: "var(--pa-accent2)",
          border: "1px solid var(--pa-border-2)",
        }}>
          {REC_KIND_LABEL[rec.kind] ?? rec.kind}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={
            rec.confidence === "spec"
              ? { background: "var(--pa-accent)", color: "var(--pa-cream)" }
              : { background: "var(--pa-inset)", color: "var(--pa-muted)", border: "1px solid var(--pa-border-2)" }
          }
          title={
            rec.confidence === "spec"
              ? "Ranked from declared measurements"
              : "Ranked by device-type rule of thumb — specs missing"
          }
        >
          {rec.confidence === "spec" ? "Spec-based" : "Rule of thumb"}
        </span>
      </div>
      <div className="px-4 py-3 text-sm text-pa-muted border-b border-pa-border/50">
        {rec.detail}
        <ParameterExplainer id={rec.kind} />
      </div>
      {rec.options.map((opt, i) => (
        <div
          key={`${opt.label}-${i}`}
          className="flex gap-3 items-start px-4 py-2.5 border-b border-pa-border/50 last:border-0 text-sm"
        >
          <span className="shrink-0 w-5 text-center" style={{ color: i === 0 ? "var(--pa-accent)" : "var(--pa-faint)" }}>
            {i === 0 ? "★" : "·"}
          </span>
          <div className="min-w-0 flex-1">
            <span className="font-medium text-pa-text">{opt.label}</span>
            {i === 0 && (
              <span className="ml-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--pa-accent)" }}>
                Recommended
              </span>
            )}
            <div className="text-xs text-pa-muted mt-0.5">{opt.rationale}</div>
          </div>
          <div className="shrink-0 flex items-center gap-2" title={`Ranking score ${Math.round(opt.score)} / 100 (comparable within this card only)`}>
            <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--pa-inset)", border: "1px solid var(--pa-border-2)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, Math.min(100, (opt.score / Math.max(topScore, 1)) * 100))}%`,
                  background: i === 0 ? "var(--pa-accent)" : "var(--pa-accent2)",
                  opacity: i === 0 ? 1 : 0.55,
                }}
              />
            </div>
            <span className="text-xs text-pa-muted/70 tabular-nums w-6 text-right">{Math.round(opt.score)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationsBlock({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <div className="mb-5">
      <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--pa-accent2)" }}>
        Recommendations — advisory, not verdicts
      </div>
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
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

      {/* Advisory recommendations (D/A placement, connection choice) */}
      {(report.recommendations?.length ?? 0) > 0 && (
        <RecommendationsBlock recommendations={report.recommendations!} />
      )}

      {/* Per-link results */}
      {report.links.map((link, i) => (
        <LinkBlock key={i} link={link} />
      ))}

      {/* System checks */}
      <SystemBlock checks={report.system} />
    </div>
  );
}
