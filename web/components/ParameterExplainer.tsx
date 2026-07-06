"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  EXPLAINERS,
  TIER_LABELS,
  type ExplainerTier,
} from "@/lib/explainers";
import { FIGURES } from "@/components/figures";
import Equation from "@/components/Equation";

const TIERS: ExplainerTier[] = ["simple", "theory", "expert"];
const STORAGE_KEY = "pa-explainer-tier";
const CHANGE_EVENT = "pa-explainer-tier-change";

function isTier(v: unknown): v is ExplainerTier {
  return v === "simple" || v === "theory" || v === "expert";
}

// Shared, reactive depth preference backed by localStorage. Using an external
// store (rather than effects) keeps every open explainer in sync, persists the
// choice across sessions, and renders "simple" on the server with no hydration
// mismatch.
function readTier(): ExplainerTier {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (isTier(v)) return v;
  } catch {
    /* localStorage unavailable */
  }
  return "simple";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function useTierPreference(): [ExplainerTier, (t: ExplainerTier) => void] {
  const tier = useSyncExternalStore<ExplainerTier>(
    subscribe,
    readTier,
    () => "simple",
  );
  const setTier = (t: ExplainerTier) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [tier, setTier];
}

/**
 * "Learn more" disclosure shown under a result row. Looks the parameter up by
 * its engine check id (or context field name); renders nothing if there's no
 * explainer for that id.
 *
 * On the expert tier the disclosure also renders the parameter's figure
 * (from the FIGURES registry) and its display equations.
 */
export default function ParameterExplainer({ id }: { id: string }) {
  const entry = EXPLAINERS[id];
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useTierPreference();

  if (!entry) return null;

  const Figure = FIGURES[entry.slug];

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-xs font-medium hover:underline"
        style={{ color: "var(--pa-accent)" }}
      >
        {open ? "Hide explainer" : "Learn more"}
        <span className="ml-1 inline-block" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div
          className="mt-2 rounded-md border p-3"
          style={{
            background: "var(--pa-surface)",
            borderColor: "var(--pa-border)",
          }}
        >
          <div className="flex gap-1 mb-2" role="tablist" aria-label="Explanation depth">
            {TIERS.map((t) => {
              const active = t === tier;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTier(t)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${active ? "" : "pa-listrow"}`}
                  style={
                    active
                      ? { background: "var(--pa-accent)", color: "#fff" }
                      : { color: "var(--pa-muted)" }
                  }
                >
                  {TIER_LABELS[t]}
                </button>
              );
            })}
          </div>

          {tier === "expert" && Figure && (
            <div
              className="mb-2 rounded-md border"
              style={{
                background: "var(--pa-cream)",
                borderColor: "var(--pa-border)",
                padding: "12px 8px 4px",
              }}
            >
              <Figure />
            </div>
          )}

          <p className="text-xs leading-relaxed" style={{ color: "var(--pa-text)" }}>
            {entry[tier]}
          </p>

          {tier === "expert" &&
            entry.equations?.map((eq) => (
              <Equation key={eq.caption} mathml={eq.mathml} caption={eq.caption} />
            ))}

          <Link
            href={`/learn/${entry.slug}`}
            className="inline-block mt-2 text-xs font-medium hover:underline"
            style={{ color: "var(--pa-accent2)" }}
          >
            Full explainer →
          </Link>
        </div>
      )}
    </div>
  );
}
