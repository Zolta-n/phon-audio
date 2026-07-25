"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Candidate = { name: string; isNew: boolean };
type Item = { id: string; name: string };

type ItemState =
  | { phase: "queued" }
  | { phase: "running" }
  | { phase: "done"; stagedId: string; missingFields: number }
  | { phase: "error"; message: string };

type Stage = "form" | "review" | "run";

export function BatchRunner({ categories }: { categories: string[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "dac");
  const [hints, setHints] = useState("");

  const [stage, setStage] = useState<Stage>("form");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cap, setCap] = useState(30);

  const [items, setItems] = useState<Item[]>([]);
  const [states, setStates] = useState<Record<string, ItemState>>({});
  const [running, setRunning] = useState(false);
  const stopRequested = useRef(false);

  async function call(body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch("/api/batch/enumerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);
    return json;
  }

  async function enumerate() {
    if (!brand.trim()) return setMessage({ kind: "err", text: "Enter a brand." });
    setBusy(true);
    setMessage(null);
    try {
      const json = await call({ brand: brand.trim(), category, hints: hints.trim() || undefined });
      const cands = (json.candidates as Candidate[]) ?? [];
      setCandidates(cands);
      setCap((json.cap as number) ?? 30);
      // Default-select the new ones (known items are skipped by the dedup guard).
      setSelected(new Set(cands.filter((c) => c.isNew).map((c) => c.name)));
      setStage("review");
      if (cands.length === 0) setMessage({ kind: "err", text: "No models found. Try model hints or a different category." });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function startBatch() {
    const models = candidates.filter((c) => selected.has(c.name)).map((c) => c.name);
    if (models.length === 0) return setMessage({ kind: "err", text: "Select at least one model." });
    setBusy(true);
    setMessage(null);
    try {
      const json = await call({ brand: brand.trim(), category, hints: hints.trim() || undefined, confirm: true, models });
      const runId = json.runId as string;
      const its = (json.items as Item[]) ?? [];
      setItems(its);
      setStates(Object.fromEntries(its.map((i) => [i.id, { phase: "queued" as const }])));
      setStage("run");
      await runQueue(its, runId);
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function runQueue(queue: Item[], runId: string) {
    setRunning(true);
    stopRequested.current = false;
    for (const item of queue) {
      if (stopRequested.current) break;
      setStates((prev) => ({ ...prev, [item.id]: { phase: "running" } }));
      try {
        const res = await fetch("/api/batch/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discoveredId: item.id, runId }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);
        setStates((prev) => ({ ...prev, [item.id]: { phase: "done", stagedId: json.stagedId, missingFields: json.missingFields } }));
      } catch (e) {
        setStates((prev) => ({ ...prev, [item.id]: { phase: "error", message: (e as Error).message } }));
      }
    }
    setRunning(false);
    router.refresh();
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const doneCount = Object.values(states).filter((s) => s.phase === "done").length;
  const selectedCount = candidates.filter((c) => selected.has(c.name)).length;

  return (
    <div>
      {message && (
        <p className={`text-sm mb-4 ${message.kind === "ok" ? "text-adm-ok" : "text-adm-err"}`}>{message.text}</p>
      )}

      {/* ── Form ── */}
      {stage === "form" && (
        <div className="adm-card p-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className="text-xs text-adm-muted">Brand</label>
              <input className="adm-input" value={brand} placeholder="e.g. Fezz, KEF, SMSL"
                onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-adm-muted">Category</label>
              <select className="adm-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-adm-muted">Model hints (optional)</label>
              <input className="adm-input" value={hints} placeholder="e.g. Silver / Gold series, tube integrateds"
                onChange={(e) => setHints(e.target.value)} />
            </div>
          </div>
          <button className="adm-btn adm-btn-primary mt-4" disabled={busy} onClick={enumerate}>
            {busy ? "Enumerating…" : "Enumerate models"}
          </button>
        </div>
      )}

      {/* ── Review / confirm ── */}
      {stage === "review" && (
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <button className="adm-btn adm-btn-primary" disabled={busy || selectedCount === 0} onClick={startBatch}>
              {busy ? "Starting…" : `Start batch (${selectedCount})`}
            </button>
            <button className="adm-btn" disabled={busy} onClick={() => { setStage("form"); setMessage(null); }}>
              ← Edit
            </button>
            <span className="text-sm text-adm-muted">
              {candidates.length} found for {brand} · {category} — new items pre-selected · cap {cap}
            </span>
          </div>
          <div className="adm-card overflow-x-auto">
            <table className="adm-table">
              <thead><tr><th></th><th>Model</th><th>Status</th></tr></thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <input type="checkbox" checked={selected.has(c.name)} onChange={() => toggle(c.name)} />
                    </td>
                    <td className="font-medium">{c.name}</td>
                    <td>
                      {c.isNew
                        ? <span className="adm-badge adm-badge-ok">new</span>
                        : <span className="adm-badge" title="Already in discovered_components">known</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-adm-muted mt-2">
            LLM-enumerated from web sources — verify before collecting; “known” items already exist and are skipped on insert.
          </p>
        </div>
      )}

      {/* ── Run ── */}
      {stage === "run" && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {running ? (
              <button className="adm-btn adm-btn-danger" onClick={() => (stopRequested.current = true)}>
                Stop after current item
              </button>
            ) : (
              <Link href="/staged" className="adm-btn adm-btn-primary">Review in Staged →</Link>
            )}
            <span className="text-sm text-adm-muted">{doneCount}/{items.length} collected</span>
          </div>
          <div className="adm-card overflow-x-auto">
            <table className="adm-table">
              <thead><tr><th>Model</th><th>Progress</th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const state = states[item.id] ?? { phase: "queued" as const };
                  return (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td>
                        {state.phase === "queued" && <span className="adm-badge">queued</span>}
                        {state.phase === "running" && <span className="adm-badge adm-badge-warn">collecting…</span>}
                        {state.phase === "done" && (
                          <span className="adm-badge adm-badge-ok">
                            staged → {state.stagedId}{state.missingFields > 0 && ` (${state.missingFields} missing)`}
                          </span>
                        )}
                        {state.phase === "error" && (
                          <span className="adm-badge adm-badge-err" title={state.message}>
                            failed: {state.message.slice(0, 80)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
