"use client";
import { useState } from "react";
import type { Port } from "@/types";

type Direction = "input" | "output";

const CONNECTORS = ["usb", "coax", "optical", "aes", "i2s", "rca", "xlr", "trs", "xlr4", "speaker_binding"] as const;
const DOMAINS = ["digital", "line", "phono", "speaker", "headphone"] as const;

function getKind(domain: string, direction: Direction): string {
  if (domain === "digital") return direction === "input" ? "digital_in" : "digital_out";
  if (domain === "line") return direction === "input" ? "line_in" : "line_out";
  if (domain === "phono") return direction === "input" ? "phono_in" : "phono_out";
  if (domain === "speaker") return direction === "input" ? "speaker_load" : "speaker_out";
  if (domain === "headphone") return direction === "input" ? "headphone_load" : "headphone_out";
  return "line_in";
}

/** Tips for where to find each spec value */
const SPEC_TIPS: Record<string, { where: string; how: string; impact: string }> = {
  inputImpedanceOhm_line: {
    where: "Product manual PDF (specs page) or AudioScienceReview.com measurements",
    how: "Search for 'input impedance' in the manual. Typical values: 10k\u201347k\u2126 for line, 47k\u2126 for phono.",
    impact: "Used for impedance bridging check \u2014 ensures the source can drive this input without signal loss.",
  },
  inputSensitivityVrms: {
    where: "Product manual \u2014 often listed as 'sensitivity' or 'input level for full output'",
    how: "Look for a value in mV or Vrms. If in mV, divide by 1000. Typical: 0.5\u20132 Vrms for line inputs.",
    impact: "Used for gain staging \u2014 checks if the upstream device can reach full output.",
  },
  maxInputVrms: {
    where: "Product manual \u2014 listed as 'maximum input level' or 'input overload'",
    how: "Rarely published. If not found, leave empty \u2014 the engine will skip the overload check.",
    impact: "Checks if the source could clip this input at max volume.",
  },
  outputImpedanceOhm_line: {
    where: "AudioScienceReview.com measurements (most reliable) or product manual",
    how: "Search ASR for '[product name] review'. Look for 'output impedance' in the measurements table.",
    impact: "Critical for impedance bridging and cable HF rolloff calculations.",
  },
  maxOutputVrms: {
    where: "AudioScienceReview.com or manual \u2014 listed as 'max output voltage' or 'output level'",
    how: "ASR measures this directly. Manual may list it as 'X Vrms' or 'X V'. Typical: 2\u20134 Vrms for DACs.",
    impact: "Used for gain staging \u2014 checks if this output can drive the next stage to full power.",
  },
  gainDb: {
    where: "Product manual or ASR measurements",
    how: "Look for 'voltage gain' in dB. For preamps: 10\u201320 dB. For power amps: 26\u201332 dB.",
    impact: "Used for system gain structure check \u2014 too much total gain creates noise issues.",
  },
  outputImpedanceOhm_speaker: {
    where: "ASR measurements \u2014 often derived from damping factor",
    how: "If damping factor is given: output impedance = 8 / damping_factor. E.g., DF=100 \u2192 0.08\u2126.",
    impact: "Used for damping factor calculation with speakers.",
  },
  outputImpedanceOhm_hp: {
    where: "ASR measurements, Head-Fi reviews, or product spec sheet",
    how: "Search for 'output impedance'. Typical: <1\u2126 (good) to 10+\u2126 (tube amps).",
    impact: "Critical \u2014 output impedance should be \u2264\u215b of headphone impedance for flat response.",
  },
  maxVrms_hp: {
    where: "ASR measurements \u2014 measured as 'max output voltage before clipping'",
    how: "Look in ASR review under 'output power' or 'voltage swing' measurements.",
    impact: "Determines if the amp can drive high-impedance headphones loud enough.",
  },
  maxCurrentMa_hp: {
    where: "ASR measurements or derived from power specs",
    how: "If power is given: I = sqrt(P/R). E.g., 1W into 32\u2126 = 177mA. Or look for 'max current output'.",
    impact: "Determines if the amp can drive low-impedance headphones/IEMs.",
  },
};

