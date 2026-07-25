"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CatalogRow {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  active: boolean;
  verified: boolean;
}

export function CatalogManager({ rows }: { rows: CatalogRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [q, setQ] = useState("");

  const filtered = rows.filter((r) => {
    const hay = `${r.name} ${r.manufacturer ?? ""} ${r.category} ${r.id}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  async function act(id: string, fn: () => Promise<Response>, ok: string) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fn();
      const json = await res.json();
      if (!res.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);
      setMessage({ kind: "ok", text: ok });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const setActive = (id: string, active: boolean) =>
    act(
      id,
      () => fetch(`/api/components/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
      active ? "Reactivated." : "Deactivated (hidden from the public catalog).",
    );

  const remove = (id: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    act(id, () => fetch(`/api/components/${id}`, { method: "DELETE" }), "Deleted.");
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          className="adm-input max-w-xs"
          placeholder="Filter by name / brand / category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="text-sm text-adm-muted">{filtered.length} of {rows.length}</span>
      </div>
      {message && (
        <p className={`text-sm mb-3 ${message.kind === "ok" ? "text-adm-ok" : "text-adm-err"}`}>{message.text}</p>
      )}
      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={r.active ? undefined : { opacity: 0.55 }}>
                <td className="font-medium">
                  {r.name} <span className="text-adm-muted font-normal">({r.id})</span>
                </td>
                <td>{r.manufacturer ?? "—"}</td>
                <td className="text-adm-muted">{r.category}</td>
                <td>
                  {r.active
                    ? <span className="adm-badge adm-badge-ok">active</span>
                    : <span className="adm-badge adm-badge-warn">inactive</span>}
                  {r.verified && <span className="adm-badge adm-badge-info ml-1">verified</span>}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <button className="adm-btn" disabled={busy === r.id} onClick={() => setActive(r.id, !r.active)}>
                      {r.active ? "Deactivate" : "Reactivate"}
                    </button>
                    <button className="adm-btn adm-btn-danger" disabled={busy === r.id} onClick={() => remove(r.id, r.name)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
