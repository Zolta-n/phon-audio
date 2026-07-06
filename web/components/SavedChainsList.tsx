"use client";

import { useState } from "react";
import Link from "next/link";

interface ChainNode {
  position: number;
  component: { id: string; name: string; category: string; manufacturer?: string } | null;
}

export interface SavedChain {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  context: Record<string, unknown>;
  chain_nodes: ChainNode[];
}

const BADGE_COLORS: Record<string, string> = {
  source: "#7a5c3a", turntable: "#6b4423", dac: "var(--pa-accent)", preamp: "#9b4f0a",
  power_amp: "#7a3a08", tube_amp_se: "#8b3a5c", tube_amp_pp: "#6b3a6b",
  integrated: "#8b4f20", headphone_amp: "#9b5010",
  speaker: "#4a7a3a", headphone: "#3a5c7a",
};

export default function SavedChainsList({ chains: initialChains }: { chains: SavedChain[] }) {
  const [chains, setChains] = useState(initialChains);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this chain?")) return;
    setDeleting(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/chains/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChains(chains.filter(c => c.id !== id));
      } else {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error ?? "Couldn't delete the chain — please try again.");
      }
    } catch {
      setDeleteError("Couldn't delete the chain — please check your connection and try again.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {deleteError && (
        <div style={{
          background: "#fff5f5",
          border: "1px solid #feb2b2",
          color: "#c53030",
          borderRadius: "var(--pa-radius-md)",
          padding: "10px 14px",
          fontSize: "0.82rem",
          fontFamily: "var(--pa-font-ui)",
        }}>
          {deleteError}
        </div>
      )}
      {chains.map(chain => {
        const nodes = [...chain.chain_nodes].sort((a, b) => a.position - b.position);
        const date = new Date(chain.created_at).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });
        const ctx = chain.context as { targetSplDb?: number; crestFactorDb?: number; distanceM?: number; roomGainDb?: number } | null;
        const roomHints = ctx
          ? [
              ctx.targetSplDb != null && `${ctx.targetSplDb} dB SPL`,
              ctx.crestFactorDb != null && `${ctx.crestFactorDb} dB headroom`,
              ctx.distanceM != null && `${ctx.distanceM} m`,
              ctx.roomGainDb != null && `+${ctx.roomGainDb} dB room gain`,
            ].filter(Boolean).join(" \u00b7 ")
          : "";

        return (
          <div key={chain.id} style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "var(--pa-radius-lg)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            transition: "border-color 0.15s",
          }}>
            {/* Chain info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1rem", color: "#1e293b", marginBottom: "6px" }}>
                {chain.name}
              </div>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                {nodes.map((node, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    {i > 0 && <span style={{ color: "#cbd5e1", fontSize: "0.7rem" }}>{"\u2192"}</span>}
                    <span style={{
                      fontSize: "0.7rem",
                      fontFamily: "var(--pa-font-ui)",
                      background: BADGE_COLORS[node.component?.category ?? ""] ?? "#94a3b8",
                      color: "#fff",
                      padding: "2px 6px",
                      borderRadius: "var(--pa-radius-sm)",
                      whiteSpace: "nowrap",
                    }}>
                      {node.component?.name ?? "Unknown"}
                    </span>
                  </span>
                ))}
              </div>
              {roomHints && (
                <div style={{ fontSize: "0.68rem", color: "#78716c", fontFamily: "var(--pa-font-ui)", marginTop: "4px" }}>
                  {roomHints}
                </div>
              )}
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "var(--pa-font-ui)", marginTop: "6px" }}>
                {date}
                {chain.is_public && <span style={{ marginLeft: "8px", color: "var(--pa-accent)" }}>Public</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <Link
                href={`/builder?load=${chain.id}`}
                style={{
                  background: "var(--pa-accent)",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "7px 14px",
                  borderRadius: "var(--pa-radius-md)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "var(--pa-font-ui)",
                }}
              >
                Open
              </Link>
              <button
                onClick={() => handleDelete(chain.id)}
                disabled={deleting === chain.id}
                style={{
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: "var(--pa-radius-md)",
                  color: deleting === chain.id ? "#cbd5e1" : "#c0392b",
                  padding: "7px 12px",
                  fontSize: "0.78rem",
                  cursor: deleting === chain.id ? "wait" : "pointer",
                  fontFamily: "var(--pa-font-ui)",
                }}
              >
                {deleting === chain.id ? "\u2026" : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
