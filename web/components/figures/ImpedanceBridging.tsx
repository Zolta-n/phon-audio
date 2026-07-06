import {
  Fig,
  INK,
  MUTED,
  ACCENT,
  DEEP,
  PASS,
  WARN,
  FAIL,
  HRes,
  VRes,
  Ground,
  Source,
  t14,
  t12,
  tAxis,
} from "./shared";

// Bottom plot: x = Zin/Zout ratio 1..20 mapped 80..620; y = loss 0..−6.5 dB.
const rx = (r: number) => 80 + ((r - 1) * 540) / 19;
const ly = (lossDb: number) => 300 + -lossDb * 20; // 0 dB at y=300, −6 at 420

const CURVE = [1, 1.5, 2, 3, 4, 5, 7, 10, 14, 20].map((r) => {
  const loss = 20 * Math.log10(r / (r + 1));
  return `${rx(r).toFixed(1)},${ly(loss).toFixed(1)}`;
});

export default function ImpedanceBridging() {
  return (
    <Fig
      h={470}
      title="Voltage bridging: schematic and insertion loss"
      desc="A source with output impedance Zout feeding a load input impedance Zin forms a voltage divider. Below, the insertion loss versus the Zin to Zout ratio, with the engine's fail, warn, and pass bands at 5x and 10x."
    >
      {/* ---- schematic ---- */}
      <Source cx={110} cy={130} />
      <text {...t12} x={80} y={130} textAnchor="end" dominantBaseline="central">
        V src
      </text>
      <line x1={110} y1={110} x2={110} y2={70} stroke={INK} strokeWidth={1} />
      <line x1={110} y1={70} x2={230} y2={70} stroke={INK} strokeWidth={1} />
      <HRes x={230} y={70} w={80} color={DEEP} />
      <text {...t14} x={270} y={44} textAnchor="middle">
        Z out
      </text>
      <line x1={310} y1={70} x2={430} y2={70} stroke={INK} strokeWidth={1} />
      <circle cx={430} cy={70} r={3} fill={INK} />
      <line x1={430} y1={70} x2={556} y2={70} stroke={INK} strokeWidth={1} />
      <circle cx={562} cy={70} r={5} fill="none" stroke={INK} strokeWidth={1.5} />
      <text {...t12} x={562} y={48} textAnchor="middle">
        V in (next stage)
      </text>
      <line x1={430} y1={70} x2={430} y2={90} stroke={INK} strokeWidth={1} />
      <VRes x={430} y={90} h={80} color={ACCENT} />
      <text {...t14} x={455} y={128} dominantBaseline="central">
        Z in
      </text>
      <line x1={430} y1={170} x2={430} y2={192} stroke={INK} strokeWidth={1} />
      <Ground x={430} y={192} />
      <line x1={110} y1={150} x2={110} y2={192} stroke={INK} strokeWidth={1} />
      <Ground x={110} y={192} />

      {/* ---- insertion loss plot ---- */}
      {/* threshold bands */}
      <rect x={rx(1)} y={280} width={rx(5) - rx(1)} height={150} fill={FAIL} opacity={0.08} />
      <rect x={rx(5)} y={280} width={rx(10) - rx(5)} height={150} fill={WARN} opacity={0.08} />
      <rect x={rx(10)} y={280} width={620 - rx(10)} height={150} fill={PASS} opacity={0.08} />
      <text {...t12} fill={FAIL} x={(rx(1) + rx(5)) / 2} y={272} textAnchor="middle">
        fail
      </text>
      <text {...t12} fill={WARN} x={(rx(5) + rx(10)) / 2} y={272} textAnchor="middle">
        warn
      </text>
      <text {...t12} fill={PASS} x={(rx(10) + 620) / 2} y={272} textAnchor="middle">
        pass
      </text>
      <line x1={rx(5)} y1={280} x2={rx(5)} y2={430} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />
      <line x1={rx(10)} y1={280} x2={rx(10)} y2={430} stroke={MUTED} strokeWidth={1} strokeDasharray="4 3" />

      {/* axes */}
      <line x1={80} y1={280} x2={80} y2={430} stroke={INK} strokeWidth={1} />
      <line x1={80} y1={430} x2={620} y2={430} stroke={INK} strokeWidth={1} />
      {[0, -3, -6].map((db) => (
        <text key={db} {...tAxis} x={70} y={ly(db)} textAnchor="end" dominantBaseline="central">
          {db} dB
        </text>
      ))}
      {[1, 5, 10, 20].map((r) => (
        <text key={r} {...tAxis} x={rx(r)} y={446} textAnchor="middle">
          {r}×
        </text>
      ))}
      <text {...tAxis} x={350} y={462} textAnchor="middle">
        Z in / Z out ratio
      </text>

      {/* loss curve */}
      <polyline points={CURVE.join(" ")} fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
      <circle cx={rx(10)} cy={ly(20 * Math.log10(10 / 11))} r={3.5} fill={ACCENT} />
      <text {...t12} x={rx(10) + 10} y={ly(-0.83) - 10}>
        10× → only −0.83 dB, flat with frequency
      </text>
    </Fig>
  );
}
