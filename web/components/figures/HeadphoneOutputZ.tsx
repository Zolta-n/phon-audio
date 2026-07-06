import { Fig, INK, MUTED, ACCENT, DEEP, t14, t12, tAxis } from "./shared";

// x: log frequency 20 Hz .. 20 kHz mapped 80..620.
const fx = (hz: number) => 80 + (Math.log10(hz) - Math.log10(20)) * (540 / 3);
// Top panel: impedance 0..32 Ω mapped 190..55.
const zy = (ohm: number) => 190 - ohm * (135 / 32);
// Bottom panel: deviation 0..−7 dB mapped 255..360.
const dy = (dev: number) => 255 + -dev * 15;

export default function HeadphoneOutputZ() {
  return (
    <Fig
      h={430}
      title="A multi-driver IEM's impedance turns output impedance into EQ"
      desc="Top: a multi-driver IEM impedance curve swinging between 30 and 6 ohms across the audio band. Bottom: the resulting frequency response deviation — flat from a near-zero-ohm source, but a 6 dB swing from a 10 ohm source, mirroring the impedance curve."
    >
      {/* ---- top: |Z| of a multi-driver IEM ---- */}
      <text {...t14} x={80} y={40}>
        IEM impedance |Z(f)|
      </text>
      <line x1={80} y1={55} x2={80} y2={190} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={190} x2={620} y2={190} stroke={INK} strokeWidth={1} />
      {[10, 20, 30].map((z) => (
        <text key={z} {...tAxis} x={70} y={zy(z)} textAnchor="end" dominantBaseline="central">
          {z} Ω
        </text>
      ))}
      <path
        d={`M${fx(20)},${zy(28)} C${fx(45)},${zy(31)} ${fx(70)},${zy(30)} ${fx(120)},${zy(24)}
           C${fx(250)},${zy(15)} ${fx(500)},${zy(11)} ${fx(900)},${zy(12)}
           C${fx(1500)},${zy(13)} ${fx(1800)},${zy(9)} ${fx(2500)},${zy(6)}
           C${fx(3500)},${zy(4.5)} ${fx(5000)},${zy(7)} ${fx(7000)},${zy(12)}
           C${fx(10000)},${zy(18)} ${fx(15000)},${zy(16)} ${fx(20000)},${zy(13)}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
      />
      <circle cx={fx(3000)} cy={zy(5.2)} r={3.5} fill={ACCENT} />
      <text {...t12} x={fx(3000) + 10} y={zy(5.2) + 14}>
        crossover hand-off dips to ≈6 Ω
      </text>

      {/* ---- bottom: FR deviation by source impedance ---- */}
      <text {...t14} x={80} y={235}>
        Resulting response deviation
      </text>
      <line x1={80} y1={248} x2={80} y2={368} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={368} x2={620} y2={368} stroke={INK} strokeWidth={1} />
      {[0, -3, -6].map((db) => (
        <text key={db} {...tAxis} x={70} y={dy(db)} textAnchor="end" dominantBaseline="central">
          {db} dB
        </text>
      ))}
      {[20, 200, 2000, 20000].map((f) => (
        <text key={f} {...tAxis} x={fx(f)} y={384} textAnchor="middle">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
      <text {...tAxis} x={350} y={400} textAnchor="middle">
        frequency (Hz)
      </text>

      {/* near-zero source: flat */}
      <path
        d={`M${fx(20)},${dy(-0.1)} C${fx(500)},${dy(-0.35)} ${fx(2000)},${dy(-0.55)} ${fx(3000)},${dy(-0.6)}
           C${fx(6000)},${dy(-0.4)} ${fx(12000)},${dy(-0.2)} ${fx(20000)},${dy(-0.25)}`}
        fill="none"
        stroke={DEEP}
        strokeWidth={1.8}
      />
      {/* 10 Ω source: mirrors the impedance curve, −6 dB at the dip */}
      <path
        d={`M${fx(20)},${dy(-0.5)} C${fx(70)},${dy(-0.35)} ${fx(120)},${dy(-0.8)} ${fx(250)},${dy(-2)}
           C${fx(500)},${dy(-3.3)} ${fx(900)},${dy(-3.1)} ${fx(1500)},${dy(-2.9)}
           C${fx(2000)},${dy(-3.9)} ${fx(2600)},${dy(-5.7)} ${fx(3200)},${dy(-6)}
           C${fx(4500)},${dy(-5)} ${fx(7000)},${dy(-3)} ${fx(10000)},${dy(-1.8)}
           C${fx(14000)},${dy(-1.4)} ${fx(17000)},${dy(-1.9)} ${fx(20000)},${dy(-2.2)}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.8}
        strokeDasharray="7 4"
      />

      {/* legend */}
      <line x1={430} y1={252} x2={458} y2={252} stroke={DEEP} strokeWidth={1.8} />
      <text {...t12} x={464} y={252} dominantBaseline="central">
        0.5 Ω source — under 1 dB
      </text>
      <line x1={430} y1={270} x2={458} y2={270} stroke={ACCENT} strokeWidth={1.8} strokeDasharray="7 4" />
      <text {...t12} x={464} y={270} dominantBaseline="central">
        10 Ω source — 6 dB of wave
      </text>

      <text {...t12} x={350} y={420} textAnchor="middle">
        The response sags wherever the impedance dips — the divider is a literal, measurable EQ
      </text>
    </Fig>
  );
}
