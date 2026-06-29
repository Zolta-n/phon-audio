"use client";

import type {
  ChainEntry, SystemReport, ContextSettings, Verdict, SignalDomain,
} from "@/types";
import { CATEGORY_BADGE, CABLE_BY_ID } from "@/types";
import {
  CAT_COLOR, DOMAIN_COLOR, VERDICT_FG, VERDICT_BG, VERDICT_ICON,
  getExtendedSpecNote, getCableSpec, getDomainForLink,
  computeScore, computeSplHeadroom, getImpedanceData,
} from "./diagramUtils";

// ---- Sub-components --------------------------------------------------------

/** Header block — engineering title block style */
function SchematicHeader({ ctx }: { ctx: ContextSettings }) {
  const peakDb = ctx.crestFactorDb;
  return (
    <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: "1px solid #d8c9a8" }}>
      <div style={{
        font: "600 11px monospace", letterSpacing: ".18em",
        color: "#3d2200", textTransform: "uppercase",
      }}>
        PHON.AUDIO &mdash; SIGNAL CHAIN EVALUATION
      </div>
      <div style={{
        font: "500 9px monospace", letterSpacing: ".1em",
        color: "#8a7a5c", marginTop: 4,
      }}>
        SCALE: NTS &middot; CTX: {ctx.targetSplDb} dB @ {ctx.distanceM} m &middot; +{peakDb} dB HEADROOM
      </div>
    </div>
  );
}

/** A single schematic component box */
function SchematicBox({ entry, leftDomain, rightDomain, report, chain }: {
  entry: ChainEntry;
  leftDomain: SignalDomain | null;
  rightDomain: SignalDomain | null;
  report: SystemReport;
  chain: ChainEntry[];
}) {
  const c = entry.component;
  const catColor = CAT_COLOR[c.category] ?? "#7a5c3a";
  const badge = CATEGORY_BADGE[c.category] ?? "?";
  const spec = getExtendedSpecNote(c, report, chain);

  return (
    <div style={{
      position: "relative",
      width: 170, display: "flex", flexDirection: "column",
      background: "#fff8f0", border: `1.5px solid ${catColor}`,
      borderRadius: 4, flexShrink: 0,
    }}>
      {/* Category label above */}
      <div style={{
        padding: "7px 12px 5px",
        font: "600 9px monospace", letterSpacing: ".16em",
        color: catColor, textTransform: "uppercase",
      }}>
        {badge}
      </div>
      {/* Name */}
      <div style={{
        padding: "0 12px",
        font: "700 16px/1.15 Georgia, serif", color: "#2d1a0a",
      }}>
        {c.name}
      </div>
      {/* Spec line */}
      {spec && (
        <div style={{
          padding: "4px 12px 10px",
          font: "500 9.5px monospace", color: "#9b4f0a",
        }}>
          {spec}
        </div>
      )}
      {/* Left port dot */}
      {leftDomain && (
        <div style={{
          position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: "#fff", border: `2.5px solid ${DOMAIN_COLOR[leftDomain] ?? "#9a8d72"}`,
        }} />
      )}
      {/* Right port dot */}
      {rightDomain && (
        <div style={{
          position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: "#fff", border: `2.5px solid ${DOMAIN_COLOR[rightDomain] ?? "#9a8d72"}`,
        }} />
      )}
    </div>
  );
}

