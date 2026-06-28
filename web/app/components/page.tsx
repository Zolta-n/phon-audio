import { getComponents } from "@/lib/getComponents";
import ComponentSearch from "@/components/ComponentSearch";

export default async function ComponentsPage() {
  const catalog = await getComponents();

  return (
    <div style={{ minHeight: "calc(100vh - 68px)" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0f00, #3d2200)",
        padding: "48px 48px 40px",
        borderBottom: "1px solid rgba(217,119,6,0.2)",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "2rem",
            fontWeight: 700,
            color: "#faf5ee",
            marginBottom: "8px",
          }}>
            Components
          </h1>
          <p style={{
            fontSize: "0.95rem",
            color: "#d4b896",
            fontFamily: "var(--pa-font-ui)",
          }}>
            Browse {catalog.length} audio components or add your own
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 48px",
      }}>
        <ComponentSearch catalog={catalog} />
      </div>
    </div>
  );
}
