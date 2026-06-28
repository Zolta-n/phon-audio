"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import type { UIComponent, ComponentCategory } from "@/types";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";
import ComponentCard from "./ComponentCard";

const BRAND_LIMIT = 5;

export default function ComponentSearch({ catalog }: { catalog: UIComponent[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ComponentCategory | "all">("all");
  const { favorites, isFavorite, toggleFavorite } = useFavorites();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());

  const q = query.toLowerCase();

  // Step 1: category + text filter (existing logic)
  const filtered = catalog.filter(c => {
    if (category !== "all" && c.category !== category) return false;
    if (q && !c.name.toLowerCase().includes(q) && !(c.manufacturer ?? "").toLowerCase().includes(q)) return false;
    return true;
  });

  // Step 2: favorites + brand filters
  const finalFiltered = filtered.filter(c => {
    if (showFavoritesOnly && !isFavorite(c.id)) return false;
    if (selectedBrands.size > 0 && !selectedBrands.has(c.manufacturer ?? "Other")) return false;
    return true;
  });

  // Step 3: group by manufacturer
  const grouped = useMemo(() => {
    const groups: Record<string, UIComponent[]> = {};
    for (const c of finalFiltered) {
      const mfr = c.manufacturer ?? "Other";
      if (!groups[mfr]) groups[mfr] = [];
      groups[mfr].push(c);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [finalFiltered]);

  // Brand list from category-filtered results (not further filtered)
  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const c of filtered) set.add(c.manufacturer ?? "Other");
    return [...set].sort();
  }, [filtered]);

  const favCount = filtered.filter(c => isFavorite(c.id)).length;

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  };

  const pillStyle = (active: boolean, accent?: boolean) => ({
    padding: "6px 16px",
    borderRadius: "20px",
    border: "1.5px solid",
    borderColor: active ? (accent ? "#92400e" : "#d97706") : "var(--pa-border)",
    background: active ? (accent ? "#92400e" : "#d97706") : "var(--pa-bg)",
    color: active ? "#fff" : "var(--pa-muted)",
    fontSize: "0.78rem",
    cursor: "pointer",
    fontFamily: "var(--pa-font-ui)",
    fontWeight: 500 as const,
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

      {/* Category pills + Favorites */}
      <div style={{
        display: "flex",
        gap: "8px",
        marginBottom: brands.length > 1 ? "12px" : "28px",
        flexWrap: "wrap",
      }}>
        <button onClick={() => { setCategory("all"); setShowFavoritesOnly(false); }} style={pillStyle(category === "all" && !showFavoritesOnly)}>
          All ({catalog.length})
        </button>
        <button
          onClick={() => setShowFavoritesOnly(prev => !prev)}
          style={pillStyle(showFavoritesOnly)}
        >
          {"\u2665"} Favorites ({favCount})
        </button>
        {CATEGORY_ORDER.map(cat => {
          const count = catalog.filter(c => c.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setShowFavoritesOnly(false); }}
              style={pillStyle(category === cat && !showFavoritesOnly)}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Brand pills */}
      {brands.length > 1 && (
        <div style={{
          display: "flex",
          gap: "6px",
          marginBottom: "28px",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "0.7rem",
            color: "var(--pa-muted)",
            fontFamily: "var(--pa-font-ui)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginRight: "4px",
          }}>Brands:</span>
          {brands.map(brand => (
            <button
              key={brand}
              onClick={() => toggleBrand(brand)}
              style={pillStyle(selectedBrands.has(brand), true)}
            >
              {brand}
            </button>
          ))}
          {selectedBrands.size > 0 && (
            <button
              onClick={() => setSelectedBrands(new Set())}
              style={{
                background: "none",
                border: "none",
                color: "#d97706",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontFamily: "var(--pa-font-ui)",
                textDecoration: "underline",
                padding: "4px 8px",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Grouped results */}
      {grouped.map(([mfr, components]) => {
        const isExpanded = expandedBrands.has(mfr);
        const visible = isExpanded ? components : components.slice(0, BRAND_LIMIT);
        const remaining = components.length - BRAND_LIMIT;

        return (
          <div key={mfr} style={{ marginBottom: "32px" }}>
            <div style={{
              fontFamily: "Georgia, serif",
              fontSize: "1rem",
              color: "var(--pa-muted)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
            }}>
              <span style={{ fontWeight: 600, color: "var(--pa-text)" }}>{mfr}</span>
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--pa-font-ui)" }}>
                ({components.length})
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}>
              {visible.map(c => (
                <ComponentCard
                  key={c.id}
                  component={c}
                  isFavorite={isFavorite(c.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
            {remaining > 0 && !isExpanded && (
              <button
                onClick={() => setExpandedBrands(prev => new Set(prev).add(mfr))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#d97706",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  fontFamily: "var(--pa-font-ui)",
                  padding: "10px 0",
                  fontWeight: 500,
                }}
              >
                Show {remaining} more from {mfr}
              </button>
            )}
          </div>
        );
      })}

      {finalFiltered.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          color: "var(--pa-muted)",
          fontFamily: "var(--pa-font-ui)",
        }}>
          <div style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
            {showFavoritesOnly ? "No favorites yet" : "No components found"}
          </div>
          <div style={{ fontSize: "0.85rem" }}>
            {showFavoritesOnly
              ? "Click the heart on any component to add it to your favorites"
              : <>Try a different search or{" "}<Link href="/components/add" style={{ color: "#d97706" }}>add a new component</Link></>
            }
          </div>
        </div>
      )}
    </div>
  );
}
