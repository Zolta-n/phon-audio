"use client";
import type { ChainEntry, SystemReport, Verdict, UIComponent, Port } from "@/types";
import { CATEGORY_BADGE, CABLE_BY_ID } from "@/types";

const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", dac: "#c96f12", preamp: "#9b4f0a",
  power_amp: "#7a3a08", integrated: "#8b4f20", headphone_amp: "#9b5010",
  speaker: "#4a7a3a", headphone: "#3a5c7a",
};

const VERDICT_COLOR: Record<Verdict, string> = {
  pass: "#4a7a3a", info: "#3a5c7a", warn: "#9b5010", fail: "#c0392b",
};
const VERDICT_SYMBOL: Record<Verdict, string> = {
  pass: "✓", info: "i", warn: "!", fail: "✕",
};

const NODE_W = 170;
const NODE_H = 90;
const CONN_W = 60;
const PAD_X = 16;
const PAD_Y = 16;
const BADGE_H = 22;

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
      if (bits && rate) return `${bits}-bit · ${rate} kHz`;
      if (bits) return `${bits}-bit`;
    }
    const out = outs[0];
    if (out) return `${out.connector?.toUpperCase() ?? ""}${out.balanced ? " Bal." : " SE"}`.trim();
  }

  if (c.category === "headphone") {
    const hp = ins.find(p => p.domain === "headphone");
    if (hp) {
      const ohm  = s(hp).nominalImpedanceOhm as number | null;
      const sens = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.value;
      const unit = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.unit ?? "dB/mW";
      if (ohm && sens) return `${ohm}Ω · ${sens} ${unit}`;
      if (ohm) return `${ohm}Ω`;
    }
  }

  if (c.category === "speaker") {
    const sp = ins.find(p => p.domain === "speaker");
    if (sp) {
      const ohm  = s(sp).nominalImpedanceOhm as number | null;
      const sens = s(sp).sensitivity83dBm as number | null;
      if (ohm && sens) return `${ohm}Ω · ${sens} dB`;
      if (ohm) return `${ohm}Ω`;
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
      if (watts && imp) return `${watts}W @ ${imp}Ω`;
      const conn = out.connector?.toUpperCase();
      const bal  = out.balanced ? "Balanced" : "SE";
      if (conn) return `${conn} · ${bal}`;
    }
  }

  if (c.category === "source") {
    const out = outs[0];
    if (out) return out.connector?.toUpperCase() ?? "";
  }

  return "";
}

