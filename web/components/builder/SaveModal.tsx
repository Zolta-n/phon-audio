"use client";

import type { ChainEntry } from "@/types";

/** Modal for naming and confirming a chain save. */
export default function SaveModal({
  chain,
  chainName,
  onChainNameChange,
  saving,
  saveMsg,
  onCancel,
  onConfirm,
}: {
  chain: ChainEntry[];
  chainName: string;
  onChainNameChange: (name: string) => void;
  saving: boolean;
  saveMsg: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onCancel}>
      <div style={{
        background: "#fff", borderRadius: "12px", padding: "28px",
        width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", color: "var(--pa-text)", marginBottom: "16px" }}>
          Save Chain
        </h3>
        <label style={{ fontSize: "0.78rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", display: "block", marginBottom: "6px" }}>
          Chain name
        </label>
        <input
          type="text"
          value={chainName}
          onChange={e => onChainNameChange(e.target.value)}
          placeholder="My audio chain"
          style={{
            width: "100%", padding: "10px 14px", fontSize: "0.88rem",
            border: "1.5px solid var(--pa-border)", borderRadius: "8px",
            background: "var(--pa-bg)", color: "var(--pa-text)",
            fontFamily: "var(--pa-font-ui)", outline: "none", marginBottom: "8px",
            boxSizing: "border-box",
          }}
          onKeyDown={e => e.key === "Enter" && onConfirm()}
          autoFocus
        />
        <p style={{ fontSize: "0.72rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", marginBottom: "16px" }}>
          {chain.length} components: {chain.map(e => e.component.name).join(" → ")}
        </p>
        {saveMsg && (
          <p style={{ fontSize: "0.78rem", color: saveMsg.includes("failed") ? "#c0392b" : "#166534", marginBottom: "12px", fontFamily: "var(--pa-font-ui)" }}>
            {saveMsg}
          </p>
        )}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            background: "var(--pa-bg)", color: "var(--pa-text)", border: "1.5px solid var(--pa-border)",
            padding: "9px 20px", borderRadius: "8px", fontSize: "0.85rem",
            fontFamily: "var(--pa-font-ui)", cursor: "pointer",
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving} style={{
            background: saving ? "#b45309" : "#d97706", color: "#fff", border: "none",
            padding: "9px 24px", borderRadius: "8px", fontSize: "0.85rem",
            fontWeight: 600, cursor: saving ? "wait" : "pointer",
            fontFamily: "var(--pa-font-ui)",
          }}>
            {saving ? "Saving…" : "Save Chain"}
          </button>
        </div>
      </div>
    </div>
  );
}
