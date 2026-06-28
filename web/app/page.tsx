import Link from "next/link";

const FEATURES = [
  {
    icon: "⚡",
    title: "Full signal chain",
    desc: "Source → DAC → preamp → amp → speaker or headphone. Every link checked, every domain covered.",
  },
  {
    icon: "📐",
    title: "Real physics",
    desc: "Impedance bridging, damping factor, cable HF rolloff, power headroom — deterministic math, not guesswork.",
  },
  {
    icon: "🔊",
    title: "Honest about cables",
    desc: "Models speaker-cable resistance and interconnect capacitance. Tells you when a link is bit-perfect and cable choice is irrelevant.",
  },
];

const CHECKS = [
  { domain: "digital",   label: "Format / sample-rate / bit-depth match, cable length" },
  { domain: "line",      label: "Impedance bridging ≥10×, HF rolloff, gain staging" },
  { domain: "speaker",   label: "Power / headroom, impedance stability, damping factor, power handling" },
  { domain: "headphone", label: "Voltage + current drive, output-impedance ratio ≥8×" },
];

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-20 px-6 text-center">
        <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-4">
          Audiophile gear compatibility
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
          Does your gear actually work together?
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
          Build your signal chain, run the numbers. Get structured results on impedance,
          power headroom, damping factor, and gain staging — from source to speaker.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/builder"
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Try the chain builder →
          </Link>
          <Link
            href="/builder?demo=speaker"
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium px-8 py-3 rounded-lg transition-colors"
          >
            See a demo
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid sm:grid-cols-3 gap-8">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h2 className="font-semibold text-slate-900 mb-2">{f.title}</h2>
            <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* What gets checked */}
      <section className="bg-white border-y border-slate-100 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold text-slate-900 mb-8 text-center">
            What the engine checks at each link
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CHECKS.map((c) => (
              <div key={c.domain} className="flex gap-3 items-start bg-slate-50 rounded-lg p-4">
                <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide shrink-0">
                  {c.domain}
                </span>
                <span className="text-slate-600 text-sm">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Start with a demo chain
        </h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          See how the engine evaluates a full speaker system or headphone chain in seconds.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/builder?demo=speaker"
            className="bg-slate-900 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Speaker system demo
          </Link>
          <Link
            href="/builder?demo=headphone"
            className="bg-slate-900 hover:bg-slate-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Headphone chain demo
          </Link>
        </div>
      </section>
    </div>
  );
}
