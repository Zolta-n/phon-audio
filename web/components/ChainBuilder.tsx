"use client";

import { useState, useCallback, useMemo } from "react";
import type { UIComponent, ChainEntry, ContextSettings, SystemReport } from "@/types";
import { CABLE_DEFS, CABLE_SUGGESTION } from "@/types";
import ResultsPanel from "@/components/ResultsPanel";
import ChainDiagram from "@/components/ChainDiagram";
import RoomCanvas from "@/components/RoomCanvas";
import Palette from "@/components/builder/Palette";
import ChainNodeList from "@/components/builder/ChainNodeList";
import SummaryPanel from "@/components/builder/SummaryPanel";
import SaveModal from "@/components/builder/SaveModal";
import { toEvaluateNodes, toSaveNodes } from "@/components/builder/chainSerialize";
import { createClient } from "@/lib/supabase";

// ---- Seed demo chains (use engine seed IDs for fallback mode) ---------------

const DEMO_CHAINS: Record<string, { componentIds: string[]; cableIds: string[] }> = {
  speaker: {
    // Schiit Modi 5 → Schiit Freya+ → Schiit Aegir 2F → Wharfedale Linton
    componentIds: ["schiit-modi-5", "freya-plus-f", "aegir-2f", "wharfedale-linton"],
    cableIds:     ["coax", "xlr-1m", "speaker-12awg-3m", "none"],
  },
  headphone: {
    // Schiit Modi 5 → Schiit Asgard X → Meze 109 PRO
    componentIds: ["schiit-modi-5", "schiit-asgard-x", "meze-audio-109-pro"],
    cableIds:     ["coax", "none", "none"],
  },
};

interface SavedChainNode {
  component: { id: string } | null;
  cable: { kind: string; lengthM: number } | null;
}

type SavedChainData = {
  name: string;
  context: Partial<ContextSettings> | null;
  nodes: SavedChainNode[];
} | null;

