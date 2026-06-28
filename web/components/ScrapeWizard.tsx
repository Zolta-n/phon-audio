"use client";
import { useState } from "react";
import type { UIComponent } from "@/types";
import ComponentForm from "./ComponentForm";

type Step = "input" | "loading" | "review" | "done";

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  fontSize: "0.9rem",
  border: "1.5px solid var(--pa-border)",
  borderRadius: "8px",
  background: "var(--pa-bg)",
  color: "var(--pa-text)",
  fontFamily: "var(--pa-font-ui)",
  outline: "none",
};

export default function ScrapeWizard() {
  const [step, setStep] = useState<Step>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scraped, setScraped] = useState<UIComponent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleScrape = async () => {
    setError(null);
    if (!url.trim()) { setError("Please enter a URL"); return; }
    try { new URL(url); } catch { setError("Invalid URL format"); return; }

    setStep("loading");
    try {
      const res = await fetch("/api/components/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
          borderTopColor: "#d97706",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 20px",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: "1rem", color: "var(--pa-text)", fontFamily: "var(--pa-font-ui)", marginBottom: "8px" }}>
          Extracting specs...
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", lineHeight: 1.7 }}>
          1. Fetching the manufacturer page<br />
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
          borderRadius: "8px",
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
        <div style={{ fontSize: "1.1rem", color: "var(--pa-text)", fontFamily: "Georgia, serif", marginBottom: "12px" }}>
          Component saved!
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <a href={`/components/${savedId}`} style={{
            background: "#d97706", color: "#fff", padding: "10px 20px",
            borderRadius: "8px", textDecoration: "none", fontSize: "0.85rem",
            fontFamily: "var(--pa-font-ui)", fontWeight: 600,
          }}>
            View Component
          </a>
          <button onClick={() => { setStep("input"); setUrl(""); setScraped(null); }} style={{
            background: "var(--pa-bg)", color: "var(--pa-text)", border: "1.5px solid var(--pa-border)",
            padding: "10px 20px", borderRadius: "8px", fontSize: "0.85rem",
            fontFamily: "var(--pa-font-ui)", cursor: "pointer",
          }}>
            Add Another
          </button>
        </div>
      </div>
    );
  }

  // step === "input"
  return (
    <div>
      <p style={{
        fontSize: "0.88rem",
        color: "var(--pa-muted)",
        fontFamily: "var(--pa-font-ui)",
        marginBottom: "16px",
        lineHeight: 1.6,
      }}>
        Paste a product page URL from the manufacturer&apos;s website. The system will extract specs automatically using AI.
      </p>
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          type="url"
          style={inputStyle}
          placeholder="https://www.schiit.com/products/modi"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleScrape()}
          onFocus={e => { e.currentTarget.style.borderColor = "#d97706"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--pa-border)"; }}
        />
        <button onClick={handleScrape} style={{
          background: "#d97706", color: "#fff", border: "none",
          padding: "10px 24px", borderRadius: "8px", fontSize: "0.88rem",
          fontWeight: 600, cursor: "pointer", fontFamily: "var(--pa-font-ui)",
          whiteSpace: "nowrap",
        }}>
          Find Specs
        </button>
      </div>
      {error && (
        <div style={{
          background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px",
          padding: "10px 14px", color: "#c0392b", fontSize: "0.82rem",
          fontFamily: "var(--pa-font-ui)", marginTop: "12px",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
