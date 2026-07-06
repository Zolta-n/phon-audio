import { Fig, INK, MUTED, FAINT, ACCENT, FAIL, t14, t12, tAxis } from "./shared";

// dB → y mapping: 40 dB at y=300, 110 dB at y=40 (3.714 px/dB)
const y = (db: number) => 300 - (db - 40) * (260 / 70);

const LEVELS: { db: number; label: string; color?: string; strong?: boolean }[] = [
  { db: 40, label: "Quiet room noise floor" },
  { db: 65, label: "Background listening" },
  { db: 85, label: "SMPTE / Dolby reference level", color: ACCENT, strong: true },
  { db: 90, label: "OSHA 8-hour exposure limit", color: FAIL },
  { db: 105, label: "Transient peaks (85 dB avg + 20 dB crest)" },
];

const POWER: { db: number; label: string }[] = [
  { db: 85, label: "1×" },
  { db: 95, label: "10×" },
  { db: 105, label: "100×" },
];

export default function TargetSpl() {
  return (
    <Fig
      h={340}
      title="The SPL ladder"
      desc="A decibel scale from 40 to 110 dB marking background listening, the 85 dB SMPTE reference, the OSHA limit, and transient peaks, with the relative amplifier power cost of each 10 dB step."
    >
      {/* axis */}
      <line x1={180} y1={y(110)} x2={180} y2={y(40)} stroke={INK} strokeWidth={1.5} />
      {LEVELS.map((l) => (
        <g key={l.db}>
          <line
            x1={174}
            x2={l.strong ? 460 : 186}
            y1={y(l.db)}
            y2={y(l.db)}
            stroke={l.color ?? INK}
            strokeWidth={l.strong ? 1.5 : 1}
            strokeDasharray={l.strong ? "5 4" : undefined}
          />
          <text {...tAxis} x={166} y={y(l.db)} textAnchor="end" dominantBaseline="central">
            {l.db} dB
          </text>
          <text
            {...t12}
            fill={l.color ?? MUTED}
            x={194}
            y={y(l.db) - 8}
          >
            {l.label}
          </text>
        </g>
      ))}
      {/* power cost column */}
      <text {...t14} x={545} y={y(105) - 26} textAnchor="middle">
        Relative amp power
      </text>
      <line x1={545} y1={y(85)} x2={545} y2={y(105)} stroke={FAINT} strokeWidth={1} />
      {POWER.map((p) => (
        <g key={p.db}>
          <circle cx={545} cy={y(p.db)} r={3} fill={ACCENT} />
          <text {...t12} x={556} y={y(p.db)} dominantBaseline="central">
            {p.label}
          </text>
          <text {...tAxis} x={534} y={y(p.db)} textAnchor="end" dominantBaseline="central">
            {p.db} dB
          </text>
        </g>
      ))}
      <text {...t12} x={340} y={330} textAnchor="middle">
        Power scales as 10^(dB/10): asking for 95 dB instead of 85 costs ten times the watts
      </text>
    </Fig>
  );
}
