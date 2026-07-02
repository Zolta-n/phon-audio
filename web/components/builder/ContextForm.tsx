"use client";

import type { ContextSettings } from "@/types";

/** Room/listening context sliders. */
export default function ContextForm({
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
    ticks?: (string | number)[],
  ) => {
    const pct = ((ctx[key] - min) / (max - min)) * 100;
    const tickLabels = ticks ?? [min, Math.round((min + max) / 2), max];
    return (
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.78rem", color: "#7c5a3a", fontFamily: "var(--pa-font-ui)" }}>
            {label}
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e", fontFamily: "var(--pa-font-ui)" }}>
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
          style={{ width: "100%", cursor: "pointer", margin: "2px 0", "--pct": `${pct}%` } as React.CSSProperties}
        />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 2px", marginTop: "2px" }}>
          {tickLabels.map((t, i) => (
            <span key={i} style={{ fontSize: "0.55rem", color: "#b45309", fontFamily: "var(--pa-font-ui)" }}>
              {typeof t === "number" ? `${t}${unit}` : t}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {slider("Target SPL", "targetSplDb", 60, 100, 1, " dB", ["60", "70", "80", "90", "100"])}
      {slider("Headroom", "crestFactorDb", 6, 30, 1, " dB", ["6", "12", "18", "24", "30"])}
      {slider("Distance", "distanceM", 0.5, 8, 0.5, " m", ["0.5m", "2m", "4m", "6m", "8m"])}
      {slider("Room gain", "roomGainDb", 0, 12, 1, " dB", ["0", "3", "6", "9", "12"])}
    </>
  );
}
