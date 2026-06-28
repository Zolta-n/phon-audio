import ChainBuilder from "@/components/ChainBuilder";
import { getComponents } from "@/lib/getComponents";

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  const catalog = await getComponents();

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 68px)" }}>
      <div style={{
        background: "var(--pa-dark)",
        borderBottom: "1px solid rgba(201,111,18,0.2)",
        padding: "20px 32px",
      }}>
        <h1 style={{
          fontFamily: "var(--font-playfair), Georgia, serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--pa-cream)",
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}>Chain Builder</h1>
        <p style={{
          fontSize: "0.85rem",
          color: "rgba(253,246,236,0.5)",
          fontFamily: "var(--font-lora), serif",
        }}>
          Add components, set listening context, then evaluate your signal chain.
        </p>
      </div>
      <ChainBuilder catalog={catalog} initialDemo={demo} />
    </div>
  );
}
