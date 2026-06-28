"use client";
import type { ChainEntry, SystemReport, Verdict, UIComponent, Port } from "@/types";
import { CATEGORY_BADGE, CABLE_BY_ID } from "@/types";

const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", dac: "#d97706", preamp: "#b45309",
  power_amp: "#7a3a08", tube_amp_se: "#8b3a5c", tube_amp_pp: "#6b3a6b",
  integrated: "#8b4f20", headphone_amp: "#b45309",
  speaker: "#16a34a", headphone: "#16a34a",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#16a34a", info: "#3a5c7a", warn: "#d97706", fail: "#c0392b",
};
const VERDICT_BG: Record<Verdict, string> = {
  pass: "#dcfce7", info: "#dbeafe", warn: "#fef3c7", fail: "#fee2e2",
};
const VERDICT_ICON: Record<Verdict, string> = {
  pass: "\u2713", info: "\u2139", warn: "\u26A1", fail: "\u2715",
};

const NODE_W = 190;
const NODE_H = 90;
const GAP = 90;        // space between boxes (for connector)
const PAD_X = 20;
const PAD_Y = 20;
const HEADER_H = 28;
const BADGE_H = 38;    // space below boxes for verdict badges

/** Extract a short, user-facing spec line from Port data */
function getSpecNote(c: UIComponent): string {
  const outs = c.outputs ?? [];
  const ins  = c.inputs  ?? [];
  const s = (p: Port) => p.specs as Record<string, unknown>;

  if (c.category === "dac") {
    const din = ins.find(p => p.domain === "digital");
    if (din) {
      const bits = s(din).maxBitDepth as number | null;
      const rate = s(din).maxSampleRateKhz as number | null;
      if (bits && rate) return `${bits}-bit \u00B7 ${rate} kHz`;
      if (bits) return `${bits}-bit`;
    }
    const out = outs[0];
    if (out) {
      const conn = out.connector?.toUpperCase() ?? "";
      const bal = out.balanced ? "Bal." : "SE";
      return conn ? `${conn} \u00B7 ${bal}` : bal;
    }
  }

  if (c.category === "headphone") {
    const hp = ins.find(p => p.domain === "headphone");
    if (hp) {
      const ohm  = s(hp).nominalImpedanceOhm as number | null;
      const sens = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.value;
      const unit = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.unit ?? "dB/mW";
      if (ohm && sens) return `${ohm}\u2126 \u00B7 ${sens} ${unit}`;
      if (ohm) return `${ohm}\u2126`;
    }
  }

  if (c.category === "speaker") {
    const sp = ins.find(p => p.domain === "speaker");
    if (sp) {
      const ohm  = s(sp).nominalImpedanceOhm as number | null;
      const sens = s(sp).sensitivity83dBm as number | null;
      if (ohm && sens) return `${ohm}\u2126 \u00B7 ${sens} dB`;
      if (ohm) return `${ohm}\u2126`;
    }
  }

  if (["headphone_amp", "preamp", "power_amp", "integrated"].includes(c.category)) {
    const out = outs.find(p => p.domain === "headphone")
              ?? outs.find(p => p.domain === "speaker")
              ?? outs.find(p => p.domain === "line")
              ?? outs[0];
    if (out) {
      const watts = (s(out).continuousWattsPerChannel ?? s(out).maxWattsPerChannel) as number | null;
      const imp   = (s(out).minLoadImpedanceOhm ?? s(out).nominalLoadImpedanceOhm) as number | null;
      if (watts && imp) return `${watts}W @ ${imp}\u2126`;
      const conn = out.connector?.toUpperCase();
      const bal  = out.balanced ? "Balanced" : "SE";
      if (conn) return `${conn} \u00B7 ${bal}`;
    }
  }

  if (c.category === "source") {
    const out = outs[0];
    if (out) return out.connector?.toUpperCase() ?? "";
  }

  return "";
}

/** Short friendly label for the cable connector between two nodes */
function getCableShortLabel(cableId: string): string {
  const def = CABLE_BY_ID[cableId];
  if (!def?.label) return "";
  const m = def.label.match(/^(USB|Coax|Optical|XLR|RCA|Speaker|TRS|TOSLINK)/i);
  return m ? m[1] : def.label.split(" ")[0].slice(0, 8);
}

