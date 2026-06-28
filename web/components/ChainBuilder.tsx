"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  UIComponent, ChainEntry, ContextSettings, SystemReport,
  ComponentCategory,
} from "@/types";
import {
  CABLE_DEFS, CABLE_BY_ID, CABLE_SUGGESTION,
  CATEGORY_LABELS, CATEGORY_BADGE, CATEGORY_ORDER,
} from "@/types";
import ResultsPanel from "@/components/ResultsPanel";

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

// ---- Sub-components --------------------------------------------------------

function CategoryGroup({
  category,
  components,
  onAdd,
}: {
  category: ComponentCategory;
  components: UIComponent[];
  onAdd: (c: UIComponent) => void;
}) {
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
        {CATEGORY_LABELS[category]}
      </p>
      {components.map((c) => (
        <button
          key={c.id}
          onClick={() => onAdd(c)}
          title={c.note ?? c.name}
          className="block w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-700 mb-1 truncate transition-colors"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}

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
  const field = (label: string, key: keyof ContextSettings, min: number, max: number, step = 1) => (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        value={ctx[key]}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange({ ...ctx, [key]: parseFloat(e.target.value) || 0 })}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
  return (
    <>
      {field("Target SPL (dB)", "targetSplDb",  60, 120)}
      {field("Crest factor / headroom (dB)", "crestFactorDb", 6, 30)}
      {field("Distance to speaker (m)", "distanceM", 0.5, 20, 0.5)}
      {field("Room gain (dB)", "roomGainDb", 0, 12)}
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

  // Group catalog by category
  const grouped: Partial<Record<ComponentCategory, UIComponent[]>> = {};
  for (const c of catalog) {
    (grouped[c.category] ??= []).push(c);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-[220px_1fr_260px] gap-4 p-4 max-w-7xl mx-auto w-full">

        {/* ── Palette ── */}
        <aside className="bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Components</p>
          {catalog.length === 0 ? (
            <p className="text-xs text-slate-400">Loading catalog…</p>
          ) : (
            CATEGORY_ORDER.map((cat) =>
              grouped[cat] ? (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  components={grouped[cat]!}
                  onAdd={addComponent}
                />
              ) : null,
            )
          )}
        </aside>

        {/* ── Chain ── */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Chain</p>

          {chain.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              Click a component on the left to start building your chain
            </p>
          ) : (
            <div className="flex-1">
              {chain.map((entry, i) => (
                <div key={`${entry.component.id}-${i}`}>
                  {/* Node card */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50">
                    <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded shrink-0">
                      {CATEGORY_BADGE[entry.component.category]}
                    </span>
                    <span className="flex-1 text-sm text-slate-800 truncate">{entry.component.name}</span>
                    <button
                      onClick={() => removeAt(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors text-lg leading-none px-1"
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

          {/* Actions */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={evaluate}
              disabled={evaluating || chain.length < 2}
              className="bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {evaluating ? "Evaluating…" : "Evaluate"}
            </button>
            <button
              onClick={() => loadDemo("speaker")}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Speaker demo
            </button>
            <button
              onClick={() => loadDemo("headphone")}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              HP demo
            </button>
            <button
              onClick={() => { setChain([]); setReport(null); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </section>

        {/* ── Context + Evaluate ── */}
        <aside className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Listening Context
          </p>
          <ContextForm ctx={ctx} onChange={setCtx} />
          <button
            onClick={evaluate}
            disabled={evaluating || chain.length < 2}
            className="w-full mt-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            {evaluating ? "Evaluating…" : "Evaluate chain"}
          </button>
        </aside>
      </div>

      {/* ── Results ── */}
      {(error || report) && (
        <div id="results" className="max-w-7xl mx-auto w-full px-4 pb-10">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}
          {report && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Results</p>
              <ResultsPanel report={report} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
