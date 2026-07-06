import type { Metadata } from "next";
import Link from "next/link";
import { explainersByGroup } from "@/lib/explainers";

export const metadata: Metadata = {
  title: "Learn — Audio Signal Chain Parameters | Phon.Audio",
  description:
    "Plain-language to expert explanations of every electrical parameter that determines audio gear compatibility: impedance bridging, damping factor, gain staging, power headroom, and more.",
  alternates: { canonical: "/learn" },
};

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];

export default function LearnIndexPage() {
  const groups = explainersByGroup();

  return (
    <div style={{ maxWidth: "920px", margin: "0 auto", padding: "72px 24px 96px" }}>
      <div className="pa-kicker pa-fade-up" style={{ marginBottom: "18px", animationDuration: "0.8s" }}>
        <span>Reference</span>
      </div>
      <h1
        className="pa-fade-up"
        style={{
          fontFamily: "var(--pa-font-display)",
          fontSize: "3.4rem",
          lineHeight: 1.08,
          color: "var(--pa-text)",
          margin: "0 0 18px",
          fontWeight: 500,
          animationDuration: "0.8s",
          animationDelay: "0.1s",
        }}
      >
        The parameters, <em style={{ color: "var(--pa-accent2)" }}>explained</em>
      </h1>
      <p
        className="pa-fade-up"
        style={{
          fontSize: "1.14rem",
          lineHeight: 1.8,
          color: "var(--pa-muted)",
          maxWidth: "640px",
          margin: "0 0 64px",
          animationDuration: "0.8s",
          animationDelay: "0.2s",
        }}
      >
        Every check the engine runs, plus the room and listening settings that
        feed it — each explained three ways, from plain language to nerd-level
        detail.
      </p>

      {groups.map(({ group, items }, gi) => (
        <section key={group} style={{ marginBottom: "52px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--pa-border)",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.26em",
                textTransform: "uppercase",
                color: "var(--pa-accent2)",
                margin: 0,
                fontFamily: "var(--pa-font-ui)",
              }}
            >
              {group}
            </h2>
            <span
              style={{
                fontFamily: "var(--pa-font-display)",
                fontStyle: "italic",
                color: "var(--pa-rail)",
                fontSize: "0.95rem",
              }}
            >
              {ROMAN[gi] ?? gi + 1}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
              gap: "14px",
            }}
          >
            {items.map((e) => (
              <Link
                key={e.slug}
                href={`/learn/${e.slug}`}
                className="pa-card pa-card--interactive"
                style={{
                  display: "block",
                  borderRadius: "10px",
                  padding: "22px 24px",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--pa-font-display)",
                    fontSize: "1.2rem",
                    color: "var(--pa-text)",
                    marginBottom: "7px",
                  }}
                >
                  {e.label}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                    color: "var(--pa-muted)",
                  }}
                >
                  {e.summary}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