/** Connection annotation between two boxes */
function SchematicLink({ chain, report, linkIdx }: {
  chain: ChainEntry[];
  report: SystemReport;
  linkIdx: number;
}) {
  if (linkIdx >= report.links.length) return null;
  const link = report.links[linkIdx];
  const domain = link.domain as SignalDomain;
  const domainColor = DOMAIN_COLOR[domain] ?? "#9a8d72";
  const cableSpec = getCableSpec(chain[linkIdx].cableId);
  const impedance = getImpedanceData(chain, report, linkIdx);

  // Cable domain label
  const cableDef = CABLE_BY_ID[chain[linkIdx].cableId];
  const bal = cableDef?.cable?.kind === "interconnect" && cableDef.cable.balanced;
  const domainLabel = domain + (bal ? " \u00B7 bal" : "");

  // Build check annotation
  let checkLabel = "";
  if (impedance) {
    if (impedance.type === "damping") {
      checkLabel = `DF ${impedance.ratio.toFixed(0)} \u00B7 ${VERDICT_ICON[impedance.verdict]}`;
    } else {
      checkLabel = `bridge ${impedance.ratio.toFixed(0)}\u00D7 \u00B7 ${VERDICT_ICON[impedance.verdict]}`;
    }
  }

  const isSpeaker = domain === "speaker";

  return (
    <div style={{
      width: 100, display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      position: "relative", flexShrink: 0,
    }}>
      {/* Cable annotation above */}
      <div style={{
        font: "500 8.5px monospace", color: "#92400e",
        textAlign: "center", marginBottom: 4,
        whiteSpace: "nowrap",
      }}>
        {cableSpec && <div>{cableSpec} &middot; {domainLabel}</div>}
        {!cableSpec && <div>{domainLabel}</div>}
      </div>

      {/* Connection line — right-angle style */}
      <div style={{ width: "100%", position: "relative", height: 24 }}>
        {/* Vertical stub out */}
        <div style={{
          position: "absolute", left: 0, top: 6,
          width: 10, height: 2, background: domainColor,
        }} />
        {/* Horizontal bar */}
        <div style={{
          position: "absolute", left: 10, top: 6,
          right: 10, height: isSpeaker ? 3 : 2,
          background: domainColor,
        }} />
        {/* Vertical stub in */}
        <div style={{
          position: "absolute", right: 0, top: 6,
          width: 10, height: 2, background: domainColor,
        }} />
        {/* Right-angle corners */}
        <div style={{
          position: "absolute", left: 10, top: 0,
          width: 2, height: 8, background: domainColor,
        }} />
        <div style={{
          position: "absolute", right: 10, top: 0,
          width: 2, height: 8, background: domainColor,
        }} />
      </div>

      {/* Check annotation below */}
      {checkLabel && (
        <div style={{
          font: "500 8.5px monospace",
          color: impedance ? VERDICT_FG[impedance.verdict] : "#7a5c3a",
          textAlign: "center", marginTop: 2,
          whiteSpace: "nowrap",
        }}>
          {checkLabel}
        </div>
      )}
    </div>
  );
}

/** Speaker cable annotation below the speaker box */
function SpeakerCableAnnotation({ chain, ctx, report }: {
  chain: ChainEntry[];
  ctx: ContextSettings;
  report: SystemReport;
}) {
  const spkIdx = chain.findIndex(e => e.component.category === "speaker");
  if (spkIdx < 1) return null;

  const ampIdx = spkIdx - 1;
  const cableSpec = getCableSpec(chain[ampIdx].cableId);
  const splData = computeSplHeadroom(chain, ctx);

  // Get power headroom check
  const headroom = ampIdx < report.links.length
    ? report.links[ampIdx].results.find(r => r.id === "speaker_power_headroom")
    : null;

  return (
    <div style={{
      marginTop: 8, paddingLeft: 60 + (spkIdx * 270),
      font: "500 9px monospace",
    }}>
      {cableSpec && (
        <div style={{ color: "#a23e12" }}>
          {cableSpec} &middot; speaker
        </div>
      )}
      {splData && headroom && (
        <div style={{
          color: headroom.verdict === "pass" || headroom.verdict === "info"
            ? "#2f8a4e" : headroom.verdict === "warn" ? "#d97706" : "#c0392b",
        }}>
          {splData.maxSpl.toFixed(0)} dB max &middot; +{headroom.value?.toFixed(0) ?? "?"} dB peak {VERDICT_ICON[headroom.verdict]}
        </div>
      )}
    </div>
  );
}

/** Room plan view SVG */
function RoomPlanView({ ctx }: { ctx: ContextSettings }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        font: "600 9px monospace", letterSpacing: ".14em",
        color: "#7a5c3a", textTransform: "uppercase",
      }}>
        ROOM &mdash; PLAN VIEW
      </div>
      <div style={{
        background: "#fbf4e8", border: "1px solid #d8c9a8",
        borderRadius: 6, padding: 8,
      }}>
        <svg width="200" height="110" viewBox="0 0 200 110">
          {/* Room outline */}
          <rect x="4" y="4" width="192" height="102" rx="3" fill="none"
            stroke="#cdba97" strokeWidth="1" />
          {/* Left speaker */}
          <path d="M20 24 l12 7 l-12 7 z" fill="#a23e12" />
          {/* Right speaker */}
          <path d="M20 72 l12 7 l-12 7 z" fill="#a23e12" />
          {/* Dashed lines to listener */}
          <line x1="32" y1="31" x2="156" y2="55" stroke="#b08f5c"
            strokeWidth="1" strokeDasharray="4 3" />
          <line x1="32" y1="79" x2="156" y2="55" stroke="#b08f5c"
            strokeWidth="1" strokeDasharray="4 3" />
          {/* Listener head */}
          <circle cx="160" cy="55" r="8" fill="none" stroke="#3d2200" strokeWidth="1.5" />
          <path d="M153 61 q7 7 14 0" fill="none" stroke="#3d2200" strokeWidth="1.2" />
          {/* Distance annotation */}
          <line x1="34" y1="100" x2="152" y2="100" stroke="#8a7a5c"
            strokeWidth="0.8" strokeDasharray="2 2" />
          <text x="93" y="98" textAnchor="middle" fontSize="9" fill="#8a7a5c"
            fontFamily="monospace">{ctx.distanceM} m</text>
        </svg>
      </div>
    </div>
  );
}

