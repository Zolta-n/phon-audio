"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UIComponent } from "@/types";
import ScrapeWizard from "@/components/ScrapeWizard";
import ComponentForm from "@/components/ComponentForm";

type Tab = "import" | "manual";

export default function AddComponentPage() {
  const [tab, setTab] = useState<Tab>("import");
  const router = useRouter();

  const handleManualSave = async (component: UIComponent) => {
    const res = await fetch("/api/components", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(component),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Save failed");
    router.push(`/components/${data.id}`);
  };

  return (
    <div style={{ minHeight: "calc(100vh - var(--pa-nav-h))" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0f00, #3d2200)",
        padding: "48px 48px 40px",
        borderBottom: "1px solid rgba(217,119,6,0.2)",
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <h1 style={{
            fontFamily: "var(--pa-font-serif)",
            fontSize: "2rem",
            fontWeight: 700,
            color: "#faf5ee",
            marginBottom: "8px",
          }}>
            Add Component
          </h1>
          <p style={{
            fontSize: "0.95rem",
            color: "#d4b896",
            fontFamily: "var(--pa-font-ui)",
          }}>
            Import from a product URL or enter specs manually
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px" }}>
        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 0,
          border: "1.5px solid var(--pa-border)",
          borderRadius: "var(--pa-radius-md)",
          overflow: "hidden",
          marginBottom: "28px",
          width: "fit-content",
        }}>
          {([
            { key: "import" as Tab, label: "Import from URL" },
            { key: "manual" as Tab, label: "Manual Entry" },
          ]).map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "10px 24px",
                fontSize: "0.85rem",
                color: tab === t.key ? "#fff" : "var(--pa-muted)",
                background: tab === t.key ? "var(--pa-accent)" : "var(--pa-bg)",
                border: "none",
                borderRight: i === 0 ? "1.5px solid var(--pa-border)" : "none",
                cursor: "pointer",
                fontFamily: "var(--pa-font-ui)",
                fontWeight: tab === t.key ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "import" ? (
          <ScrapeWizard />
        ) : (
          <ComponentForm onSave={handleManualSave} mode="create" />
        )}
      </div>
    </div>
  );
}
