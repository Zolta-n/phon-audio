// ---------------------------------------------------------------------------
// Recommendation layer: ranks real alternatives the chain offers — where D/A
// conversion should happen, and which digital connection to use. Purely
// advisory: it never touches link verdicts or the overall score. Rankings are
// about clocking architecture, noise isolation and converter quality margins,
// not "sound signature" (all working digital links deliver the same bits).
// ---------------------------------------------------------------------------

import type { Chain, Component, Connector, DigitalIn, DigitalOut, Port, SignalDomain } from "../types";
import { RANKING } from "./thresholds";

export type RecommendationKind = "da_placement" | "digital_connection";

/** "spec" = ranked from declared measurements; "heuristic" = category rule of thumb. */
export type RecommendationConfidence = "spec" | "heuristic";

export interface RecommendationOption {
  /** e.g. "Convert in the Network Streamer (built-in DAC)" or "Coax S/PDIF". */
  label: string;
  /** 0–100, comparable only within this recommendation. */
  score: number;
  rationale: string;
  /** For digital_connection options. */
  connector?: Connector;
}

export interface Recommendation {
  /** Stable id: `${kind}:${fromIndex}-${toIndex}`. */
  id: string;
  kind: RecommendationKind;
  confidence: RecommendationConfidence;
  title: string;
  detail: string;
  /** Chain node indices this recommendation concerns. */
  fromIndex: number;
  toIndex: number;
  /** Best digital connector, when kind === "digital_connection". */
  suggestedConnector?: Connector;
  /** All viable options, best first (emitted only when ≥ 2 exist). */
  options: RecommendationOption[];
}

export interface LinkOption {
  domain: SignalDomain;
  out: Port;
  in: Port;
  /** True when out/in share a physical connector (no adapter needed). */
  connectorMatch: boolean;
}

/**
 * Every domain-compatible out→in port pairing between two components. Used
 * only by this recommendation layer; evaluateChain's resolveLink still picks
 * the single evaluated path via DOMAIN_PRIORITY.
 */
export function enumerateLinkOptions(from: Component, to: Component): LinkOption[] {
  const options: LinkOption[] = [];
  for (const out of from.outputs ?? []) {
    for (const inp of to.inputs ?? []) {
      if (out.domain !== inp.domain) continue;
      options.push({ domain: out.domain, out, in: inp, connectorMatch: out.connector === inp.connector });
    }
  }
  return options;
}

// Keep in sync with DOMAIN_PRIORITY in ./index.ts — used only to tell the user
// which of the alternative paths the report actually evaluated.
const DOMAIN_PRIORITY: SignalDomain[] = ["speaker", "headphone", "line", "phono", "digital"];

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export interface DacQuality {
  score: number;
  basis: "spec" | "heuristic";
  reasons: string[];
}

/** Quality score (0–100) for a component's D/A stage, from specs when present. */
export function dacQualityScore(component: Component): DacQuality {
  const dac = component.dac;
  const subs: { weight: number; score: number }[] = [];
  const reasons: string[] = [];

  if (dac?.dynamicRangeDb !== undefined) {
    subs.push({
      weight: RANKING.dacWeights.dynamicRange,
      score: clamp01((dac.dynamicRangeDb - RANKING.dacDrFloorDb) / (RANKING.dacDrCeilDb - RANKING.dacDrFloorDb)) * 100,
    });
    reasons.push(`${dac.dynamicRangeDb} dB dynamic range`);
  }
  if (dac?.thdPlusNPct !== undefined && dac.thdPlusNPct > 0) {
    const thdDb = 20 * Math.log10(dac.thdPlusNPct / 100);
    subs.push({
      weight: RANKING.dacWeights.thd,
      score: clamp01((thdDb - RANKING.dacThdFloorDb) / (RANKING.dacThdCeilDb - RANKING.dacThdFloorDb)) * 100,
    });
    reasons.push(`THD+N ${thdDb.toFixed(0)} dB`);
  }
  if (dac?.intrinsicJitterPs !== undefined && dac.intrinsicJitterPs > 0) {
    const logSpan = Math.log10(RANKING.dacJitterFloorPs) - Math.log10(RANKING.dacJitterCeilPs);
    subs.push({
      weight: RANKING.dacWeights.jitter,
      score: clamp01((Math.log10(RANKING.dacJitterFloorPs) - Math.log10(dac.intrinsicJitterPs)) / logSpan) * 100,
    });
    reasons.push(`${dac.intrinsicJitterPs} ps conversion-clock jitter`);
  }
  if (dac?.clockAccuracyPpm !== undefined && dac.clockAccuracyPpm > 0) {
    const logSpan = Math.log10(RANKING.dacClockFloorPpm) - Math.log10(RANKING.dacClockCeilPpm);
    subs.push({
      weight: RANKING.dacWeights.clock,
      score: clamp01((Math.log10(RANKING.dacClockFloorPpm) - Math.log10(dac.clockAccuracyPpm)) / logSpan) * 100,
    });
    reasons.push(`±${dac.clockAccuracyPpm} ppm clock`);
  }

  if (subs.length === 0) {
    return {
      score: RANKING.dacHeuristicByCategory[component.category] ?? RANKING.dacHeuristicDefault,
      basis: "heuristic",
      reasons: ["no D/A specs on record — ranked by device type (dedicated DAC > streamer > amp built-in)"],
    };
  }

  const totalWeight = subs.reduce((s, x) => s + x.weight, 0);
  const score = subs.reduce((s, x) => s + (x.weight / totalWeight) * x.score, 0);
  return { score, basis: "spec", reasons };
}

