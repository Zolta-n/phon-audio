"use client";

import type { ChainEntry } from "@/types";
import { CABLE_DEFS } from "@/types";

/** Connections panel: one row per link with cable selection + insert-between.
 *  Node removal lives on the rack cards (ChainDiagram), not here. */
export default function ChainNodeList({
  chain,
  insertAtIdx,
  onToggleInsertAt,
  onSetCableAt,
}: {
  chain: ChainEntry[];
  insertAtIdx: number | null;
  onToggleInsertAt: (idx: number) => void;
  onSetCableAt: (idx: number, cableId: string) => void;
}) {
  if (chain.length < 2) return null;

  return (
    <div style={{
      border: "1px solid var(--pa-border)",
      borderRadius: "10px",
      background: "var(--pa-inset)",
      padding: "18px 20px",
      marginBottom: "22px",
    }}>
      <div style={{
        fontSize: "0.56rem",
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: "var(--pa-accent2)",
        fontWeight: 700,
        fontFamily: "var(--pa-font-ui)",
        marginBottom: "10px",
      }}>
        Connections
      </div>
      {chain.slice(0, -1).map((entry, i) => (
        <div
          key={`${entry.component.id}-${i}`}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0 6px 34px" }}
        >
          <div style={{ width: "1px", height: "18px", background: "var(--pa-rail)", flexShrink: 0 }} />
          <span style={{ color: "var(--pa-accent2)", fontSize: "0.7rem", flexShrink: 0 }}>↳</span>
          <select
            value={entry.cableId}
            onChange={(e) => onSetCableAt(i, e.target.value)}
            title={`Cable: ${entry.component.name} → ${chain[i + 1].component.name}`}
            style={{
              fontSize: "0.72rem",
              border: "1px solid var(--pa-border-2)",
              borderRadius: "4px",
              padding: "5px 12px",
              background: "var(--pa-panel)",
              color: "var(--pa-text)",
              letterSpacing: "0.04em",
              cursor: "pointer",
              fontFamily: "var(--pa-font-serif)",
              maxWidth: "280px",
            }}
          >
            {CABLE_DEFS.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            onClick={() => onToggleInsertAt(i + 1)}
            title="Insert component here"
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              border: insertAtIdx === i + 1 ? "1px solid var(--pa-accent)" : "1px solid var(--pa-border-2)",
              background: insertAtIdx === i + 1 ? "var(--pa-accent)" : "var(--pa-inset)",
              color: insertAtIdx === i + 1 ? "var(--pa-cream)" : "var(--pa-accent2)",
              fontSize: "0.9rem",
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            +
          </button>
          <span style={{
            fontSize: "0.66rem",
            color: "var(--pa-muted)",
            fontFamily: "var(--pa-font-ui)",
            letterSpacing: "0.04em",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}>
            {entry.component.name} → {chain[i + 1].component.name}
          </span>
        </div>
      ))}
    </div>
  );
}
