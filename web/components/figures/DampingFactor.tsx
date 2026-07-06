import { Fig, INK, MUTED, ACCENT, DEEP, HRes, Source, t14, t12, tAxis } from "./shared";

// Top: the damping loop drawn with resistor lengths proportional to their
// resistance — the voice coil visually dominates.
// Bottom: response error vs damping factor (log x), flat beyond DF ≈ 20.

const dfx = (df: number) => 80 + Math.log10(df) * 270; // DF 1..100 → 80..620
const ey = (errDb: number) => 360 - errDb * 18; // 0..8 dB → 360..216

const CURVE = [1, 1.5, 2, 3, 4, 6, 8, 12, 20, 35, 60, 100].map((df) => {
  const err = 20 * Math.log10(1 + 8 / df / 6.4);
  return `${dfx(df).toFixed(1)},${ey(err).toFixed(1)}`;
});

export default function DampingFactor() {
  return (
    <Fig
      h={440}
      title="The damping loop and why big DF numbers don't matter"
      desc="Top: the series loop the woofer's back-EMF sees — tiny amp output impedance, small cable resistance, and a voice coil resistance drawn much longer because it dominates. Bottom: response error versus damping factor, steep below 8 and flat beyond 20."
    >
      {/* ---- loop circuit, resistor length ∝ resistance ---- */}
      <line x1={70} y1={70} x2={110} y2={70} stroke={INK} strokeWidth={1} />
      <HRes x={110} y={70} w={26} color={MUTED} />
      <text {...t12} x={123} y={46} textAnchor="middle">
        Z out 0.05 Ω
      </text>
      <line x1={136} y1={70} x2={190} y2={70} stroke={INK} strokeWidth={1} />
      <HRes x={190} y={70} w={40} color={DEEP} />
      <text {...t12} x={210} y={46} textAnchor="middle">
        R cable 0.1 Ω
      </text>
      <line x1={230} y1={70} x2={300} y2={70} stroke={INK} strokeWidth={1} />
      <HRes x={300} y={70} w={230} color={ACCENT} />
      <text {...t14} x={415} y={44} textAnchor="middle">
        R voice-coil ≈ 6.4 Ω
      </text>
      <line x1={530} y1={70} x2={610} y2={70} stroke={INK} strokeWidth={1} />
      {/* back-EMF source closes the loop */}
      <line x1={610} y1={70} x2={610} y2={110} stroke={INK} strokeWidth={1} />
      <Source cx={610} cy={130} />
      <text {...t12} x={610} y={172} textAnchor="middle">
        back-EMF
      </text>
      <text {...t12} x={610} y={188} textAnchor="middle">
        (moving cone)
      </text>
      <line x1={610} y1={150} x2={610} y2={205} stroke="none" />
      {/* return rail */}
      <line x1={610} y1={196} x2={610} y2={196} stroke="none" />
      <path d="M610,150 L610,205 L70,205 L70,70" fill="none" stroke={INK} strokeWidth={1} />
      <text {...t12} x={90} y={196}>
        amp side
      </text>
      <text {...t12} x={90} y={100}>
        resistor length drawn ∝ resistance —
      </text>
      <text {...t12} x={90} y={116}>
        the voice coil dominates the loop
      </text>

      {/* ---- error vs DF ---- */}
      <line x1={80} y1={220} x2={80} y2={360} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={360} x2={620} y2={360} stroke={INK} strokeWidth={1} />
      {[1, 10, 100].map((df) => (
        <text key={df} {...tAxis} x={dfx(df)} y={376} textAnchor="middle">
          {df}
        </text>
      ))}
      <text {...tAxis} x={350} y={392} textAnchor="middle">
        damping factor (8 Ω speaker)
      </text>
      {[0, 4, 8].map((db) => (
        <text key={db} {...tAxis} x={70} y={ey(db)} textAnchor="end" dominantBaseline="central">
          {db} dB
        </text>
      ))}

      <line x1={dfx(8)} y1={220} x2={dfx(8)} y2={360} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <text {...tAxis} x={dfx(8)} y={214} textAnchor="middle">
        DF 8
      </text>
      <line x1={dfx(20)} y1={220} x2={dfx(20)} y2={360} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <text {...tAxis} x={dfx(20)} y={214} textAnchor="middle">
        DF 20
      </text>

      <polyline points={CURVE.join(" ")} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinejoin="round" />
      <text {...t12} x={614} y={ey(0.6) - 26} textAnchor="end">
        beyond DF ≈ 20 the curve is flat —
      </text>
      <text {...t12} x={614} y={ey(0.6) - 10} textAnchor="end">
        DF 50 vs 500 differs by a fraction of a dB
      </text>

      <text {...t12} x={350} y={428} textAnchor="middle">
        Worst-case response error from series resistance in the bass circuit, relative to an ideal amp
      </text>
    </Fig>
  );
}
