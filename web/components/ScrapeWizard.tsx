"use client";
import { useState } from "react";
import type { UIComponent } from "@/types";
import ComponentForm from "./ComponentForm";

type Step = "input" | "loading" | "review" | "done";

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  fontSize: "0.9rem",
  width: "auto",
};

type FindMode = "url" | "name";

export default function ScrapeWizard() {
  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<FindMode>("url");
  const [url, setUrl] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState<UIComponent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleScrape = async () => {
    setError(null);
    let payload: Record<string, string>;
    if (mode === "url") {
      if (!url.trim()) { setError("Please enter a URL"); return; }
      try { new URL(url); } catch { setError("Invalid URL format"); return; }
      payload = { url };
    } else {
      if (!manufacturer.trim() || !model.trim()) { setError("Enter both a brand and a model name"); return; }
      payload = { manufacturer: manufacturer.trim(), name: model.trim() };
    }

    setStep("loading");
    try {
      const res = await fetch("/api/components/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scraping failed");
      setScraped(data.component);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scraping failed");
      setStep("input");
    }
  };

  const handleSave = async (component: UIComponent) => {
    const res = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(component),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    setSavedId(data.id);
    setStep("done");
  };

  if (step === "loading") {
    return (
      <div style={{
        textAlign: "center",
        padding: "60px 20px",
      }}>
        <div style={{
          width: "40px", height: "40px",
          border: "3px solid var(--pa-border)",
          borderTopColor: "var(--pa-accent)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 20px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: "1rem", color: "var(--pa-text)", fontFamily: "var(--pa-font-ui)", marginBottom: "8px" }}>
          Extracting specs...
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", lineHeight: 1.7 }}>
          1. {mode === "url" ? "Fetching the manufacturer page" : "Searching the web for the product"}<br />
          2. Extracting specs with AI<br />
          3. Searching the web for missing parameters (reviews, measurements)<br />
          4. Merging results<br /><br />
          This may take 30-60 seconds.
        </div>
      </div>
    );
  }

  if (step === "review" && scraped) {
    return (
      <div>
        <div style={{
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "var(--pa-radius-md)",
          padding: "12px 16px",
          marginBottom: "20px",
          fontSize: "0.85rem",
          color: "#166534",
          fontFamily: "var(--pa-font-ui)",
        }}>
          Specs extracted successfully. Review and edit below, then save.
        </div>
        <ComponentForm initial={scraped} onSave={handleSave} mode="review" />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{
        textAlign: "center",
        padding: "60px 20px",
      }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>{"\u2713"}</div>
        <div style={{ fontSize: "1.1rem", color: "var(--pa-text)", fontFamily: "var(--pa-font-display)", marginBottom: "12px" }}>
          Component saved!
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <a href={`/components/${savedId}`} style={{
            background: "var(--pa-accent)", color: "#fff", padding: "10px 20px",
            borderRadius: "var(--pa-radius-md)", textDecoration: "none", fontSize: "0.85rem",
            fontFamily: "var(--pa-font-ui)", fontWeight: 600,
          }}>
            View Component
          </a>
          <button onClick={() => { setStep("input"); setUrl(""); setScraped(null); }} style={{
            background: "var(--pa-bg)", color: "var(--pa-text)", border: "1.5px solid var(--pa-border)",
            padding: "10px 20px", borderRadius: "var(--pa-radius-md)", fontSize: "0.85rem",
            fontFamily: "var(--pa-font-ui)", cursor: "pointer",
          }}>
            Add Another
          </button>
        </div>
      </div>
    );
  }

  // step === "input"
  const toggleBtn = (m: FindMode): React.CSSProperties => ({
    padding: "6px 14px",
    fontSize: "0.82rem",
    color: mode === m ? "#fff" : "var(--pa-muted)",
    background: mode === m ? "var(--pa-accent)" : "var(--pa-bg)",
    border: "1.5px solid var(--pa-border)",
    borderRadius: "var(--pa-radius-sm)",
    cursor: "pointer",
    fontFamily: "var(--pa-font-ui)",
    fontWeight: mode === m ? 600 : 400,
  });

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
        <button onClick={() => { setMode("url"); setError(null); }} style={toggleBtn("url")}>Have a URL</button>
        <button onClick={() => { setMode("name"); setError(null); }} style={toggleBtn("name")}>Find by brand + model</button>
      </div>
      <p style={{
        fontSize: "0.88rem",
        color: "var(--pa-muted)",
        fontFamily: "var(--pa-font-ui)",
        marginBottom: "16px",
        lineHeight: 1.6,
      }}>
        {mode === "url"
          ? "Paste a product page URL from the manufacturer's website. The system extracts specs automatically using AI."
          : "Enter the brand and model — no URL needed. The system searches the web for specs and measurements automatically using AI."}
      </p>
      {mode === "url" ? (
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="url"
            className="pa-input" style={inputStyle}
            placeholder="https://www.schiit.com/products/modi"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScrape()}
          />
          <button onClick={handleScrape} className="pa-btn pa-btn-primary" style={{ padding: "10px 24px", fontSize: "0.88rem", whiteSpace: "nowrap" }}>
            Find Specs
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            className="pa-input" style={{ ...inputStyle, flex: "0 0 34%" }}
            placeholder="Brand (e.g. SMSL)"
            value={manufacturer}
            onChange={e => setManufacturer(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScrape()}
          />
          <input
            className="pa-input" style={inputStyle}
            placeholder="Model (e.g. SU-9)"
            value={model}
            onChange={e => setModel(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScrape()}
          />
          <button onClick={handleScrape} className="pa-btn pa-btn-primary" style={{ padding: "10px 24px", fontSize: "0.88rem", whiteSpace: "nowrap" }}>
            Find Specs
          </button>
        </div>
      )}
      {error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--pa-radius-md)",
          padding: "10px 14px", color: "#c0392b", fontSize: "0.82rem",
          fontFamily: "var(--pa-font-ui)", marginTop: "12px",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
