"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import type { UIComponent } from "@/types";
import ComponentForm from "@/components/ComponentForm";

export default function EditComponentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [component, setComponent] = useState<UIComponent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/components/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Component not found");
        return res.json();
      })
      .then(data => { setComponent(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
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
            Edit Component
          </h1>
          <p style={{
            fontSize: "0.95rem",
            color: "#d4b896",
            fontFamily: "var(--pa-font-ui)",
          }}>
            {component ? component.name : "Loading..."}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--pa-muted)", fontFamily: "var(--pa-font-ui)" }}>
            Loading component...
          </div>
        ) : error ? (
          <div style={{
            background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "var(--pa-radius-md)",
            padding: "16px", color: "#c0392b", fontSize: "0.9rem", fontFamily: "var(--pa-font-ui)",
          }}>
            {error}
          </div>
        ) : component ? (
          <ComponentForm initial={component} onSave={handleSave} mode="edit" />
        ) : null}
      </div>
    </div>
  );
}
