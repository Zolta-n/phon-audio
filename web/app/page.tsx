import Link from "next/link";
import { getComponents } from "@/lib/getComponents";

export default async function HomePage() {
  const catalog = await getComponents();
  const componentCount = catalog.length;
  const brandCount = new Set(catalog.map((c) => c.manufacturer ?? "Other")).size;

  return (
    <div>
      {/* ═══ HERO ═══ */}
      <section style={{
        minHeight: "60vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Background gradient */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #1a0f00 0%, #3d2200 40%, #5c3a1e 70%, #2d1a0a 100%)",
        }} />
        {/* Warm overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(180,100,20,0.35)",
        }} />
        {/* Light rays */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(217,119,6,0.18) 0%, transparent 70%)",
        }} />

        {/* Content wrap: text left, SVG right */}
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: "80px",
          padding: "80px",
          maxWidth: "var(--pa-container)",
          width: "100%",
        }}>
          {/* Left text */}
          <div style={{ flex: 1, maxWidth: "520px" }}>
            <div className="pa-eyebrow" style={{
              letterSpacing: "0.2em",
              color: "var(--pa-accent)",
              marginBottom: "18px",
            }}>
              Audiophile Compatibility Engine
            </div>
            <h1 style={{
              fontFamily: "var(--pa-font-serif)",
              fontSize: "3.5rem",
              fontWeight: "normal",
              lineHeight: 1.15,
              color: "#faf5ee",
              marginBottom: "22px",
            }}>
              Hear more.<br />
              <em style={{ fontStyle: "italic", color: "var(--pa-gold)" }}>Pair better.</em>
            </h1>
            <p style={{
              fontSize: "1.1rem",
              lineHeight: 1.7,
              color: "#d4b896",
              marginBottom: "40px",
              maxWidth: "400px",
              fontFamily: "var(--pa-font-ui)",
            }}>
              The compatibility engine for serious audio systems.
              Every connection, every impedance, every watt —
              verified before you invest.
            </p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link href="/builder" className="pa-btn pa-btn-primary" style={{ padding: "14px 28px", fontSize: "1rem" }}>
                Build Your Chain
              </Link>
              <Link href="#how" className="pa-btn pa-btn-outline-light" style={{ padding: "13px 28px", fontSize: "1rem", fontWeight: 400 }}>
                See how it works
              </Link>
            </div>

            {/* Trust stats */}
            <div style={{
              marginTop: "24px",
              display: "flex",
              gap: "28px",
              alignItems: "center",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pa-font-serif)", fontSize: "1.6rem", color: "var(--pa-gold)" }}>{componentCount}</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8916d", marginTop: "2px", fontFamily: "var(--pa-font-ui)" }}>Components</div>
              </div>
              <div style={{ width: "1px", height: "36px", background: "rgba(250,245,238,0.15)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pa-font-serif)", fontSize: "1.6rem", color: "var(--pa-gold)" }}>{brandCount}</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8916d", marginTop: "2px", fontFamily: "var(--pa-font-ui)" }}>Brands</div>
              </div>
              <div style={{ width: "1px", height: "36px", background: "rgba(250,245,238,0.15)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--pa-font-serif)", fontSize: "1.6rem", color: "var(--pa-gold)" }}>Free</div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a8916d", marginTop: "2px", fontFamily: "var(--pa-font-ui)" }}>No signup</div>
              </div>
            </div>
          </div>

          {/* Right: Hero SVG illustration */}
          <div style={{ flexShrink: 0, width: "420px" }}>
            <svg width="420" height="340" viewBox="0 0 420 340" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="warmGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </radialGradient>
                <filter id="warmBlur">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Room glow */}
              <ellipse cx="210" cy="180" rx="190" ry="140" fill="url(#warmGlow)" />

              {/* Room label */}
              <text x="210" y="30" textAnchor="middle" fill="#d97706" fontSize="11" fontFamily="Georgia, serif" letterSpacing="1">Reference Listening Setup</text>

              {/* Isometric room floor (trapezoid) */}
              <polygon points="70,260 350,260 400,140 20,140" fill="rgba(92,58,30,0.3)" stroke="#a87940" strokeWidth={1.5} strokeDasharray="4,3" opacity={0.6} />
              {/* Floor fill on top */}
              <polygon points="70,260 350,260 400,140 20,140" fill="rgba(92,58,30,0.15)" />

              {/* Back wall */}
              <line x1="20" y1="140" x2="400" y2="140" stroke="#a87940" strokeWidth={1.5} opacity={0.8} />
              {/* Left wall */}
              <line x1="20" y1="140" x2="70" y2="260" stroke="#a87940" strokeWidth={1} opacity={0.5} />
              {/* Right wall */}
              <line x1="400" y1="140" x2="350" y2="260" stroke="#a87940" strokeWidth={1} opacity={0.5} />

              {/* Left speaker */}
              <rect x="40" y="100" width="36" height="60" rx={5} fill="#2d1a0a" stroke="#d97706" strokeWidth={1.5} />
              <ellipse cx="58" cy="122" rx="11" ry="11" fill="#3d2200" stroke="#d97706" strokeWidth={1} />
              <ellipse cx="58" cy="122" rx="5" ry="5" fill="#92400e" />
              <ellipse cx="58" cy="142" rx="6" ry="6" fill="#3d2200" stroke="#a87940" strokeWidth={0.75} />
              <text x="58" y="170" textAnchor="middle" fill="#a87940" fontSize="9" fontFamily="monospace">L</text>

              {/* Right speaker */}
              <rect x="344" y="100" width="36" height="60" rx={5} fill="#2d1a0a" stroke="#d97706" strokeWidth={1.5} />
              <ellipse cx="362" cy="122" rx="11" ry="11" fill="#3d2200" stroke="#d97706" strokeWidth={1} />
              <ellipse cx="362" cy="122" rx="5" ry="5" fill="#92400e" />
              <ellipse cx="362" cy="142" rx="6" ry="6" fill="#3d2200" stroke="#a87940" strokeWidth={0.75} />
              <text x="362" y="170" textAnchor="middle" fill="#a87940" fontSize="9" fontFamily="monospace">R</text>

              {/* Listening chair */}
              {/* Chair back */}
              <rect x="191" y="200" width="38" height="36" rx={8} fill="#3d2200" stroke="#a87940" strokeWidth={1.5} />
              {/* Chair seat */}
              <ellipse cx="210" cy="240" rx="24" ry="12" fill="#3d2200" stroke="#a87940" strokeWidth={1.5} />
              {/* Head */}
              <circle cx="210" cy="185" r="16" fill="#2d1a0a" stroke="#a87940" strokeWidth={1.5} />
              {/* Ear position dashed circle */}
              <circle cx="210" cy="185" r="6" fill="none" stroke="#d97706" strokeWidth={1} strokeDasharray="3,2" />

              {/* Component stack (DAC + AMP) */}
              <rect x="80" y="180" width="60" height="30" rx={4} fill="#1a0f00" stroke="#d97706" strokeWidth={1.5} />
              <text x="110" y="192" textAnchor="middle" fill="#d97706" fontSize="8" fontFamily="monospace" letterSpacing="0.5">DAC</text>
              <text x="110" y="204" textAnchor="middle" fill="#a87940" fontSize="8" fontFamily="var(--pa-font-ui)">Modi 5</text>

              <rect x="80" y="216" width="60" height="30" rx={4} fill="#1a0f00" stroke="#d97706" strokeWidth={1.5} />
              <text x="110" y="228" textAnchor="middle" fill="#d97706" fontSize="8" fontFamily="monospace" letterSpacing="0.5">AMP</text>
              <text x="110" y="240" textAnchor="middle" fill="#a87940" fontSize="8" fontFamily="var(--pa-font-ui)">Asgard X</text>

              {/* Curved connector lines from stack to speakers */}
              <path d="M 140,185 C 170,150 210,138 330,135" stroke="#d97706" strokeWidth={1.5} fill="none" strokeDasharray="5,4" opacity={0.7} filter="url(#warmBlur)" />
              <path d="M 140,185 C 110,150 85,138 76,132" stroke="#d97706" strokeWidth={1.5} fill="none" strokeDasharray="5,4" opacity={0.7} filter="url(#warmBlur)" />

              {/* Sound wave arcs from speakers to listener */}
              <path d="M 76,130 Q 140,155 200,185" stroke="#fbbf24" strokeWidth={1} fill="none" opacity={0.3} />
              <path d="M 76,130 Q 135,170 198,192" stroke="#fbbf24" strokeWidth={0.75} fill="none" opacity={0.2} />
              <path d="M 344,130 Q 280,155 220,185" stroke="#fbbf24" strokeWidth={1} fill="none" opacity={0.3} />
              <path d="M 344,130 Q 285,170 222,192" stroke="#fbbf24" strokeWidth={0.75} fill="none" opacity={0.2} />

              {/* Headphone icon */}
              <text x="250" y="170" fill="#a87940" fontSize="30" textAnchor="middle" opacity={0.7}>&#127911;</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ GALLERY STRIP ═══ */}
      <section style={{
        background: "var(--pa-surface)",
        padding: "52px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <p className="pa-eyebrow" style={{ letterSpacing: "0.18em", marginBottom: "24px" }}>
          The listening experience
        </p>
        <div style={{ display: "flex", gap: "20px" }}>
          {[
            { label: "Turntable closeup", bg: "radial-gradient(ellipse at 40% 60%, #c47c2a 0%, #6b3a10 40%, #1a0c04 100%)" },
            { label: "Amplifier glow", bg: "radial-gradient(ellipse at 50% 70%, #d4820a 0%, #7a3a08 30%, #0d0805 100%)" },
            { label: "Listening room", bg: "linear-gradient(160deg, #8b5e2a 0%, #3d2008 50%, #1a0e06 100%)" },
          ].map(thumb => (
            <div key={thumb.label} style={{
              width: "280px",
              height: "180px",
              borderRadius: "var(--pa-radius-md)",
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
              border: "1px solid var(--pa-border)",
              background: thumb.bg,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}>
              <span style={{
                position: "absolute",
                bottom: "10px",
                left: 0,
                right: 0,
                textAlign: "center",
                color: "rgba(255,255,255,0.14)",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                fontFamily: "var(--pa-font-ui)",
              }}>
                {thumb.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" style={{
        background: "var(--pa-bg)",
        padding: "84px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <h2 style={{
          fontFamily: "var(--pa-font-serif)",
          fontSize: "2.1rem",
          fontWeight: 700,
          color: "var(--pa-text)",
          marginBottom: "52px",
          letterSpacing: "-0.01em",
        }}>
          How it works
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "48px",
        }}>
          {[
            { num: "01", title: "Add your components", body: "Search our library of thousands of DACs, amplifiers, speakers, and cables. Add what you own or what you\u2019re considering." },
            { num: "02", title: "Build the signal chain", body: "Connect components visually. Phon.Audio checks impedance, gain staging, and compatibility as you build." },
            { num: "03", title: "Refine and compare", body: "Swap components, compare chains side-by-side, and get recommendations tuned to your listening preferences." },
          ].map(step => (
            <div key={step.num} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{
                fontFamily: "var(--pa-font-serif)",
                fontSize: "3.2rem",
                fontWeight: 700,
                color: "var(--pa-accent)",
                lineHeight: 1,
              }}>
                {step.num}
              </div>
              <div style={{
                fontFamily: "var(--pa-font-serif)",
                fontSize: "1.15rem",
                fontWeight: 600,
                color: "var(--pa-text)",
              }}>
                {step.title}
              </div>
              <p style={{
                fontSize: "0.9rem",
                color: "var(--pa-muted)",
                lineHeight: 1.65,
                fontFamily: "var(--pa-font-ui)",
              }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BUILDER PREVIEW ═══ */}
      <section style={{
        background: "var(--pa-surface)",
        padding: "84px 80px",
        borderTop: "1px solid var(--pa-border)",
      }}>
        <h2 style={{
          fontFamily: "var(--pa-font-serif)",
          fontSize: "2.1rem",
          fontWeight: 700,
          color: "var(--pa-text)",
          marginBottom: "52px",
          letterSpacing: "-0.01em",
        }}>
          The chain builder
        </h2>
        <div style={{
          background: "var(--pa-bg)",
          border: "1px solid var(--pa-border)",
          borderRadius: "var(--pa-radius-lg)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "200px 1fr 180px",
        }}>
          {/* Sidebar */}
          <div style={{ borderRight: "1px solid var(--pa-border)", padding: "20px 0" }}>
            <div style={{
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--pa-muted)",
              padding: "0 16px 12px",
              borderBottom: "1px solid var(--pa-border)",
              marginBottom: "8px",
              fontFamily: "var(--pa-font-ui)",
            }}>
              Components
            </div>
            {[
              { name: "Schiit Modi 3+", active: true },
              { name: "Schiit Magni", active: false },
              { name: "Focal Clear MG", active: false },
              { name: "Cardas Clear Cable", active: false },
            ].map(item => (
              <div key={item.name} style={{
                padding: "9px 16px",
                fontSize: "0.82rem",
                color: item.active ? "var(--pa-accent)" : "var(--pa-text)",
                fontWeight: item.active ? 500 : 400,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: item.active ? "var(--pa-accent-soft)" : "transparent",
                fontFamily: "var(--pa-font-ui)",
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: item.active ? "var(--pa-accent)" : "var(--pa-border)",
                }} />
                {item.name}
              </div>
            ))}
          </div>

          {/* Chain canvas */}
          <div style={{
            padding: "36px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0,
          }}>
            {[
              { label: "Source", name: "DAC", active: true },
              { label: "Amplifier", name: "Amp", active: false },
              { label: "Output", name: "Speakers", active: false },
            ].map((node, i) => (
              <div key={node.name} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <div style={{
                  background: node.active ? "rgba(217,119,6,0.06)" : "var(--pa-bg)",
                  border: `1.5px solid ${node.active ? "var(--pa-accent)" : "var(--pa-border)"}`,
                  borderRadius: "var(--pa-radius-md)",
                  padding: "14px 20px",
                  textAlign: "center",
                  minWidth: "90px",
                }}>
                  <div style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--pa-muted)",
                    marginBottom: "4px",
                    fontFamily: "var(--pa-font-ui)",
                  }}>
                    {node.label}
                  </div>
                  <div style={{
                    fontFamily: "var(--pa-font-serif)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: node.active ? "var(--pa-accent2)" : "var(--pa-text)",
                  }}>
                    {node.name}
                  </div>
                </div>
                {i < 2 && (
                  <div style={{
                    width: "44px",
                    height: "2px",
                    background: "var(--pa-border)",
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute",
                      right: "-1px",
                      top: "-4px",
                      width: 0,
                      height: 0,
                      borderLeft: "8px solid var(--pa-border)",
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{
            borderLeft: "1px solid var(--pa-border)",
            padding: "24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            {[
              { label: "Output Level", value: "\u22124.2 dB", pct: 68 },
              { label: "Gain Stage", value: "Low", pct: 45 },
            ].map(ctrl => (
              <div key={ctrl.label}>
                <span style={{
                  fontSize: "0.72rem",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--pa-muted)",
                  marginBottom: "6px",
                  display: "block",
                  fontFamily: "var(--pa-font-ui)",
                }}>
                  {ctrl.label}
                </span>
                <div style={{
                  width: "100%",
                  height: "4px",
                  background: "var(--pa-border)",
                  borderRadius: "2px",
                  marginTop: "6px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    borderRadius: "2px",
                    background: "var(--pa-accent)",
                    width: `${ctrl.pct}%`,
                  }} />
                </div>
                <div style={{
                  fontSize: "0.8rem",
                  color: "var(--pa-text)",
                  fontWeight: 500,
                  marginTop: "4px",
                  fontFamily: "var(--pa-font-ui)",
                }}>
                  {ctrl.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link href="/builder" className="pa-btn pa-btn-primary" style={{ padding: "14px 32px", fontSize: "1rem", letterSpacing: "0.04em" }}>
            Start Building
          </Link>
        </div>
      </section>
    </div>
  );
}
