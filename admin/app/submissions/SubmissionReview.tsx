"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface SubmissionRow {
  id: string;
  name: string;
  category: string;
  manufacturer: string | null;
  created_by: string | null;
  created_at: string | null;
  submitter_email: string | null;
  port_count: number;
}

export function SubmissionReview({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function act(id: string, body: unknown, ok: string) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/components/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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

  const approve = (id: string, name: string) =>
    act(id, { verified: true }, `Approved "${name}" — now visible to everyone.`);

  const reject = (id: string, name: string) => {
    if (!window.confirm(`Reject "${name}"? It stays visible to its submitter but is hidden from the catalog.`)) return;
    act(id, { active: false }, `Rejected "${name}" — hidden from the catalog.`);
  };

  if (rows.length === 0) {
    return <div className="adm-card p-6 text-sm text-adm-muted">No submissions awaiting review.</div>;
  }

  return (
    <div>
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
              <th>Ports</th>
              <th>Submitted by</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">
                  {r.name} <span className="text-adm-muted font-normal">({r.id})</span>
                </td>
                <td>{r.manufacturer ?? "—"}</td>
                <td className="text-adm-muted">{r.category}</td>
                <td className={r.port_count === 0 ? "text-adm-err" : undefined}>{r.port_count}</td>
                <td className="text-adm-muted">{r.submitter_email ?? r.created_by ?? "—"}</td>
                <td className="text-adm-muted">
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <div className="flex gap-2 justify-end">
                    <button className="adm-btn" disabled={busy === r.id} onClick={() => approve(r.id, r.name)}>
                      Approve
                    </button>
                    <button
                      className="adm-btn adm-btn-danger"
                      disabled={busy === r.id}
                      onClick={() => reject(r.id, r.name)}
                    >
                      Reject
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