export default function ChainDiagram({ chain, report }: { chain: ChainEntry[]; report: SystemReport | null }) {
  if (chain.length === 0) return null;

  const getBadge = (nodeIdx: number) => {
    if (!report || nodeIdx >= report.links.length) return null;
    const link = report.links[nodeIdx];
    // Pick worst verdict result for badge
    const priority: Verdict[] = ["fail", "warn", "pass", "info"];
    for (const v of priority) {
      const r = link.results.find(r => r.verdict === v);
      if (r) return { verdict: r.verdict, label: r.label };
    }
    return null;
  };

  const totalW = chain.length * NODE_W + (chain.length - 1) * GAP + PAD_X * 2;
  const totalH = NODE_H + PAD_Y * 2 + BADGE_H;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ display: "block", minWidth: `${Math.min(totalW, 600)}px` }}
      >
        <defs>
          <linearGradient id="bg1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff8f0" />
            <stop offset="100%" stopColor="#fef3e2" />
          </linearGradient>
          <linearGradient id="bg2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff4e6" />
            <stop offset="100%" stopColor="#fde8c0" />
          </linearGradient>
          <filter id="bshadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#d97706" floodOpacity={0.12} />
          </filter>
          <marker id="arrAmb" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
            <path d="M0,0 L0,8 L10,4 z" fill="#d97706" />
          </marker>
        </defs>

        {chain.map((entry, i) => {
          const x = PAD_X + i * (NODE_W + GAP);
          const y = PAD_Y;
          const color = CAT_COLOR[entry.component.category] ?? "#7a5c3a";
          const badge = CATEGORY_BADGE[entry.component.category] ?? "?";
          const name  = entry.component.name;
          const note  = getSpecNote(entry.component);
          const linkBadge = getBadge(i);

          const displayName = name.length > 18 ? name.slice(0, 17) + "\u2026" : name;
          const displayNote = note.length > 22 ? note.slice(0, 21) + "\u2026" : note;

          const midY = y + NODE_H / 2;
          const cableLabel = i < chain.length - 1 ? getCableShortLabel(entry.cableId) : "";

          // Connector colors based on report verdict
          const nextLink = report && i < report.links.length ? report.links[i] : null;
          const linkColor = nextLink ? VERDICT_COLOR[nextLink.verdict] : "#d97706";

          return (
            <g key={`${entry.component.id}-${i}`}>
              {/* ── Box ── */}
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8}
                fill={i % 2 === 0 ? "url(#bg1)" : "url(#bg2)"}
                stroke={color} strokeWidth={1.5} filter="url(#bshadow)" />

              {/* Header bar */}
              <rect x={x} y={y} width={NODE_W} height={HEADER_H} rx={8} fill={color} />
              <rect x={x} y={y + HEADER_H - 8} width={NODE_W} height={8} fill={color} />

              {/* Category label */}
              <text x={x + NODE_W / 2} y={y + 18} textAnchor="middle" fontSize="9" fontWeight="600"
                fill="#fff" fontFamily="var(--pa-font-ui)" letterSpacing="1.5">
                {badge}
              </text>

              {/* Component name */}
              <text x={x + NODE_W / 2} y={y + HEADER_H + 22} textAnchor="middle" fontSize="13" fontWeight="600"
                fill="#3d2200" fontFamily="Georgia, serif">
                {displayName}
              </text>

              {/* Spec line */}
              {displayNote && (
                <text x={x + NODE_W / 2} y={y + HEADER_H + 40} textAnchor="middle" fontSize="9"
                  fill="#92400e" fontFamily="monospace">
                  {displayNote}
                </text>
              )}

              {/* ── Connector to next ── */}
              {i < chain.length - 1 && (() => {
                const startX = x + NODE_W;
                const endX   = x + NODE_W + GAP;
                const lineStart = startX + 14;
                const lineEnd   = endX - 14;

                return (
                  <g>
                    {/* OUT port circle */}
                    <circle cx={startX} cy={midY} r={7} fill="#fff" stroke={linkColor} strokeWidth={1.5} />
                    {/* IN port circle on next box */}
                    <circle cx={endX} cy={midY} r={7} fill="#fff" stroke={linkColor} strokeWidth={1.5} />

                    {/* Dashed arrow line */}
                    <line x1={lineStart} y1={midY} x2={lineEnd} y2={midY}
                      stroke={linkColor} strokeWidth={2.5} strokeDasharray="7,5"
                      markerEnd="url(#arrAmb)" />

                    {/* Cable label centered above line */}
                    {cableLabel && (
                      <text x={(startX + endX) / 2} y={midY - 14} textAnchor="middle"
                        fill="#92400e" fontSize="9" fontFamily="var(--pa-font-ui)" fontWeight="500">
                        {cableLabel}
                      </text>
                    )}
                  </g>
                );
              })()}

              {/* ── Verdict badge below ── */}
              {linkBadge && (
                <g>
                  <rect x={x + 4} y={y + NODE_H + 6} width={NODE_W - 8} height={26} rx={6}
                    fill={VERDICT_BG[linkBadge.verdict]}
                    stroke={VERDICT_COLOR[linkBadge.verdict]} strokeWidth={1} />
                  <text x={x + NODE_W / 2} y={y + NODE_H + 23} textAnchor="middle" fontSize="9.5"
                    fill={VERDICT_COLOR[linkBadge.verdict]} fontFamily="var(--pa-font-ui)" fontWeight="500">
                    {VERDICT_ICON[linkBadge.verdict]} {linkBadge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
