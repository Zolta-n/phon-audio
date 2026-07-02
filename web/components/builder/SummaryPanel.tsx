"use client";

import { useMemo } from "react";
import type { ContextSettings, SystemReport } from "@/types";
import ContextForm from "./ContextForm";
import { computeScore, scoreLabel, getTopChecks } from "./chainScore";

/** Right-hand panel: evaluate button, room settings, and the results summary. */
export default function SummaryPanel({
  ctx,
  onCtxChange,
  report,
  evaluating,
  canEvaluate,
  onEvaluate,
  saving,
  saveMsg,
  onSave,
}: {
  ctx: ContextSettings;
  onCtxChange: (c: ContextSettings) => void;
  report: SystemReport | null;
  evaluating: boolean;
  canEvaluate: boolean;
  onEvaluate: () => void;
  saving: boolean;
  saveMsg: string | null;
  onSave: () => void;
}) {
  const score = useMemo(() => (report ? computeScore(report) : 0), [report]);
  const topChecks = useMemo(() => (report ? getTopChecks(report) : []), [report]);

  return (
    <aside style={{
      background: "var(--pa-cream)",
      borderRadius: "var(--pa-radius-lg)",
      border: "1.5px solid var(--pa-border)",
      padding: "16px",
      overflowY: "auto",
      maxHeight: "calc(100vh - var(--pa-nav-h) - 6rem)",
    }}>
      {/* Evaluate button — always at top for visibility */}
      <button
        onClick={onEvaluate}
        disabled={evaluating || !canEvaluate}
        style={{
          width: "100%",
          marginBottom: "16px",
          background: evaluating || !canEvaluate ? "var(--pa-border)" : "var(--pa-accent)",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 700,
          padding: "11px",
          borderRadius: "var(--pa-radius-sm)",
          border: "none",
          cursor: evaluating || !canEvaluate ? "not-allowed" : "pointer",
          fontFamily: "var(--pa-font-ui)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {evaluating ? "Evaluating…" : "Evaluate Chain"}
      </button>

      <div style={{
        fontFamily: "var(--pa-font-serif)",
        fontSize: "0.95rem",
        color: "#3d2200",
        borderBottom: "1px solid var(--pa-border)",
        paddingBottom: "12px",
        marginBottom: "16px",
      }}>
        Room Settings
      </div>
      <ContextForm ctx={ctx} onChange={onCtxChange} />

      {/* Compatibility check summary */}
      {report && (
        <div style={{ marginTop: "16px" }}>
          {/* Compatibility card */}
          <div style={{
            background: "#fef3e2",
            border: "1.5px solid #fcd34d",
            borderRadius: "var(--pa-radius-md)",
            padding: "12px",
            marginBottom: "12px",
          }}>
            <div style={{
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--pa-accent-deep)",
              marginBottom: "10px",
              fontWeight: 700,
              fontFamily: "var(--pa-font-ui)",
            }}>
              Compatibility Check
            </div>
            {topChecks.map((chk, idx) => (
              <div key={idx} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 0",
                borderBottom: idx < topChecks.length - 1 ? "1px solid rgba(252,211,77,0.3)" : "none",
                fontSize: "0.72rem",
                fontFamily: "var(--pa-font-ui)",
              }}>
                <span style={{ color: "#7c5a3a" }}>{chk.label}</span>
                <span style={{
                  fontWeight: 600,
                  color: chk.verdict === "pass" ? "#16a34a" : chk.verdict === "fail" ? "#c0392b" : "var(--pa-accent)",
                }}>
                  {chk.valueStr} {chk.verdict === "pass" ? "✓" : chk.verdict === "fail" ? "✕" : "⚡"}
                </span>
              </div>
            ))}
          </div>

          {/* Score badge */}
          <div style={{
            background: "linear-gradient(135deg, var(--pa-accent), var(--pa-accent-hover))",
            borderRadius: "var(--pa-radius-md)",
            padding: "12px",
            textAlign: "center",
            color: "#fff",
            marginBottom: "12px",
          }}>
            <div style={{ fontFamily: "var(--pa-font-serif)", fontSize: "2.2rem", lineHeight: 1 }}>
              {score}
            </div>
            <div style={{
              fontSize: "0.7rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.85,
              marginTop: "4px",
              fontFamily: "var(--pa-font-ui)",
            }}>
              out of 100 — {scoreLabel(score)}
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            style={{
              width: "100%",
              background: "var(--pa-accent)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--pa-radius-md)",
              padding: "9px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "var(--pa-font-ui)",
            }}
          >
            {saving ? "Saving…" : saveMsg || "Save"}
          </button>
        </div>
      )}
    </aside>
  );
}
