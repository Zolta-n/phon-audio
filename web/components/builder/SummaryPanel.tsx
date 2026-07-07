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
      background: "var(--pa-panel)",
      borderRadius: "var(--pa-radius-lg)",
      border: "1px solid var(--pa-border)",
      padding: "22px",
      alignSelf: "start",
      overflowY: "auto",
      maxHeight: "calc(100vh - var(--pa-nav-h) - 6rem)",
    }}>
      {/* Evaluate button — always at top for visibility */}
      <button
        onClick={onEvaluate}
        disabled={evaluating || !canEvaluate}
        className="pa-btn pa-btn-primary"
        style={{ width: "100%", marginBottom: "22px", padding: "14px", letterSpacing: "0.22em" }}
      >
        {evaluating ? "Evaluating…" : "Evaluate Chain"}
      </button>

      <div style={{
        fontFamily: "var(--pa-font-display)",
        fontSize: "1.15rem",
        color: "var(--pa-text)",
        borderBottom: "1px solid var(--pa-border)",
        paddingBottom: "12px",
        marginBottom: "18px",
      }}>
        Room Settings
      </div>
      <ContextForm ctx={ctx} onChange={onCtxChange} />

      {/* Compatibility check summary */}
      {report && (
        <div style={{ marginTop: "22px" }}>
          {/* Compatibility card */}
          <div style={{
            background: "var(--pa-inset)",
            border: "1px solid var(--pa-border-2)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "18px",
          }}>
            <div style={{
              fontSize: "0.58rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--pa-accent2)",
              marginBottom: "12px",
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
                gap: "10px",
                padding: "7px 0",
                borderBottom: idx < topChecks.length - 1 ? "1px solid rgba(224,203,166,0.5)" : "none",
                fontSize: "0.74rem",
              }}>
                <span style={{ color: "var(--pa-muted)" }}>{chk.label}</span>
                <span style={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  color: chk.verdict === "pass" ? "var(--pa-ok-on-cream)" : chk.verdict === "fail" ? "#c0392b" : "var(--pa-warn-on-cream)",
                }}>
                  {chk.valueStr} {chk.verdict === "pass" ? "✓" : chk.verdict === "fail" ? "✕" : "⚠"}
                </span>
              </div>
            ))}
          </div>

          {/* Score card */}
          <div style={{
            background: "linear-gradient(180deg, #2b1a09, #140b00)",
            border: "1px solid var(--pa-rack-border)",
            borderRadius: "10px",
            padding: "18px",
            textAlign: "center",
            marginBottom: "16px",
            boxShadow: "inset 0 1px 0 rgba(255,215,150,0.15)",
          }}>
            <div style={{
              fontFamily: "var(--pa-font-display)",
              fontSize: "2.6rem",
              lineHeight: 1,
              color: "var(--pa-gold)",
              textShadow: "0 0 18px rgba(251,191,36,0.45)",
            }}>
              {score}
            </div>
            <div style={{
              fontSize: "0.56rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--pa-faint)",
              marginTop: "8px",
              fontFamily: "var(--pa-font-ui)",
            }}>
              out of 100 — {scoreLabel(score)}
            </div>
            <div className="pa-vu" style={{ justifyContent: "center", height: "18px", marginTop: "12px" }}>
              <i /><i /><i /><i /><i />
            </div>
          </div>

          {(report.recommendations?.length ?? 0) > 0 && (
            <div style={{
              fontSize: "0.7rem",
              color: "var(--pa-accent2)",
              fontFamily: "var(--pa-font-ui)",
              letterSpacing: "0.06em",
              textAlign: "center",
              marginBottom: "14px",
            }}>
              💡 {report.recommendations!.length} optimization suggestion{report.recommendations!.length === 1 ? "" : "s"} — see results below
            </div>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="pa-btn pa-btn-invert"
            style={{ width: "100%", padding: "12px", letterSpacing: "0.2em", cursor: saving ? "wait" : "pointer" }}
          >
            {saving ? "Saving…" : saveMsg || "Save Chain"}
          </button>
        </div>
      )}
    </aside>
  );
}
