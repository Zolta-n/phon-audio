import type { UIComponent } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getComponent(id: string): Promise<UIComponent | null> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/components/${id}`, {
      next: { revalidate: 3600 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await getComponent(id);
  if (!component) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/builder" className="hover:text-slate-600">Builder</Link>
        <span className="mx-2">›</span>
        <span>{CATEGORY_LABELS[component.category]}</span>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{component.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {CATEGORY_LABELS[component.category]}
              {component.manufacturer ? ` · ${component.manufacturer}` : ""}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{component.name}</h1>
            {component.note && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-1.5 border border-amber-200">
                ⚠️ {component.note}
              </p>
            )}
          </div>
          {component.affiliateUrl && (
            <a
              href={component.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 bg-amber-400 hover:bg-amber-300 text-amber-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Buy →
            </a>
          )}
        </div>
      </div>

      {/* Ports */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {component.inputs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Inputs</p>
            {component.inputs.map((port, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded uppercase font-medium">
                  {port.domain}
                </span>
                <span>{port.connector.toUpperCase()}</span>
                {port.balanced && <span className="text-xs text-slate-400">balanced</span>}
              </div>
            ))}
          </div>
        )}
        {component.outputs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Outputs</p>
            {component.outputs.map((port, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700 mb-2">
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded uppercase font-medium">
                  {port.domain}
                </span>
                <span>{port.connector.toUpperCase()}</span>
                {port.balanced && <span className="text-xs text-slate-400">balanced</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/builder?add=${component.id}`}
          className="bg-slate-900 hover:bg-slate-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Add to chain →
        </Link>
        <Link
          href="/builder"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Back to builder
        </Link>
      </div>
    </div>
  );
}
