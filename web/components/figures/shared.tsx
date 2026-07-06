// ---------------------------------------------------------------------------
// Phon.Audio — shared primitives for expert-tier figures
//
// Every figure is a pure, server-safe SVG component: no client JS, no state,
// no imports beyond React types. Colors come from the site's --pa-* variables
// so figures follow the theme automatically. Semantic pass/warn/fail hexes are
// muted to sit inside the warm palette.
// ---------------------------------------------------------------------------

import type { ReactNode } from "react";

export const INK = "var(--pa-text)";
export const MUTED = "var(--pa-muted)";
export const FAINT = "var(--pa-border)";
export const ACCENT = "var(--pa-accent)"; // amber — primary trace
export const DEEP = "var(--pa-accent2)"; // deep brown — secondary trace
export const PASS = "#5b8a3c";
export const WARN = "#d97706";
export const FAIL = "#b4452f";
export const UI = "var(--pa-font-ui)";

/** 13px semibold — panel titles, key values. */
export const t14 = {
  fontFamily: UI,
  fontSize: 13,
  fontWeight: 600,
  fill: INK,
} as const;

/** 11.5px muted — annotations, secondary labels. */
export const t12 = {
  fontFamily: UI,
  fontSize: 11.5,
  fill: MUTED,
} as const;

/** 10.5px — axis ticks. */
export const tAxis = {
  fontFamily: UI,
  fontSize: 10.5,
  fill: MUTED,
} as const;

/** Responsive SVG frame with accessible title/desc. viewBox is 680 × h. */
export function Fig({
  h,
  title,
  desc,
  children,
}: {
  h: number;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 680 ${h}`}
      width="100%"
      role="img"
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <desc>{desc}</desc>
      {children}
    </svg>
  );
}

/** Horizontal resistor zigzag starting at (x, y), width w. */
export function HRes({
  x,
  y,
  w = 80,
  color = INK,
}: {
  x: number;
  y: number;
  w?: number;
  color?: string;
}) {
  const s = w / 12;
  const d = `M${x} ${y} l${s} -9 l${s * 2} 18 l${s * 2} -18 l${s * 2} 18 l${
    s * 2
  } -18 l${s * 2} 18 l${s} -9`;
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  );
}

/** Vertical resistor zigzag starting at (x, y), height h. */
export function VRes({
  x,
  y,
  h = 80,
  color = INK,
}: {
  x: number;
  y: number;
  h?: number;
  color?: string;
}) {
  const s = h / 12;
  const d = `M${x} ${y} l-9 ${s} l18 ${s * 2} l-18 ${s * 2} l18 ${s * 2} l-18 ${
    s * 2
  } l18 ${s * 2} l-9 ${s}`;
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
  );
}

/** Ground symbol centered on x, starting at y. */
export function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={INK} strokeWidth={1}>
      <line x1={x - 15} x2={x + 15} y1={y} y2={y} strokeWidth={1.5} />
      <line x1={x - 9} x2={x + 9} y1={y + 6} y2={y + 6} />
      <line x1={x - 3} x2={x + 3} y1={y + 12} y2={y + 12} />
    </g>
  );
}

/** AC source: circle with a sine glyph, centered at (cx, cy). */
export function Source({ cx, cy, r = 20 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={1.5} />
      <path
        d={`M${cx - r / 2},${cy} q${r / 4},-${r / 2.2} ${r / 2},0 q${r / 4},${
          r / 2.2
        } ${r / 2},0`}
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
      />
    </g>
  );
}
