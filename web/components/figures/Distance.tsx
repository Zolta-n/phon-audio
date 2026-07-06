import { Fig, INK, MUTED, FAINT, ACCENT, t14, t12 } from "./shared";

// Point source at (90, 175); arcs at r = 60 (1 m), 120 (2 m), 240 (4 m);
// dashed arc at r = 340 for the critical distance.
const CX = 90;
const CY = 175;

function arc(r: number) {
  return `M${CX} ${CY - r} A${r} ${r} 0 0 1 ${CX} ${CY + r}`;
}

export default function Distance() {
  return (
    <Fig
      h={330}
      title="Inverse-square attenuation with distance"
      desc="Expanding wavefront arcs from a point source at 1, 2, and 4 metres, losing 6 dB per doubling, with a dashed critical-distance arc where the room's reverberant field takes over."
    >
      {/* wavefront arcs */}
      <path d={arc(60)} fill="none" stroke={MUTED} strokeWidth={1.2} />
      <path d={arc(120)} fill="none" stroke={MUTED} strokeWidth={1} opacity={0.75} />
      <path d={arc(240)} fill="none" stroke={MUTED} strokeWidth={1} opacity={0.5} />
      <path d={arc(340)} fill="none" stroke={ACCENT} strokeWidth={1.2} strokeDasharray="6 5" />

      {/* source */}
      <circle cx={CX} cy={CY} r={6} fill={INK} />
      <text {...t14} x={CX} y={CY + 28} textAnchor="middle">
        Source
      </text>

      {/* listening ray */}
      <line x1={CX + 10} y1={CY} x2={620} y2={CY} stroke={FAINT} strokeWidth={1} />
      <circle cx={CX + 240} cy={CY} r={5} fill="none" stroke={INK} strokeWidth={1.5} />

      {/* distance markers along the ray */}
      <g>
        <circle cx={CX + 60} cy={CY} r={2.5} fill={INK} />
        <text {...t12} x={CX + 60} y={CY - 14} textAnchor="middle">
          1 m
        </text>
        <text {...t12} x={CX + 60} y={CY + 20} textAnchor="middle">
          0 dB ref
        </text>
      </g>
      <g>
        <circle cx={CX + 120} cy={CY} r={2.5} fill={INK} />
        <text {...t12} x={CX + 120} y={CY - 14} textAnchor="middle">
          2 m
        </text>
        <text {...t12} x={CX + 120} y={CY + 20} textAnchor="middle">
          −6 dB
        </text>
      </g>
      <g>
        <text {...t12} x={CX + 240} y={CY - 14} textAnchor="middle">
          4 m
        </text>
        <text {...t12} x={CX + 240} y={CY + 20} textAnchor="middle">
          −12 dB (needs 4× power vs 2 m)
        </text>
      </g>

      {/* critical distance label */}
      <text {...t12} fill={ACCENT} x={CX + 350} y={70}>
        Critical distance — beyond here the
      </text>
      <text {...t12} fill={ACCENT} x={CX + 350} y={86}>
        reverberant field dominates and the
      </text>
      <text {...t12} fill={ACCENT} x={CX + 350} y={102}>
        −6 dB/doubling law goes soft
      </text>

      <text {...t12} x={340} y={315} textAnchor="middle">
        Free-field model: intensity falls with the square of distance — the conservative end for sizing an amp
      </text>
    </Fig>
  );
}
