import type { Metadata } from "next";
import Link from "next/link";
import { explainersByGroup } from "@/lib/explainers";

export const metadata: Metadata = {
  title: "Learn — Audio Signal Chain Parameters | Phon.Audio",
  description:
    "Plain-language to expert explanations of every electrical parameter that determines audio gear compatibility: impedance bridging, damping factor, gain staging, power headroom, and more.",
  alternates: { canonical: "/learn" },
};

export default function LearnIndexPage() {
  const groups = explainersByGroup();

  return (
    <div style={{ maxWidth: "880px", margin: "0 auto", padding: "56px 24px 80px" }}>
      <p
        style={{
          color: "var(--pa-accent)",
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--pa-font-ui)",
        }}
      >
        Reference
      </p>
      <h1
        style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "2.6rem",
          lineHeight: 1.1,
          color: "var(--pa-text)",
          margin: "6px 0 14px",
        }}
      >
        The parameters, explained
      </h1>
      <p
        style={{
          fontFamily: "var(--font-lora), Georgia, serif",
          fontSize: "1.15rem",
          lineHeight: 1.6,
          color: "var(--pa-muted)",
          maxWidth: "620px",
          marginBottom: "48px",
        }}
      >
        Every check the engine runs, plus the room and listening settings that
        feed it — each one explained three ways, from plain-language to the
        nerd-level detail.
      </p>

      {groups.map(({ group, items }) => (
        <section key={group} style={{ marginBottom: "44px" }}>
          <h2
            style={{
              fontFamily: "var(--pa-font-ui)",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--pa-accent2)",
              borderBottom: "1px solid var(--pa-border)",
              paddingBottom: "8px",
              marginBottom: "18px",
            }}
          >
            {group}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "12px",
            }}
          >
            {items.map((e) => (
              <Link
                key={e.slug}
                href={`/learn/${e.slug}`}
                style={{
                  display: "block",
                  background: "var(--pa-surface)",
                  border: "1px solid var(--pa-border)",
                  borderRadius: "var(--pa-radius-md)",
                  padding: "16px 18px",
                  textDecoration: "none",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-playfair), Georgia, serif",
                    fontSize: "1.1rem",
                    color: "var(--pa-text)",
                    marginBottom: "5px",
                  }}
                >
                  {e.label}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-lora), Georgia, serif",
                    fontSize: "0.9rem",
                    lineHeight: 1.45,
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
