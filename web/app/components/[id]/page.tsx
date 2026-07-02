import type { Port } from "@/types";
import { CATEGORY_LABELS } from "@/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getComponentById } from "@/lib/getComponents";

/** Impact descriptions for missing specs */
const UNKNOWN_IMPACT: Record<string, string> = {
  inputImpedanceOhm: "impedance bridging check skipped",
  inputSensitivityVrms: "gain staging check skipped",
  maxInputVrms: "overload check skipped",
  outputImpedanceOhm: "impedance bridging & cable rolloff checks skipped",
  maxOutputVrms: "gain staging check skipped",
  gainDb: "system gain structure check skipped",
  maxVrms: "headphone drive check skipped",
  maxCurrentMa: "headphone drive check skipped",
  nominalImpedanceOhm: "impedance checks skipped",
  sensitivityDb_2_83V_1m: "SPL calculation skipped",
  powerHandlingW: "power handling check skipped",
  minImpedanceOhm: "impedance stability check skipped",
};

type SpecRow = { label: string; value: string | null; unknownImpact?: string };

function PortSpecs({ port }: { port: Port }) {
  const s = (port.specs ?? {}) as Record<string, unknown>;
  const kind = s.kind as string | undefined;
  const specs: SpecRow[] = [];

  const add = (label: string, field: string, format: (v: unknown) => string) => {
    if (s[field] != null) {
      specs.push({ label, value: format(s[field]) });
    } else {
      specs.push({ label, value: null, unknownImpact: UNKNOWN_IMPACT[field] });
    }
  };

  if (kind === "digital_in" || kind === "digital_out") {
    add("Max sample rate", "maxSampleRateKhz", v => `${v} kHz`);
    add("Max bit depth", "maxBitDepth", v => `${v}-bit`);
    const formats = s.formats as string[] | undefined;
    if (formats?.length) specs.push({ label: "Formats", value: formats.map(f => f.toUpperCase()).join(", ") });
  } else if (kind === "line_in") {
    add("Input impedance", "inputImpedanceOhm", v => `${v} Ω`);
    add("Sensitivity", "inputSensitivityVrms", v => `${v} Vrms`);
    add("Max input", "maxInputVrms", v => `${v} Vrms`);
  } else if (kind === "line_out") {
    add("Output impedance", "outputImpedanceOhm", v => `${v} Ω`);
    add("Max output", "maxOutputVrms", v => `${v} Vrms`);
    add("Gain", "gainDb", v => `${v} dB`);
  } else if (kind === "speaker_out") {
    const pw = s.powerW as { ohm: number; watts: number }[] | undefined;
    if (pw?.length) specs.push({ label: "Power", value: pw.map(p => `${p.watts}W @ ${p.ohm}Ω`).join(", ") });
    add("Output impedance", "outputImpedanceOhm", v => `${v} Ω`);
    add("Gain", "gainDb", v => `${v} dB`);
  } else if (kind === "headphone_out") {
    add("Output impedance", "outputImpedanceOhm", v => `${v} Ω`);
    add("Max Vrms", "maxVrms", v => `${v}`);
    add("Max current", "maxCurrentMa", v => `${v} mA`);
    add("Gain", "gainDb", v => `${v} dB`);
  } else if (kind === "headphone_load") {
    add("Impedance", "nominalImpedanceOhm", v => `${v} Ω`);
    const sens = s.sensitivity as { value?: number; unit?: string } | undefined;
    if (sens?.value) specs.push({ label: "Sensitivity", value: `${sens.value} ${sens.unit ?? "dB/mW"}` });
    else specs.push({ label: "Sensitivity", value: null, unknownImpact: "headphone drive check skipped" });
  } else if (kind === "speaker_load") {
    add("Impedance", "nominalImpedanceOhm", v => `${v} Ω`);
    add("Min impedance", "minImpedanceOhm", v => `${v} Ω`);
    add("Sensitivity", "sensitivityDb_2_83V_1m", v => `${v} dB`);
    add("Power handling", "powerHandlingW", v => `${v} W`);
  } else if (kind === "phono_out") {
    const ct = s.cartridgeType as string | undefined;
    if (ct) specs.push({ label: "Type", value: ct.toUpperCase() });
    add("Output", "outputVoltageMv", v => `${v} mV`);
    if (s.internalImpedanceOhm) specs.push({ label: "Internal impedance", value: `${s.internalImpedanceOhm} Ω` });
    if (s.recommendedLoadImpedanceOhm) specs.push({ label: "Rec. load impedance", value: `${Number(s.recommendedLoadImpedanceOhm as number).toLocaleString()} Ω` });
    if (s.recommendedLoadCapacitancePf) specs.push({ label: "Rec. load capacitance", value: `${s.recommendedLoadCapacitancePf} pF` });
  } else if (kind === "phono_in") {
    const ct = s.cartridgeType as string | undefined;
    if (ct) specs.push({ label: "Accepts", value: ct === "both" ? "MM + MC" : ct.toUpperCase() });
    add("Input impedance", "inputImpedanceOhm", v => `${Number(v as number).toLocaleString()} Ω`);
    if (s.inputCapacitancePf) specs.push({ label: "Input capacitance", value: `${s.inputCapacitancePf} pF` });
    add("Gain", "gainDb", v => `${v} dB`);
  }

  if (specs.length === 0) return null;
  return (
    <div className="mt-1 ml-1 text-xs space-y-0.5">
      {specs.map(sp => (
        <div key={sp.label}>
          <span className="text-slate-400">{sp.label}:</span>{" "}
          {sp.value != null ? (
            <span className="text-slate-500">{sp.value}</span>
          ) : (
            <span className="text-amber-500" title={sp.unknownImpact}>
              Unknown
              {sp.unknownImpact && (
                <span className="text-amber-400 text-[10px] ml-1">({sp.unknownImpact})</span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const component = await getComponentById(id);
  if (!component) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-400 mb-6">
        <Link href="/components" className="hover:text-slate-600">Components</Link>
        <span className="mx-2">&rsaquo;</span>
        <span>{CATEGORY_LABELS[component.category]}</span>
        <span className="mx-2">&rsaquo;</span>
        <span className="text-slate-700">{component.name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              {CATEGORY_LABELS[component.category]}
              {component.manufacturer ? ` \u00B7 ${component.manufacturer}` : ""}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{component.name}</h1>
            {component.note && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-1.5 border border-amber-200">
                {component.note}
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
              Buy &rarr;
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
              <div key={i} className="mb-3 pb-2 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded uppercase font-medium">
                    {port.domain}
                  </span>
                  <span>{port.connector.toUpperCase()}</span>
                  {port.balanced && <span className="text-xs text-slate-400">balanced</span>}
                </div>
                <PortSpecs port={port} />
              </div>
            ))}
          </div>
        )}
        {component.outputs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Outputs</p>
            {component.outputs.map((port, i) => (
              <div key={i} className="mb-3 pb-2 border-b border-slate-100 last:border-0 last:mb-0 last:pb-0">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded uppercase font-medium">
                    {port.domain}
                  </span>
                  <span>{port.connector.toUpperCase()}</span>
                  {port.balanced && <span className="text-xs text-slate-400">balanced</span>}
                </div>
                <PortSpecs port={port} />
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
          Add to chain &rarr;
        </Link>
        <Link
          href={`/components/${component.id}/edit`}
          className="bg-amber-500 hover:bg-amber-400 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Edit specs
        </Link>
        <Link
          href="/components"
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          Back to catalog
        </Link>
      </div>
    </div>
  );
}