export default function ChainBuilder({
  catalog,
  initialDemo,
  savedChain,
  loadFailed,
}: {
  catalog: UIComponent[];
  initialDemo?: string;
  savedChain?: SavedChainData;
  loadFailed?: boolean;
}) {
  // Initial chain: restore the saved chain (?load=) or a demo (?demo=) once,
  // at mount — catalog is server-provided and complete on first render.
  const initialEntries = (): ChainEntry[] => {
    const byId = Object.fromEntries(catalog.map((c) => [c.id, c]));
    if (savedChain && catalog.length > 0) {
      const entries: ChainEntry[] = [];
      for (const node of savedChain.nodes) {
        const uiComp = node.component ? byId[node.component.id] : undefined;
        if (!uiComp) continue;
        // Match cable object back to a cable definition
        let cableId = "none";
        if (node.cable) {
          const match = CABLE_DEFS.find(c =>
            c.cable && c.cable.kind === node.cable!.kind && c.cable.lengthM === node.cable!.lengthM
          );
          if (match) cableId = match.id;
        }
        entries.push({ component: uiComp, cableId });
      }
      if (entries.length > 0) return entries;
    }
    if (initialDemo && catalog.length > 0) {
      const demo = DEMO_CHAINS[initialDemo];
      if (demo) {
        const components = demo.componentIds.map((id) => byId[id]).filter(Boolean);
        if (components.length > 0) {
          return components.map((c, i) => ({ component: c, cableId: demo.cableIds[i] ?? "none" }));
        }
      }
    }
    return [];
  };

  const [chain, setChain] = useState<ChainEntry[]>(initialEntries);
  const [ctx, setCtx] = useState<ContextSettings>(() => ({
    targetSplDb: savedChain?.context?.targetSplDb ?? 85,
    crestFactorDb: savedChain?.context?.crestFactorDb ?? 15,
    distanceM: savedChain?.context?.distanceM ?? 3,
    roomGainDb: savedChain?.context?.roomGainDb ?? 0,
  }));
  const [report, setReport] = useState<SystemReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chainName, setChainName] = useState(savedChain?.name ?? "");
  const [insertAtIdx, setInsertAtIdx] = useState<number | null>(null);

  // Index catalog by id for quick lookup
  const catalogById = useMemo(
    () => Object.fromEntries(catalog.map((c) => [c.id, c])),
    [catalog],
  );

  const suggestCable = useCallback(
    (fromId: string, toId: string): string => {
      const from = catalogById[fromId];
      const to   = catalogById[toId];
      if (!from || !to) return "none";
      return CABLE_SUGGESTION[`${from.category}->${to.category}`] ?? "xlr-1m";
    },
    [catalogById],
  );

  const loadDemo = useCallback(
    (name: string) => {
      const demo = DEMO_CHAINS[name];
      if (!demo) return;
      const components = demo.componentIds.map((id) => catalogById[id]).filter(Boolean);
      if (components.length === 0) return;
      const entries: ChainEntry[] = components.map((c, i) => ({
        component: c,
        cableId: demo.cableIds[i] ?? "none",
      }));
      setChain(entries);
      setReport(null);
    },
    [catalogById],
  );

  const addComponent = useCallback(
    (comp: UIComponent) => {
      setChain((prev) => {
        const next = [...prev];
        if (next.length > 0) {
          const last = next[next.length - 1];
          last.cableId = suggestCable(last.component.id, comp.id);
        }
        next.push({ component: comp, cableId: "none" });
        return next;
      });
      setReport(null);
    },
    [suggestCable],
  );

  const insertComponent = useCallback(
    (idx: number, comp: UIComponent) => {
      setChain((prev) => {
        const next = [...prev];
        const before = next[idx - 1];
        const after = next[idx];
        const cableToNew = before ? suggestCable(before.component.id, comp.id) : "none";
        const cableToAfter = after ? suggestCable(comp.id, after.component.id) : "none";
        if (before) next[idx - 1] = { ...before, cableId: cableToNew };
        next.splice(idx, 0, { component: comp, cableId: cableToAfter });
        return next;
      });
      setInsertAtIdx(null);
      setReport(null);
    },
    [suggestCable],
  );

  const handlePick = useCallback(
    (comp: UIComponent) => {
      if (insertAtIdx !== null) insertComponent(insertAtIdx, comp);
      else addComponent(comp);
    },
    [insertAtIdx, insertComponent, addComponent],
  );

  const removeAt = useCallback((idx: number) => {
    setChain((prev) => prev.filter((_, i) => i !== idx));
    setInsertAtIdx(null);
    setReport(null);
  }, []);

  const setCableAt = useCallback((idx: number, cableId: string) => {
    setChain((prev) => prev.map((n, i) => (i === idx ? { ...n, cableId } : n)));
  }, []);

  const evaluate = useCallback(async () => {
    if (chain.length < 2) {
      setError("Add at least 2 components to evaluate.");
      return;
    }
    setEvaluating(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: toEvaluateNodes(chain), context: ctx }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Evaluation failed");
      setReport(data as SystemReport);

      // Scroll to results
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setEvaluating(false);
    }
  }, [chain, ctx]);

  const handleSave = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setShowSaveModal(true);
    // Default name from chain components
    if (!chainName) {
      setChainName(chain.map(e => e.component.name).join(" → "));
    }
  };

  const confirmSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: chainName || "My Chain",
          context: ctx,
          nodes: toSaveNodes(chain),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaveMsg("Chain saved!");
      setShowSaveModal(false);
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const secondaryButton: React.CSSProperties = {
    border: "1px solid var(--pa-accent)",
    color: "var(--pa-accent)",
    background: "transparent",
    fontSize: "0.875rem",
    padding: "8px 16px",
    borderRadius: "var(--pa-radius-sm)",
    cursor: "pointer",
    fontFamily: "var(--pa-font-ui)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 300px",
        gap: "16px",
        padding: "16px",
        maxWidth: "var(--pa-container)",
        margin: "0 auto",
        width: "100%",
      }}>

        {/* ── Palette ── */}
        <Palette catalog={catalog} onPick={handlePick} />

        {/* ── Chain ── */}
        <section style={{
          background: "var(--pa-cream)",
          borderRadius: "var(--pa-radius-lg)",
          border: "1.5px solid var(--pa-border)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            fontFamily: "var(--pa-font-serif)",
            fontSize: "1rem",
            color: "#3d2200",
            borderBottom: "1px solid var(--pa-border)",
            paddingBottom: "12px",
            marginBottom: "12px",
          }}>
            Signal Chain
          </div>

          {loadFailed && (
            <div style={{
              background: "#fff5f5",
              border: "1px solid #feb2b2",
              color: "#c53030",
              borderRadius: "var(--pa-radius-md)",
              padding: "8px 12px",
              marginBottom: "12px",
              fontSize: "0.8rem",
              fontFamily: "var(--pa-font-ui)",
            }}>
              Couldn&apos;t load the requested saved chain — it may be private or deleted.
            </div>
          )}

          {/* Graphical chain diagram — always visible */}
          {chain.length > 0 ? (
            <div style={{
              background: "var(--pa-surface)",
              border: "1px solid var(--pa-border)",
              borderRadius: "var(--pa-radius-md)",
              padding: "16px",
              marginBottom: "12px",
            }}>
              <ChainDiagram chain={chain} report={report} />
            </div>
          ) : (
            <div style={{
              background: "var(--pa-surface)",
              border: "1px dashed var(--pa-border)",
              borderRadius: "var(--pa-radius-md)",
              padding: "40px 20px",
              textAlign: "center",
              marginBottom: "12px",
              color: "var(--pa-muted)",
              fontSize: "0.85rem",
              fontFamily: "var(--pa-font-ui)",
            }}>
              ← Add components from the panel to build your chain
            </div>
          )}

          {/* Insert mode hint */}
          {insertAtIdx !== null && (
            <div style={{
              background: "#fffbeb",
              border: "1px solid var(--pa-accent)",
              borderRadius: "var(--pa-radius-md)",
              padding: "6px 12px",
              marginBottom: "8px",
              fontSize: "0.78rem",
              color: "var(--pa-accent)",
              fontFamily: "var(--pa-font-ui)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>← Select a component to insert</span>
              <button
                onClick={() => setInsertAtIdx(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--pa-muted)",
                  cursor: "pointer",
                  fontSize: "1rem",
                  lineHeight: 1,
                  padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Compact chain node list (for cable editing + remove) */}
          {chain.length > 0 && (
            <ChainNodeList
              chain={chain}
              insertAtIdx={insertAtIdx}
              onToggleInsertAt={(idx) => setInsertAtIdx(insertAtIdx === idx ? null : idx)}
              onRemoveAt={removeAt}
              onSetCableAt={setCableAt}
            />
          )}

          {/* Room view — only for speaker chains */}
          {chain.some(e => e.component.category === "speaker") && (
            <div style={{
              margin: "12px 0",
              padding: "16px",
              background: "var(--pa-surface)",
              border: "1px solid var(--pa-border)",
              borderRadius: "var(--pa-radius-md)",
            }}>
              <RoomCanvas
                distanceM={ctx.distanceM}
                roomGainDb={ctx.roomGainDb}
                hasSpeakers={true}
                hasHeadphones={false}
              />
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            <button
              onClick={evaluate}
              disabled={evaluating || chain.length < 2}
              style={{
                background: evaluating || chain.length < 2 ? "var(--pa-border)" : "var(--pa-dark)",
                color: "#fff",
                fontSize: "0.875rem",
                fontWeight: 500,
                padding: "8px 16px",
                borderRadius: "var(--pa-radius-sm)",
                border: "none",
                cursor: evaluating || chain.length < 2 ? "not-allowed" : "pointer",
                fontFamily: "var(--pa-font-ui)",
              }}
            >
              {evaluating ? "Evaluating…" : "Evaluate"}
            </button>
            <button onClick={() => loadDemo("speaker")} style={secondaryButton}>
              Speaker demo
            </button>
            <button onClick={() => loadDemo("headphone")} style={secondaryButton}>
              HP demo
            </button>
            <button
              onClick={() => { setChain([]); setReport(null); }}
              style={{
                background: "var(--pa-surface)",
                color: "var(--pa-muted)",
                fontSize: "0.875rem",
                padding: "8px 16px",
                borderRadius: "var(--pa-radius-sm)",
                border: "1px solid var(--pa-border)",
                cursor: "pointer",
                fontFamily: "var(--pa-font-ui)",
              }}
            >
              Clear
            </button>
          </div>
        </section>

        {/* ── Context + Evaluate ── */}
        <SummaryPanel
          ctx={ctx}
          onCtxChange={setCtx}
          report={report}
          evaluating={evaluating}
          canEvaluate={chain.length >= 2}
          onEvaluate={evaluate}
          saving={saving}
          saveMsg={saveMsg}
          onSave={handleSave}
        />
      </div>

      {/* ── Results ── */}
      {(error || report) && (
        <div id="results" style={{ maxWidth: "var(--pa-container)", margin: "0 auto", width: "100%", padding: "0 16px 40px" }}>
          {error && (
            <div style={{
              background: "#fff5f5",
              border: "1px solid #feb2b2",
              color: "#c53030",
              borderRadius: "var(--pa-radius-md)",
              padding: "12px 16px",
              fontSize: "0.875rem",
              marginBottom: "16px",
            }}>
              {error}
            </div>
          )}
          {report && (
            <div style={{
              background: "var(--pa-bg)",
              borderRadius: "var(--pa-radius-lg)",
              border: "1px solid var(--pa-border)",
              padding: "24px",
            }}>
              <p style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--pa-muted)",
                marginBottom: "16px",
                fontFamily: "var(--pa-font-ui)",
              }}>
                Results
              </p>
              <ResultsPanel report={report} />
            </div>
          )}
        </div>
      )}

      {/* ── Save Modal ── */}
      {showSaveModal && (
        <SaveModal
          chain={chain}
          chainName={chainName}
          onChainNameChange={setChainName}
          saving={saving}
          saveMsg={saveMsg}
          onCancel={() => setShowSaveModal(false)}
          onConfirm={confirmSave}
        />
      )}
    </div>
  );
}
