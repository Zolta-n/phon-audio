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
      <section style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        {/* Background gradient */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(170deg, #2a1808 0%, #6b3c12 30%, #c4800a 55%, #8b5020 75%, #1a0c04 100%)",
          zIndex: 0,
        }} />
        {/* Overlay to bottom */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, transparent 40%, rgba(10,5,0,0.72) 100%)",
          zIndex: 1,
        }} />
        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, padding: "0 80px 80px" }}>
          <p style={{
            color: "var(--pa-accent)",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: "18px",
            fontFamily: "var(--font-lora), Georgia, serif",
          }}>
            High-Fidelity Audio Engineering
          </p>
          <h1 style={{
            fontFamily: "var(--font-playfair), Georgia, serif",
            fontSize: "3.8rem",
            fontWeight: 700,
            color: "var(--pa-cream)",
            lineHeight: 1.15,
            marginBottom: "22px",
            maxWidth: "700px",
          }}>
            Design Your<br />Perfect Sound Chain
          </h1>
          <p style={{
            fontSize: "1.1rem",
            color: "rgba(253,246,236,0.72)",
            maxWidth: "560px",
            marginBottom: "36px",
            lineHeight: 1.65,
            fontFamily: "var(--font-lora), Georgia, serif",
          }}>
            Build your signal chain, run the numbers. Get structured results on impedance,
            power headroom, damping factor, and gain staging — from source to speaker.
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link href="/builder" style={{
              background: "var(--pa-accent)",
              color: "#fff",
              fontFamily: "var(--font-lora), Georgia, serif",
              fontWeight: 600,
              fontSize: "0.95rem",
              padding: "14px 32px",
              borderRadius: "4px",
              textDecoration: "none",
              letterSpacing: "0.03em",
            }}>
              Try the chain builder →
            </Link>
            <Link href="/builder?demo=speaker" style={{
              background: "transparent",
              color: "var(--pa-cream)",
              border: "1px solid rgba(253,246,236,0.45)",
              fontFamily: "var(--font-lora), Georgia, serif",
              fontWeight: 500,
              fontSize: "0.95rem",
              padding: "14px 32px",
              borderRadius: "4px",
              textDecoration: "none",
              letterSpacing: "0.03em",
            }}>
              See a demo
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery strip */}
      <section style={{
        background: "var(--pa-surface)",
        padding: "52px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <p style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          color: "var(--pa-muted)",
          marginBottom: "24px",
          fontFamily: "var(--font-lora), Georgia, serif",
        }}>
          The Listening Experience
        </p>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {/* Turntable placeholder */}
          <div style={{
            width: "280px",
            height: "180px",
            borderRadius: "8px",
            background: "radial-gradient(ellipse at 40% 60%, #c47c2a 0%, #6b3a10 40%, #1a0c04 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "16px",
            flexShrink: 0,
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", letterSpacing: "0.05em" }}>⬡ Photo placeholder</span>
          </div>
          {/* Amp placeholder */}
          <div style={{
            width: "280px",
            height: "180px",
            borderRadius: "8px",
            background: "radial-gradient(ellipse at 50% 70%, #d4820a 0%, #7a3a08 30%, #0d0805 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "16px",
            flexShrink: 0,
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", letterSpacing: "0.05em" }}>⬡ Photo placeholder</span>
          </div>
          {/* Room placeholder */}
          <div style={{
            width: "280px",
            height: "180px",
            borderRadius: "8px",
            background: "linear-gradient(160deg, #8b5e2a 0%, #3d2008 50%, #1a0e06 100%)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: "16px",
            flexShrink: 0,
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", letterSpacing: "0.05em" }}>⬡ Photo placeholder</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{
        background: "var(--pa-bg)",
        padding: "84px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <h2 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "var(--pa-text)",
          marginBottom: "52px",
        }}>
          How it works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px" }}>
          {FEATURES.map((f, idx) => (
            <div key={f.title}>
              <div style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: "3.2rem",
                fontWeight: 700,
                color: "var(--pa-accent)",
                lineHeight: 1,
                marginBottom: "8px",
              }}>
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{f.icon}</div>
              <h3 style={{
                fontFamily: "var(--font-playfair), Georgia, serif",
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--pa-text)",
                marginBottom: "10px",
              }}>
                {f.title}
              </h3>
              <p style={{
                fontFamily: "var(--font-lora), Georgia, serif",
                fontSize: "0.9rem",
                color: "var(--pa-muted)",
                lineHeight: 1.7,
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* What gets checked */}
      <section style={{
        background: "var(--pa-surface)",
        padding: "64px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <h2 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--pa-text)",
          marginBottom: "32px",
        }}>
          What the engine checks at each link
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
          {CHECKS.map((c) => (
            <div key={c.domain} style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              padding: "16px",
              borderRadius: "8px",
              background: "var(--pa-cream)",
              border: "1px solid var(--pa-border)",
            }}>
              <span style={{
                background: "var(--pa-accent)",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "3px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                flexShrink: 0,
                fontFamily: "var(--font-lora), Georgia, serif",
              }}>
                {c.domain}
              </span>
              <span style={{
                color: "var(--pa-muted)",
                fontSize: "0.875rem",
                fontFamily: "var(--font-lora), Georgia, serif",
                lineHeight: 1.5,
              }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        background: "var(--pa-dark)",
        padding: "80px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--pa-cream)",
          marginBottom: "16px",
        }}>
          Start with a demo chain
        </h2>
        <p style={{
          color: "rgba(253,246,236,0.55)",
          marginBottom: "36px",
          maxWidth: "440px",
          margin: "0 auto 36px",
          fontFamily: "var(--font-lora), Georgia, serif",
          fontSize: "1rem",
          lineHeight: 1.6,
        }}>
          See how the engine evaluates a full speaker system or headphone chain in seconds.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/builder?demo=speaker" style={{
            background: "var(--pa-accent)",
            color: "#fff",
            fontFamily: "var(--font-lora), Georgia, serif",
            fontWeight: 500,
            fontSize: "0.9rem",
            padding: "12px 28px",
            borderRadius: "4px",
            textDecoration: "none",
            letterSpacing: "0.03em",
          }}>
            Speaker system demo
          </Link>
          <Link href="/builder?demo=headphone" style={{
            background: "var(--pa-accent)",
            color: "#fff",
            fontFamily: "var(--font-lora), Georgia, serif",
            fontWeight: 500,
            fontSize: "0.9rem",
            padding: "12px 28px",
            borderRadius: "4px",
            textDecoration: "none",
            letterSpacing: "0.03em",
          }}>
            Headphone chain demo
          </Link>
        </div>
      </section>
    </div>
  );
}
