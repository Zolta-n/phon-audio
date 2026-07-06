import { getComponents } from "@/lib/getComponents";
import ComponentSearch from "@/components/ComponentSearch";

export default async function ComponentsPage() {
  const catalog = await getComponents();
  const brandCount = new Set(catalog.map((c) => c.manufacturer ?? "Other")).size;

  return (
    <div style={{ minHeight: "calc(100vh - var(--pa-nav-h))" }}>
      {/* Header */}
      <div className="pa-page-header pa-page-header--glow-left" style={{ padding: "44px 56px" }}>
        <div className="pa-container" style={{ position: "relative" }}>
          <div className="pa-kicker" style={{ marginBottom: "14px" }}>
            <span>The Library</span>
          </div>
          <h1 style={{
            fontFamily: "var(--pa-font-display)",
            fontSize: "2.6rem",
            fontWeight: 500,
            color: "var(--pa-text-on-dark)",
            margin: "0 0 10px",
          }}>
            Components
          </h1>
          <p style={{ fontSize: "1.02rem", color: "var(--pa-lede)", margin: 0, fontStyle: "italic" }}>
            {catalog.length} components across {brandCount} brands — or add your own.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="pa-container" style={{ padding: "36px 56px 64px", boxSizing: "border-box" }}>
        <ComponentSearch catalog={catalog} />
      </div>
    </div>
  );
}
