import { Fig, INK, MUTED, FAINT, ACCENT, DEEP, t14, t12, tAxis } from "./shared";

// Plot area: x 70..640 (log frequency 10 Hz .. 1 kHz), y 60..240.
// Anechoic response flat at y=180; in-room response rises 12 dB/oct
// below the pressure-zone corner at x=300.

export default function RoomGain() {
  return (
    <Fig
      h={310}
      title="Room gain below the pressure-zone corner"
      desc="Frequency response plot comparing a flat anechoic response with an in-room response that rises at 12 dB per octave below the pressure-zone corner frequency, plus 3 dB boundary reinforcement steps."
    >
      {/* axes */}
      <line x1={70} y1={60} x2={70} y2={240} stroke={INK} strokeWidth={1} />
      <line x1={70} y1={240} x2={640} y2={240} stroke={INK} strokeWidth={1} />
      <text {...tAxis} x={70} y={256} textAnchor="middle">
        10 Hz
      </text>
      <text {...tAxis} x={300} y={256} textAnchor="middle">
        ≈ f&#8202;pz
      </text>
      <text {...tAxis} x={640} y={256} textAnchor="middle">
        1 kHz
      </text>
      <text {...tAxis} x={58} y={70} textAnchor="end">
        SPL
      </text>
      <text {...tAxis} x={58} y={180} textAnchor="end" dominantBaseline="central">
        0 dB
      </text>

      {/* pressure zone shading + corner */}
      <rect x={70} y={60} width={230} height={180} fill={ACCENT} opacity={0.07} />
      <line x1={300} y1={60} x2={300} y2={240} stroke={MUTED} strokeWidth={1} strokeDasharray="5 4" />
      <text {...t12} x={308} y={74}>
        pressure-zone corner: f ≈ c / 2L
      </text>

      {/* anechoic: flat, dashed */}
      <line x1={70} y1={180} x2={640} y2={180} stroke={DEEP} strokeWidth={1.5} strokeDasharray="6 5" />
      <text {...t12} fill={DEEP} x={470} y={170}>
        anechoic (free field) — flat
      </text>

      {/* in-room: flat above corner, +12 dB/oct rise below it */}
      <path d="M640,180 L300,180 L70,80" fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      <text {...t12} fill={ACCENT} x={82} y={104}>
        in-room: rises ~12 dB/octave
      </text>

      {/* +3 dB boundary steps annotation */}
      <g>
        <line x1={150} y1={210} x2={190} y2={210} stroke={MUTED} strokeWidth={1} />
        <line x1={190} y1={210} x2={190} y2={200} stroke={MUTED} strokeWidth={1} />
        <line x1={190} y1={200} x2={230} y2={200} stroke={MUTED} strokeWidth={1} />
        <line x1={230} y1={200} x2={230} y2={190} stroke={MUTED} strokeWidth={1} />
        <line x1={230} y1={190} x2={270} y2={190} stroke={MUTED} strokeWidth={1} />
        <text {...t12} x={150} y={228}>
          +3 dB per boundary (2π → π → π/2)
        </text>
      </g>

      <text {...t12} x={355} y={295} textAnchor="middle">
        The engine&apos;s flat dB bonus is the tide; real rooms make it lumpy with modes
      </text>
    </Fig>
  );
}
