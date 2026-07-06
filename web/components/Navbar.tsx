import Link from "next/link";
import AuthButton from "./AuthButton";

export default function Navbar() {
  return (
    <header style={{
      background: "rgba(20,11,0,0.96)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      borderBottom: "1px solid rgba(217,119,6,0.25)",
    }}>
      <div className="pa-container" style={{
        padding: "0 56px",
        height: "var(--pa-nav-h)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--pa-font-display)",
          fontSize: "1.45rem",
          fontWeight: 500,
          color: "var(--pa-cream)",
          textDecoration: "none",
          letterSpacing: "0.06em",
        }}>
          Phon<span style={{ color: "var(--pa-accent)" }}>.</span>Audio
        </Link>
        <nav style={{ display: "flex", gap: "40px", alignItems: "center" }}>
          <Link href="/builder" className="pa-navlink">Compatibility</Link>
          <Link href="/components" className="pa-navlink">Components</Link>
          <Link href="/learn" className="pa-navlink">Learn</Link>
          <AuthButton />
          <Link href="/builder" className="pa-btn pa-btn-outline-light" style={{ padding: "13px 26px", letterSpacing: "0.22em", fontSize: "0.72rem", fontWeight: 400 }}>
            Build Your Chain
          </Link>
        </nav>
      </div>
    </header>
  );
}
