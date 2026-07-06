import { Fig, MUTED, ACCENT, DEEP, t14, t12 } from "./shared";

export default function CrestFactor() {
  return (
    <Fig
      h={300}
      title="Crest factor: compressed vs dynamic masters"
      desc="Two waveforms at the same RMS level. The compressed master has a small gap between its peak and RMS lines; the dynamic master shows large transient spikes far above its RMS line."
    >
      <text {...t14} x={180} y={45} textAnchor="middle">
        Compressed master
      </text>
      <text {...t14} x={510} y={45} textAnchor="middle">
        Dynamic master
      </text>

      {/* left panel: peak and RMS lines nearly touch */}
      <line x1={60} y1={110} x2={300} y2={110} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <line x1={60} y1={128} x2={300} y2={128} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <text {...t12} x={54} y={110} textAnchor="end" dominantBaseline="central">
        Peak
      </text>
      <text {...t12} x={54} y={128} textAnchor="end" dominantBaseline="central">
        RMS
      </text>
      <path
        fill="none"
        stroke={DEEP}
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M60,170 L63,110 L72,230 L78,112 L87,228 L93,110 L102,230 L108,114 L117,226 L123,110 L132,230 L138,112 L147,228 L153,110 L162,230 L168,112 L177,226 L183,110 L192,230 L198,114 L207,228 L213,110 L222,230 L228,112 L237,226 L243,110 L252,230 L258,112 L267,228 L273,110 L282,230 L288,114 L297,226 L300,170"
      />
      <line x1={310} y1={112} x2={310} y2={126} stroke={MUTED} strokeWidth={1} />
      <line x1={306} y1={112} x2={314} y2={112} stroke={MUTED} strokeWidth={1} />
      <line x1={306} y1={126} x2={314} y2={126} stroke={MUTED} strokeWidth={1} />
      <text {...t12} x={318} y={119} dominantBaseline="central">
        ≈7 dB
      </text>

      {/* right panel: big gap between peak and RMS */}
      <line x1={390} y1={95} x2={630} y2={95} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <line x1={390} y1={146} x2={630} y2={146} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <path
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.5}
        strokeLinejoin="round"
        d="M390,170 L398,158 L406,182 L414,160 L422,184 L430,156 L438,186 L446,150 L450,95 L454,245 L458,130 L466,184 L474,158 L482,182 L490,160 L498,184 L506,152 L522,186 L526,110 L530,238 L534,140 L542,182 L550,158 L558,180 L566,162 L574,182 L582,158 L590,180 L598,160 L606,182 L614,162 L622,180 L630,170"
      />
      <line x1={598} y1={97} x2={598} y2={144} stroke={MUTED} strokeWidth={1} />
      <line x1={594} y1={97} x2={602} y2={97} stroke={MUTED} strokeWidth={1} />
      <line x1={594} y1={144} x2={602} y2={144} stroke={MUTED} strokeWidth={1} />
      <text {...t12} x={590} y={120} textAnchor="end" dominantBaseline="central">
        ≈18 dB
      </text>

      <text {...t12} x={340} y={285} textAnchor="middle">
        Same RMS level — the dynamic master&apos;s transients demand ~10–30× the peak power
      </text>
    </Fig>
  );
}
