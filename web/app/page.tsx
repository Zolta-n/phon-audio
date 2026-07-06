import Link from "next/link";
import { getComponents } from "@/lib/getComponents";

const BENCH_UNITS = [
  {
    category: "DAC",
    numeral: "I",
    name: "Schiit Modi 5",
    spec: "24-bit · 192 kHz",
    status: "BIT-PERFECT",
    tone: "ok" as const,
    delay: 0.05,
    ledDuration: "3s",
  },
  {
    category: "Preamp",
    numeral: "II",
    name: "Schiit Freya+",
    spec: "XLR · Balanced",
    status: "BRIDGED 12×",
    tone: "ok" as const,
    delay: 0.2,
    ledDuration: "3.4s",
  },
  {
    category: "Power Amp",
    numeral: "",
    name: "Schiit Aegir 2F",
    spec: "20W @ 8Ω",
    status: "HEADROOM +2.1 dB",
    tone: "warn" as const,
    delay: 0.35,
    ledDuration: "2.4s",
  },
  {
    category: "Speaker",
    numeral: "IV",
    name: "Wharfedale Linton",
    spec: "6Ω · 90 dB",
    status: "DAMPING 64",
    tone: "ok" as const,
    delay: 0.5,
    ledDuration: "3.8s",
  },
];

const HOW_STEPS = [
  {
    num: "01",
    title: "Add your components",
    body: "Search the library of DACs, amplifiers, speakers, and cables. Add what you own or what you're considering.",
  },
  {
    num: "02",
    title: "Build the signal chain",
    body: "Connect components visually. Impedance, gain staging, and compatibility are checked as you build.",
  },
  {
    num: "03",
    title: "Refine and compare",
    body: "Swap components, compare chains side-by-side, and tune to your listening preferences.",
  },
];