function getSpecTipKey(kind: string, field: string): string {
  if (field === "inputImpedanceOhm" && kind === "line_in") return "inputImpedanceOhm_line";
  if (field === "outputImpedanceOhm" && kind === "speaker_out") return "outputImpedanceOhm_speaker";
  if (field === "outputImpedanceOhm" && kind === "headphone_out") return "outputImpedanceOhm_hp";
  if (field === "outputImpedanceOhm" && kind === "line_out") return "outputImpedanceOhm_line";
  if (field === "maxVrms") return "maxVrms_hp";
  if (field === "maxCurrentMa") return "maxCurrentMa_hp";
  return field;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: "0.82rem",
  border: "1.5px solid var(--pa-border)",
  borderRadius: "6px",
  background: "var(--pa-bg)",
  color: "var(--pa-text)",
  fontFamily: "var(--pa-font-ui)",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.72rem",
  color: "var(--pa-muted)",
  fontFamily: "var(--pa-font-ui)",
  marginBottom: "2px",
  display: "block",
};

const tipStyle: React.CSSProperties = {
  fontSize: "0.68rem",
  color: "#92400e",
  fontFamily: "var(--pa-font-ui)",
  lineHeight: 1.4,
  padding: "6px 8px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  borderRadius: "4px",
  marginTop: "4px",
};

function NumField({ label, value, onChange, placeholder, tip }: {
  label: string; value: number | null | undefined;
  onChange: (v: number | null) => void; placeholder?: string;
  tip?: { where: string; how: string; impact: string } | undefined;
}) {
  const [showTip, setShowTip] = useState(false);
  const isEmpty = value == null || value === undefined;
  return (
    <div style={{ flex: 1, minWidth: "100px" }}>
      <span style={labelStyle}>
        {label}
        {isEmpty && tip && (
          <button
            onClick={() => setShowTip(!showTip)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#d97706", fontSize: "0.68rem", marginLeft: "4px",
              fontFamily: "var(--pa-font-ui)", textDecoration: "underline",
              padding: 0,
            }}
          >
            {showTip ? "hide tip" : "where to find?"}
          </button>
        )}
      </span>
      <input
        type="number"
        step="any"
        style={inputStyle}
        placeholder={placeholder ?? ""}
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
      {showTip && tip && (
        <div style={tipStyle}>
          <strong>Where:</strong> {tip.where}<br />
          <strong>How:</strong> {tip.how}<br />
          <strong>Impact if missing:</strong> {tip.impact}
        </div>
      )}
    </div>
  );
}

interface PortEditorProps {
  port: Port;
  direction: Direction;
  onChange: (p: Port) => void;
  onRemove: () => void;
  /** Component name for generating search links */
  componentName?: string;
}

