"use client";

import type {
  ChainEntry, SystemReport, Verdict, ContextSettings,
  SignalDomain,
} from "@/types";
import { CATEGORY_BADGE } from "@/types";
import {
  CAT_COLOR, CAT_BADGE_COLOR, DOMAIN_COLOR, DOMAIN_LIGHT,
  VERDICT_FG, VERDICT_BG, VERDICT_ICON,
  getSpecNote, getIOChip, getCableSpec, getDomainForLink,
  computeScore,
} from "./diagramUtils";

// ---- Sub-components --------------------------------------------------------

function Module({ entry, leftDomain, rightDomain }: {
  entry: ChainEntry;
  leftDomain: SignalDomain | null;
  rightDomain: SignalDomain | null;
}) {
  const c = entry.component;
  const catColor = CAT_COLOR[c.category] ?? "#7a5c3a";
  const badgeColor = CAT_BADGE_COLOR[c.category] ?? "#f0a94e";
  const badge = CATEGORY_BADGE[c.category] ?? "?";
  const name = c.name;
  const mfr = c.manufacturer?.toUpperCase() ?? "";
  const spec = getSpecNote(c);
  const ioChip = rightDomain
    ? getIOChip(c, "out")
    : getIOChip(c, "in");

  return (
    <div style={{
      width: 152, position: "relative", display: "flex", flexDirection: "column",
      background: "#fff8f0", border: `1.5px solid ${catColor}`,
      borderRadius: 9, overflow: "hidden", flexShrink: 0,
    }}>
      {/* Header bar */}
      <div style={{
        background: "#1a0f00", padding: "7px 11px",
        display: "flex", flexDirection: "column", gap: 1,
      }}>
        <span style={{
          font: "600 9px monospace", letterSpacing: ".18em",
          color: badgeColor, textTransform: "uppercase",
        }}>
          {badge}
        </span>
        {mfr && (
          <span style={{
            font: "500 8.5px var(--pa-font-ui)", letterSpacing: ".1em",
            color: "#9a7a52",
          }}>
            {mfr}
          </span>
        )}
      </div>
      {/* Body */}
      <div style={{
        padding: "11px 11px 13px", display: "flex", flexDirection: "column",
        gap: 7, flex: 1,
      }}>
        <span style={{ font: "600 15px/1.05 Georgia, serif", color: "#2d1a0a" }}>
          {name}
        </span>
        {spec && (
          <span style={{ font: "500 10px monospace", color: "#9b4f0a" }}>
            {spec}
          </span>
        )}
        {ioChip && (
          <div style={{
            marginTop: "auto", font: "500 8.5px monospace", color: "#7a5c3a",
            background: "#f7ecda", border: "1px solid #ecdcbf",
            borderRadius: 4, padding: "4px 6px",
          }}>
            {ioChip}
          </div>
        )}
      </div>
      {/* Left port pin */}
      {leftDomain && (
        <div style={{
          position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)",
          width: 13, height: 13, borderRadius: "50%",
          background: "#fff", border: `2.5px solid ${DOMAIN_COLOR[leftDomain] ?? "#9a8d72"}`,
        }} />
      )}
      {/* Right port pin */}
      {rightDomain && (
        <div style={{
          position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)",
          width: 13, height: 13, borderRadius: "50%",
          background: "#fff", border: `2.5px solid ${DOMAIN_COLOR[rightDomain] ?? "#9a8d72"}`,
        }} />
      )}
    </div>
  );
}

