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

  return (
    <aside style={{
      background: "var(--pa-cream)",
      borderRadius: "var(--pa-radius-lg)",
      border: "1.5px solid var(--pa-border)",
      padding: "16px 0",
      overflowY: "auto",
      maxHeight: "calc(100vh - var(--pa-nav-h) - 6rem)",
    }}>
      <div style={{
        fontSize: "0.65rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.16em",
        color: "var(--pa-accent-deep)",
        padding: "0 16px 12px",
        borderBottom: "1px solid var(--pa-border)",
        marginBottom: "8px",
        fontFamily: "var(--pa-font-ui)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        Components
        <button
          onClick={() => setShowFavoritesOnly(prev => !prev)}
          title={showFavoritesOnly ? "Show all" : "Show favorites only"}
          style={{
            background: "none",
            border: "none",
            fontSize: "0.85rem",
            cursor: "pointer",
            color: showFavoritesOnly ? "var(--pa-accent)" : "#d4b896",
            padding: "0 2px",
            lineHeight: 1,
            transition: "color 0.15s",
          }}
        >
          {showFavoritesOnly ? "♥" : "♡"}
        </button>
      </div>
      {catalog.length === 0 ? (
        <p style={{ fontSize: "0.75rem", color: "var(--pa-muted)" }}>Loading catalog…</p>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          if (!byCategory[cat]) return null;
          const catMfrs = byCategory[cat]!;
          const mfrNames = Object.keys(catMfrs).sort();
          const isCatOpen = openCategory === cat;
          return (
            <div key={cat} style={{ marginBottom: "2px" }}>
              {/* Category type label */}
              <div className="pa-listrow" style={{
                fontSize: "0.6rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--pa-accent-deep)",
                padding: "10px 16px 6px",
                fontWeight: 700,
                fontFamily: "var(--pa-font-ui)",
                cursor: "pointer",
              }}
                onClick={() => setOpenCategory(isCatOpen ? null : cat)}
              >
                {CATEGORY_LABELS[cat]}
                <span style={{ float: "right", color: "var(--pa-accent)", fontSize: "0.72rem" }}>
                  {isCatOpen ? "▼" : "▶"}
                </span>
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
                        padding: "9px 16px",
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        color: isMfrOpen ? "var(--pa-accent-deep)" : "#5c3a1e",
                        fontWeight: isMfrOpen ? 600 : 400,
                        letterSpacing: "0.03em",
                        fontFamily: "var(--pa-font-ui)",
                      }}
                    >
                      <span>{mfr}</span>
                      <span style={{ color: "var(--pa-accent)", fontSize: "0.72rem" }}>{isMfrOpen ? "▼" : "▶"}</span>
                    </div>
                    {isMfrOpen && (() => {
                      const mfrKey = `${cat}::${mfr}`;
                      const allComps = catMfrs[mfr];
                      const isExpanded = expandedMfrs.has(mfrKey);
                      const visible = isExpanded ? allComps : allComps.slice(0, 5);
                      const remaining = allComps.length - 5;
                      return (
                        <div style={{ background: "var(--pa-surface)" }}>
                          {visible.map((c) => (
                            <div
                              key={c.id}
                              className="pa-listrow"
                              onClick={() => onPick(c)}
                              title={c.note ?? c.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "7px 16px 7px 28px",
                                fontSize: "0.78rem",
                                color: "#7c5a3a",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--pa-border)",
                                fontFamily: "var(--pa-font-ui)",
                              }}
                            >
                              <span
                                onClick={e => { e.stopPropagation(); toggleFavorite(c.id); }}
                                style={{
                                  fontSize: "0.72rem",
                                  color: isFavorite(c.id) ? "var(--pa-accent)" : "#d4b896",
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
                                fontSize: "0.58rem",
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "var(--pa-accent-hover)",
                                background: "#fef3c7",
                                padding: "1px 5px",
                                borderRadius: "var(--pa-radius-sm)",
                                border: "1px solid #fcd34d",
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
                                fontSize: "0.72rem",
                                color: "var(--pa-accent)",
                                padding: "6px 16px 6px 28px",
                                cursor: "pointer",
                                fontFamily: "var(--pa-font-ui)",
                                fontWeight: 500,
                                borderBottom: "1px solid var(--pa-border)",
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
