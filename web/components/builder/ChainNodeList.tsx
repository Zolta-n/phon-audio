"use client";

import type { ChainEntry } from "@/types";
import { CABLE_DEFS, CATEGORY_BADGE } from "@/types";

function CableConnector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingLeft: "40px", padding: "4px 0 4px 40px" }}>
      <div style={{ width: "1px", height: "16px", background: "var(--pa-border)" }} />
      <span style={{ color: "var(--pa-muted)", fontSize: "0.75rem" }}>↓</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: "0.75rem",
          border: "1px solid var(--pa-border)",
          borderRadius: "var(--pa-radius-sm)",
          padding: "4px 8px",
          background: "var(--pa-bg)",
          color: "var(--pa-text)",
          cursor: "pointer",
          fontFamily: "var(--pa-font-ui)",
        }}
      >
        {CABLE_DEFS.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Compact chain node list: cable editing, insert-between, and remove. */
export default function ChainNodeList({
  chain,
  insertAtIdx,
  onToggleInsertAt,
  onRemoveAt,
  onSetCableAt,
}: {
  chain: ChainEntry[];
  insertAtIdx: number | null;
  onToggleInsertAt: (idx: number) => void;
  onRemoveAt: (idx: number) => void;
  onSetCableAt: (idx: number, cableId: string) => void;
}) {
  return (
    <div style={{ marginBottom: "12px", flex: 1 }}>
      {chain.map((entry, i) => (
        <div key={`${entry.component.id}-${i}`}>
          {/* Node card */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "1px solid var(--pa-border)",
            borderRadius: "var(--pa-radius-md)",
            padding: "10px 12px",
            background: "var(--pa-surface)",
          }}>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              background: "var(--pa-accent)",
              color: "#fff",
              padding: "2px 8px",
              borderRadius: "var(--pa-radius-sm)",
              flexShrink: 0,
              fontFamily: "var(--pa-font-ui)",
              letterSpacing: "0.04em",
            }}>
              {CATEGORY_BADGE[entry.component.category]}
            </span>
            <span style={{
              flex: 1,
              fontSize: "0.875rem",
              color: "var(--pa-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--pa-font-ui)",
            }}>
              {entry.component.name}
            </span>
            <button
              onClick={() => onRemoveAt(i)}
              style={{
                color: "var(--pa-muted)",
                background: "none",
                border: "none",
                fontSize: "1.2rem",
                lineHeight: 1,
                padding: "0 4px",
                cursor: "pointer",
              }}
              title="Remove"
            >
              ×
            </button>
          </div>

          {/* Cable connector + insert button (between nodes) */}
          {i < chain.length - 1 && (
            <div style={{ display: "flex", alignItems: "center" }}>
              <CableConnector
                value={entry.cableId}
                onChange={(id) => onSetCableAt(i, id)}
              />
              <button
                onClick={() => onToggleInsertAt(i + 1)}
                title="Insert component here"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  border: insertAtIdx === i + 1 ? "2px solid var(--pa-accent)" : "1px solid var(--pa-border)",
                  background: insertAtIdx === i + 1 ? "var(--pa-accent)" : "var(--pa-surface)",
                  color: insertAtIdx === i + 1 ? "#fff" : "var(--pa-muted)",
                  fontSize: "1rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginLeft: "6px",
                }}
              >
                +
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
