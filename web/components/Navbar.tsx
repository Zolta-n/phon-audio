import Link from "next/link";
import AuthButton from "./AuthButton";

export default function Navbar() {
  const linkStyle = { color: "#a08060", textDecoration: "none" as const, fontSize: "0.875rem", letterSpacing: "0.05em", fontFamily: "var(--pa-font-ui)" };

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
        <nav style={{ display: "flex", gap: "28px", alignItems: "center" }}>
          <Link href="/builder" style={linkStyle}>Compatibility</Link>
          <Link href="/components" style={linkStyle}>Components</Link>
          <Link href="/learn" style={linkStyle}>Learn</Link>
          <AuthButton />
          <Link href="/builder" style={{
            background: "var(--pa-accent)",
            color: "#fff",
            padding: "9px 22px",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            fontFamily: "var(--pa-font-ui)",
            letterSpacing: "0.04em",
          }}>
            Build Your Chain
          </Link>
        </nav>
      </div>
    </header>
  );
}
