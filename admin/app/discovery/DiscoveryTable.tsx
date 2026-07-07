"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiscoveredComponentRow } from "../../lib/rows";

export interface DiscoveryRow extends DiscoveredComponentRow {
  brandName: string;
  matchedName: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  discovered: "",
  selected: "adm-badge-info",
  collecting: "adm-badge-warn",
  staged: "adm-badge-accent",
  migrated: "adm-badge-ok",
  rejected: "adm-badge-err",
};

export function DiscoveryTable({ rows }: { rows: DiscoveryRow[] }) {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [inDb, setInDb] = useState("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category_guess).filter(Boolean))] as string[],
    [rows]
  );

  const filtered = rows.filter(
    (r) =>
      (category === "all" || r.category_guess === category) &&
      (status === "all" || r.status === status) &&
      (inDb === "all" ||
        (inDb === "yes" && r.matched_component_id) ||
        (inDb === "no" && !r.matched_component_id))
  );

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function setSelection(newStatus: "selected" | "rejected" | "discovered") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/discovered/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...checked], status: newStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      setChecked(new Set());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectableChecked = checked.size > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <select className="adm-input !w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="adm-input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {Object.keys(STATUS_BADGE).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="adm-input !w-auto" value={inDb} onChange={(e) => setInDb(e.target.value)}>
          <option value="all">In DB: all</option>
          <option value="no">Not in DB</option>
          <option value="yes">Already in DB</option>
        </select>
        <div className="grow" />
        <button
          className="adm-btn adm-btn-primary"
          disabled={!selectableChecked || busy}
          onClick={() => setSelection("selected")}
        >
          Queue for collection ({checked.size})
        </button>
        <button
          className="adm-btn adm-btn-danger"
          disabled={!selectableChecked || busy}
          onClick={() => setSelection("rejected")}
        >
          Reject
        </button>
      </div>
      {error && <p className="text-sm text-adm-err mb-2">{error}</p>}

      <div className="adm-card overflow-x-auto">
        <table className="adm-table">
          <thead>
            <tr>
              <th></th>
              <th>#</th>
              <th>Component</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Mentions</th>
              <th>Score</th>
              <th>In DB?</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={checked.has(r.id)}
                    onChange={() => toggle(r.id)}
                    disabled={!["discovered", "selected", "rejected"].includes(r.status)}
                  />
                </td>
                <td className="text-adm-muted">{i + 1}</td>
                <td className="font-medium">{r.name}</td>
                <td>{r.brandName}</td>
                <td className="text-adm-muted">{r.category_guess ?? "?"}</td>
                <td title={Object.entries(r.source_counts).map(([k, v]) => `${k}: ${v}`).join("\n")}>
                  {r.mention_count}
                  <span className="text-adm-muted"> ({Object.keys(r.source_counts).length} src)</span>
                </td>
                <td>{Number(r.popularity).toFixed(1)}</td>
                <td>
                  {r.matchedName ? (
                    <span className="adm-badge adm-badge-ok" title={`Matched: ${r.matchedName}`}>
                      ✓ {r.matchedName}
                    </span>
                  ) : (
                    <span className="adm-badge adm-badge-warn">new</span>
                  )}
                </td>
                <td>
                  <span className={`adm-badge ${STATUS_BADGE[r.status] ?? ""}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-adm-muted mt-2">
        {filtered.length} of {rows.length} items. Match badges are fuzzy — check the matched name before trusting them.
      </p>
    </div>
  );
}
