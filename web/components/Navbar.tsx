import Link from "next/link";

export default function Navbar() {
  return (
    <header style={{
      background: "rgba(26,15,0,0.96)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderBottom: "1px solid rgba(201,111,18,0.15)",
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "0 48px",
        height: "68px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "var(--pa-cream)",
          textDecoration: "none",
          letterSpacing: "0.03em",
        }}>
          Phon<span style={{ color: "var(--pa-accent)" }}>.</span>Audio
        </Link>
        <nav style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <Link href="/builder" style={{ color: "#a08060", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.05em", fontFamily: "var(--font-lora), serif" }}>
            Compatibility
          </Link>
          <Link href="/" style={{ color: "#a08060", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.05em", fontFamily: "var(--font-lora), serif" }}>
            Components
          </Link>
          <Link href="#" style={{ color: "#a08060", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.05em", fontFamily: "var(--font-lora), serif" }}>
            Learn
          </Link>
          <Link href="#" style={{ color: "#a08060", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.05em", fontFamily: "var(--font-lora), serif" }}>
            Community
          </Link>
          <Link href="/builder" style={{
            background: "var(--pa-accent)",
            color: "#fff",
            padding: "9px 22px",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            fontFamily: "var(--font-lora), serif",
            letterSpacing: "0.04em",
          }}>
            Build Your Chain
          </Link>
        </nav>
      </div>
    </header>
  );
}
