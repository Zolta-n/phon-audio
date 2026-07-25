"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { UIComponent } from "@/types";
import ComponentForm from "@/components/ComponentForm";

export default function RecollectComponentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [component, setComponent] = useState<UIComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount, re-collect: fills only currently-empty fields with the new tools.
  useEffect(() => {
    fetch(`/api/components/${id}/recollect`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Re-collect failed");
        return data.component as UIComponent;
      })
      .then((c) => { setComponent(c); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [id]);

  const handleSave = async (updated: UIComponent) => {
    const res = await fetch(`/api/components/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Update failed");
    router.push(`/components/${id}`);
  };

  return (
    <div style={{ minHeight: "calc(100vh - var(--pa-nav-h))" }}>
      {/* Header */}
      <div className="pa-page-header pa-page-header--glow-left" style={{ padding: "44px 56px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", position: "relative" }}>
          <div className="pa-kicker" style={{ marginBottom: "14px" }}>
            <span>The Library</span>
          </div>
          <h1 style={{
            fontFamily: "var(--pa-font-display)",
            fontSize: "2.4rem",
            fontWeight: 500,
            color: "var(--pa-text-on-dark)",
            margin: "0 0 10px",
          }}>
            Re-collect Component
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--pa-lede)", margin: 0, fontStyle: "italic" }}>
            {component ? component.name : "Re-collecting fresh from the web…"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
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
              Re-collecting specs…
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)", lineHeight: 1.7 }}>
              Re-collecting from scratch with the current tools — review the result before saving.<br />
              This may take 30-60 seconds.
            </div>
          </div>
        ) : error ? (
          <div style={{
            background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--pa-radius-md)",
            padding: "16px", color: "#c0392b", fontSize: "0.9rem", fontFamily: "var(--pa-font-ui)",
          }}>
            {error}
          </div>
        ) : component ? (
          <div>
            <div style={{
              background: "#dcfce7", border: "1px solid #86efac", borderRadius: "var(--pa-radius-md)",
              padding: "12px 16px", marginBottom: "20px", fontSize: "0.85rem",
              color: "#166534", fontFamily: "var(--pa-font-ui)",
            }}>
              Re-collected fresh — review below and save to update the component. This replaces the current specs, so double-check anything you previously corrected by hand.
            </div>
            <ComponentForm initial={component} onSave={handleSave} mode="review" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
