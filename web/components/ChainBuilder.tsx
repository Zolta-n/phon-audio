"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  UIComponent, ChainEntry, ContextSettings, SystemReport,
  ComponentCategory,
} from "@/types";
import {
  CABLE_DEFS, CABLE_BY_ID, CABLE_SUGGESTION,
  CATEGORY_BADGE, CATEGORY_LABELS, CATEGORY_ORDER,
} from "@/types";
import ResultsPanel from "@/components/ResultsPanel";
import ChainDiagram from "@/components/ChainDiagram";
import RoomCanvas from "@/components/RoomCanvas";

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

// ---- Helper functions -------------------------------------------------------

function computeScore(report: SystemReport): number {
  let score = 100;
  for (const link of report.links) {
    for (const r of link.results) {
      if (r.verdict === "fail") score -= 20;
      else if (r.verdict === "warn") score -= 5;
    }
  }
  for (const r of report.system) {
    if (r.verdict === "fail") score -= 20;
    else if (r.verdict === "warn") score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent pairing";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Fair match";
  return "Compatibility issues";
}

function getTopChecks(report: SystemReport): Array<{ label: string; verdict: "pass" | "warn" | "fail" | "info"; valueStr: string }> {
  const all: Array<{ label: string; verdict: "pass" | "warn" | "fail" | "info"; valueStr: string }> = [];
  for (const link of report.links) {
    for (const r of link.results) {
      if (r.verdict === "info") continue; // skip info-level
      const valueStr = r.value != null && r.unit ? `${r.value.toFixed(1)}${r.unit}` : "";
      all.push({ label: r.label, verdict: r.verdict, valueStr });
    }
  }
  // Sort: fails first, then warns, then passes. Take top 4.
  const order = { fail: 0, warn: 1, pass: 2, info: 3 };
  all.sort((a, b) => order[a.verdict] - order[b.verdict]);
  return all.slice(0, 4);
}

// ---- Category color badges -------------------------------------------------

const CAT_COLOR_BADGE: Partial<Record<ComponentCategory, string>> = {
  source: "#7a5c3a", dac: "#c96f12", preamp: "#9b4f0a",
  power_amp: "#7a3a08", integrated: "#8b4f20", headphone_amp: "#9b5010",
  speaker: "#4a7a3a", headphone: "#3a5c7a",
};

// ---- Sub-components --------------------------------------------------------

function CableConnector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 pl-10 py-1">
      <div className="w-px h-4 bg-slate-300" />
      <span className="text-slate-400 text-xs">↓</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white text-slate-600 cursor-pointer"
      >
        {CABLE_DEFS.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
    </div>
  );
}

function ContextForm({
  ctx,
  onChange,
}: {
  ctx: ContextSettings;
  onChange: (c: ContextSettings) => void;
}) {
  const slider = (
    label: string,
    key: keyof ContextSettings,
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--pa-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {label}
        </label>
        <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--pa-text)", fontFamily: "var(--font-lora), serif" }}>
          {ctx[key]}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={ctx[key]}
        onChange={(e) => onChange({ ...ctx, [key]: parseFloat(e.target.value) })}
        style={{ width: "100%", cursor: "pointer", margin: "2px 0" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "var(--pa-muted)", opacity: 0.65, marginTop: "1px" }}>
        <span>{min}{unit}</span>
        <span>{Math.round((min + max) / 2)}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <>
      {slider("Target SPL", "targetSplDb", 60, 100, 1, " dB")}
      {slider("Headroom", "crestFactorDb", 6, 30, 1, " dB")}
      {slider("Distance", "distanceM", 0.5, 8, 0.5, " m")}
      {slider("Room gain", "roomGainDb", 0, 12, 1, " dB")}
    </>
  );
}

// ---- Main component --------------------------------------------------------

