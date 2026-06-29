// Shared color maps, helpers, and signal-level math for expert diagram views.
import type {
  ChainEntry, SystemReport, Verdict, ContextSettings,
  UIComponent, Port, SignalDomain,
} from "@/types";
import { CABLE_BY_ID } from "@/types";

// ---- Color maps ------------------------------------------------------------

export const CAT_COLOR: Record<string, string> = {
  source: "#7a5c3a", turntable: "#6b4e2e", dac: "#c96f12", preamp: "#9b4f0a",
  power_amp: "#7a3a08", tube_amp_se: "#8b3a5c", tube_amp_pp: "#6b3a6b",
  integrated: "#8b4f20", headphone_amp: "#9b5010",
  speaker: "#16632e", headphone: "#3a5c7a",
};

export const CAT_BADGE_COLOR: Record<string, string> = {
  speaker: "#6cc189", headphone: "#7ab8d4",
};

export const DOMAIN_COLOR: Record<string, string> = {
  digital: "#3a6ea5", line: "#c47a1a", speaker: "#a23e12",
  headphone: "#3f7a4a", phono: "#8b3a5c",
};
export const DOMAIN_LIGHT: Record<string, string> = {
  digital: "#6a9ec5", line: "#dca24f", speaker: "#c66036",
  headphone: "#6aad7a", phono: "#b06a8c",
};

export const VERDICT_FG: Record<Verdict, string> = {
  pass: "#2f8a4e", info: "#3a6ea5", warn: "#d97706", fail: "#c0392b",
};
export const VERDICT_BG: Record<Verdict, string> = {
  pass: "#dff3e4", info: "#e3eef6", warn: "#fdebcf", fail: "#fdecea",
};
export const VERDICT_ICON: Record<Verdict, string> = {
  pass: "\u2713", info: "\u2139", warn: "\u26A1", fail: "\u2715",
};

// ---- Helpers ---------------------------------------------------------------

const s = (p: Port) => p.specs as Record<string, unknown>;

export function getSpecNote(c: UIComponent): string {
  const outs = c.outputs ?? [];
  const ins  = c.inputs  ?? [];

  if (c.category === "dac") {
    const din = ins.find(p => p.domain === "digital");
    if (din) {
      const bits = s(din).maxBitDepth as number | null;
      const rate = s(din).maxSampleRateKhz as number | null;
      if (bits && rate) return `${bits}-bit \u00B7 ${rate} kHz`;
      if (bits) return `${bits}-bit`;
    }
  }
  if (c.category === "headphone") {
    const hp = ins.find(p => p.domain === "headphone");
    if (hp) {
      const ohm  = s(hp).nominalImpedanceOhm as number | null;
      const sens = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.value;
      const unit = (s(hp).sensitivity as { value?: number; unit?: string } | null)?.unit ?? "dB/mW";
      if (ohm && sens) return `${ohm}\u2126 \u00B7 ${sens} ${unit}`;
      if (ohm) return `${ohm}\u2126`;
    }
  }
  if (c.category === "speaker") {
    const sp = ins.find(p => p.domain === "speaker");
    if (sp) {
      const ohm  = s(sp).nominalImpedanceOhm as number | null;
      const sens = s(sp).sensitivityDb_2_83V_1m as number | null;
      if (ohm && sens) return `${ohm}\u2126 \u00B7 ${sens} dB`;
      if (ohm) return `${ohm}\u2126`;
    }
  }
  if (["headphone_amp", "preamp", "power_amp", "integrated", "tube_amp_se", "tube_amp_pp"].includes(c.category)) {
    const out = outs.find(p => p.domain === "headphone")
              ?? outs.find(p => p.domain === "speaker")
              ?? outs.find(p => p.domain === "line")
              ?? outs[0];
    if (out) {
      const watts = (s(out).continuousWattsPerChannel ?? s(out).maxWattsPerChannel) as number | null;
      const imp   = (s(out).minLoadImpedanceOhm ?? s(out).nominalLoadImpedanceOhm) as number | null;
      if (watts && imp) return `${watts} W \u00B7 ${imp}\u2126`;
      const gain = s(out).gainDb as number | null;
      if (gain) return `+${gain} dB`;
      const conn = out.connector?.toUpperCase();
      const bal  = out.balanced ? "Bal" : "SE";
      if (conn) return `${conn} \u00B7 ${bal}`;
    }
  }
  if (c.category === "source" || c.category === "turntable") {
    const out = outs[0];
    if (out) return out.connector?.toUpperCase() ?? "";
  }
  return "";
}