export default function ChainDiagram({ chain, report }: { chain: ChainEntry[]; report: SystemReport | null }) {
  if (chain.length === 0) return null;

  const getLinkBadge = (nodeIdx: number) => {
    if (!report || nodeIdx >= report.links.length) return null;
    const link = report.links[nodeIdx];
    const priority: Verdict[] = ["fail", "warn", "pass", "info"];
    for (const v of priority) {
      const r = link.results.find(r => r.verdict === v);
      if (r) return { verdict: r.verdict, label: r.label };
    }
    return null;
  };

  const totalW = chain.length * NODE_W + (chain.length - 1) * CONN_W + PAD_X * 2;
  const totalH = NODE_H + PAD_Y * 2 + BADGE_H;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ display: "block", minWidth: `${Math.min(totalW, 600)}px` }}
      >
        {chain.map((entry, i) => {
          const x = PAD_X + i * (NODE_W + CONN_W);
          const y = PAD_Y;
          const color = CAT_COLOR[entry.component.category] ?? "#7a5c3a";
          const badge = CATEGORY_BADGE[entry.component.category] ?? "?";
          const name  = entry.component.name;
          const note  = getSpecNote(entry.component);
          const linkBadge = getLinkBadge(i);

          const displayName = name.length > 20 ? name.slice(0, 19) + "…" : name;
          const displayNote = note.length > 24 ? note.slice(0, 23) + "…" : note;

          const connX = x + NODE_W + CONN_W / 2;
          const connY = y + NODE_H / 2;

          const cableLabel = i < chain.length - 1
            ? (() => {
                const def = CABLE_BY_ID[entry.cableId];
                if (!def?.label) return "";
                const m = def.label.match(/^(USB|Coax|Optical|XLR|RCA|Speaker)/i);
                return m ? m[1] : def.label.slice(0, 6);
              })()
            : "";

          return (
            <g key={`${entry.component.id}-${i}`}>
              {/* Drop shadow */}
              <rect x={x+2} y={y+2} width={NODE_W} height={NODE_H} rx={8} fill="rgba(0,0,0,0.07)" />
              {/* Box */}
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} fill="white" stroke={color} strokeWidth={1.5} />
              {/* Coloured header */}
              <path
                d={`M${x+8},${y} H${x+NODE_W-8} Q${x+NODE_W},${y} ${x+NODE_W},${y+8} V${y+28} H${x} V${y+8} Q${x},${y} ${x+8},${y} Z`}
                fill={color}
              />
              {/* Badge text */}
              <text x={x+NODE_W/2} y={y+17} textAnchor="middle" fontSize="9" fontWeight="700"
                fill="rgba(255,255,255,0.92)" fontFamily="var(--font-lora), serif" letterSpacing="0.14em">
                {badge}
              </text>
              {/* Component name */}
              <text x={x+NODE_W/2} y={y+49} textAnchor="middle" fontSize="12" fontWeight="700"
                fill="#2d1a0a" fontFamily="var(--font-playfair), Georgia, serif">
                {displayName}
              </text>
              {/* Spec line */}
              {displayNote && (
                <text x={x+NODE_W/2} y={y+65} textAnchor="middle" fontSize="9" fill="#7a5c3a"
                  fontFamily="var(--font-lora), serif">
                  {displayNote}
                </text>
              )}

              {/* Verdict badge below box */}
              {linkBadge && (
                <g>
                  <rect x={x+8} y={y+NODE_H+4} width={NODE_W-16} height={18} rx={9}
                    fill={`${VERDICT_COLOR[linkBadge.verdict]}1a`}
                    stroke={`${VERDICT_COLOR[linkBadge.verdict]}55`} strokeWidth={1} />
                  <text x={x+NODE_W/2} y={y+NODE_H+16} textAnchor="middle" fontSize="8.5"
                    fill={VERDICT_COLOR[linkBadge.verdict]} fontFamily="var(--font-lora), serif" fontWeight="600">
                    {VERDICT_SYMBOL[linkBadge.verdict]} {linkBadge.label.slice(0, 22)}
                  </text>
                </g>
              )}

              {/* Connector to next */}
              {i < chain.length - 1 && (
                <g>
                  <line x1={x+NODE_W} y1={connY} x2={connX-11} y2={connY}
                    stroke="#d4c4a8" strokeWidth={1.5} strokeDasharray="4,3" />
                  <circle cx={connX} cy={connY} r={11} fill="white" stroke="#d4c4a8" strokeWidth={1.5} />
                  {/* Arrow polygon */}
                  <polygon
                    points={`${connX-4},${connY-5} ${connX+5},${connY} ${connX-4},${connY+5}`}
                    fill="#c96f12"
                  />
                  <line x1={connX+11} y1={connY} x2={x+NODE_W+CONN_W} y2={connY}
                    stroke="#d4c4a8" strokeWidth={1.5} strokeDasharray="4,3" />
                  {/* Cable label */}
                  {cableLabel && (
                    <text x={connX} y={connY-16} textAnchor="middle" fontSize="8" fill="#9b7a50"
                      fontFamily="var(--font-lora), serif">
                      {cableLabel}
                    </text>
                  )}
                  {/* Verdict dot */}
                  {report && i < report.links.length && (
                    <circle cx={connX+9} cy={connY-9} r={4}
                      fill={VERDICT_COLOR[report.links[i].verdict]} />
                  )}
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
