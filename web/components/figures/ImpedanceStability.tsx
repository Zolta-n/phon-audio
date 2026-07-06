import { Fig, INK, MUTED, ACCENT, DEEP, FAIL, PASS, t14, t12, tAxis } from "./shared";

// x: log frequency 20 Hz .. 20 kHz over 3 decades, mapped 70..620 (183.3 px/decade).
// y: impedance 0..10 Ω mapped 280..60 (22 px per ohm).
const zx = (hz: number) => 70 + (Math.log10(hz) - Math.log10(20)) * (550 / 3);
const zy = (ohm: number) => 280 - ohm * 22;

export default function ImpedanceStability() {
  return (
    <Fig
      h={330}
      title="Impedance magnitude and EPDR of a nominal 4-ohm speaker"
      desc="The impedance magnitude curve of a nominally 4 ohm speaker dips to 3 ohms; the phase-adjusted EPDR trace dips to about 1.5 ohms in the same region, which is what the amplifier's output stage actually experiences."
    >
      {/* axes */}
      <line x1={70} y1={50} x2={70} y2={280} stroke={INK} strokeWidth={1} />
      <line x1={70} y1={280} x2={620} y2={280} stroke={INK} strokeWidth={1} />
      {[20, 200, 2000, 20000].map((f) => (
        <text key={f} {...tAxis} x={zx(f)} y={296} textAnchor="middle">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}
      <text {...tAxis} x={345} y={312} textAnchor="middle">
        frequency (Hz)
      </text>
      {[2, 4, 6, 8].map((z) => (
        <text key={z} {...tAxis} x={60} y={zy(z)} textAnchor="end" dominantBaseline="central">
          {z} Ω
        </text>
      ))}

      {/* nominal line */}
      <line x1={70} y1={zy(4)} x2={620} y2={zy(4)} stroke={MUTED} strokeWidth={1} strokeDasharray="3 4" />
      <text {...tAxis} x={614} y={zy(4) - 6} textAnchor="end">
        nominal 4 Ω
      </text>
      {/* amp stability rating */}
      <line x1={70} y1={zy(2)} x2={620} y2={zy(2)} stroke={PASS} strokeWidth={1} strokeDasharray="5 4" />
      <text {...tAxis} fill={PASS} x={614} y={zy(2) - 6} textAnchor="end">
        amp rated stable to 2 Ω
      </text>

      {/* |Z| curve: bass resonance peak, midbass dip, crossover dip */}
      <path
        d={`M${zx(20)},${zy(5.5)} C${zx(35)},${zy(9)} ${zx(50)},${zy(9.2)} ${zx(65)},${zy(7.5)}
           C${zx(100)},${zy(4)} ${zx(150)},${zy(3.1)} ${zx(220)},${zy(3)}
           C${zx(400)},${zy(3.2)} ${zx(700)},${zy(5.5)} ${zx(1200)},${zy(5.2)}
           C${zx(2000)},${zy(4.4)} ${zx(3000)},${zy(3.4)} ${zx(5000)},${zy(3.6)}
           C${zx(9000)},${zy(4.2)} ${zx(14000)},${zy(6)} ${zx(20000)},${zy(7)}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={2}
      />

      {/* EPDR trace: dips roughly to half of |Z| where phase is hostile */}
      <path
        d={`M${zx(20)},${zy(4.2)} C${zx(40)},${zy(6)} ${zx(60)},${zy(5.5)} ${zx(90)},${zy(3)}
           C${zx(130)},${zy(1.8)} ${zx(180)},${zy(1.5)} ${zx(260)},${zy(1.7)}
           C${zx(500)},${zy(2.4)} ${zx(900)},${zy(3.4)} ${zx(1500)},${zy(3)}
           C${zx(2500)},${zy(2.2)} ${zx(3500)},${zy(1.9)} ${zx(5000)},${zy(2.2)}
           C${zx(9000)},${zy(2.8)} ${zx(14000)},${zy(3.8)} ${zx(20000)},${zy(4.5)}`}
        fill="none"
        stroke={DEEP}
        strokeWidth={1.6}
        strokeDasharray="6 4"
      />

      {/* dip annotations */}
      <circle cx={zx(220)} cy={zy(3)} r={3.5} fill={ACCENT} />
      <text {...t12} fill={ACCENT} x={zx(220) + 8} y={zy(3) + 16}>
        |Z| min ≈ 3 Ω
      </text>
      <circle cx={zx(180)} cy={zy(1.5)} r={3.5} fill={DEEP} />
      <text {...t12} fill={FAIL} x={zx(180) + 60} y={zy(1.5) + 18}>
        EPDR ≈ 1.5 Ω — what the output stage really sees
      </text>

      {/* legend */}
      <line x1={430} y1={62} x2={458} y2={62} stroke={ACCENT} strokeWidth={2} />
      <text {...t12} x={464} y={62} dominantBaseline="central">
        |Z(f)| magnitude
      </text>
      <line x1={430} y1={80} x2={458} y2={80} stroke={DEEP} strokeWidth={1.6} strokeDasharray="6 4" />
      <text {...t12} x={464} y={80} dominantBaseline="central">
        EPDR (phase-adjusted)
      </text>
    </Fig>
  );
}