const ANALOG_OUT_DOMAINS: SignalDomain[] = ["line", "headphone", "speaker"];

/** Does this component contain a D/A conversion stage? */
export function hasDaStage(c: Component): boolean {
  if (c.dac !== undefined) return true;
  const analogOut = (c.outputs ?? []).some((p) => ANALOG_OUT_DOMAINS.includes(p.domain));
  if (!analogOut) return false;
  const digitalIn = (c.inputs ?? []).some((p) => p.domain === "digital");
  // A source with analog outputs converts its internal digital stream itself.
  return digitalIn || c.category === "source";
}

/** D/A placement: emitted when a pair offers both an analog and a digital path
 *  and each path's conversion point actually has a D/A stage. */
function daPlacement(
  from: Component,
  to: Component,
  options: LinkOption[],
  fromIndex: number,
): Recommendation | null {
  const analog = options.filter((o) => o.domain === "line" || o.domain === "headphone");
  const digital = options.filter((o) => o.domain === "digital");
  if (analog.length === 0 || digital.length === 0) return null;
  if (!hasDaStage(from) || !hasDaStage(to)) return null;

  const qFrom = dacQualityScore(from); // convert upstream → analog link
  const qTo = dacQualityScore(to); //     convert downstream → digital link
  const confidence: RecommendationConfidence =
    qFrom.basis === "spec" && qTo.basis === "spec" ? "spec" : "heuristic";

  const optFrom: RecommendationOption = {
    label: `Convert in ${from.name} (analog connection)`,
    score: qFrom.score,
    rationale: qFrom.reasons.join("; "),
  };
  const optTo: RecommendationOption = {
    label: `Convert in ${to.name} (digital connection)`,
    score: qTo.score,
    rationale: qTo.reasons.join("; "),
  };
  const ranked = [optFrom, optTo].sort((a, b) => b.score - a.score);
  const winner = ranked[0]!;
  const margin = Math.abs(qFrom.score - qTo.score);

  // Which path does the report actually evaluate? resolveLink walks
  // DOMAIN_PRIORITY, so the first available domain wins (line beats digital).
  const evaluatedDomain = DOMAIN_PRIORITY.find((d) => options.some((o) => o.domain === d));
  const evaluatedNote =
    evaluatedDomain === "digital"
      ? `Note: this chain is currently evaluated over the digital connection — ${to.name}'s DAC does the conversion. To use ${from.name}'s DAC instead, connect via an analog cable.`
      : `Note: this chain is currently evaluated over the ${evaluatedDomain} (analog) connection — ${from.name}'s DAC does the conversion. To use ${to.name}'s DAC instead, connect via a digital cable.`;

  const detail =
    margin < 5
      ? `Both devices can do the D/A conversion and on ${confidence === "spec" ? "spec" : "type"} they are effectively tied (${margin.toFixed(0)}-point margin) — either works; pick the connection that suits your setup. ${evaluatedNote}`
      : `${winner.label.replace(/ \(.*\)$/, "")} has the stronger D/A stage (${winner.score.toFixed(0)} vs ${ranked[1]!.score.toFixed(0)} on a 0–100 scale${confidence === "heuristic" ? ", by device-type rule of thumb — treat as a starting point, not a measurement" : ""}). ${evaluatedNote}`;

  return {
    id: `da_placement:${fromIndex}-${fromIndex + 1}`,
    kind: "da_placement",
    confidence,
    title: "Where should D/A conversion happen?",
    detail,
    fromIndex,
    toIndex: fromIndex + 1,
    options: ranked,
  };
}