export function getIOChip(c: UIComponent, side: "in" | "out"): string {
  const ports = side === "out" ? (c.outputs ?? []) : (c.inputs ?? []);
  const p = ports[0];
  if (!p) return "";
  const sp = s(p);
  if (side === "out") {
    const v = sp.maxOutputVrms as number | null;
    const conn = p.connector?.toUpperCase() ?? "";
    if (v) return `OUT \u00B7 ${v}\u2009V \u00B7 ${conn}`;
    const df = sp.dampingFactor as number | null;
    if (df) return `OUT \u00B7 DF ${df}`;
    if (conn) return `OUT \u00B7 ${conn}`;
    return "OUT";
  }
  const ohm = (sp.nominalImpedanceOhm ?? sp.inputImpedanceOhm) as number | null;
  const minOhm = sp.minImpedanceOhm as number | null;
  if (minOhm) return `IN \u00B7 min ${minOhm}\u2126`;
  if (ohm) return `IN \u00B7 ${ohm}\u2126`;
  return "IN";
}

export function getCableSpec(cableId: string): string {
  const def = CABLE_BY_ID[cableId];
  if (!def?.cable) return "";
  const c = def.cable;
  if (c.kind === "speaker" && c.awg) return `${c.awg} AWG \u00B7 ${c.lengthM} m`;
  const m = def.label.match(/^(USB|Coax|Optical|XLR|RCA|TRS|TOSLINK)/i);
  const prefix = m ? m[1] : def.label.split(" ")[0].slice(0, 8);
  return `${prefix} \u00B7 ${c.lengthM} m`;
}

export function getDomainForLink(
  chain: ChainEntry[],
  report: SystemReport,
  nodeIdx: number,
): SignalDomain | null {
  if (nodeIdx < report.links.length) {
    return report.links[nodeIdx].domain as SignalDomain;
  }
  const comp = chain[nodeIdx]?.component;
  if (comp?.outputs?.length) return comp.outputs[0].domain;
  return null;
}

// ---- Score helper ----------------------------------------------------------

export function computeScore(report: SystemReport): number {
  let score = 100;
  for (const link of report.links) {
    for (const r of link.results) {
      if (r.verdict === "fail") score -= 20;
      else if (r.verdict === "warn") score -= 5;
    }
  }
  for (const r of report.system) {
    if (r.verdict === "fail") score -= 20;
    else if (r.verdict === "warn") score -= 5;
  }
  return Math.max(0, Math.min(100, score));
}

// ---- Audio math (client-side reimplementations from src/units.ts) -----------

function sensitivityDbPer1W(sens2_83V: number, impedanceOhm: number): number {
  const powerAt2_83V = (2.83 * 2.83) / impedanceOhm;
  return sens2_83V - 10 * Math.log10(powerAt2_83V);
}

function distanceAttenuationDb(distanceM: number): number {
  return 20 * Math.log10(Math.max(distanceM, 0.01));
}

function powerForSpl(targetSplDb: number, sensitivity1W: number): number {
  return Math.pow(10, (targetSplDb - sensitivity1W) / 10);
}

