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
  const { isFavorite, toggleFavorite } = useFavorites();
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

  return (
    <div>
      {/* Search bar + Add button */}
      <div style={{
        display: "flex",
        gap: "14px",
        marginBottom: "26px",
        alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="Search by name or brand…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pa-input"
          style={{ flex: 1, width: "auto", padding: "14px 20px" }}
        />
        <Link href="/components/add" className="pa-btn pa-btn-primary" style={{ padding: "14px 26px", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
          + Add Component
        </Link>
      </div>

      {/* Category pills + Favorites */}
      <div style={{
        display: "flex",
        gap: "9px",
        marginBottom: brands.length > 1 ? "14px" : "44px",
        flexWrap: "wrap",
      }}>
        <button
          onClick={() => { setCategory("all"); setShowFavoritesOnly(false); }}
          className={category === "all" && !showFavoritesOnly ? "pa-chip pa-chip--active" : "pa-chip"}
        >
          All · {catalog.length}
        </button>
        <button
          onClick={() => setShowFavoritesOnly(prev => !prev)}
          className={showFavoritesOnly ? "pa-chip pa-chip--active" : "pa-chip"}
        >
          ♥ Favorites · {favCount}
        </button>
        {CATEGORY_ORDER.map(cat => {
          const count = catalog.filter(c => c.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setShowFavoritesOnly(false); }}
              className={category === cat && !showFavoritesOnly ? "pa-chip pa-chip--active" : "pa-chip"}
            >
              {CATEGORY_LABELS[cat]} · {count}
            </button>
          );
        })}
      </div>

      {/* Brand pills */}
      {brands.length > 1 && (
        <div style={{
          display: "flex",
          gap: "9px",
          marginBottom: "44px",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <span style={{
            fontSize: "0.58rem",
            color: "var(--pa-muted)",
            fontFamily: "var(--pa-font-ui)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            marginRight: "6px",
          }}>Brands</span>
          {brands.map(brand => (
            <button
              key={brand}
              onClick={() => toggleBrand(brand)}
              className={selectedBrands.has(brand) ? "pa-chip pa-chip--active" : "pa-chip"}
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
                borderBottom: "1px solid var(--pa-rail)",
                color: "var(--pa-accent2)",
                fontSize: "0.66rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "var(--pa-font-ui)",
                padding: "0 0 2px",
                marginLeft: "6px",
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
          <div key={mfr} style={{ marginBottom: "48px" }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: "14px",
              marginBottom: "20px",
              borderBottom: "1px solid var(--pa-border)",
              paddingBottom: "12px",
            }}>
              <span style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.5rem", color: "var(--pa-text)" }}>
                {mfr}
              </span>
              <span style={{
                fontSize: "0.62rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--pa-faint)",
                fontFamily: "var(--pa-font-ui)",
              }}>
                {components.length} component{components.length === 1 ? "" : "s"}
              </span>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}>
              {visible.map((c, i) => (
                <ComponentCard
                  key={c.id}
                  component={c}
                  index={i}
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
                  color: "var(--pa-accent2)",
                  fontSize: "0.66rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  fontFamily: "var(--pa-font-ui)",
                  padding: "16px 0 0",
                }}
              >
                Show {remaining} more from {mfr} →
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
        }}>
          <div style={{ fontFamily: "var(--pa-font-display)", fontSize: "1.2rem", marginBottom: "8px", color: "var(--pa-text)" }}>
            {showFavoritesOnly ? "No favorites yet" : "No components found"}
          </div>
          <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
            {showFavoritesOnly
              ? "Click the heart on any component to add it to your favorites"
              : <>Try a different search or{" "}<Link href="/components/add" style={{ color: "var(--pa-accent2)" }}>add a new component</Link></>
            }
          </div>
        </div>
      )}
    </div>
  );
}
