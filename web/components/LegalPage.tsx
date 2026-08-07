import type { ReactNode } from "react";

/**
 * Shared shell for the long-form legal pages (privacy, terms, disclosure).
 * Keeps the header band, measure and "last updated" line identical across
 * them so the three read as one document set.
 */
export default function LegalPage({
  kicker,
  title,
  lede,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  /** ISO date (YYYY-MM-DD) this document was last revised. */
  updated: string;
  children: ReactNode;
}) {
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div style={{ minHeight: "calc(100vh - var(--pa-nav-h))" }}>
      <div className="pa-page-header pa-page-header--glow-left" style={{ padding: "44px 56px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", position: "relative" }}>
          <div className="pa-kicker" style={{ marginBottom: "14px" }}>
            <span>{kicker}</span>
          </div>
          <h1
            style={{
              fontFamily: "var(--pa-font-display)",
              fontSize: "2.4rem",
              fontWeight: 500,
              color: "var(--pa-text-on-dark)",
              margin: "0 0 10px",
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--pa-lede)", margin: 0, fontStyle: "italic" }}>
            {lede}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 56px 96px", boxSizing: "border-box" }}>
        <p
          style={{
            fontFamily: "var(--pa-font-ui)",
            fontSize: "0.66rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--pa-muted)",
            margin: "0 0 28px",
          }}
        >
          Last updated <time dateTime={updated}>{updatedLabel}</time>
        </p>
        <div className="pa-prose">{children}</div>
      </div>
    </div>
  );
}
