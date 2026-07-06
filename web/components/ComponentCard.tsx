"use client";
import Link from "next/link";
import type { UIComponent } from "@/types";
import { CATEGORY_BADGE } from "@/types";

const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", turntable: "#7a5c3a", dac: "#9b4f0a", preamp: "#7a3d10",
  power_amp: "#5c2f08", tube_amp_se: "#5c2f08", tube_amp_pp: "#5c2f08",
  integrated: "#5c2f08", headphone_amp: "#7a3d10",
  speaker: "#3d5c1e", headphone: "#3d5c1e",
};

function portSummary(c: UIComponent): string {
  const ins = (c.inputs ?? []).map(p => p.connector).filter(Boolean);
  const outs = (c.outputs ?? []).map(p => p.connector).filter(Boolean);
  const parts: string[] = [];
  if (ins.length) parts.push(`In: ${[...new Set(ins)].join(", ").toUpperCase()}`);
  if (outs.length) parts.push(`Out: ${[...new Set(outs)].join(", ").toUpperCase()}`);
  return parts.join(" · ");
}

export default function ComponentCard({ component, isFavorite, onToggleFavorite, index = 0 }: {
  component: UIComponent;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
}) {
  const badge = CATEGORY_BADGE[component.category] ?? "?";
  const color = CAT_COLOR[component.category] ?? "#7a5c3a";
  const summary = portSummary(component);

  return (
    <Link href={`/components/${component.id}`} style={{ textDecoration: "none" }}>
      <div className="pa-card pa-card--interactive pa-fade-up" style={{
        padding: "22px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        cursor: "pointer",
        position: "relative",
        animationDelay: `${0.05 + (index % 4) * 0.07}s`,
      }}>
        {onToggleFavorite && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(component.id); }}
            className={isFavorite ? "pa-fav pa-fav--active" : "pa-fav"}
            style={{ position: "absolute", top: 12, right: 14, fontSize: "1rem" }}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? "♥" : "♡"}
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="pa-badge" style={{ color: "var(--pa-cream)", background: color }}>
            {badge}
          </span>
          {component.manufacturer && (
            <span style={{
              fontSize: "0.68rem",
              color: "var(--pa-muted)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "var(--pa-font-ui)",
            }}>
              {component.manufacturer}
            </span>
          )}
        </div>
        <div style={{
          fontFamily: "var(--pa-font-display)",
          fontSize: "1.2rem",
          fontWeight: 500,
          color: "var(--pa-text)",
          lineHeight: 1.25,
        }}>
          {component.name}
        </div>
        {summary && (
          <div style={{
            fontSize: "0.7rem",
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