export default function PortEditor({ port, direction, onChange, onRemove, componentName }: PortEditorProps) {
  const specs = (port.specs ?? {}) as Record<string, unknown>;
  const kind = getKind(port.domain, direction);

  const updateSpec = (key: string, val: unknown) => {
    onChange({ ...port, specs: { ...specs, kind, [key]: val } });
  };

  const setDomain = (d: string) => {
    const newKind = getKind(d, direction);
    onChange({ ...port, domain: d as Port["domain"], specs: { kind: newKind } as Port["specs"] });
  };

  return (
    <div style={{
      border: "1px solid var(--pa-border)",
      borderRadius: "8px",
      padding: "14px",
      background: "#fff8f0",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      {/* Top row: domain, connector, balanced, remove */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ minWidth: "120px" }}>
          <span style={labelStyle}>Domain</span>
          <select
            style={inputStyle}
            value={port.domain}
            onChange={e => setDomain(e.target.value)}
          >
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={{ minWidth: "120px" }}>
          <span style={labelStyle}>Connector</span>
          <select
            style={inputStyle}
            value={port.connector}
            onChange={e => onChange({ ...port, connector: e.target.value as Port["connector"] })}
          >
            {CONNECTORS.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--pa-text)", fontFamily: "var(--pa-font-ui)", paddingBottom: "6px" }}>
          <input
            type="checkbox"
            checked={port.balanced}
            onChange={e => onChange({ ...port, balanced: e.target.checked })}
          />
          Balanced
        </label>
        <button
          onClick={onRemove}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "1px solid #e8d5b7",
            borderRadius: "6px",
            color: "#c0392b",
            padding: "4px 10px",
            fontSize: "0.78rem",
            cursor: "pointer",
            fontFamily: "var(--pa-font-ui)",
          }}
        >
          Remove
        </button>
      </div>

      {/* Spec fields based on kind */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {kind === "digital_in" || kind === "digital_out" ? (
          <>
            <NumField label="Max Sample Rate (kHz)" value={specs.maxSampleRateKhz as number | null} onChange={v => updateSpec("maxSampleRateKhz", v)} />
            <NumField label="Max Bit Depth" value={specs.maxBitDepth as number | null} onChange={v => updateSpec("maxBitDepth", v)} />
            <div style={{ minWidth: "120px" }}>
              <span style={labelStyle}>Formats</span>
              <div style={{ display: "flex", gap: "10px", paddingTop: "6px" }}>
                {["pcm", "dsd"].map(fmt => {
                  const formats = (specs.formats as string[] | undefined) ?? ["pcm"];
                  const checked = formats.includes(fmt);
                  return (
                    <label key={fmt} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.78rem", fontFamily: "var(--pa-font-ui)", color: "var(--pa-text)" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...formats, fmt]
                            : formats.filter(f => f !== fmt);
                          updateSpec("formats", next.length ? next : ["pcm"]);
                        }}
                      />
                      {fmt.toUpperCase()}
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        ) : kind === "line_in" ? (
          <>
            <NumField label="Input Impedance (\u2126)" value={specs.inputImpedanceOhm as number | null} onChange={v => updateSpec("inputImpedanceOhm", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "inputImpedanceOhm")]} />
            <NumField label="Input Sensitivity (Vrms)" value={specs.inputSensitivityVrms as number | null} onChange={v => updateSpec("inputSensitivityVrms", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "inputSensitivityVrms")]} />
            <NumField label="Max Input (Vrms)" value={specs.maxInputVrms as number | null} onChange={v => updateSpec("maxInputVrms", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "maxInputVrms")]} />
          </>
        ) : kind === "line_out" ? (
          <>
            <NumField label="Output Impedance (\u2126)" value={specs.outputImpedanceOhm as number | null} onChange={v => updateSpec("outputImpedanceOhm", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "outputImpedanceOhm")]} />
            <NumField label="Max Output (Vrms)" value={specs.maxOutputVrms as number | null} onChange={v => updateSpec("maxOutputVrms", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "maxOutputVrms")]} />
            <NumField label="Gain (dB)" value={specs.gainDb as number | null} onChange={v => updateSpec("gainDb", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "gainDb")]} />
          </>
        ) : kind === "phono_out" ? (
          <>
            <div style={{ minWidth: "120px" }}>
              <span style={labelStyle}>Cartridge Type</span>
              <select style={inputStyle} value={(specs.cartridgeType as string) ?? "mm"} onChange={e => updateSpec("cartridgeType", e.target.value)}>
                <option value="mm">MM (Moving Magnet)</option>
                <option value="mc">MC (Moving Coil)</option>
              </select>
            </div>
            <NumField label="Output Voltage (mV)" value={specs.outputVoltageMv as number | null} onChange={v => updateSpec("outputVoltageMv", v)} placeholder="e.g. 5" />
            <NumField label="Internal Impedance (\u2126)" value={specs.internalImpedanceOhm as number | null} onChange={v => updateSpec("internalImpedanceOhm", v)} />
            <NumField label="Rec. Load Impedance (\u2126)" value={specs.recommendedLoadImpedanceOhm as number | null} onChange={v => updateSpec("recommendedLoadImpedanceOhm", v)} placeholder="47000" />
            <NumField label="Rec. Load Capacitance (pF)" value={specs.recommendedLoadCapacitancePf as number | null} onChange={v => updateSpec("recommendedLoadCapacitancePf", v)} placeholder="100-300" />
          </>
        ) : kind === "phono_in" ? (
          <>
            <div style={{ minWidth: "120px" }}>
              <span style={labelStyle}>Accepts</span>
              <select style={inputStyle} value={(specs.cartridgeType as string) ?? "both"} onChange={e => updateSpec("cartridgeType", e.target.value)}>
                <option value="mm">MM only</option>
                <option value="mc">MC only</option>
                <option value="both">MM + MC</option>
              </select>
            </div>
            <NumField label="Input Impedance (\u2126)" value={specs.inputImpedanceOhm as number | null} onChange={v => updateSpec("inputImpedanceOhm", v)} placeholder="47000" />
            <NumField label="Input Capacitance (pF)" value={specs.inputCapacitancePf as number | null} onChange={v => updateSpec("inputCapacitancePf", v)} />
            <NumField label="Gain (dB)" value={specs.gainDb as number | null} onChange={v => updateSpec("gainDb", v)} placeholder="40" />
          </>
        ) : kind === "speaker_out" ? (
          <>
            <NumField label="Output Impedance (\u2126)" value={specs.outputImpedanceOhm as number | null} onChange={v => updateSpec("outputImpedanceOhm", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "outputImpedanceOhm")]} />
            <NumField label="Min Load Impedance (\u2126)" value={specs.ratedMinImpedanceOhm as number | null} onChange={v => updateSpec("ratedMinImpedanceOhm", v)} />
            <NumField label="Gain (dB)" value={specs.gainDb as number | null} onChange={v => updateSpec("gainDb", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "gainDb")]} />
            <NumField label="Input Sensitivity (Vrms)" value={specs.inputSensitivityVrms as number | null} onChange={v => updateSpec("inputSensitivityVrms", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "inputSensitivityVrms")]} />
            <div style={{ width: "100%" }}>
              <span style={labelStyle}>Power (W) at impedance</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {((specs.powerW as { ohm: number; watts: number }[] | undefined) ?? [{ ohm: 8, watts: 0 }]).map((pw, i, arr) => (
                  <div key={i} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input type="number" step="any" placeholder="ohm" style={{ ...inputStyle, width: "60px" }} value={pw.ohm || ""} onChange={e => {
                      const next = [...arr]; next[i] = { ...pw, ohm: Number(e.target.value) }; updateSpec("powerW", next);
                    }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--pa-muted)" }}>\u2126 @</span>
                    <input type="number" step="any" placeholder="watts" style={{ ...inputStyle, width: "70px" }} value={pw.watts || ""} onChange={e => {
                      const next = [...arr]; next[i] = { ...pw, watts: Number(e.target.value) }; updateSpec("powerW", next);
                    }} />
                    <span style={{ fontSize: "0.72rem", color: "var(--pa-muted)" }}>W</span>
                    {i === arr.length - 1 && (
                      <button onClick={() => updateSpec("powerW", [...arr, { ohm: 4, watts: 0 }])} style={{ background: "none", border: "1px solid var(--pa-border)", borderRadius: "4px", padding: "2px 8px", fontSize: "0.72rem", cursor: "pointer", color: "#d97706" }}>+</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : kind === "headphone_out" ? (
          <>
            <NumField label="Output Impedance (\u2126)" value={specs.outputImpedanceOhm as number | null} onChange={v => updateSpec("outputImpedanceOhm", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "outputImpedanceOhm")]} />
            <NumField label="Max Vrms" value={specs.maxVrms as number | null} onChange={v => updateSpec("maxVrms", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "maxVrms")]} />
            <NumField label="Max Current (mA)" value={specs.maxCurrentMa as number | null} onChange={v => updateSpec("maxCurrentMa", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "maxCurrentMa")]} />
            <NumField label="Gain (dB)" value={specs.gainDb as number | null} onChange={v => updateSpec("gainDb", v)} tip={SPEC_TIPS[getSpecTipKey(kind, "gainDb")]} />
          </>
        ) : kind === "headphone_load" ? (
          <>
            <NumField label="Nominal Impedance (\u2126)" value={specs.nominalImpedanceOhm as number | null} onChange={v => updateSpec("nominalImpedanceOhm", v)} />
            <NumField label="Sensitivity (value)" value={(specs.sensitivity as { value?: number })?.value ?? null} onChange={v => updateSpec("sensitivity", { value: v, unit: (specs.sensitivity as { unit?: string })?.unit ?? "dB/mW" })} />
            <div style={{ minWidth: "100px" }}>
              <span style={labelStyle}>Sensitivity unit</span>
              <select style={inputStyle} value={(specs.sensitivity as { unit?: string })?.unit ?? "dB/mW"} onChange={e => updateSpec("sensitivity", { value: (specs.sensitivity as { value?: number })?.value ?? null, unit: e.target.value })}>
                <option value="dB/mW">dB/mW</option>
                <option value="dB/V">dB/V</option>
              </select>
            </div>
          </>
        ) : kind === "speaker_load" ? (
          <>
            <NumField label="Nominal Impedance (\u2126)" value={specs.nominalImpedanceOhm as number | null} onChange={v => updateSpec("nominalImpedanceOhm", v)} />
            <NumField label="Min Impedance (\u2126)" value={specs.minImpedanceOhm as number | null} onChange={v => updateSpec("minImpedanceOhm", v)} />
            <NumField label="Sensitivity (dB @ 2.83V/1m)" value={specs.sensitivityDb_2_83V_1m as number | null} onChange={v => updateSpec("sensitivityDb_2_83V_1m", v)} />
            <NumField label="Power Handling (W)" value={specs.powerHandlingW as number | null} onChange={v => updateSpec("powerHandlingW", v)} />
          </>
        ) : null}
      </div>

      {/* Search links for finding missing specs */}
      {componentName && hasEmptySpecs(kind, specs) && (
        <div style={{
          fontSize: "0.7rem",
          color: "var(--pa-muted)",
          fontFamily: "var(--pa-font-ui)",
          borderTop: "1px dashed var(--pa-border)",
          paddingTop: "8px",
          lineHeight: 1.6,
        }}>
          <span style={{ color: "#92400e", fontWeight: 600 }}>Missing specs?</span>{" "}
          <a
            href={`https://www.audiosciencereview.com/forum/index.php?search/${encodeURIComponent(componentName)}/&o=relevance`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d97706", textDecoration: "underline" }}
          >
            Search AudioScienceReview
          </a>
          {" \u00B7 "}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(componentName + " specifications impedance measurements")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d97706", textDecoration: "underline" }}
          >
            Google specs
          </a>
          {" \u00B7 "}
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(componentName + " manual PDF specifications")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#d97706", textDecoration: "underline" }}
          >
            Find manual PDF
          </a>
        </div>
      )}
    </div>
  );
}

function hasEmptySpecs(kind: string, specs: Record<string, unknown>): boolean {
  const fields: Record<string, string[]> = {
    line_in: ["inputImpedanceOhm", "inputSensitivityVrms"],
    line_out: ["outputImpedanceOhm", "maxOutputVrms"],
    speaker_out: ["outputImpedanceOhm", "gainDb"],
    headphone_out: ["outputImpedanceOhm", "maxVrms", "maxCurrentMa"],
  };
  const expected = fields[kind];
  if (!expected) return false;
  return expected.some(f => specs[f] == null);
}
