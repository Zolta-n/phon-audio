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
      <div className="pa-card" style={{
        background: "#fff", padding: "28px",
        width: "100%", maxWidth: "400px", boxShadow: "var(--pa-shadow-lg)",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.1rem", color: "var(--pa-text)", marginBottom: "16px" }}>
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
          className="pa-input"
          style={{ marginBottom: "8px", boxSizing: "border-box" }}
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
          <button onClick={onCancel} className="pa-btn pa-btn-secondary" style={{ padding: "9px 20px", fontSize: "0.85rem", fontWeight: 400 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={saving} className="pa-btn pa-btn-primary" style={{ padding: "9px 24px", fontSize: "0.85rem" }}>
            {saving ? "Saving…" : "Save Chain"}
          </button>
        </div>
      </div>
    </div>
  );
}
