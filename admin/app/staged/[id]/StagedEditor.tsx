"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Confidence, FieldMeta, MissingField, StagedComponentRow } from "../../../lib/rows";

const CATEGORIES = [
  "source", "turntable", "dac", "preamp", "power_amp",
  "tube_amp_se", "tube_amp_pp", "integrated",
  "headphone_amp", "speaker", "headphone",
];

/** Badge colour per confidence tier — strong sourcing reads calmer than weak. */
const CONFIDENCE_BADGE: Record<Confidence, string> = {
  measured: "adm-badge-ok",
  rated: "adm-badge-ok",
  inferred: "adm-badge-warn",
  derived: "adm-badge-info",
  estimated_from_graph: "adm-badge-warn",
  typical_for_chipset: "adm-badge-warn",
  estimated_typical: "adm-badge-err",
};

type Port = { domain?: string; connector?: string; balanced?: boolean; specs?: Record<string, unknown> };
type Specs = { inputs?: Port[]; outputs?: Port[]; dac?: Record<string, unknown> };

/** Parse an edited value: JSON when it parses (numbers, arrays, null), else raw string. */
function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function displayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function StagedEditor({ row }: { row: StagedComponentRow }) {
  const router = useRouter();
  const [meta, setMeta] = useState({
    name: row.name,
    category: row.category as string,
    manufacturer: row.manufacturer ?? "",
    image_url: row.image_url ?? "",
    notes: row.notes ?? "",
  });
  const [specs, setSpecs] = useState<Specs>(structuredClone(row.specs ?? {}) as Specs);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const missingSet = useMemo(
    () => new Set((row.missing_fields ?? []).map((m: MissingField) => `${m.portType}.${m.index}.${m.field}`)),
    [row.missing_fields]
  );
  const fieldMeta: Record<string, FieldMeta> = row.field_meta ?? {};
  const locked = row.review_status === "migrated";

  function setSpecField(portType: "inputs" | "outputs", index: number, field: string, raw: string) {
    setSpecs((prev) => {
      const next = structuredClone(prev);
      const port = next[portType]?.[index];
      if (port) {
        port.specs = { ...(port.specs ?? {}), [field]: parseValue(raw) };
      }
      return next;
    });
  }

  async function call(path: string, method: string, body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);
    return json;
  }

  async function act(fn: () => Promise<string>) {
    setBusy(true);
    setMessage(null);
    try {
      const text = await fn();
      setMessage({ kind: "ok", text });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    act(async () => {
      await call(`/api/staged/${row.id}`, "PATCH", {
        name: meta.name,
        category: meta.category,
        manufacturer: meta.manufacturer || null,
        image_url: meta.image_url || null,
        notes: meta.notes || null,
        specs,
      });
      return "Saved.";
    });

  const setReview = (review_status: "approved" | "rejected" | "pending") =>
    act(async () => {
      await call(`/api/staged/${row.id}`, "PATCH", { review_status });
      return `Marked ${review_status}.`;
    });

  const migrate = () =>
    act(async () => {
      const result = await call("/api/migrate", "POST", { stagedIds: [row.id] });
      const migrated = result.migrated as string[];
      const skipped = result.skipped as { id: string; reason: string }[];
      if (migrated.includes(row.id)) return `Migrated to catalog as '${row.id}'.`;
      throw new Error(skipped[0]?.reason ?? "Migration skipped");
    });

  const recollect = () =>
    act(async () => {
      if (!row.discovered_id) throw new Error("No linked discovered item to re-collect from.");
      await call("/api/collect", "POST", { discoveredId: row.discovered_id });
      return "Re-collected. Reload to see fresh data.";
    });

  function renderPort(portType: "inputs" | "outputs", port: Port, index: number) {
    const existing = Object.keys(port.specs ?? {}).filter((k) => k !== "kind");
    const missingForPort = (row.missing_fields ?? [])
      .filter((m) => m.portType === portType && m.index === index)
      .map((m) => m.field);
    const fields = [...new Set([...existing, ...missingForPort])];

    return (
      <div key={`${portType}-${index}`} className="adm-card p-4">
        <div className="text-sm font-semibold mb-3">
          {portType === "inputs" ? "Input" : "Output"} {index}{" "}
          <span className="text-adm-muted font-normal">
            {String(port.specs?.["kind"] ?? "?")} · {port.connector ?? "?"} · {port.domain ?? "?"}
            {port.balanced ? " · balanced" : ""}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {fields.map((field) => {
            const path = `${portType}.${index}.${field}`;
            const isMissing = missingSet.has(path) && port.specs?.[field] == null;
            const fm = fieldMeta[path];
            const needsVerify = fm?.status === "verify";
            return (
              <div key={field}>
                <label className="flex items-center gap-2 text-xs mb-0.5 flex-wrap">
                  <span className={isMissing ? "text-adm-err" : needsVerify ? "text-adm-warn" : "text-adm-muted"}>
                    {field}
                  </span>
                  {isMissing && <span className="adm-badge adm-badge-err">missing</span>}
                  {!isMissing && fm && (
                    <span className={`adm-badge ${CONFIDENCE_BADGE[fm.confidence] ?? ""}`} title={fm.source}>
                      {fm.confidence}
                    </span>
                  )}
                  {!isMissing && fm?.corroborated && (
                    <span className="adm-badge adm-badge-ok" title="≥2 independent sources agreed">
                      ✓ 2+ sources
                    </span>
                  )}
                  {!isMissing && fm?.source &&
                    (fm.source.startsWith("http") ? (
                      <a href={fm.source} target="_blank" rel="noreferrer" className="underline text-adm-muted">
                        source
                      </a>
                    ) : (
                      <span className="text-adm-muted">{fm.source}</span>
                    ))}
                </label>
                <input
                  className="adm-input"
                  style={
                    isMissing
                      ? { borderColor: "var(--adm-err)" }
                      : needsVerify
                        ? { borderColor: "var(--adm-warn)" }
                        : undefined
                  }
                  disabled={locked}
                  value={displayValue(port.specs?.[field])}
                  placeholder={isMissing ? "not found — enter manually" : ""}
                  onChange={(e) => setSpecField(portType, index, field, e.target.value)}
                />
              </div>
            );
          })}
          {fields.length === 0 && <p className="text-xs text-adm-muted">No spec fields.</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <Link href="/staged" className="text-sm text-adm-muted hover:text-adm-text">
            ← Staged
          </Link>
          <h1 className="text-xl font-bold">
            {row.name} <span className="text-adm-muted text-sm font-normal">({row.id})</span>
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="adm-btn" disabled={busy || locked} onClick={save}>Save</button>
          <button className="adm-btn" disabled={busy || locked} onClick={recollect}>Re-collect</button>
          {row.review_status !== "approved" && (
            <button className="adm-btn adm-btn-primary" disabled={busy || locked} onClick={() => setReview("approved")}>
              Approve
            </button>
          )}
          {row.review_status === "approved" && (
            <button className="adm-btn adm-btn-primary" disabled={busy} onClick={migrate}>
              Migrate to catalog
            </button>
          )}
          <button className="adm-btn adm-btn-danger" disabled={busy || locked} onClick={() => setReview("rejected")}>
            Reject
          </button>
        </div>
      </div>

      {message && (
        <p className={`text-sm mb-4 ${message.kind === "ok" ? "text-adm-ok" : "text-adm-err"}`}>
          {message.text}
        </p>
      )}
      {locked && (
        <p className="text-sm text-adm-info mb-4">
          This item has been migrated — edit it in the main catalog instead.
        </p>
      )}

      <div className="adm-card p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          <div>
            <label className="text-xs text-adm-muted">Name</label>
            <input className="adm-input" disabled={locked} value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-adm-muted">Category</label>
            <select className="adm-input" disabled={locked} value={meta.category}
              onChange={(e) => setMeta({ ...meta, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-adm-muted">Manufacturer</label>
            <input className="adm-input" disabled={locked} value={meta.manufacturer}
              onChange={(e) => setMeta({ ...meta, manufacturer: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-adm-muted">Image URL</label>
            <input className="adm-input" disabled={locked} value={meta.image_url}
              onChange={(e) => setMeta({ ...meta, image_url: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-adm-muted">Notes</label>
            <textarea className="adm-input" rows={3} disabled={locked} value={meta.notes}
              onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
          </div>
        </div>
        {row.sources.length > 0 && (
          <div className="mt-3 text-xs text-adm-muted">
            Sources:{" "}
            {row.sources.map((s, i) => (
              <a key={i} href={s} target="_blank" rel="noreferrer" className="underline mr-2">
                [{i + 1}]
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {(specs.inputs ?? []).map((p, i) => renderPort("inputs", p, i))}
        {(specs.outputs ?? []).map((p, i) => renderPort("outputs", p, i))}
      </div>
      <p className="text-xs text-adm-muted mt-3">
        Values are parsed as JSON where possible — numbers stay numbers, arrays like{" "}
        <code>[{'{'}"ohm":8,"watts":100{'}'}]</code> stay arrays. Each filled field shows its
        confidence tier (<span className="text-adm-ok">measured/rated</span> &gt;{" "}
        <span className="text-adm-info">derived</span> &gt;{" "}
        <span className="text-adm-warn">inferred</span>); “✓ 2+ sources” means independent sources
        agreed. Corroboration is a hint — the catalog <code>verified</code> flag stays a human call.
      </p>
    </div>
  );
}
