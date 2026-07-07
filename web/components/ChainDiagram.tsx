"use client";

import type { ChainEntry, SystemReport, LinkReport, Verdict } from "@/types";
import { CATEGORY_LABELS } from "@/types";

const AMP_CATEGORIES = new Set(["power_amp", "tube_amp_se", "tube_amp_pp", "integrated", "headphone_amp"]);

/** Compact monospace port summary, e.g. "USB, COAX → RCA". */
function portSummary(entry: ChainEntry): string {
  const ins = [...new Set(entry.component.inputs.map((p) => p.connector.toUpperCase()))].slice(0, 3);
  const outs = [...new Set(entry.component.outputs.map((p) => p.connector.toUpperCase()))].slice(0, 3);
  if (ins.length && outs.length) return `${ins.join(", ")} → ${outs.join(", ")}`;
  if (outs.length) return `Out: ${outs.join(", ")}`;
  if (ins.length) return `In: ${ins.join(", ")}`;
  return "—";
}

/** The link whose status this node should display: outgoing, else incoming for the last node. */
function linkForNode(report: SystemReport | null, idx: number, total: number): LinkReport | null {
  if (!report) return null;
  if (idx < report.links.length) return report.links[idx];
  if (total >= 2 && report.links.length > 0) return report.links[report.links.length - 1];
  return null;
}

function statusText(link: LinkReport): string {
  if (link.verdict === "pass" || link.verdict === "info") return "Link verified";
  const order: Record<Verdict, number> = { fail: 0, warn: 1, info: 2, pass: 3 };
  const worst = [...link.results].sort((a, b) => order[a.verdict] - order[b.verdict])[0];
  if (!worst) return link.verdict === "fail" ? "Check failed" : "Caution";
  const value = worst.value != null && worst.unit ? ` ${worst.value.toFixed(1)}${worst.unit}` : "";
  return `${worst.label}${value}`;
}

/** Signal chain rendered as dark rack-unit cards over a traveling-pulse rail. */
export default function ChainDiagram({
  chain,
  report,
  onRemoveAt,
  insertAtIdx,
  onToggleInsertAt,
}: {
  chain: ChainEntry[];
  report: SystemReport | null;
  onRemoveAt?: (idx: number) => void;
  insertAtIdx?: number | null;
  onToggleInsertAt?: (idx: number) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${chain.length}, minmax(0, 1fr))`,
      gap: "18px",
      position: "relative",
    }}>
      {chain.length > 1 && (
        <>
          <div className="pa-rail" />
          <div className="pa-rail-track">
            <div className="pa-pulse" style={{ width: "8px", height: "8px" }} />
          </div>
        </>
      )}
      {chain.map((entry, i) => {
        const link = linkForNode(report, i, chain.length);
        const tone: Verdict | null = link ? link.verdict : null;
        return (
          <div
            key={`${entry.component.id}-${i}`}
            className="pa-rack-unit pa-fade-up"
            style={{ padding: "20px 20px 16px", animationDuration: "0.8s", animationDelay: `${0.05 + i * 0.1}s` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
              <span style={{
                fontSize: "0.54rem",
                letterSpacing: "0.28em",
                color: "var(--pa-accent)",
                fontFamily: "var(--pa-font-ui)",
                textTransform: "uppercase",
                fontWeight: 700,
                flex: 1,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}>
                {CATEGORY_LABELS[entry.component.category]}
              </span>
              {AMP_CATEGORIES.has(entry.component.category) && (
                <div className="pa-vu" style={{ height: "16px", gap: "2.5px" }}>
                  <i /><i /><i />
                </div>
              )}
              {onRemoveAt && (
                <button
                  onClick={() => onRemoveAt(i)}
                  title="Remove"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--pa-faint)",
                    fontSize: "1rem",
                    lineHeight: 1,
                    padding: "0 2px",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <div style={{
              fontFamily: "var(--pa-font-display)",
              fontSize: "1.1rem",
              color: "var(--pa-cream)",
              marginBottom: "5px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}>
              {entry.component.name}
            </div>
            <div style={{
              fontSize: "0.68rem",
              color: "var(--pa-faint)",
              fontFamily: "monospace",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}>
              {portSummary(entry)}
            </div>
            <div style={{
              marginTop: "13px",
              paddingTop: "11px",
              borderTop: "1px solid rgba(217,119,6,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}>
              {tone ? (
                <>
                  <div className={
                    tone === "fail" ? "pa-led pa-led--err" : tone === "warn" ? "pa-led pa-led--warn" : "pa-led"
                  } />
                  <span style={{
                    fontSize: "0.58rem",
                    color: tone === "fail" ? "#fca5a5" : tone === "warn" ? "var(--pa-warn-text)" : "var(--pa-ok-text)",
                    fontFamily: "var(--pa-font-ui)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}>
                    {statusText(link!)}
                  </span>
                </>
              ) : (
                <>
                  <div style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: "rgba(168,145,109,0.5)",
                  }} />
                  <span style={{
                    fontSize: "0.58rem",
                    color: "var(--pa-faint)",
                    fontFamily: "var(--pa-font-ui)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                  }}>
                    Ready
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
      {onToggleInsertAt && chain.length > 1 && chain.slice(0, -1).map((entry, k) => (
        <button
          key={`insert-${entry.component.id}-${k}`}
          onClick={() => onToggleInsertAt(k + 1)}
          title="Insert component here"
          style={{
            position: "absolute",
            // center of gap k in an N-column equal grid: (k+1)(W+gap)/N − gap/2
            left: `calc((100% + 18px) * ${k + 1} / ${chain.length} - 9px)`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2,
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            border: insertAtIdx === k + 1 ? "1px solid var(--pa-accent)" : "1px solid var(--pa-border-2)",
            background: insertAtIdx === k + 1 ? "var(--pa-accent)" : "var(--pa-inset)",
            color: insertAtIdx === k + 1 ? "var(--pa-cream)" : "var(--pa-accent2)",
            fontSize: "0.9rem",
            lineHeight: 1,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      ))}
    </div>
  );
}
