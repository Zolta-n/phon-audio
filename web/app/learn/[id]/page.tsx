import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EXPLAINER_SLUGS,
  TIER_LABELS,
  getExplainer,
  type ExplainerTier,
} from "@/lib/explainers";

const TIER_ORDER: ExplainerTier[] = ["simple", "theory", "expert"];

export function generateStaticParams() {
  return EXPLAINER_SLUGS.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getExplainer(id);
  if (!entry) return { title: "Not found — Phon.Audio" };
  return {
    title: `${entry.label} — Phon.Audio`,
    description: entry.summary,
    alternates: { canonical: `/learn/${entry.slug}` },
  };
}

export default async function LearnParameterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getExplainer(id);
  if (!entry) notFound();

  return (
    <article
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "56px 24px 80px",
      }}
    >
      {/* Breadcrumb */}
      <Link
        href="/learn"
        style={{
          color: "var(--pa-muted)",
          textDecoration: "none",
          fontSize: "0.8rem",
          letterSpacing: "0.05em",
          fontFamily: "var(--pa-font-ui)",
        }}
      >
        ← All parameters
      </Link>

      {/* Group kicker */}
      <div className="pa-kicker" style={{ marginTop: "28px", marginBottom: "10px" }}>
        <span>{entry.group}</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "var(--pa-font-display)",
          fontSize: "2.4rem",
          fontWeight: 500,
          lineHeight: 1.1,
          color: "var(--pa-text)",
          margin: "0 0 14px",
        }}
      >
        {entry.label}
      </h1>

      <p
        style={{
          fontSize: "1.15rem",
          lineHeight: 1.6,
          fontStyle: "italic",
          color: "var(--pa-muted)",
          marginBottom: "44px",
        }}
      >
        {entry.summary}
      </p>

      {/* Tiers */}
      {TIER_ORDER.map((tier) => (
        <section key={tier} style={{ marginBottom: "36px" }}>
          <h2
            style={{
              fontFamily: "var(--pa-font-ui)",
              fontSize: "0.66rem",
              fontWeight: 700,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "var(--pa-accent2)",
              borderBottom: "1px solid var(--pa-border)",
              paddingBottom: "8px",
              marginBottom: "14px",
            }}
          >
            {TIER_LABELS[tier]}
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              lineHeight: 1.7,
              color: "var(--pa-list-text)",
            }}
          >
            {entry[tier]}
          </p>
        </section>
      ))}

      {/* CTA back to the tool */}
      <div
        style={{
          marginTop: "52px",
          paddingTop: "28px",
          borderTop: "1px solid var(--pa-border)",
        }}
      >
        <Link href="/builder" className="pa-btn pa-btn-primary" style={{ padding: "13px 28px" }}>
          Check this in your chain →
        </Link>
      </div>
    </article>
  );
}