function Connector({ domain, cableSpec, verdict }: {
  domain: SignalDomain | null;
  cableSpec: string;
  verdict: Verdict | null;
}) {
  const color = domain ? (DOMAIN_COLOR[domain] ?? "#9a8d72") : "#9a8d72";
  const light = domain ? (DOMAIN_LIGHT[domain] ?? "#c4b99a") : "#c4b99a";
  const isSpeaker = domain === "speaker";
  const barH = isSpeaker ? 8 : 6;

  return (
    <div style={{
      width: 70, position: "relative", display: "flex",
      alignItems: "center", flexShrink: 0,
    }}>
      {/* Cable bar */}
      <div style={{
        position: "absolute", left: 2, right: 10, top: "50%",
        transform: "translateY(-50%)", height: barH, borderRadius: barH / 2,
        background: `repeating-linear-gradient(90deg, ${color} 0 9px, ${light} 9px 16px)`,
        backgroundSize: "16px " + barH + "px",
        animation: "dashflow 1.1s linear infinite",
      }} />
      {/* Arrowhead */}
      <div style={{
        position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)",
        width: 0, height: 0,
        borderTop: `${isSpeaker ? 7 : 6}px solid transparent`,
        borderBottom: `${isSpeaker ? 7 : 6}px solid transparent`,
        borderLeft: `${isSpeaker ? 10 : 9}px solid ${color}`,
      }} />
      {/* Cable spec label */}
      {cableSpec && (
        <div style={{
          position: "absolute", left: "50%", top: "calc(50% - 30px)",
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          font: "500 8.5px monospace", color: "#92400e",
        }}>
          {cableSpec}
        </div>
      )}
      {/* Verdict node */}
      {verdict && (
        <div style={{
          position: "absolute", left: "50%", top: "calc(50% + 16px)",
          transform: "translateX(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 19, height: 19, borderRadius: "50%",
          background: VERDICT_BG[verdict], border: `2px solid ${VERDICT_FG[verdict]}`,
          color: VERDICT_FG[verdict], fontSize: 11, lineHeight: 1,
        }}>
          {VERDICT_ICON[verdict]}
        </div>
      )}
    </div>
  );
}

function AcousticRun({ distanceM }: { distanceM: number }) {
  return (
    <div style={{
      width: 54, position: "relative", display: "flex",
      alignItems: "center", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", left: 2, right: 8, top: "50%",
        transform: "translateY(-50%)", height: 0,
        borderTop: "3px dotted #9a8d72",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "calc(50% - 26px)",
        transform: "translateX(-50%)", whiteSpace: "nowrap",
        font: "500 8px monospace", color: "#8a7a5c",
      }}>
        {distanceM} m
      </div>
    </div>
  );
}

function RoomNode({ ctx }: { ctx: ContextSettings }) {
  const peakSpl = ctx.targetSplDb + ctx.crestFactorDb;
  return (
    <div style={{
      width: 140, display: "flex", flexDirection: "column",
      background: "#f3ede1", border: "1.5px solid #b9a888",
      borderRadius: 9, overflow: "hidden", flexShrink: 0,
    }}>
      <div style={{ background: "#3a2c14", padding: "7px 11px" }}>
        <span style={{
          font: "600 9px monospace", letterSpacing: ".16em", color: "#d8c298",
        }}>
          LISTENING
        </span>
      </div>
      <div style={{
        padding: "9px 10px 11px", display: "flex", flexDirection: "column",
        gap: 7, alignItems: "center",
      }}>
        <svg width="116" height="56" viewBox="0 0 116 56">
          <rect x="2" y="2" width="112" height="52" rx="4" fill="#fbf4e8" stroke="#cdba97" strokeWidth="1"/>
          <path d="M14 14 l9 5 l-9 5 z" fill="#a23e12"/>
          <path d="M14 32 l9 5 l-9 5 z" fill="#a23e12"/>
          <circle cx="92" cy="28" r="6" fill="none" stroke="#3d2200" strokeWidth="1.6"/>
          <path d="M86 33 q6 6 12 0" fill="none" stroke="#3d2200" strokeWidth="1.4"/>
          <line x1="24" y1="49" x2="86" y2="49" stroke="#b08f5c" strokeWidth="1" strokeDasharray="2 2"/>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
          <span style={{ font: "600 11px monospace", color: "#3d2200" }}>
            {ctx.targetSplDb} dB \u00B7 {ctx.distanceM} m
          </span>
          <span style={{ font: "500 8.5px monospace", color: "#8a7a5c" }}>
            +{ctx.crestFactorDb} dB headroom ({peakSpl} peak)
          </span>
        </div>
      </div>
    </div>
  );
}

