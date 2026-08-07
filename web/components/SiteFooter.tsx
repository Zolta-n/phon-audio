import Link from "next/link";
import { AMAZON_DISCLOSURE } from "@/lib/legal";

const LINKS = [
  { href: "/components", label: "Components" },
  { href: "/learn", label: "Learn" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/disclosure", label: "Disclosure" },
];

/**
 * Site-wide footer. Carries the Amazon Associates disclosure, which the
 * Operating Agreement requires to appear clearly and conspicuously on the site
 * itself rather than only inside a linked legal page.
 */
export default function SiteFooter() {
  return (
    <footer
      style={{
        background: "var(--pa-dark)",
        color: "rgba(253,246,236,0.55)",
        padding: "40px 24px 32px",
        fontFamily: "var(--pa-font-ui)",
      }}
    >
      <div style={{ maxWidth: "var(--pa-container)", margin: "0 auto", textAlign: "center" }}>
        <nav
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "10px 26px",
            marginBottom: "22px",
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                color: "rgba(253,246,236,0.62)",
                fontSize: "0.68rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p
          style={{
            fontFamily: "var(--pa-font-serif)",
            fontSize: "0.8rem",
            lineHeight: 1.6,
            color: "rgba(253,246,236,0.5)",
            maxWidth: "620px",
            margin: "0 auto 18px",
          }}
        >
          {AMAZON_DISCLOSURE}{" "}
          <Link href="/disclosure" style={{ color: "rgba(217,119,6,0.9)" }}>
            How this works
          </Link>
        </p>

        <p
          style={{
            fontSize: "0.68rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(253,246,236,0.35)",
            margin: 0,
          }}
        >
          Phon<span style={{ color: "rgba(217,119,6,0.7)" }}>.</span>Audio — High-fidelity signal
          chain design © 2026
        </p>
      </div>
    </footer>
  );
}
