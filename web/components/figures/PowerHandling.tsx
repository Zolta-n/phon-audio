import { Fig, INK, MUTED, ACCENT, DEEP, FAIL, t14, t12, tAxis } from "./shared";

// Top: clean sine vs hard-clipped sine (two cycles each).
// Bottom: spectrum — clean has only the fundamental; clipped adds odd
// harmonics decaying as 1/n, extending into the shaded tweeter band.

const BASE = 385; // spectrum baseline
const H1 = 170;
const HARM = [
  { n: 1, x: 150 },
  { n: 3, x: 260 },
  { n: 5, x: 350 },
  { n: 7, x: 440 },
  { n: 9, x: 530 },
];

export default function PowerHandling() {
  return (
    <Fig
      h={445}
      title="Why clipping kills tweeters"
      desc="A clean sine wave versus a hard-clipped one, and their spectra: the clipped wave adds odd harmonics decaying as one over n, dumping energy into the shaded tweeter band above the crossover."
    >
      <text {...t14} x={180} y={40} textAnchor="middle">
        Clean sine
      </text>
      <text {...t14} x={505} y={40} textAnchor="middle">
        Hard-clipped
      </text>

      {/* clean sine: two cycles, x 70..290, center y=105, amp 45 */}
      <path
        d="M70,105 C84,60 111,60 125,105 C139,150 166,150 180,105 C194,60 221,60 235,105 C249,150 276,150 290,105"
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.8}
      />

      {/* clipped sine: flat tops/bottoms at ±32 */}
      <path
        d="M395,105 C400,88 403,73 409,73 L444,73 C450,73 453,88 458,105 C463,122 466,137 472,137 L507,137 C513,137 516,122 521,105 C526,88 529,73 535,73 L570,73 C576,73 579,88 584,105 C589,122 592,137 598,137 L615,137"
        fill="none"
        stroke={DEEP}
        strokeWidth={1.8}
      />
      <line x1={395} y1={73} x2={615} y2={73} stroke={MUTED} strokeWidth={1} strokeDasharray="3 4" />
      <text {...t12} fill={FAIL} x={505} y={60} textAnchor="middle">
        rails — RMS power roughly doubles
      </text>

      {/* ---- spectrum ---- */}
      <line x1={90} y1={BASE} x2={620} y2={BASE} stroke={INK} strokeWidth={1} />
      <text {...tAxis} x={355} y={BASE + 30} textAnchor="middle">
        frequency
      </text>

      {/* tweeter band shading from just left of the 3rd harmonic */}
      <rect x={225} y={195} width={395} height={BASE - 195} fill={FAIL} opacity={0.07} />
      <line x1={225} y1={195} x2={225} y2={BASE} stroke={FAIL} strokeWidth={1} strokeDasharray="4 3" />
      <text {...t12} fill={FAIL} x={238} y={208}>
        tweeter band (above crossover ≈ 2 kHz)
      </text>

      {/* clean spectrum: fundamental only, drawn as outline beside the clipped bar */}
      <rect
        x={128}
        y={BASE - H1}
        width={18}
        height={H1}
        fill="none"
        stroke={ACCENT}
        strokeWidth={1.6}
        strokeDasharray="4 3"
      />
      {/* clipped spectrum: odd harmonics ∝ 1/n */}
      {HARM.map((h) => (
        <g key={h.n}>
          <rect x={h.x} y={BASE - H1 / h.n} width={18} height={H1 / h.n} fill={DEEP} opacity={0.85} rx={2} />
          <text {...tAxis} x={h.x + 9} y={BASE + 16} textAnchor="middle">
            f{h.n === 1 ? "₁" : `·${h.n}`}
          </text>
        </g>
      ))}
      <text {...tAxis} x={137} y={BASE + 16} textAnchor="middle">
        clean
      </text>

      <text {...t12} x={355} y={434} textAnchor="middle">
        A small amp driven into clipping delivers more energy to a tweeter than a big amp playing cleanly
      </text>
    </Fig>
  );
}