function FootnoteStrip({ report }: { report: SystemReport }) {
  const summaries: { verdict: Verdict; text: string }[] = [];

  for (const link of report.links) {
    const key = link.results
      .filter(r => r.verdict !== "info")
      .map(r => `${r.label}${r.value != null && r.unit ? " " + r.value.toFixed(r.value < 10 ? 1 : 0) + r.unit : ""}`)
      .join(", ");
    if (!key) continue;

    const domainLabel = link.domain.charAt(0).toUpperCase() + link.domain.slice(1);
    const icon = VERDICT_ICON[link.verdict];
    summaries.push({
      verdict: link.verdict,
      text: `${icon} ${domainLabel} link \u00B7 ${key}`,
    });
  }

  if (summaries.length === 0) return null;

  return (
    <div style={{
      marginTop: 14, paddingTop: 13, borderTop: "1px solid #ecdcbf",
      display: "flex", gap: 8, flexWrap: "wrap",
    }}>
      {summaries.map((s, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 150,
          font: "500 9.5px/1.4 var(--pa-font-ui)", color: VERDICT_FG[s.verdict],
          background: VERDICT_BG[s.verdict],
          border: `1px solid ${s.verdict === "pass" ? "#cfe6d3" : s.verdict === "warn" ? "#f0d8a8" : s.verdict === "fail" ? "#f5c6c6" : "#c5d8e8"}`,
          borderRadius: 6, padding: "7px 10px",
        }}>
          {s.text}
        </div>
      ))}
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export default function ExpertDiagram({ chain, report, ctx }: {
  chain: ChainEntry[];
  report: SystemReport;
  ctx: ContextSettings;
}) {
  if (chain.length === 0) return null;

  const hasSpeaker = chain.some(e => e.component.category === "speaker");
  const overallIcon = VERDICT_ICON[report.overall];
  const overallLabel = report.overall.charAt(0).toUpperCase() + report.overall.slice(1);

  const score = computeScore(report);

  return (
    <div style={{
      background: "#faf8f5", border: "1px solid #e2cda8", borderRadius: 14,
      boxShadow: "0 1px 3px rgba(120,60,10,.07)", padding: "24px 26px 26px",
    }}>
      {/* CSS animation */}
      <style>{`
        @keyframes dashflow { to { background-position-x: -16px } }
        @media (prefers-reduced-motion: reduce) {
          [style*="dashflow"] { animation: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div style={{ font: "600 17px/1 Georgia, serif", color: "#3d2200" }}>
          Signal Chain
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Domain legend */}
          <div style={{
            display: "flex", gap: 13, alignItems: "center",
            font: "500 9px monospace", letterSpacing: ".06em", color: "#7a5c3a",
          }}>
            {(["digital", "line", "speaker"] as const).map(d => (
              <span key={d} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 11, height: 4, borderRadius: 2,
                  background: DOMAIN_COLOR[d],
                }} />
                {d.toUpperCase()}
              </span>
            ))}
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{
                width: 11, height: 4, borderRadius: 2, background: "#9a8d72",
              }} />
              ACOUSTIC
            </span>
          </div>
          {/* Overall verdict chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: VERDICT_BG[report.overall],
            border: `1.5px solid ${VERDICT_FG[report.overall]}`,
            borderRadius: 6, padding: "5px 11px",
          }}>
            <span style={{ color: VERDICT_FG[report.overall], fontSize: 13 }}>
              {overallIcon}
            </span>
            <span style={{
              font: "600 11px var(--pa-font-ui)", color: VERDICT_FG[report.overall],
            }}>
              {overallLabel}
            </span>
            <span style={{
              font: "600 11px monospace", color: VERDICT_FG[report.overall],
              borderLeft: `1px solid ${VERDICT_FG[report.overall]}33`,
              paddingLeft: 7,
            }}>
              {score}<span style={{ opacity: 0.5 }}>/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* Chain row */}
      <div style={{
        display: "flex", alignItems: "stretch", padding: "14px 0 8px",
        overflowX: "auto",
      }}>
        {chain.map((entry, i) => {
          const isLast = i === chain.length - 1;
          const leftDomain = i > 0 ? getDomainForLink(chain, report, i - 1) : null;
          const rightDomain = !isLast ? getDomainForLink(chain, report, i) : null;
          const linkReport = !isLast && i < report.links.length ? report.links[i] : null;
          const cableSpec = !isLast ? getCableSpec(entry.cableId) : "";

          return (
            <div key={`${entry.component.id}-${i}`} style={{ display: "flex", alignItems: "stretch" }}>
              <Module entry={entry} leftDomain={leftDomain} rightDomain={rightDomain} />
              {!isLast && (
                <Connector
                  domain={rightDomain}
                  cableSpec={cableSpec}
                  verdict={linkReport?.verdict ?? null}
                />
              )}
            </div>
          );
        })}

        {/* Acoustic run + Room node (for speaker chains) */}
        {hasSpeaker && (
          <>
            <AcousticRun distanceM={ctx.distanceM} />
            <RoomNode ctx={ctx} />
          </>
        )}
      </div>

      {/* Footnote strip */}
      <FootnoteStrip report={report} />
    </div>
  );
}
