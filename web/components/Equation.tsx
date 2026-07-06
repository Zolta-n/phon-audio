// ---------------------------------------------------------------------------
// Phon.Audio — display equation block
//
// Renders a MathML string (native browser support, zero JS, crawlable) as a
// centered display equation with a muted caption. The MathML comes from the
// static, trusted explainer data — never from user input — which is why
// dangerouslySetInnerHTML is acceptable here.
//
// Server- and client-safe: no hooks, no browser APIs.
// ---------------------------------------------------------------------------

export interface EquationProps {
  mathml: string;
  caption: string;
}

export default function Equation({ mathml, caption }: EquationProps) {
  return (
    <div style={{ margin: "20px 0" }}>
      <div
        style={{
          overflowX: "auto",
          textAlign: "center",
          fontSize: "1.15rem",
          color: "var(--pa-text)",
        }}
        // Static editorial content from lib/explainers.ts — trusted source.
        dangerouslySetInnerHTML={{ __html: mathml }}
      />
      <p
        style={{
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--pa-muted)",
          fontFamily: "var(--pa-font-ui)",
          margin: "8px 0 0",
        }}
      >
        {caption}
      </p>
    </div>
  );
}
