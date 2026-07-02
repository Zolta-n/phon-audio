"use client";
import Link from "next/link";
import type { UIComponent } from "@/types";
import { CATEGORY_BADGE } from "@/types";

const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", dac: "#d97706", preamp: "#b45309",
  power_amp: "#7a3a08", tube_amp_se: "#8b3a5c", tube_amp_pp: "#6b3a6b",
  integrated: "#8b4f20", headphone_amp: "#b45309",
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

export default function ComponentCard({ component, isFavorite, onToggleFavorite }: {
  component: UIComponent;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const badge = CATEGORY_BADGE[component.category] ?? "?";
  const color = CAT_COLOR[component.category] ?? "#7a5c3a";
  const summary = portSummary(component);

  return (
    <Link href={`/components/${component.id}`} style={{ textDecoration: "none" }}>
      <div className="pa-card pa-card--interactive" style={{
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: "pointer",
        position: "relative",
      }}>
        {onToggleFavorite && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(component.id); }}
            className={isFavorite ? "pa-fav pa-fav--active" : "pa-fav"}
            style={{ position: "absolute", top: 8, right: 8 }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "\u2665" : "\u2661"}
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="pa-badge" style={{ color: "#fff", background: color }}>
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
          fontFamily: "var(--pa-font-serif)",
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