function ampPowerAtImpedance(
  powerW: { ohm: number; watts: number }[],
  impedanceOhm: number,
): number {
  if (!powerW || powerW.length === 0) return NaN;
  const exact = powerW.find(p => p.ohm === impedanceOhm);
  if (exact) return exact.watts;
  const sorted = [...powerW].sort((a, b) => a.ohm - b.ohm);
  if (impedanceOhm <= sorted[0]!.ohm) return sorted[0]!.watts;
  const last = sorted[sorted.length - 1]!;
  if (impedanceOhm >= last.ohm) return last.watts;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i]!;
    const hi = sorted[i + 1]!;
    if (impedanceOhm >= lo.ohm && impedanceOhm <= hi.ohm) {
      const t = (impedanceOhm - lo.ohm) / (hi.ohm - lo.ohm);
      return lo.watts + t * (hi.watts - lo.watts);
    }
  }
  return last.watts;
}

const COPPER_RESISTIVITY = 0.01724;
function awgDiameterMm(awg: number): number {
  return 0.127 * Math.pow(92, (36 - awg) / 39);
}
function speakerCableResistanceOhm(awg: number, lengthM: number): number {
  const d = awgDiameterMm(awg);
  const areaMm2 = (Math.PI / 4) * d * d;
  return (COPPER_RESISTIVITY / areaMm2) * lengthM * 2;
}

// ---- Signal-level flow computation -----------------------------------------

export interface SignalLevel {
  value: number;
  unit: string;   // "V", "W", "dB"
  label: string;  // formatted, e.g. "2.0 V"
}

export function computeSignalLevels(
  chain: ChainEntry[],
  report: SystemReport,
  ctx: ContextSettings,
): (SignalLevel | null)[] {
  const levels: (SignalLevel | null)[] = [];
  let upstreamVrms: number | null = null;

  for (let i = 0; i < chain.length; i++) {
    const comp = chain[i].component;
    const outs = comp.outputs ?? [];
    const ins  = comp.inputs  ?? [];

    // Determine what this node outputs
    const lineOut = outs.find(p => p.domain === "line");
    const speakerOut = outs.find(p => p.domain === "speaker");
    const hpOut = outs.find(p => p.domain === "headphone");
    const digitalOut = outs.find(p => p.domain === "digital");
    const speakerIn = ins.find(p => p.domain === "speaker");
    const hpIn = ins.find(p => p.domain === "headphone");

    if (lineOut) {
      const sp = s(lineOut);
      const maxV = sp.maxOutputVrms as number | null;
      const gain = sp.gainDb as number | null;
      if (gain && upstreamVrms) {
        const amplified: number = upstreamVrms * Math.pow(10, gain / 20);
        const v: number = maxV ? Math.min(amplified, maxV) : amplified;
        upstreamVrms = v;
        levels.push({ value: v, unit: "V", label: `${v.toFixed(1)} V` });
      } else if (maxV) {
        upstreamVrms = maxV;
        levels.push({ value: maxV, unit: "V", label: `${maxV.toFixed(1)} V` });
      } else {
        levels.push(null);
      }
    } else if (speakerOut) {
      const sp = s(speakerOut);
      const powerW = sp.powerW as { ohm: number; watts: number }[] | null;
      // Find the speaker downstream to get its impedance
      const spkComp = chain.find(e => e.component.category === "speaker");
      const spkIn = spkComp?.component.inputs?.find(p => p.domain === "speaker");
      const spkZ = spkIn ? (s(spkIn).nominalImpedanceOhm as number | null) : null;
      if (powerW && spkZ) {
        const watts = ampPowerAtImpedance(powerW, spkZ);
        upstreamVrms = null;
        levels.push({ value: watts, unit: "W", label: `${watts.toFixed(0)} W` });
      } else {
        levels.push(null);
      }
    } else if (hpOut) {
      const sp = s(hpOut);
      const maxV = sp.maxVrms as number | null;
      if (maxV) {
        levels.push({ value: maxV, unit: "V", label: `${maxV.toFixed(1)} V` });
      } else {
        levels.push(null);
      }
    } else if (speakerIn) {
      // Terminal speaker — compute SPL
      const sp = s(speakerIn);
      const nomZ = sp.nominalImpedanceOhm as number | null;
      const sens = sp.sensitivityDb_2_83V_1m as number | null;
      if (nomZ && sens) {
        const sens1W = sensitivityDbPer1W(sens, nomZ);
        // Get amp power from previous node
        const prevLevel = levels[levels.length - 1];
        if (prevLevel && prevLevel.unit === "W") {
          const spl = sens1W + 10 * Math.log10(prevLevel.value)
                    - distanceAttenuationDb(ctx.distanceM)
                    + (ctx.roomGainDb ?? 0);
          levels.push({ value: spl, unit: "dB", label: `${spl.toFixed(0)} dB` });
        } else {
          levels.push(null);
        }
      } else {
        levels.push(null);
      }
    } else if (hpIn) {
      // Terminal headphone — show impedance-based info
      const sp = s(hpIn);
      const ohm = sp.nominalImpedanceOhm as number | null;
      if (ohm) {
        levels.push({ value: ohm, unit: "\u2126", label: `${ohm} \u2126` });
      } else {
        levels.push(null);
      }
    } else if (digitalOut) {
      // Digital source — show as digital marker
      levels.push({ value: 0, unit: "dig", label: "digital" });
    } else {
      levels.push(null);
    }
  }
  return levels;
}

