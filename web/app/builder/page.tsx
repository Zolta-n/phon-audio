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
    <div className="flex flex-col min-h-[calc(100vh-3.5rem-4rem)]">
      <div className="bg-white border-b border-slate-100 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">Chain Builder</h1>
        <p className="text-sm text-slate-500">
          Build your signal chain, pick cables, set listening context, then evaluate.
        </p>
      </div>
      <ChainBuilder catalog={catalog} initialDemo={demo} />
    </div>
  );
}
