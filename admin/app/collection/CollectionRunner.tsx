"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface QueueItem {
  id: string;
  name: string;
  brandName: string;
  categoryGuess: string | null;
  status: string;
}

type ItemState =
  | { phase: "queued" }
  | { phase: "running" }
  | { phase: "done"; stagedId: string; missingFields: number }
  | { phase: "error"; message: string };

export function CollectionRunner({ queue }: { queue: QueueItem[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, ItemState>>(
    Object.fromEntries(queue.map((q) => [q.id, { phase: "queued" }]))
  );
  const [running, setRunning] = useState(false);
  const stopRequested = useRef(false);

  function setState(id: string, state: ItemState) {
    setStates((prev) => ({ ...prev, [id]: state }));
  }

  async function runQueue() {
    setRunning(true);
    stopRequested.current = false;

    for (const item of queue) {
      if (stopRequested.current) break;
      const current = states[item.id];
      if (current?.phase === "done") continue;

      setState(item.id, { phase: "running" });
      try {
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discoveredId: item.id }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setState(item.id, { phase: "done", stagedId: json.stagedId, missingFields: json.missingFields });
      } catch (e) {
        setState(item.id, { phase: "error", message: (e as Error).message });
      }
    }

    setRunning(false);
    router.refresh();
  }

  const doneCount = Object.values(states).filter((s) => s.phase === "done").length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {running ? (
          <button className="adm-btn adm-btn-danger" onClick={() => (stopRequested.current = true)}>
            Stop after current item
          </button>
        ) : (
          <button className="adm-btn adm-btn-primary" onClick={runQueue}>
            Run collection ({queue.length} items)
          </button>
        )}
        <span className="text-sm text-adm-muted">
          {doneCount}/{queue.length} collected
        </span>
      </div>

      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => {
              const state = states[item.id] ?? { phase: "queued" as const };
              return (
                <tr key={item.id}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.brandName}</td>
                  <td className="text-adm-muted">{item.categoryGuess ?? "?"}</td>
                  <td>
                    {state.phase === "queued" && <span className="adm-badge">queued</span>}
                    {state.phase === "running" && (
                      <span className="adm-badge adm-badge-warn">collecting…</span>
                    )}
                    {state.phase === "done" && (
                      <span className="adm-badge adm-badge-ok">
                        staged → {state.stagedId}
                        {state.missingFields > 0 && ` (${state.missingFields} missing)`}
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
  );
}