// ---- SPL headroom bar data -------------------------------------------------

export interface SplHeadroom {
  maxSpl: number;
  peakNeed: number;
  ampWatts: number;
  floorDb: number;
}

export function computeSplHeadroom(
  chain: ChainEntry[],
  ctx: ContextSettings,
): SplHeadroom | null {
  // Find the power amp and speaker
  const ampEntry = chain.find(e =>
    ["power_amp", "tube_amp_se", "tube_amp_pp", "integrated"].includes(e.component.category),
  );
  const spkEntry = chain.find(e => e.component.category === "speaker");
  if (!ampEntry || !spkEntry) return null;

  const ampOut = ampEntry.component.outputs?.find(p => p.domain === "speaker");
  const spkIn = spkEntry.component.inputs?.find(p => p.domain === "speaker");
  if (!ampOut || !spkIn) return null;

  const ampSp = s(ampOut);
  const spkSp = s(spkIn);
  const powerW = ampSp.powerW as { ohm: number; watts: number }[] | null;
  const nomZ = spkSp.nominalImpedanceOhm as number | null;
  const sens = spkSp.sensitivityDb_2_83V_1m as number | null;
  if (!powerW || !nomZ || !sens) return null;

  const watts = ampPowerAtImpedance(powerW, nomZ);
  const sens1W = sensitivityDbPer1W(sens, nomZ);
  const maxSpl = sens1W + 10 * Math.log10(watts)
               - distanceAttenuationDb(ctx.distanceM)
               + (ctx.roomGainDb ?? 0);
  const peakNeed = ctx.targetSplDb + ctx.crestFactorDb;

  return {
    maxSpl: Math.round(maxSpl * 10) / 10,
    peakNeed,
    ampWatts: Math.round(watts),
    floorDb: 70,
  };
}

// ---- Impedance data for telemetry track ------------------------------------

export interface ImpedanceData {
  type: "bridge" | "damping" | "hp_impedance";
  ratio: number;
  verdict: Verdict;
  sourceZ: number | null;
  loadZ: number | null;
  cableR?: number;
}

