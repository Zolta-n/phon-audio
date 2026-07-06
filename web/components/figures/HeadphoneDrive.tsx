import { Fig, INK, MUTED, ACCENT, DEEP, PASS, FAIL, t14, t12, tAxis } from "./shared";

// V–I plane for a portable source: Vmax = 3 Vrms, Imax = 70 mA.
// x: current 0..120 mA → 80..600 px (4.333 px/mA)
// y: voltage 0..7 V → 290..60 px (32.86 px/V)
const ix = (mA: number) => 80 + mA * (520 / 120);
const vy = (v: number) => 290 - v * (230 / 7);

export default function HeadphoneDrive() {
  return (
    <Fig
      h={345}
      title="Voltage and current limits on the V-I plane"
      desc="An amplifier's voltage and current limits form a rectangle on the voltage-current plane. A 300 ohm dynamic headphone's steep load line exits through the voltage wall, while a 32 ohm planar's shallow load line exits through the current wall."
    >
      {/* axes */}
      <line x1={80} y1={50} x2={80} y2={290} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={290} x2={620} y2={290} stroke={INK} strokeWidth={1} />
      {[0, 40, 80, 120].map((mA) => (
        <text key={mA} {...tAxis} x={ix(mA)} y={306} textAnchor="middle">
          {mA}
        </text>
      ))}
      <text {...tAxis} x={350} y={322} textAnchor="middle">
        current (mA)
      </text>
      {[0, 2, 4, 6].map((v) => (
        <text key={v} {...tAxis} x={70} y={vy(v)} textAnchor="end" dominantBaseline="central">
          {v} V
        </text>
      ))}

      {/* amp operating region */}
      <rect x={80} y={vy(3)} width={ix(70) - 80} height={290 - vy(3)} fill={PASS} opacity={0.09} />
      <line x1={80} y1={vy(3)} x2={620} y2={vy(3)} stroke={FAIL} strokeWidth={1.2} strokeDasharray="6 4" />
      <text {...t12} fill={FAIL} x={614} y={vy(3) - 8} textAnchor="end">
        V max 3 Vrms — voltage wall
      </text>
      <line x1={ix(70)} y1={50} x2={ix(70)} y2={290} stroke={FAIL} strokeWidth={1.2} strokeDasharray="6 4" />
      <text {...t12} fill={FAIL} x={ix(70) + 8} y={64}>
        I max 70 mA — current wall
      </text>
      <text {...t12} fill={PASS} x={100} y={278}>
        the amp&apos;s clean operating region
      </text>

      {/* 300 Ω load line: V = 0.3·I(mA), exits top at I = 23.3 mA */}
      <line x1={ix(0)} y1={vy(0)} x2={ix(23.3)} y2={vy(7)} stroke={DEEP} strokeWidth={1.8} />
      <text {...t12} fill={DEEP} x={ix(23.3) + 8} y={70}>
        300 Ω dynamic (steep)
      </text>
      {/* its required peak point: 5.4 V @ 18 mA — above the voltage wall */}
      <circle cx={ix(18)} cy={vy(5.4)} r={4.5} fill="none" stroke={FAIL} strokeWidth={2} />
      <text {...t12} fill={FAIL} x={ix(18) + 10} y={vy(5.4) + 2}>
        needs 5.4 V @ 18 mA — starved of voltage
      </text>

      {/* 32 Ω load line: V = 0.032·I(mA), reaches 3.84 V at 120 mA */}
      <line x1={ix(0)} y1={vy(0)} x2={ix(120)} y2={vy(3.84)} stroke={ACCENT} strokeWidth={1.8} />
      <text {...t12} fill={ACCENT} x={ix(120) - 148} y={vy(3.84) - 16}>
        32 Ω planar (shallow)
      </text>
      {/* its required peak point: 2.82 V @ 88 mA — past the current wall */}
      <circle cx={ix(88)} cy={vy(2.82)} r={4.5} fill="none" stroke={FAIL} strokeWidth={2} />
      <text {...t12} fill={FAIL} x={ix(88) + 12} y={vy(2.82) + 6}>
        needs 2.8 V @ 88 mA
      </text>
      <text {...t12} fill={FAIL} x={ix(88) + 12} y={vy(2.82) + 22}>
        — starved of current
      </text>

      <text {...t12} x={350} y={340} textAnchor="middle">
        Both points are ~250 mW — the same milliwatts, two different walls
      </text>
    </Fig>
  );
}
