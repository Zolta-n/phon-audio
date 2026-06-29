"use client";

import type {
  ChainEntry, SystemReport, ContextSettings, Verdict,
} from "@/types";
import { CATEGORY_BADGE } from "@/types";
import {
  CAT_COLOR, DOMAIN_COLOR, VERDICT_FG, VERDICT_BG, VERDICT_ICON,
  getSpecNote, getDomainForLink, computeScore,
  computeSignalLevels, computeSplHeadroom, getImpedanceData,
} from "./diagramUtils";

// ---- Sub-components --------------------------------------------------------

/** Dark pill node row — the component identity bar */
function NodePillRow({ chain }: { chain: ChainEntry[] }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-around",
      padding: "0 60px", marginBottom: 6,
    }}>
      {chain.map((entry, i) => {
        const c = entry.component;
        const catColor = CAT_COLOR[c.category] ?? "#7a5c3a";
        const badge = CATEGORY_BADGE[c.category] ?? "?";
        return (
          <div key={`${c.id}-${i}`} style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, flex: 1, minWidth: 0,
          }}>
            <span style={{
              font: "600 9px monospace", letterSpacing: ".16em",
              color: catColor, textTransform: "uppercase",
            }}>
              {badge}
            </span>
            <div style={{
              background: "#1a0f00", borderRadius: 20,
              padding: "7px 16px", maxWidth: 140,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              font: "600 12px Georgia, serif", color: "#f0dfc4",
              textAlign: "center",
            }}>
              {c.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Track 1: signal level line chart */
function SignalLevelTrack({ chain, report, ctx }: {
  chain: ChainEntry[];
  report: SystemReport;
  ctx: ContextSettings;
}) {
  const levels = computeSignalLevels(chain, report, ctx);
  const n = chain.length;
  if (n === 0) return null;

  // Layout constants
  const W = Math.max(600, n * 180);
  const H = 110;
  const padL = 100;
  const padR = 40;
  const padT = 28;
  const padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Compute x positions (evenly spaced)
  const xs = levels.map((_, i) => padL + (i / Math.max(n - 1, 1)) * chartW);

  // Compute y positions: log scale on voltage values (filter valid ones)
  const validValues = levels
    .filter((l): l is NonNullable<typeof l> => l != null && l.value > 0 && l.unit === "V")
    .map(l => l.value);
  // Include W values converted roughly to voltage equivalent for y-scale
  const wValues = levels
    .filter((l): l is NonNullable<typeof l> => l != null && l.unit === "W")
    .map(l => Math.sqrt(l.value * 8)); // rough V equivalent for visual

  const allVals = [...validValues, ...wValues];
  const minV = allVals.length ? Math.min(...allVals) * 0.5 : 0.5;
  const maxV = allVals.length ? Math.max(...allVals) * 1.5 : 10;
  const logMin = Math.log10(Math.max(minV, 0.01));
  const logMax = Math.log10(Math.max(maxV, 0.1));

  const yForValue = (v: number) => {
    if (v <= 0) return padT + chartH;
    const logV = Math.log10(v);
    const t = (logV - logMin) / (logMax - logMin || 1);
    return padT + chartH - t * chartH;
  };

  // Build polyline points
  const points: { x: number; y: number; level: typeof levels[0] }[] = [];
  for (let i = 0; i < n; i++) {
    const l = levels[i];
    if (!l || l.unit === "dig") {
      points.push({ x: xs[i], y: padT + chartH * 0.5, level: l });
    } else if (l.unit === "V") {
      points.push({ x: xs[i], y: yForValue(l.value), level: l });
    } else if (l.unit === "W") {
      // Map watts to a voltage-equivalent y position
      points.push({ x: xs[i], y: yForValue(Math.sqrt(l.value * 8)), level: l });
    } else if (l.unit === "dB" || l.unit === "\u2126") {
      // Terminal nodes — put them at the top portion
      points.push({ x: xs[i], y: padT + 8, level: l });
    } else {
      points.push({ x: xs[i], y: padT + chartH * 0.5, level: l });
    }
  }

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  // Reference line at ~2.0V (standard line level)
  const refY = yForValue(2.0);

  return (
    <div style={{
      background: "#fefbf6", border: "1px solid #ecdcbf", borderRadius: 8,
      padding: "12px 0", marginBottom: 10,
    }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", minWidth: 500 }}>
        {/* Left label */}
        <text x={12} y={padT + 10} fontSize="11" fontWeight="600" fill="#3d2200"
          fontFamily="var(--pa-font-ui)">Signal level</text>
        <text x={12} y={padT + 24} fontSize="9" fill="#8a7a5c" fontFamily="monospace">Vrms</text>

        {/* Reference line */}
        <line x1={padL} y1={refY} x2={W - padR} y2={refY}
          stroke="#4aba6a" strokeWidth={1} strokeDasharray="6 4" opacity={0.5} />

        {/* Signal polyline */}
        <polyline points={polyline} fill="none" stroke="#c47a1a" strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots and labels */}
        {points.map((p, i) => {
          const domain = i < chain.length - 1
            ? getDomainForLink(chain, report, i)
            : (chain[i]?.component.inputs?.[0]?.domain ?? null);
          const dotColor = domain ? (DOMAIN_COLOR[domain] ?? "#c47a1a") : "#c47a1a";
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
              {p.level && (
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="600"
                  fill={p.level.unit === "dB" ? "#16632e" : "#92400e"} fontFamily="monospace">
                  {p.level.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Track 2: impedance bridging / damping cards */
function ImpedanceTrack({ chain, report }: {
  chain: ChainEntry[];
  report: SystemReport;
}) {
  const n = chain.length;
  if (n < 2) return null;

  return (
    <div style={{
      background: "#fefbf6", border: "1px solid #ecdcbf", borderRadius: 8,
      padding: "14px 16px", marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        {/* Left label */}
        <div style={{ width: 90, flexShrink: 0, paddingTop: 8 }}>
          <div style={{ font: "600 11px var(--pa-font-ui)", color: "#3d2200" }}>Impedance</div>
          <div style={{ font: "500 9px monospace", color: "#8a7a5c" }}>bridge / damping</div>
        </div>

        {/* Cards row */}
        <div style={{
          display: "flex", flex: 1, justifyContent: "space-around",
          gap: 12, flexWrap: "wrap",
        }}>
          {Array.from({ length: n - 1 }, (_, i) => {
            const data = getImpedanceData(chain, report, i);
            if (!data) return (
              <div key={i} style={{
                flex: 1, minWidth: 100, maxWidth: 180,
                background: VERDICT_BG.info, border: `1px solid #c5d8e8`,
                borderRadius: 8, padding: "10px 14px", textAlign: "center",
                font: "500 10px monospace", color: VERDICT_FG.info,
              }}>
                {"\u2014"}
              </div>
            );

            const icon = VERDICT_ICON[data.verdict];
            let mainLabel: string;
            let subLabel: string;

            if (data.type === "damping") {
              mainLabel = `DF ${data.ratio.toFixed(0)} ${icon}`;
              subLabel = data.cableR
                ? `incl. ${data.cableR.toFixed(2)}\u2126 cable`
                : `${data.sourceZ ?? "?"}\u2126 \u2192 ${data.loadZ ?? "?"}\u2126`;
            } else if (data.type === "hp_impedance") {
              mainLabel = `${data.ratio.toFixed(0)}\u00D7 ${icon}`;
              subLabel = `${data.sourceZ ?? "?"}\u2126 \u2192 ${data.loadZ ?? "?"}\u2126`;
            } else {
              mainLabel = `${data.ratio.toFixed(0)}\u00D7 ${icon}`;
              subLabel = `${data.sourceZ ?? "?"}\u2126 \u2192 ${formatZ(data.loadZ)}\u2126`;
            }

            return (
              <div key={i} style={{
                flex: 1, minWidth: 100, maxWidth: 180,
                background: VERDICT_BG[data.verdict],
                border: `1.5px solid ${VERDICT_FG[data.verdict]}40`,
                borderRadius: 8, padding: "10px 14px", textAlign: "center",
              }}>
                <div style={{
                  font: "700 16px monospace", color: VERDICT_FG[data.verdict],
                  marginBottom: 3,
                }}>
                  {mainLabel}
                </div>
                <div style={{ font: "500 9px monospace", color: "#7a5c3a" }}>
                  {subLabel}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatZ(z: number | null): string {
  if (z == null) return "?";
  if (z >= 1000) return `${(z / 1000).toFixed(0)}k`;
  return z.toFixed(0);
}

/** Track 3: SPL headroom bar */
function SplHeadroomTrack({ chain, ctx }: {
  chain: ChainEntry[];
  ctx: ContextSettings;
}) {
  const data = computeSplHeadroom(chain, ctx);
  if (!data) return null;

  const { maxSpl, peakNeed, floorDb } = data;
  const range = maxSpl - floorDb;
  const peakPct = range > 0 ? ((peakNeed - floorDb) / range) * 100 : 50;
  const barPct = 100; // full bar represents maxSpl
  const hasHeadroom = maxSpl >= peakNeed;

  return (
    <div style={{
      background: "#fefbf6", border: "1px solid #ecdcbf", borderRadius: 8,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
        {/* Left label */}
        <div style={{ width: 90, flexShrink: 0, paddingTop: 4 }}>
          <div style={{ font: "600 11px var(--pa-font-ui)", color: "#3d2200" }}>SPL headroom</div>
          <div style={{ font: "500 9px monospace", color: "#8a7a5c" }}>@ {ctx.distanceM} m</div>
        </div>

        {/* Bar area */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Peak need label */}
          <div style={{
            position: "relative", height: 16, marginBottom: 4,
          }}>
            <span style={{
              position: "absolute",
              left: `${Math.min(peakPct, 95)}%`,
              transform: "translateX(-50%)",
              font: "600 9px monospace",
              color: "#c0392b",
              whiteSpace: "nowrap",
            }}>
              peak need {peakNeed}
            </span>
          </div>

          {/* The bar */}
          <div style={{
            position: "relative", height: 24, borderRadius: 6,
            background: "#f0e8d8", overflow: "hidden",
          }}>
            {/* Green fill */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${barPct}%`, borderRadius: 6,
              background: hasHeadroom
                ? "linear-gradient(90deg, #2f8a4e 0%, #6aad3a 60%, #b8a840 100%)"
                : "linear-gradient(90deg, #c0392b 0%, #d97706 100%)",
            }} />
            {/* Peak need marker */}
            <div style={{
              position: "absolute",
              left: `${peakPct}%`,
              top: -2, bottom: -2,
              width: 2, background: "#c0392b",
              zIndex: 1,
            }} />
          </div>

          {/* Floor and max labels */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            marginTop: 4,
          }}>
            <span style={{ font: "500 9px monospace", color: "#8a7a5c" }}>
              {floorDb}
            </span>
            <span style={{
              font: "600 10px monospace",
              color: hasHeadroom ? "#2f8a4e" : "#c0392b",
            }}>
              {maxSpl.toFixed(0)} dB max
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main component --------------------------------------------------------

export default function TelemetryDiagram({ chain, report, ctx }: {
  chain: ChainEntry[];
  report: SystemReport;
  ctx: ContextSettings;
}) {
  if (chain.length === 0) return null;

  const score = computeScore(report);
  const overallIcon = VERDICT_ICON[report.overall];
  const overallLabel = report.overall.charAt(0).toUpperCase() + report.overall.slice(1);

  return (
    <div style={{
      background: "#faf8f5", border: "1px solid #e2cda8", borderRadius: 14,
      boxShadow: "0 1px 3px rgba(120,60,10,.07)", padding: "24px 26px 26px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20,
      }}>
        <div style={{ font: "600 17px/1 Georgia, serif", color: "#3d2200" }}>
          Signal Chain &mdash; Analysis
        </div>
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

      {/* Node pills */}
      <NodePillRow chain={chain} />

      {/* Track 1: Signal level */}
      <SignalLevelTrack chain={chain} report={report} ctx={ctx} />

      {/* Track 2: Impedance */}
      <ImpedanceTrack chain={chain} report={report} />

      {/* Track 3: SPL headroom */}
      <SplHeadroomTrack chain={chain} ctx={ctx} />
    </div>
  );
}