export function getImpedanceData(
  chain: ChainEntry[],
  report: SystemReport,
  linkIdx: number,
): ImpedanceData | null {
  if (linkIdx >= report.links.length) return null;
  const link = report.links[linkIdx];

  const upComp = chain[linkIdx]?.component;
  const dnComp = chain[linkIdx + 1]?.component;
  if (!upComp || !dnComp) return null;

  if (link.domain === "speaker") {
    const df = link.results.find(r => r.id === "damping_factor");
    if (!df || df.value == null) return null;
    const ampOut = upComp.outputs?.find(p => p.domain === "speaker");
    const ampZ = ampOut ? (s(ampOut).outputImpedanceOhm as number | null) : null;
    const spkIn = dnComp.inputs?.find(p => p.domain === "speaker");
    const spkZ = spkIn ? (s(spkIn).nominalImpedanceOhm as number | null) : null;
    // Compute cable resistance if speaker cable
    const cable = CABLE_BY_ID[chain[linkIdx].cableId]?.cable;
    const cableR = cable?.kind === "speaker" && cable.awg
      ? speakerCableResistanceOhm(cable.awg, cable.lengthM)
      : 0;
    return { type: "damping", ratio: df.value, verdict: df.verdict, sourceZ: ampZ, loadZ: spkZ, cableR };
  }

  if (link.domain === "headphone") {
    const hpZ = link.results.find(r => r.id === "headphone_output_impedance");
    if (!hpZ || hpZ.value == null) return null;
    const ampOut = upComp.outputs?.find(p => p.domain === "headphone");
    const ampZ = ampOut ? (s(ampOut).outputImpedanceOhm as number | null) : null;
    const hpIn = dnComp.inputs?.find(p => p.domain === "headphone");
    const loadZ = hpIn ? (s(hpIn).nominalImpedanceOhm as number | null) : null;
    return { type: "hp_impedance", ratio: hpZ.value, verdict: hpZ.verdict, sourceZ: ampZ, loadZ };
  }

  // Line domain — impedance bridging
  const bridging = link.results.find(r => r.id === "impedance_bridging");
  if (!bridging || bridging.value == null) return null;
  const upOut = upComp.outputs?.find(p => p.domain === "line");
  const dnIn = dnComp.inputs?.find(p => p.domain === "line");
  const sourceZ = upOut ? (s(upOut).outputImpedanceOhm as number | null) : null;
  const loadZ = dnIn ? (s(dnIn).inputImpedanceOhm as number | null) : null;
  return { type: "bridge", ratio: bridging.value, verdict: bridging.verdict, sourceZ, loadZ };
}

// ---- Extended spec note for schematic view ---------------------------------

export function getExtendedSpecNote(c: UIComponent, report?: SystemReport, chain?: ChainEntry[]): string {
  const outs = c.outputs ?? [];
  const ins  = c.inputs  ?? [];

  if (c.category === "dac") {
    const din = ins.find(p => p.domain === "digital");
    const lout = outs.find(p => p.domain === "line");
    const parts: string[] = [];
    if (din) {
      const bits = s(din).maxBitDepth as number | null;
      const rate = s(din).maxSampleRateKhz as number | null;
      if (bits && rate) parts.push(`${bits}b/${rate}k`);
    }
    if (lout) {
      const v = s(lout).maxOutputVrms as number | null;
      if (v) parts.push(`${v}V`);
    }
    return parts.join(" \u00B7 ") || getSpecNote(c);
  }

  if (c.category === "preamp") {
    const lout = outs.find(p => p.domain === "line");
    if (lout) {
      const gain = s(lout).gainDb as number | null;
      const conn = lout.connector?.toUpperCase() ?? "";
      const bal  = lout.balanced ? "bal" : "SE";
      const parts: string[] = [];
      if (gain) parts.push(`+${gain} dB`);
      if (conn) parts.push(`${conn} ${bal}`);
      return parts.join(" \u00B7 ") || getSpecNote(c);
    }
  }

  if (["power_amp", "tube_amp_se", "tube_amp_pp", "integrated"].includes(c.category)) {
    const spOut = outs.find(p => p.domain === "speaker");
    if (spOut) {
      const sp = s(spOut);
      const powerW = sp.powerW as { ohm: number; watts: number }[] | null;
      const outZ = sp.outputImpedanceOhm as number | null;
      const parts: string[] = [];
      if (powerW?.length) {
        const ref = powerW[0];
        parts.push(`${ref.watts}W/${ref.ohm}\u2126`);
      }
      // Try to get DF from report
      if (report && chain) {
        const idx = chain.findIndex(e => e.component.id === c.id);
        if (idx >= 0 && idx < report.links.length) {
          const df = report.links[idx].results.find(r => r.id === "damping_factor");
          if (df?.value) parts.push(`DF${df.value}`);
        }
      }
      if (!parts.length && outZ) parts.push(`Z=${outZ}\u2126`);
      return parts.join(" \u00B7 ") || getSpecNote(c);
    }
  }

  return getSpecNote(c);
}
