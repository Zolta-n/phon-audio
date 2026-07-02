import Link from "next/link";
import AuthButton from "./AuthButton";

export default function Navbar() {
  return (
    <header style={{
      background: "rgba(26,15,0,0.96)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderBottom: "1px solid rgba(217,119,6,0.15)",
    }}>
      <div className="pa-container" style={{
        padding: "0 48px",
        height: "var(--pa-nav-h)",
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
          <Link href="/builder" className="pa-navlink">Compatibility</Link>
          <Link href="/components" className="pa-navlink">Components</Link>
          <Link href="/learn" className="pa-navlink">Learn</Link>
          <AuthButton />
          <Link href="/builder" className="pa-btn pa-btn-primary" style={{ padding: "9px 22px", letterSpacing: "0.04em" }}>
            Build Your Chain
          </Link>
        </nav>
      </div>
    </header>
  );
}
