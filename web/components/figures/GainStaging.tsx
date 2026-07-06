import { Fig, INK, MUTED, ACCENT, FAIL, PASS, t14, t12, tAxis } from "./shared";

// Gain structure ladder. Levels (Vrms) placed on a vertical axis at x=210,
// level lines run to x=470, descriptions sit to the right.

const LEVELS = [
  { v: "4.0 Vrms", y: 80, label: "Source max output (balanced DAC)", color: INK },
  { v: "2.0 Vrms", y: 135, label: "Downstream input overload point", color: FAIL },
  { v: "0.7 Vrms", y: 225, label: "Input sensitivity — full output reached", color: ACCENT },
  { v: "noise", y: 295, label: "Downstream noise floor", color: MUTED },
];

export default function GainStaging() {
  return (
    <Fig
      h={345}
      title="Gain structure ladder"
      desc="A vertical voltage ladder showing a 4 volt source maximum sitting above a 2 volt input overload point, the 0.7 volt input sensitivity, and the noise floor, with the usable window and the clipping zone marked."
    >
      {/* axis */}
      <line x1={210} y1={60} x2={210} y2={310} stroke={INK} strokeWidth={1.5} />

      {/* usable window: sensitivity .. overload */}
      <rect x={210} y={135} width={260} height={90} fill={PASS} opacity={0.09} />
      <text {...t12} fill={PASS} x={480} y={175}>
        usable window — signal fits
      </text>
      <text {...t12} fill={PASS} x={480} y={191}>
        cleanly between the limits
      </text>

      {/* clipping zone: overload .. source max */}
      <rect x={210} y={80} width={260} height={55} fill={FAIL} opacity={0.09} />
      <text {...t12} fill={FAIL} x={480} y={100}>
        source exceeds overload —
      </text>
      <text {...t12} fill={FAIL} x={480} y={116}>
        input clips regardless of the pot
      </text>

      {LEVELS.map((l) => (
        <g key={l.v}>
          <line x1={204} x2={470} y1={l.y} y2={l.y} stroke={l.color} strokeWidth={1.4} />
          <text {...tAxis} x={196} y={l.y} textAnchor="end" dominantBaseline="central">
            {l.v}
          </text>
          <text {...t12} fill={l.color === MUTED ? MUTED : l.color} x={216} y={l.y - 8}>
            {l.label}
          </text>
        </g>
      ))}

      <text {...t12} x={340} y={332} textAnchor="middle">
        4 V into a 0.7 V amp = ~15 dB excess gain — all your listening happens at the bottom of the pot
      </text>
    </Fig>
  );
}
