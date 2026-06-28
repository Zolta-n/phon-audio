"use client";
import Link from "next/link";
import type { UIComponent } from "@/types";
import { CATEGORY_BADGE } from "@/types";

const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", dac: "#d97706", preamp: "#b45309",
  power_amp: "#7a3a08", integrated: "#8b4f20", headphone_amp: "#b45309",
  speaker: "#16a34a", headphone: "#16a34a",
};

function portSummary(c: UIComponent): string {
  const ins = (c.inputs ?? []).map(p => p.connector).filter(Boolean);
  const outs = (c.outputs ?? []).map(p => p.connector).filter(Boolean);
  const parts: string[] = [];
  if (ins.length) parts.push(`In: ${[...new Set(ins)].join(", ").toUpperCase()}`);
  if (outs.length) parts.push(`Out: ${[...new Set(outs)].join(", ").toUpperCase()}`);
  return parts.join(" \u00B7 ");
}

export default function ComponentCard({ component }: { component: UIComponent }) {
  const badge = CATEGORY_BADGE[component.category] ?? "?";
  const color = CAT_COLOR[component.category] ?? "#7a5c3a";
  const summary = portSummary(component);

  return (
    <Link href={`/components/${component.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        background: "var(--pa-bg)",
        border: "1px solid var(--pa-border)",
        borderRadius: "10px",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "#d97706";
          e.currentTarget.style.boxShadow = "0 2px 12px rgba(217,119,6,0.12)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--pa-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#fff",
            background: color,
            padding: "2px 7px",
            borderRadius: "4px",
            fontFamily: "var(--pa-font-ui)",
            fontWeight: 600,
          }}>
            {badge}
          </span>
          {component.manufacturer && (
            <span style={{
              fontSize: "0.72rem",
              color: "var(--pa-muted)",
              fontFamily: "var(--pa-font-ui)",
            }}>
              {component.manufacturer}
            </span>
          )}
        </div>
        <div style={{
          fontFamily: "Georgia, serif",
          fontSize: "1rem",
          fontWeight: 600,
          color: "var(--pa-text)",
          lineHeight: 1.3,
        }}>
          {component.name}
        </div>
        {summary && (
          <div style={{
            fontSize: "0.72rem",
            color: "var(--pa-muted)",
            fontFamily: "monospace",
          }}>
            {summary}
          </div>
        )}
      </div>
    </Link>
  );
}
