import {
  Fig,
  INK,
  MUTED,
  ACCENT,
  DEEP,
  HRes,
  Ground,
  Source,
  t14,
  t12,
  tAxis,
} from "./shared";

// Bode plot: x = log10(f), 1 kHz..100 MHz (5 decades) mapped 80..620 (108 px/decade).
const fx = (hz: number) => 80 + (Math.log10(hz) - 3) * 108;
// y: 0 dB at 240, 6 px per dB down to −24 dB at 384.
const gy = (db: number) => 240 + -db * 6;

export default function HfRolloff() {
  return (
    <Fig
      h={455}
      title="Cable capacitance low-pass: schematic and Bode plot"
      desc="The source output impedance and lumped cable capacitance form an RC low-pass filter. The Bode plot shows a benign corner near 16 megahertz for a short cable and low-impedance source, versus a corner near 20 kilohertz for a long high-capacitance cable driven by a high-impedance tube source."
    >
      {/* ---- RC schematic ---- */}
      <Source cx={100} cy={120} />
      <text {...t12} x={70} y={120} textAnchor="end" dominantBaseline="central">
        V src
      </text>
      <line x1={100} y1={100} x2={100} y2={62} stroke={INK} strokeWidth={1} />
      <line x1={100} y1={62} x2={210} y2={62} stroke={INK} strokeWidth={1} />
      <HRes x={210} y={62} w={80} color={DEEP} />
      <text {...t14} x={250} y={40} textAnchor="middle">
        Z out
      </text>
      <line x1={290} y1={62} x2={400} y2={62} stroke={INK} strokeWidth={1} />
      <circle cx={400} cy={62} r={3} fill={INK} />
      <line x1={400} y1={62} x2={540} y2={62} stroke={INK} strokeWidth={1} />
      <circle cx={546} cy={62} r={5} fill="none" stroke={INK} strokeWidth={1.5} />
      <text {...t12} x={546} y={40} textAnchor="middle">
        to input
      </text>
      {/* capacitor to ground */}
      <line x1={400} y1={62} x2={400} y2={98} stroke={INK} strokeWidth={1} />
      <line x1={384} y1={98} x2={416} y2={98} stroke={ACCENT} strokeWidth={2} />
      <line x1={384} y1={108} x2={416} y2={108} stroke={ACCENT} strokeWidth={2} />
      <line x1={400} y1={108} x2={400} y2={132} stroke={INK} strokeWidth={1} />
      <Ground x={400} y={132} />
      <text {...t14} x={428} y={98}>
        C · ℓ
      </text>
      <text {...t12} x={428} y={116}>
        cable capacitance × length
      </text>
      <line x1={100} y1={140} x2={100} y2={132} stroke="none" />
      <line x1={100} y1={140} x2={100} y2={148} stroke={INK} strokeWidth={1} />
      <Ground x={100} y={148} />

      {/* ---- Bode plot ---- */}
      <line x1={80} y1={220} x2={80} y2={390} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={390} x2={620} y2={390} stroke={INK} strokeWidth={1} />
      {["1k", "10k", "100k", "1M", "10M", "100M"].map((lab, i) => (
        <text key={lab} {...tAxis} x={80 + i * 108} y={406} textAnchor="middle">
          {lab}
        </text>
      ))}
      <text {...tAxis} x={350} y={422} textAnchor="middle">
        frequency (Hz)
      </text>
      {[0, -12, -24].map((db) => (
        <text key={db} {...tAxis} x={70} y={gy(db)} textAnchor="end" dominantBaseline="central">
          {db} dB
        </text>
      ))}

      {/* audible band shading, up to 20 kHz */}
      <rect x={80} y={220} width={fx(20000) - 80} height={170} fill={ACCENT} opacity={0.07} />
      <text {...t12} x={(80 + fx(20000)) / 2} y={234} textAnchor="middle">
        audible band
      </text>

      {/* −3 dB reference */}
      <line x1={80} y1={gy(-3)} x2={620} y2={gy(-3)} stroke={MUTED} strokeWidth={1} strokeDasharray="3 4" />
      <text {...tAxis} x={614} y={gy(-3) - 6} textAnchor="end">
        −3 dB
      </text>

      {/* benign case: 1 m @ 100 Ω, corner ≈ 16 MHz */}
      <path
        d={`M80,${gy(0)} L${fx(16e6)},${gy(0)} L620,${gy(-20 * Math.log10(1e8 / 16e6))}`}
        fill="none"
        stroke={DEEP}
        strokeWidth={1.8}
      />
      {/* demanding case: 5 m high-C cable @ 5 kΩ source, corner ≈ 20 kHz */}
      <path
        d={`M80,${gy(0)} L${fx(20000)},${gy(0)} L${fx(20000 * Math.pow(10, 1.2))},${gy(-24)}`}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.8}
      />
      <circle cx={fx(20000)} cy={gy(-3) + 0} r={3.5} fill={ACCENT} />

      {/* legend */}
      <line x1={370} y1={256} x2={398} y2={256} stroke={DEEP} strokeWidth={1.8} />
      <text {...t12} x={404} y={256} dominantBaseline="central">
        1 m @ 100 Ω — corner ≈ 16 MHz
      </text>
      <line x1={370} y1={274} x2={398} y2={274} stroke={ACCENT} strokeWidth={1.8} />
      <text {...t12} x={404} y={274} dominantBaseline="central">
        5 m high-C @ 5 kΩ — corner ≈ 20 kHz
      </text>

      <text {...t12} x={350} y={445} textAnchor="middle">
        The cure is a shorter run or lower capacitance — never a pricier cable
      </text>
    </Fig>
  );
}
