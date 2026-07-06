import { Fig, MUTED, ACCENT, DEEP, FAIL, t14, t12 } from "./shared";

// Left panel: open eye, boundaries at x=60/180/300, rails y=100/220.
// Right panel: closed eye, slow rise-time + jitter, boundaries at 380/500/620.

const openTraces = [
  "M60,160 C66,124 71,100 80,100 L280,100 C289,100 294,124 300,160",
  "M60,160 C66,196 71,220 80,220 L280,220 C289,220 294,196 300,160",
  "M60,160 C66,124 71,100 80,100 L160,100 C173,100 187,220 200,220 L280,220 C289,220 294,196 300,160",
  "M60,160 C66,196 71,220 80,220 L160,220 C173,220 187,100 200,100 L280,100 C289,100 294,124 300,160",
];

const closedTraces = [
  "M380,160 C398,118 412,100 432,100 L548,100 C580,100 602,128 620,160",
  "M380,160 C398,202 412,220 432,220 L548,220 C580,220 602,192 620,160",
  "M380,160 C398,118 412,100 432,100 L455,100 C482,100 498,220 545,220 L560,220 C588,220 604,192 620,160",
  "M380,160 C398,202 412,220 432,220 L455,220 C482,220 498,100 545,100 L560,100 C588,100 604,128 620,160",
];

export default function DigitalEye() {
  return (
    <Fig
      h={305}
      title="Eye diagrams: open vs closed"
      desc="Two eye diagrams. A clean digital link shows a wide open eye with crisp transitions; an over-length link shows slow rise times and jitter smearing the crossings, closing the eye."
    >
      <text {...t14} x={180} y={45} textAnchor="middle">
        Open eye — clean recovery
      </text>
      <text {...t14} x={500} y={45} textAnchor="middle">
        Closed eye — over-length run
      </text>

      {openTraces.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} />
      ))}

      {/* sampling instant at the eye center */}
      <line x1={240} y1={86} x2={240} y2={234} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <circle cx={240} cy={160} r={3.5} fill={MUTED} />
      <text {...t12} x={240} y={250} textAnchor="middle">
        sampling instant
      </text>

      {/* closed eye: jittered copies at offsets */}
      {closedTraces.map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={DEEP} strokeWidth={1.2} opacity={0.45} transform="translate(-10 0)" />
          <path d={d} fill="none" stroke={DEEP} strokeWidth={1.2} opacity={0.45} transform="translate(10 0)" />
          <path d={d} fill="none" stroke={DEEP} strokeWidth={1.4} />
        </g>
      ))}
      <text {...t12} fill={FAIL} x={500} y={250} textAnchor="middle">
        smeared crossings → bit errors, dropouts
      </text>

      <text {...t12} x={340} y={290} textAnchor="middle">
        A locked link with an open eye is bit-perfect — the failure mode is categorical, never tonal
      </text>
    </Fig>
  );
}
