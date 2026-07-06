"use client";

import { useMemo, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import type { UIComponent, ComponentCategory } from "@/types";
import { CATEGORY_BADGE, CATEGORY_LABELS, CATEGORY_ORDER } from "@/types";

/**
 * Left-hand component palette: category → manufacturer → components, with
 * favorites filtering. All expand/collapse state is palette-local; picking a
 * component is reported through onPick.
 */
export default function Palette({
  catalog,
  onPick,
}: {
  catalog: UIComponent[];
  onPick: (comp: UIComponent) => void;
}) {
  const [openManufacturer, setOpenManufacturer] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [expandedMfrs, setExpandedMfrs] = useState<Set<string>>(new Set());
  const { isFavorite, toggleFavorite } = useFavorites();

  // Two-level grouping: category → manufacturer → components
  const byCategory = useMemo(() => {
    const result: Partial<Record<ComponentCategory, Record<string, UIComponent[]>>> = {};
    const items = showFavoritesOnly ? catalog.filter(c => isFavorite(c.id)) : catalog;
    for (const c of items) {
      const cat = c.category;
      const mfr = c.manufacturer ?? "Other";
      if (!result[cat]) result[cat] = {};
      if (!result[cat]![mfr]) result[cat]![mfr] = [];
      result[cat]![mfr].push(c);
    }
    return result;
  }, [catalog, showFavoritesOnly, isFavorite]);

  const rowBorder = "1px solid rgba(232,217,196,0.6)";

  return (
    <aside style={{
      background: "var(--pa-panel)",
      borderRadius: "var(--pa-radius-lg)",
      border: "1px solid var(--pa-border)",
      overflow: "hidden",
      alignSelf: "start",
      maxHeight: "calc(100vh - var(--pa-nav-h) - 6rem)",
      overflowY: "auto",
    }}>
      <div style={{
        padding: "18px 18px 14px",
        borderBottom: "1px solid var(--pa-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: "0.62rem",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--pa-accent2)",
          fontWeight: 700,
          fontFamily: "var(--pa-font-ui)",
        }}>
          Component Library
        </span>
        <button
          onClick={() => setShowFavoritesOnly(prev => !prev)}
          title={showFavoritesOnly ? "Show all" : "Show favorites only"}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.85rem",
            cursor: "pointer",
            color: showFavoritesOnly ? "var(--pa-accent)" : "var(--pa-rail)",
            padding: "0 2px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
        >
          {showFavoritesOnly ? "♥" : "♡"}
        </button>
      </div>
      {catalog.length === 0 ? (
        <p style={{ fontSize: "0.75rem", color: "var(--pa-muted)", padding: "12px 18px" }}>Loading catalog…</p>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          if (!byCategory[cat]) return null;
          const catMfrs = byCategory[cat]!;
          const mfrNames = Object.keys(catMfrs).sort();
          const isCatOpen = openCategory === cat;
          return (
            <div key={cat}>
              {/* Category row */}
              <div
                className="pa-listrow"
                onClick={() => setOpenCategory(isCatOpen ? null : cat)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 18px",
                  fontSize: "0.62rem",
                  letterSpacing: "0.2em",
                  fontFamily: "var(--pa-font-ui)",
                  textTransform: "uppercase",
                  color: "#7a3d10",
                  fontWeight: 700,
                  borderBottom: rowBorder,
                  cursor: "pointer",
                }}
              >
                <span>{CATEGORY_LABELS[cat]}</span>
                <span style={{ color: "var(--pa-accent)", fontSize: "0.6rem" }}>{isCatOpen ? "▼" : "▶"}</span>
              </div>
              {/* Manufacturer list under this category */}
              {isCatOpen && mfrNames.map((mfr) => {
                const isMfrOpen = openManufacturer === `${cat}::${mfr}`;
                return (
                  <div key={mfr}>
                    {/* Brand header */}
                    <div
                      className="pa-listrow"
                      onClick={() => setOpenManufacturer(prev => prev === `${cat}::${mfr}` ? null : `${cat}::${mfr}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 18px 9px 24px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: isMfrOpen ? "var(--pa-accent2)" : "var(--pa-list-text)",
                        fontWeight: isMfrOpen ? 600 : 400,
                        fontFamily: "var(--pa-font-serif)",
                        borderBottom: rowBorder,
                      }}
                    >
                      <span>{mfr}</span>
                      <span style={{ color: "var(--pa-accent)", fontSize: "0.6rem" }}>{isMfrOpen ? "▼" : "▶"}</span>
                    </div>
                    {isMfrOpen && (() => {
                      const mfrKey = `${cat}::${mfr}`;
                      const allComps = catMfrs[mfr];
                      const isExpanded = expandedMfrs.has(mfrKey);
                      const visible = isExpanded ? allComps : allComps.slice(0, 5);
                      const remaining = allComps.length - 5;
                      return (
                        <div style={{ background: "var(--pa-inset)" }}>
                          {visible.map((c) => (
                            <div
                              key={c.id}
                              className="pa-listrow"
                              onClick={() => onPick(c)}
                              title={c.note ?? c.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 18px 8px 30px",
                                fontSize: "0.82rem",
                                color: "var(--pa-list-text)",
                                fontFamily: "var(--pa-font-serif)",
                                cursor: "pointer",
                                borderBottom: rowBorder,
                              }}
                            >
                              <span
                                onClick={e => { e.stopPropagation(); toggleFavorite(c.id); }}
                                style={{
                                  fontSize: "0.7rem",
                                  color: isFavorite(c.id) ? "var(--pa-accent)" : "rgba(122,92,58,0.4)",
                                  cursor: "pointer",
                                  flexShrink: 0,
                                  lineHeight: 1,
                                  transition: "color 0.15s",
                                }}
                                title={isFavorite(c.id) ? "Remove from favorites" : "Add to favorites"}
                              >
                                {isFavorite(c.id) ? "♥" : "♡"}
                              </span>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {c.name}
                              </span>
                              <span style={{
                                fontSize: "0.52rem",
                                letterSpacing: "0.1em",
                                textTransform: "uppercase",
                                color: "var(--pa-accent2)",
                                border: "1px solid var(--pa-border-2)",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                flexShrink: 0,
                                fontFamily: "var(--pa-font-ui)",
                              }}>
                                {CATEGORY_BADGE[c.category]}
                              </span>
                            </div>
                          ))}
                          {remaining > 0 && !isExpanded && (
                            <div
                              className="pa-listrow"
                              onClick={() => setExpandedMfrs(prev => new Set(prev).add(mfrKey))}
                              style={{
                                fontSize: "0.66rem",
                                letterSpacing: "0.14em",
                                textTransform: "uppercase",
                                color: "var(--pa-accent2)",
                                padding: "7px 18px 7px 30px",
                                cursor: "pointer",
                                fontFamily: "var(--pa-font-ui)",
                                fontWeight: 600,
                                borderBottom: rowBorder,
                              }}
                            >
                              +{remaining} more
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </aside>
  );
}
