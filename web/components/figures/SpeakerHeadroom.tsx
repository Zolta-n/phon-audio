import { Fig, INK, MUTED, FAINT, ACCENT, DEEP, PASS, FAIL, t14, t12, tAxis } from "./shared";

// Waterfall of the engine's SPL budget. y maps SPL 70..105 dB to 300..70.
const sy = (db: number) => 300 - (db - 70) * (230 / 35);

const BARS = [
  { x: 60, from: 70, to: 88, fill: DEEP, cap: "Sensitivity", sub: "88 dB @ 1 W / 1 m" },
  { x: 170, from: 79, to: 88, fill: FAIL, cap: "Distance", sub: "−9 dB @ 2.8 m" },
  { x: 280, from: 79, to: 83, fill: PASS, cap: "Room gain", sub: "+4 dB" },
  { x: 390, from: 70, to: 83, fill: MUTED, cap: "At your seat", sub: "83 dB per watt" },
  { x: 500, from: 83, to: 100, fill: ACCENT, cap: "Peak target", sub: "100 dB" },
];
const W = 80;

export default function SpeakerHeadroom() {
  return (
    <Fig
      h={365}
      title="The SPL budget waterfall"
      desc="A waterfall chart chaining speaker sensitivity, distance loss, room gain, effective sensitivity at the seat, and the peak SPL target, showing the 17 dB gap that sets the required amplifier power."
    >
      {/* connectors */}
      {[
        [60 + W, sy(88), 170, sy(88)],
        [170 + W, sy(79), 280, sy(79)],
        [280 + W, sy(83), 390, sy(83)],
        [390 + W, sy(83), 500, sy(83)],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={FAINT} strokeWidth={1} strokeDasharray="3 3" />
      ))}

      {BARS.map((b) => (
        <g key={b.cap}>
          <rect
            x={b.x}
            y={sy(b.to)}
            width={W}
            height={sy(b.from) - sy(b.to)}
            fill={b.fill}
            opacity={b.fill === MUTED ? 0.5 : 0.8}
            rx={3}
          />
          <text {...t14} x={b.x + W / 2} y={318} textAnchor="middle">
            {b.cap}
          </text>
          <text {...tAxis} x={b.x + W / 2} y={334} textAnchor="middle">
            {b.sub}
          </text>
        </g>
      ))}

      {/* the 17 dB bracket → power requirement */}
      <line x1={600} y1={sy(83)} x2={600} y2={sy(100)} stroke={INK} strokeWidth={1} />
      <line x1={595} y1={sy(83)} x2={605} y2={sy(83)} stroke={INK} strokeWidth={1} />
      <line x1={595} y1={sy(100)} x2={605} y2={sy(100)} stroke={INK} strokeWidth={1} />
      <text {...t12} x={608} y={(sy(83) + sy(100)) / 2 - 8} dominantBaseline="central">
        +17 dB
      </text>
      <text {...t12} x={608} y={(sy(83) + sy(100)) / 2 + 8} dominantBaseline="central">
        ≈ 50 W
      </text>

      {/* SPL axis ticks */}
      {[70, 80, 90, 100].map((db) => (
        <g key={db}>
          <text {...tAxis} x={44} y={sy(db)} textAnchor="end" dominantBaseline="central">
            {db}
          </text>
          <line x1={48} x2={54} y1={sy(db)} y2={sy(db)} stroke={MUTED} strokeWidth={1} />
        </g>
      ))}
      <text {...tAxis} x={30} y={64}>
        dB SPL
      </text>

      <text {...t12} x={340} y={356} textAnchor="middle">
        150 W available vs 50 W required = +4.8 dB headroom — inside the 3–12 dB sweet spot
      </text>
    </Fig>
  );
}
