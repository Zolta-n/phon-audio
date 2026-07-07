"use client";
import { useState } from "react";
import type { UIComponent, Port, ComponentCategory, DacSection } from "@/types";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/types";
import PortEditor from "./PortEditor";
import { toKebabCase } from "@/lib/strings";

interface ComponentFormProps {
  initial?: Partial<UIComponent>;
  onSave: (component: UIComponent) => Promise<void>;
  mode: "create" | "edit" | "review";
}

const defaultPort: Port = {
  domain: "line",
  connector: "rca",
  balanced: false,
  specs: { kind: "line_in" } as Port["specs"],
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 14px",
  fontSize: "0.88rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pa-muted)",
  fontFamily: "var(--pa-font-ui)",
  marginBottom: "4px",
  display: "block",
  fontWeight: 600,
};

export default function ComponentForm({ initial, onSave, mode }: ComponentFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [manufacturer, setManufacturer] = useState(initial?.manufacturer ?? "");
  const [category, setCategory] = useState<ComponentCategory>(initial?.category ?? "dac");
  const [notes, setNotes] = useState(initial?.note ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [inputs, setInputs] = useState<Port[]>(initial?.inputs ?? []);
  const [outputs, setOutputs] = useState<Port[]>(initial?.outputs ?? []);
  const [dac, setDac] = useState<DacSection>(initial?.dac ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoId = toKebabCase(`${manufacturer} ${name}`);

  const handleSave = async () => {
    setError(null);
    const componentId = id || autoId;
    if (!name.trim()) { setError("Name is required"); return; }
    if (!componentId) { setError("ID is required"); return; }

    const hasDacSpecs = Object.values(dac).some((v) => v !== undefined && v !== null && v !== "");
    const component: UIComponent = {
      id: componentId,
      name: name.trim(),
      category,
      inputs,
      outputs,
      dac: hasDacSpecs ? dac : undefined,
      note: notes.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
    };

    setSaving(true);
    try {
      await onSave(component);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addPort = (direction: "input" | "output") => {
    const kind = direction === "input" ? "line_in" : "line_out";
    const port: Port = { ...defaultPort, specs: { kind } as Port["specs"] };
    if (direction === "input") setInputs([...inputs, port]);
    else setOutputs([...outputs, port]);
  };

  const updateInput = (i: number, p: Port) => { const n = [...inputs]; n[i] = p; setInputs(n); };
  const updateOutput = (i: number, p: Port) => { const n = [...outputs]; n[i] = p; setOutputs(n); };
  const removeInput = (i: number) => setInputs(inputs.filter((_, j) => j !== i));
  const removeOutput = (i: number) => setOutputs(outputs.filter((_, j) => j !== i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Basic info */}
      <div style={{
        background: "var(--pa-cream)",
        border: "1px solid var(--pa-border)",
        borderRadius: "var(--pa-radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}>
        <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.05rem", color: "var(--pa-text)", fontWeight: 600 }}>
          Basic Information
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <span style={labelStyle}>Name</span>
            <input type="text" className="pa-input" style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Modi 5" />
          </div>
          <div>
            <span style={labelStyle}>Manufacturer</span>
            <input type="text" className="pa-input" style={inputStyle} value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="e.g. Schiit Audio" />
          </div>
          <div>
            <span style={labelStyle}>Category</span>
            <select className="pa-input" style={inputStyle} value={category} onChange={e => setCategory(e.target.value as ComponentCategory)}>
              {CATEGORY_ORDER.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={labelStyle}>ID {mode === "edit" ? "(read-only)" : ""}</span>
            <input
              type="text"
              className="pa-input" style={{ ...inputStyle, ...(mode === "edit" ? { opacity: 0.6 } : {}) }}
              value={id || autoId}
              onChange={e => setId(e.target.value)}
              readOnly={mode === "edit"}
              placeholder="auto-generated-from-name"
            />
          </div>
        </div>
        <div>
          <span style={labelStyle}>Notes</span>
          <textarea
            className="pa-input" style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes or caveats..."
          />
        </div>
      </div>

      {/* Inputs */}
      <div style={{
        background: "var(--pa-cream)",
        border: "1px solid var(--pa-border)",
        borderRadius: "var(--pa-radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.05rem", color: "var(--pa-text)", fontWeight: 600 }}>
            Inputs ({inputs.length})
          </div>
          <button onClick={() => addPort("input")} style={{
            background: "var(--pa-accent)", color: "#fff", border: "none", padding: "6px 14px",
            borderRadius: "var(--pa-radius-md)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "var(--pa-font-ui)", fontWeight: 600,
          }}>
            + Add Input
          </button>
        </div>
        {inputs.map((p, i) => (
          <PortEditor key={i} port={p} direction="input" onChange={p => updateInput(i, p)} onRemove={() => removeInput(i)} componentName={`${manufacturer} ${name}`.trim()} />
        ))}
        {inputs.length === 0 && (
          <div style={{ fontSize: "0.82rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", padding: "8px 0" }}>
            No inputs defined. Click &quot;+ Add Input&quot; to add one.
          </div>
        )}
      </div>

      {/* Outputs */}
      <div style={{
        background: "var(--pa-cream)",
        border: "1px solid var(--pa-border)",
        borderRadius: "var(--pa-radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.05rem", color: "var(--pa-text)", fontWeight: 600 }}>
            Outputs ({outputs.length})
          </div>
          <button onClick={() => addPort("output")} style={{
            background: "var(--pa-accent)", color: "#fff", border: "none", padding: "6px 14px",
            borderRadius: "var(--pa-radius-md)", fontSize: "0.78rem", cursor: "pointer", fontFamily: "var(--pa-font-ui)", fontWeight: 600,
          }}>
            + Add Output
          </button>
        </div>
        {outputs.map((p, i) => (
          <PortEditor key={i} port={p} direction="output" onChange={p => updateOutput(i, p)} onRemove={() => removeOutput(i)} componentName={`${manufacturer} ${name}`.trim()} />
        ))}
        {outputs.length === 0 && (
          <div style={{ fontSize: "0.82rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", padding: "8px 0" }}>
            No outputs defined. Click &quot;+ Add Output&quot; to add one.
          </div>
        )}
      </div>

      {/* D/A stage (optional) — feeds the engine's conversion-placement ranking */}
      <div style={{
        background: "var(--pa-cream)",
        border: "1px solid var(--pa-border)",
        borderRadius: "var(--pa-radius-lg)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.05rem", color: "var(--pa-text)", fontWeight: 600 }}>
          D/A Stage (optional)
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)" }}>
          Fill in when the device converts digital to analog (DAC, streamer with analog out, amp with digital in).
          Used to rank where conversion should happen in a chain — never for pass/fail verdicts.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
          {([
            ["dynamicRangeDb", "Dynamic Range / SNR (dB)", "e.g. 120"],
            ["thdPlusNPct", "THD+N (%)", "e.g. 0.0004"],
            ["intrinsicJitterPs", "Clock Jitter (ps RMS)", "e.g. 20"],
            ["clockAccuracyPpm", "Clock Accuracy (ppm)", "e.g. 10"],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key}>
              <span style={labelStyle}>{label}</span>
              <input
                type="number"
                step="any"
                className="pa-input"
                style={inputStyle}
                placeholder={placeholder}
                value={dac[key] ?? ""}
                onChange={e => setDac({ ...dac, [key]: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
          ))}
          <div>
            <span style={labelStyle}>Chipset</span>
            <input
              type="text"
              className="pa-input"
              style={inputStyle}
              placeholder="e.g. ES9039Q2M"
              value={dac.chipset ?? ""}
              onChange={e => setDac({ ...dac, chipset: e.target.value || undefined })}
            />
          </div>
        </div>
      </div>

      {/* Error + Save */}
      {error && (
        <div style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "var(--pa-radius-md)",
          padding: "10px 14px",
          color: "#c0392b",
          fontSize: "0.85rem",
          fontFamily: "var(--pa-font-ui)",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background: saving ? "var(--pa-accent-hover)" : "var(--pa-accent)",
          color: "#fff",
          border: "none",
          padding: "14px 32px",
          borderRadius: "var(--pa-radius-md)",
          fontSize: "1rem",
          fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          fontFamily: "var(--pa-font-ui)",
          alignSelf: "flex-start",
        }}
      >
        {saving ? "Saving..." : mode === "edit" ? "Update Component" : "Save Component"}
      </button>
    </div>
  );
}