/** Summary cards (links + verdict) */
function SummaryCards({ report }: { report: SystemReport }) {
  const score = computeScore(report);
  const total = report.links.length;
  const counts: Record<Verdict, number> = { pass: 0, info: 0, warn: 0, fail: 0 };
  for (const link of report.links) {
    counts[link.verdict]++;
  }

  const parts: string[] = [];
  if (counts.pass > 0) parts.push(`${counts.pass} pass`);
  if (counts.info > 0) parts.push(`${counts.info} info`);
  if (counts.warn > 0) parts.push(`${counts.warn} warn`);
  if (counts.fail > 0) parts.push(`${counts.fail} fail`);

  const overallLabel = report.overall.toUpperCase();

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {/* Links card */}
      <div style={{
        flex: 1, minWidth: 140,
        background: "#fbf4e8", border: "1px solid #d8c9a8",
        borderRadius: 6, padding: "12px 16px",
      }}>
        <div style={{
          font: "600 9px monospace", letterSpacing: ".14em",
          color: "#7a5c3a", textTransform: "uppercase", marginBottom: 6,
        }}>
          LINKS
        </div>
        <div style={{ font: "700 28px monospace", color: "#3d2200", lineHeight: 1.1 }}>
          {total} of {total}
        </div>
        <div style={{ font: "500 10px monospace", color: "#8a7a5c", marginTop: 4 }}>
          {parts.join(" \u00B7 ")}
        </div>
      </div>

      {/* Verdict card */}
      <div style={{
        flex: 1, minWidth: 120,
        background: VERDICT_BG[report.overall],
        border: `1.5px solid ${VERDICT_FG[report.overall]}`,
        borderRadius: 6, padding: "12px 16px",
      }}>
        <div style={{
          font: "600 9px monospace", letterSpacing: ".14em",
          color: VERDICT_FG[report.overall], textTransform: "uppercase", marginBottom: 6,
        }}>
          VERDICT
        </div>
        <div style={{
          font: "700 22px monospace", color: VERDICT_FG[report.overall], lineHeight: 1.1,
        }}>
          {VERDICT_ICON[report.overall]} {overallLabel}
        </div>
        <div style={{
          font: "500 10px monospace", color: VERDICT_FG[report.overall],
          marginTop: 4, opacity: 0.8,
        }}>
          Score: {score}/100
        </div>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export default function SchematicDiagram({ chain, report, ctx }: {
  chain: ChainEntry[];
  report: SystemReport;
  ctx: ContextSettings;
}) {
  if (chain.length === 0) return null;

  const hasSpeaker = chain.some(e => e.component.category === "speaker");

  return (
    <div style={{
      background: "#faf8f5", border: "1px solid #e2cda8", borderRadius: 14,
      boxShadow: "0 1px 3px rgba(120,60,10,.07)", padding: "24px 26px 26px",
    }}>
      {/* Header block */}
      <SchematicHeader ctx={ctx} />

      {/* Chain row: boxes + links */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "10px 0 6px", overflowX: "auto",
      }}>
        {chain.map((entry, i) => {
          const isLast = i === chain.length - 1;
          const leftDomain = i > 0 ? getDomainForLink(chain, report, i - 1) : null;
          const rightDomain = !isLast ? getDomainForLink(chain, report, i) : null;

          return (
            <div key={`${entry.component.id}-${i}`} style={{
              display: "flex", alignItems: "center",
            }}>
              <SchematicBox
                entry={entry}
                leftDomain={leftDomain}
                rightDomain={rightDomain}
                report={report}
                chain={chain}
              />
              {!isLast && (
                <SchematicLink chain={chain} report={report} linkIdx={i} />
              )}
            </div>
          );
        })}
      </div>

      {/* Speaker cable annotation */}
      {hasSpeaker && (
        <SpeakerCableAnnotation chain={chain} ctx={ctx} report={report} />
      )}

      {/* Bottom row: room plan + summary */}
      <div style={{
        display: "flex", gap: 20, marginTop: 20,
        paddingTop: 16, borderTop: "1px solid #d8c9a8",
        flexWrap: "wrap",
      }}>
        {hasSpeaker && (
          <div style={{ flex: "0 0 auto" }}>
            <RoomPlanView ctx={ctx} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 200 }}>
          <SummaryCards report={report} />
        </div>
      </div>
    </div>
  );
}