export default function ChainBuilder({
  catalog,
  initialDemo,
}: {
  catalog: UIComponent[];
  initialDemo?: string;
}) {
  const [chain, setChain] = useState<ChainEntry[]>([]);
  const [ctx, setCtx] = useState<ContextSettings>({
    targetSplDb: 85,
    crestFactorDb: 15,
    distanceM: 3,
    roomGainDb: 0,
  });
  const [report, setReport] = useState<SystemReport | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openManufacturer, setOpenManufacturer] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  // Index catalog by id for quick lookup
  const catalogById = Object.fromEntries(catalog.map((c) => [c.id, c]));

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

  // Auto-load demo from URL param on mount
  useEffect(() => {
    if (initialDemo && catalog.length > 0) {
      loadDemo(initialDemo);
    }
  }, [initialDemo, catalog.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const removeAt = useCallback((idx: number) => {
    setChain((prev) => prev.filter((_, i) => i !== idx));
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
      const nodes = chain.map((entry, i) => {
        const isLast = i === chain.length - 1;
        const cableDef = isLast ? null : CABLE_BY_ID[entry.cableId];
        return {
          component: {
            id: entry.component.id,
            name: entry.component.name,
            category: entry.component.category,
            inputs: entry.component.inputs,
            outputs: entry.component.outputs,
          },
          ...(cableDef?.cable ? { cableToNext: cableDef.cable } : {}),
        };
      });

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, context: ctx }),
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

  // Two-level grouping: category → manufacturer → components
  const byCategory: Partial<Record<ComponentCategory, Record<string, UIComponent[]>>> = {};
  for (const c of catalog) {
    const cat = c.category;
    const mfr = c.manufacturer ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = {};
    if (!byCategory[cat]![mfr]) byCategory[cat]![mfr] = [];
    byCategory[cat]![mfr].push(c);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 300px",
        gap: "16px",
        padding: "16px",
        maxWidth: "1280px",
        margin: "0 auto",
        width: "100%",
      }}>

        {/* ── Palette ── */}
        <aside style={{
          background: "var(--pa-bg)",
          borderRadius: "10px",
          border: "1px solid var(--pa-border)",
          padding: "16px",
          overflowY: "auto",
          maxHeight: "calc(100vh - 10rem)",
        }}>
          <p style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--pa-muted)",
            marginBottom: "12px",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}>
            Components
          </p>
          {catalog.length === 0 ? (
            <p style={{ fontSize: "0.75rem", color: "var(--pa-muted)" }}>Loading catalog…</p>
          ) : (
            CATEGORY_ORDER.map((cat) => {
              if (!byCategory[cat]) return null;
              const catMfrs = byCategory[cat]!;
              const mfrNames = Object.keys(catMfrs).sort();
              const isCatOpen = openCategory === cat;
              return (
                <div key={cat} style={{ marginBottom: "2px" }}>
                  {/* Category header */}
                  <button
                    onClick={() => setOpenCategory(isCatOpen ? null : cat)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--pa-border)",
                      marginBottom: "2px",
                    }}
                  >
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "var(--pa-accent)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      fontFamily: "var(--font-lora), serif",
                    }}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--pa-accent)" }}>{isCatOpen ? "−" : "+"}</span>
                  </button>
                  {/* Manufacturer list under this category */}
                  {isCatOpen && mfrNames.map((mfr) => {
                    const isMfrOpen = openManufacturer === `${cat}::${mfr}`;
                    return (
                      <div key={mfr} style={{ paddingLeft: "4px" }}>
                        <button
                          onClick={() => setOpenManufacturer(prev => prev === `${cat}::${mfr}` ? null : `${cat}::${mfr}`)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 8px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.78rem",
                            color: isMfrOpen ? "var(--pa-text)" : "var(--pa-muted)",
                            fontFamily: "var(--font-lora), serif",
                            fontWeight: isMfrOpen ? 600 : 400,
                          }}
                        >
                          <span>{mfr}</span>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, opacity: 0.6 }}>{isMfrOpen ? "−" : "+"}</span>
                        </button>
                        {isMfrOpen && (
                          <div style={{ paddingLeft: "8px", paddingBottom: "4px" }}>
                            {catMfrs[mfr].map((c) => (
                              <button
                                key={c.id}
                                onClick={() => addComponent(c)}
                                title={c.note ?? c.name}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  width: "100%",
                                  textAlign: "left",
                                  background: "var(--pa-surface)",
                                  border: "1px solid var(--pa-border)",
                                  borderRadius: "4px",
                                  padding: "5px 8px",
                                  fontSize: "0.76rem",
                                  color: "var(--pa-text)",
                                  marginBottom: "2px",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-lora), serif",
                                }}
                              >
                                <span style={{
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  background: CAT_COLOR_BADGE[c.category] ?? "var(--pa-accent)",
                                  color: "#fff",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                  flexShrink: 0,
                                  letterSpacing: "0.04em",
                                }}>
                                  {CATEGORY_BADGE[c.category]}
                                </span>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {c.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </aside>

        {/* ── Chain ── */}
        <section style={{
          background: "var(--pa-bg)",
          borderRadius: "10px",
          border: "1px solid var(--pa-border)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
        }}>
          <p style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--pa-muted)",
            marginBottom: "12px",
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}>
            Chain
          </p>

          {/* Graphical chain diagram — always visible */}
          {chain.length > 0 ? (
            <div style={{
              background: "var(--pa-surface)",
              border: "1px solid var(--pa-border)",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "12px",
            }}>
              <ChainDiagram chain={chain} report={report} />
            </div>
          ) : (
            <div style={{
              background: "var(--pa-surface)",
              border: "1px dashed var(--pa-border)",
              borderRadius: "8px",
              padding: "40px 20px",
              textAlign: "center",
              marginBottom: "12px",
              color: "var(--pa-muted)",
              fontSize: "0.85rem",
              fontFamily: "var(--font-lora), serif",
            }}>
              ← Add components from the panel to build your chain
            </div>
          )}

          {/* Compact chain node list (for cable editing + remove) */}
          {chain.length > 0 && (
            <div style={{ marginBottom: "12px", flex: 1 }}>
              {chain.map((entry, i) => (
                <div key={`${entry.component.id}-${i}`}>
                  {/* Node card */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid var(--pa-border)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    background: "var(--pa-surface)",
                  }}>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      background: "var(--pa-accent)",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      flexShrink: 0,
                      fontFamily: "var(--font-lora), serif",
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
                      fontFamily: "var(--font-lora), serif",
                    }}>
                      {entry.component.name}
                    </span>
                    <button
                      onClick={() => removeAt(i)}
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

                  {/* Cable connector (between nodes) */}
                  {i < chain.length - 1 && (
                    <CableConnector
                      value={entry.cableId}
                      onChange={(id) => setCableAt(i, id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Room view — only for speaker chains */}
          {chain.some(e => e.component.category === "speaker") && (
            <div style={{
              margin: "12px 0",
              padding: "16px",
              background: "var(--pa-surface)",
              border: "1px solid var(--pa-border)",
              borderRadius: "8px",
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
                borderRadius: "4px",
                border: "none",
                cursor: evaluating || chain.length < 2 ? "not-allowed" : "pointer",
                fontFamily: "var(--font-lora), serif",
              }}
            >
              {evaluating ? "Evaluating…" : "Evaluate"}
            </button>
            <button
              onClick={() => loadDemo("speaker")}
              style={{
                border: "1px solid var(--pa-accent)",
                color: "var(--pa-accent)",
                background: "transparent",
                fontSize: "0.875rem",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: "var(--font-lora), serif",
              }}
            >
              Speaker demo
            </button>
            <button
              onClick={() => loadDemo("headphone")}
              style={{
                border: "1px solid var(--pa-accent)",
                color: "var(--pa-accent)",
                background: "transparent",
                fontSize: "0.875rem",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                fontFamily: "var(--font-lora), serif",
              }}
            >
              HP demo
            </button>
            <button
              onClick={() => { setChain([]); setReport(null); }}
              style={{
                background: "var(--pa-surface)",
                color: "var(--pa-muted)",
                fontSize: "0.875rem",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "1px solid var(--pa-border)",
                cursor: "pointer",
                fontFamily: "var(--font-lora), serif",
              }}
            >
              Clear
            </button>
          </div>
        </section>

        {/* ── Context + Evaluate ── */}
        <aside style={{
          background: "var(--pa-bg)",
          borderRadius: "10px",
          border: "1px solid var(--pa-border)",
          padding: "16px",
          overflowY: "auto",
          maxHeight: "calc(100vh - 10rem)",
        }}>
          {/* Evaluate button — always at top for visibility */}
          <button
            onClick={evaluate}
            disabled={evaluating || chain.length < 2}
            style={{
              width: "100%",
              marginBottom: "16px",
              background: evaluating || chain.length < 2 ? "var(--pa-border)" : "var(--pa-accent)",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 700,
              padding: "11px",
              borderRadius: "5px",
              border: "none",
              cursor: evaluating || chain.length < 2 ? "not-allowed" : "pointer",
              fontFamily: "var(--font-lora), serif",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {evaluating ? "Evaluating…" : "Evaluate Chain"}
          </button>

          <p style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--pa-muted)",
            marginBottom: "12px",
            fontFamily: "var(--font-lora), serif",
          }}>
            Listening Context
          </p>
          <ContextForm ctx={ctx} onChange={setCtx} />

          {/* Compatibility check summary */}
          {report && (
            <div style={{ marginTop: "16px" }}>
              {/* Score badge */}
              <div style={{
                background: "var(--pa-accent)",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center",
                marginBottom: "12px",
              }}>
                <div style={{
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  lineHeight: 1,
                }}>
                  {computeScore(report)}
                </div>
                <div style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.8)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginTop: "4px",
                  fontFamily: "var(--font-lora), serif",
                }}>
                  out of 100 — {scoreLabel(computeScore(report))}
                </div>
              </div>

              {/* Key checks */}
              <div style={{
                border: "1px solid var(--pa-border)",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "12px",
              }}>
                <div style={{
                  padding: "8px 12px",
                  background: "var(--pa-surface)",
                  borderBottom: "1px solid var(--pa-border)",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--pa-muted)",
                  fontFamily: "var(--font-lora), serif",
                }}>
                  Compatibility Check
                </div>
                {getTopChecks(report).map((chk, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "7px 12px",
                    borderBottom: idx < getTopChecks(report).length - 1 ? "1px solid var(--pa-border)" : "none",
                    fontSize: "0.78rem",
                    fontFamily: "var(--font-lora), serif",
                  }}>
                    <span style={{ color: "var(--pa-text)" }}>{chk.label}</span>
                    <span style={{
                      fontWeight: 600,
                      color: chk.verdict === "pass" ? "#4a7a3a" : chk.verdict === "fail" ? "#c0392b" : "#9b5010",
                    }}>
                      {chk.valueStr} {chk.verdict === "pass" ? "✓" : chk.verdict === "fail" ? "✕" : "⚡"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Save + Share buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={{
                  flex: 1,
                  background: "var(--pa-accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "9px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-lora), serif",
                }}>
                  Save
                </button>
                <button style={{
                  flex: 1,
                  background: "transparent",
                  color: "var(--pa-text)",
                  border: "1px solid var(--pa-border)",
                  borderRadius: "4px",
                  padding: "9px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-lora), serif",
                }}>
                  Share
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Results ── */}
      {(error || report) && (
        <div id="results" style={{ maxWidth: "1280px", margin: "0 auto", width: "100%", padding: "0 16px 40px" }}>
          {error && (
            <div style={{
              background: "#fff5f5",
              border: "1px solid #feb2b2",
              color: "#c53030",
              borderRadius: "8px",
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
              borderRadius: "10px",
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
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}>
                Results
              </p>
              <ResultsPanel report={report} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
