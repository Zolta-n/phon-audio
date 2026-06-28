"use client";
import { useState } from "react";
import Link from "next/link";
import type { UIComponent, ComponentCategory } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";
import ComponentCard from "./ComponentCard";

export default function ComponentSearch({ catalog }: { catalog: UIComponent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");

  const q = query.toLowerCase();
  const filtered = catalog.filter(c => {
    if (category !== "all" && c.category !== category) return false;
    if (q && !c.name.toLowerCase().includes(q) && !(c.manufacturer ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div>
      {/* Search bar + Add button */}
      <div style={{
        display: "flex",
        gap: "12px",
        marginBottom: "20px",
        alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="Search by name or brand..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 16px",
            fontSize: "0.9rem",
            border: "1.5px solid var(--pa-border)",
            borderRadius: "8px",
            background: "var(--pa-bg)",
            color: "var(--pa-text)",
            fontFamily: "var(--pa-font-ui)",
            outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "#d97706"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--pa-border)"; }}
        />
        <Link href="/components/add" style={{
          background: "#d97706",
          color: "#fff",
          border: "none",
          padding: "10px 20px",
          borderRadius: "8px",
          fontSize: "0.85rem",
          fontWeight: 600,
          textDecoration: "none",
          fontFamily: "var(--pa-font-ui)",
          whiteSpace: "nowrap",
        }}>
          + Add Component
        </Link>
      </div>

      {/* Category pills */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: "28px",
        flexWrap: "wrap",
      }}>
        <button
          onClick={() => setCategory("all")}
          style={{
            padding: "6px 16px",
            borderRadius: "20px",
            border: "1.5px solid",
            borderColor: category === "all" ? "#d97706" : "var(--pa-border)",
            background: category === "all" ? "#d97706" : "var(--pa-bg)",
            color: category === "all" ? "#fff" : "var(--pa-muted)",
            fontSize: "0.78rem",
            cursor: "pointer",
            fontFamily: "var(--pa-font-ui)",
            fontWeight: 500,
          }}
        >
          All ({catalog.length})
        </button>
        {CATEGORY_ORDER.map(cat => {
          const count = catalog.filter(c => c.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: "6px 16px",
                borderRadius: "20px",
                border: "1.5px solid",
                borderColor: category === cat ? "#d97706" : "var(--pa-border)",
                background: category === cat ? "#d97706" : "var(--pa-bg)",
                color: category === cat ? "#fff" : "var(--pa-muted)",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontFamily: "var(--pa-font-ui)",
                fontWeight: 500,
              }}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Results grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px",
      }}>
        {filtered.map(c => (
          <ComponentCard key={c.id} component={c} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "var(--pa-muted)",
          fontFamily: "var(--pa-font-ui)",
        }}>
          <div style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No components found</div>
          <div style={{ fontSize: "0.85rem" }}>
            Try a different search or{" "}
            <Link href="/components/add" style={{ color: "#d97706" }}>add a new component</Link>
          </div>
        </div>
      )}
    </div>
  );
}