const CONNECTOR_LABELS: Partial<Record<Connector, string>> = {
  usb: "USB",
  coax: "Coax S/PDIF",
  optical: "Optical (TOSLINK)",
  aes: "AES/EBU",
  i2s: "I2S",
};

/** Connection-type ranking: emitted when a pair shares ≥ 2 digital connectors. */
function digitalConnection(
  from: Component,
  to: Component,
  options: LinkOption[],
  fromIndex: number,
): Recommendation | null {
  // One candidate per distinct shared connector (first matching port pair wins).
  const byConnector = new Map<Connector, LinkOption>();
  for (const o of options) {
    if (o.domain !== "digital" || !o.connectorMatch) continue;
    if (!byConnector.has(o.out.connector)) byConnector.set(o.out.connector, o);
  }
  if (byConnector.size < 2) return null;

  let anySpec = false;
  const ranked: RecommendationOption[] = [...byConnector.entries()]
    .map(([connector, o]) => {
      const out = o.out.specs as DigitalOut;
      const inp = o.in.specs as DigitalIn;
      const parts: string[] = [];
      let score = RANKING.connectorBase[connector] ?? 50;

      if (connector === "usb") {
        const mode = inp.usbMode ?? "adaptive";
        score += RANKING.usbModeBonus[mode];
        if (inp.usbMode) anySpec = true;
        parts.push(
          inp.usbMode === "async"
            ? "asynchronous — the DAC's clock rules the link, source jitter is irrelevant"
            : inp.usbMode
              ? `${inp.usbMode} mode — timing follows the host`
              : "transfer mode not reported",
        );
      }
      if (connector === "coax" || connector === "aes") {
        const rej = inp.jitterRejection ?? "none";
        score += RANKING.jitterRejectionBonus[rej];
        if (inp.jitterRejection) anySpec = true;
        parts.push(
          rej === "reclocking"
            ? "embedded clock, but the input re-clocks through a buffer"
            : rej === "pll"
              ? "embedded clock, cleaned by a PLL"
              : "embedded clock recovered by the receiver",
        );
      }
      const isolated = connector === "optical" || out.galvanicIsolation === true || inp.galvanicIsolation === true;
      if (isolated) {
        score += RANKING.isolationBonus;
        if (out.galvanicIsolation || inp.galvanicIsolation) anySpec = true;
        parts.push("galvanically isolated — immune to ground loops");
      }

      // Does this path (connector ceiling + input ceiling) cap what the source can deliver?
      const pathCeiling = Math.min(
        RANKING.connectorMaxPcmKhz[connector] ?? Infinity,
        inp.maxSampleRateKhz || Infinity,
      );
      const pcmLimited = Number.isFinite(pathCeiling) && (out.maxSampleRateKhz || 0) > pathCeiling;
      const dsdLimited = connector === "optical" && (out.formats ?? []).includes("dsd");
      if (pcmLimited || dsdLimited) {
        score -= RANKING.bandwidthLimitPenalty;
        if (pcmLimited) parts.push(`caps PCM at ~${pathCeiling} kHz (source outputs up to ${out.maxSampleRateKhz} kHz)`);
        if (dsdLimited) parts.push("DSD over TOSLINK is unreliable above DSD64");
      }

      return {
        label: CONNECTOR_LABELS[connector] ?? connector,
        score,
        rationale: parts.join("; ") || "solid standard digital link",
        connector,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]!;
  return {
    id: `digital_connection:${fromIndex}-${fromIndex + 1}`,
    kind: "digital_connection",
    confidence: anySpec ? "spec" : "heuristic",
    title: `Best digital connection: ${from.name} → ${to.name}`,
    detail:
      `${best.label} is the strongest choice of the ${ranked.length} shared digital inputs. ` +
      `All of these deliver the same bits — this ordering is about clocking architecture and ` +
      `noise-isolation margins, not sound signature.`,
    fromIndex,
    toIndex: fromIndex + 1,
    suggestedConnector: best.connector,
    options: ranked,
  };
}

/** Run all recommenders over each adjacent pair of the chain. */
export function recommendForChain(chain: Chain): Recommendation[] {
  const recs: Recommendation[] = [];
  for (let i = 0; i < chain.nodes.length - 1; i++) {
    const from = chain.nodes[i]!.component;
    const to = chain.nodes[i + 1]!.component;
    const options = enumerateLinkOptions(from, to);
    if (options.length === 0) continue;
    const placement = daPlacement(from, to, options, i);
    if (placement) recs.push(placement);
    const connection = digitalConnection(from, to, options, i);
    if (connection) recs.push(connection);
  }
  return recs;
}