export default async function HomePage() {
  const catalog = await getComponents();
  const componentCount = catalog.length;
  const brandCount = new Set(catalog.map((c) => c.manufacturer ?? "Other")).size;

  const stats = [
    { value: String(componentCount), label: "Components" },
    { value: String(brandCount), label: "Brands" },
    { value: "Free", label: "No signup" },
  ];

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section style={{ position: "relative", height: "860px", overflow: "hidden", background: "#0d0700" }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, #0d0700 0%, #241300 35%, #3d2200 62%, #1a0e02 100%)",
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 55% 62% at 70% 45%, rgba(217,119,6,0.32) 0%, rgba(180,100,20,0.12) 45%, transparent 72%)",
          animation: "paGlowBreathe 7s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 30% 24% at 22% 84%, rgba(251,191,36,0.10) 0%, transparent 70%)",
          animation: "paGlowBreathe 9s ease-in-out 2s infinite",
        }} />
        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "210px",
          background: "linear-gradient(180deg, rgba(20,11,0,0) 0%, rgba(38,20,4,0.9) 40%, #170c01 100%)",
        }} />

        <div className="pa-container" style={{
          position: "relative",
          zIndex: 2,
          padding: "110px 56px 0",
          display: "flex",
          gap: "30px",
        }}>
          {/* Left column */}
          <div className="pa-fade-up" style={{ flex: 1, maxWidth: "520px", animationDuration: "1s" }}>
            <div className="pa-kicker" style={{ gap: "16px", marginBottom: "30px" }}>
              <span>Audiophile Compatibility Engine</span>
            </div>
            <h1 style={{
              fontFamily: "var(--pa-font-display)",
              fontSize: "5.2rem",
              fontWeight: 500,
              lineHeight: 1.04,
              color: "var(--pa-text-on-dark)",
              margin: "0 0 34px",
              letterSpacing: "-0.01em",
            }}>
              Hear more.<br />
              <em style={{ fontWeight: 400, color: "var(--pa-gold)" }}>Pair better.</em>
            </h1>
            <p style={{
              fontSize: "1.15rem",
              lineHeight: 1.8,
              color: "var(--pa-lede)",
              margin: "0 0 46px",
              maxWidth: "410px",
              fontStyle: "italic",
            }}>
              Every connection, every impedance, every watt — verified before you invest.
            </p>
            <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
              <Link href="/builder" className="pa-btn pa-btn-primary" style={{ padding: "18px 38px", fontSize: "0.78rem" }}>
                Build Your Chain
              </Link>
              <Link href="#how" style={{
                color: "var(--pa-navtext)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "18px 10px",
                fontSize: "0.78rem",
                fontFamily: "var(--pa-font-ui)",
                textDecoration: "none",
                borderBottom: "1px solid rgba(201,168,119,0.4)",
              }}>
                See how it works
              </Link>
            </div>

            {/* Stats */}
            <div style={{ marginTop: "64px", display: "flex", gap: "44px" }}>
              {stats.map((stat, i) => (
                <div key={stat.label} style={{ display: "flex", gap: "44px" }}>
                  {i > 0 && <div style={{ width: "1px", background: "rgba(250,245,238,0.14)" }} />}
                  <div>
                    <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "2rem", color: "var(--pa-gold)" }}>{stat.value}</div>
                    <div style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.26em",
                      textTransform: "uppercase",
                      color: "var(--pa-faint)",
                      marginTop: "6px",
                      fontFamily: "var(--pa-font-ui)",
                    }}>
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: listening-room photograph */}
          <div style={{ flexShrink: 0, width: "720px", position: "relative", height: "700px" }}>
            <div style={{
              position: "absolute",
              left: "20px",
              top: "-30px",
              width: "680px",
              height: "560px",
              background: "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(217,119,6,0.20), transparent 72%)",
              animation: "paGlowBreathe 7s ease-in-out infinite",
            }} />
            <div style={{ position: "absolute", left: 0, top: "-70px", width: "720px", height: "540px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero-listening-room.png"
                alt="Reference listening setup — floorstanding speakers and amplifier in a warm room"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  filter: "sepia(0.22) saturate(1.12) brightness(0.9) contrast(1.06)",
                  WebkitMaskImage: "radial-gradient(ellipse 68% 62% at 50% 48%, black 38%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.25) 83%, transparent 97%)",
                  maskImage: "radial-gradient(ellipse 68% 62% at 50% 48%, black 38%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.25) 83%, transparent 97%)",
                }}
              />
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, rgba(217,119,6,0.10), transparent 45%, rgba(61,34,0,0.14) 90%)",
                mixBlendMode: "overlay",
                pointerEvents: "none",
              }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ YOUR CHAIN, ON THE BENCH ═══ */}
      <section style={{ background: "var(--pa-bg)", padding: "100px 56px", borderTop: "1px solid var(--pa-border)" }}>
        <div className="pa-container">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "64px" }}>
            <h2 style={{
              fontFamily: "var(--pa-font-display)",
              fontSize: "2.8rem",
              fontWeight: 500,
              color: "var(--pa-text)",
              margin: 0,
            }}>
              Your chain, <em style={{ color: "var(--pa-accent2)" }}>on the bench</em>
            </h2>
            <span style={{
              fontSize: "0.66rem",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--pa-muted)",
              fontFamily: "var(--pa-font-ui)",
            }}>
              Live compatibility readout
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "28px", position: "relative" }}>
            <div className="pa-rail" style={{ left: "5%", right: "5%" }} />
            <div className="pa-rail-track" style={{ left: "5%", right: "5%" }}>
              <div className="pa-pulse" />
            </div>
            {BENCH_UNITS.map((unit) => (
              <div
                key={unit.name}
                className="pa-rack-unit pa-fade-up"
                style={{ padding: "26px 24px 22px", animationDuration: "0.8s", animationDelay: `${unit.delay}s` }}
              >
                {unit.category === "Power Amp" && (
                  <div className="pa-vu" style={{ position: "absolute", right: "18px", top: "22px", height: "22px" }}>
                    <i style={{ width: "4px" }} /><i style={{ width: "4px" }} /><i style={{ width: "4px" }} /><i style={{ width: "4px" }} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{
                    fontSize: "0.56rem",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: "var(--pa-accent)",
                    fontFamily: "var(--pa-font-ui)",
                    fontWeight: 700,
                  }}>
                    {unit.category}
                  </span>
                  {unit.numeral && (
                    <span style={{ fontSize: "0.62rem", color: "var(--pa-muted)", fontFamily: "monospace" }}>{unit.numeral}</span>
                  )}
                </div>
                <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.25rem", color: "var(--pa-cream)", marginBottom: "6px" }}>
                  {unit.name}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--pa-faint)", fontFamily: "monospace" }}>{unit.spec}</div>
                <div style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(217,119,6,0.15)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <div
                    className={unit.tone === "warn" ? "pa-led pa-led--warn" : "pa-led"}
                    style={{ width: "8px", height: "8px", animationDuration: unit.ledDuration }}
                  />
                  <span style={{
                    fontSize: "0.62rem",
                    color: unit.tone === "warn" ? "var(--pa-warn-text)" : "var(--pa-ok-text)",
                    fontFamily: "var(--pa-font-ui)",
                    letterSpacing: "0.12em",
                  }}>
                    {unit.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={{ background: "var(--pa-surface)", padding: "100px 56px", borderTop: "1px solid var(--pa-border)" }}>
        <div className="pa-container" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {HOW_STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                padding: i === 0 ? "0 52px 0 0" : i === 1 ? "0 52px" : "0 0 0 52px",
                borderRight: i < 2 ? "1px solid var(--pa-rule)" : "none",
              }}
            >
              <div style={{
                fontFamily: "var(--pa-font-display)",
                fontSize: "4.6rem",
                fontWeight: 400,
                color: "var(--pa-accent)",
                lineHeight: 1,
                fontStyle: "italic",
              }}>
                {step.num}
              </div>
              <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.4rem", color: "var(--pa-text)", margin: "22px 0 14px" }}>
                {step.title}
              </div>
              <p style={{ fontSize: "0.95rem", color: "var(--pa-muted)", lineHeight: 1.75, margin: 0 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
