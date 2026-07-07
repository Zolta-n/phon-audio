import { test } from "node:test";
import assert from "node:assert/strict";
import type { Chain, Component } from "../src/types";
import { evaluateChain } from "../src/engine";
import {
  dacQualityScore,
  enumerateLinkOptions,
  hasDaStage,
  recommendForChain,
} from "../src/engine/recommend";
import {
  networkStreamer,
  desktopDac,
  integratedWithDac,
  towerSpeaker,
  usbCable,
  speakerCable12awg,
} from "../src/seed/components";

function chainOf(...components: Component[]): Chain {
  return {
    context: { targetSplDb: 80, crestFactorDb: 15, distanceM: 2, roomGainDb: 3 },
    nodes: components.map((component) => ({ component })),
  };
}

// ---- dacQualityScore ---------------------------------------------------------

test("dacQualityScore: full specs give a spec basis and better DR wins", () => {
  const good = dacQualityScore(desktopDac); // 123 dB DR
  const okay = dacQualityScore(integratedWithDac); // 105 dB DR
  assert.equal(good.basis, "spec");
  assert.equal(okay.basis, "spec");
  assert.ok(good.score > okay.score, `${good.score} should beat ${okay.score}`);
});

test("dacQualityScore: partial specs stay spec-based with renormalized weights", () => {
  const drOnly: Component = { ...desktopDac, dac: { dynamicRangeDb: 125 } };
  const q = dacQualityScore(drOnly);
  assert.equal(q.basis, "spec");
  // 125 dB is the window ceiling; the only present field carries full weight.
  assert.ok(q.score > 99, `expected ~100, got ${q.score}`);
});

test("dacQualityScore: no specs fall back to the category heuristic ordering", () => {
  const strip = (c: Component): Component => ({ ...c, dac: undefined });
  const dacScore = dacQualityScore(strip(desktopDac));
  const sourceScore = dacQualityScore(strip(networkStreamer));
  const intScore = dacQualityScore(strip(integratedWithDac));
  assert.equal(dacScore.basis, "heuristic");
  assert.ok(dacScore.score > sourceScore.score && sourceScore.score > intScore.score);
  assert.match(dacScore.reasons[0]!, /no D\/A specs/);
});

// ---- hasDaStage / enumerateLinkOptions ----------------------------------------

test("hasDaStage: DAC, streamer and digital-in amp qualify; speaker does not", () => {
  assert.ok(hasDaStage(desktopDac));
  assert.ok(hasDaStage(networkStreamer));
  assert.ok(hasDaStage(integratedWithDac));
  assert.ok(!hasDaStage(towerSpeaker));
});

test("enumerateLinkOptions lists both digital and line pairings for a combo pair", () => {
  const options = enumerateLinkOptions(networkStreamer, integratedWithDac);
  const domains = new Set(options.map((o) => o.domain));
  assert.ok(domains.has("digital"));
  assert.ok(domains.has("line"));
});

// ---- D/A placement -------------------------------------------------------------

test("da_placement: combo pair with specs on both sides is spec-confident and favors the streamer", () => {
  const recs = recommendForChain(chainOf(networkStreamer, integratedWithDac, towerSpeaker));
  const placement = recs.find((r) => r.kind === "da_placement");
  assert.ok(placement, "expected a da_placement recommendation");
  assert.equal(placement!.confidence, "spec");
  assert.equal(placement!.fromIndex, 0);
  // Streamer DAC (112 dB) beats the amp's built-in (105 dB).
  assert.match(placement!.options[0]!.label, /Network Streamer/);
  // Honesty note: says which path the report actually evaluated.
  assert.match(placement!.detail, /currently evaluated over the line/);
});

test("da_placement: stripping one side's specs degrades confidence to heuristic", () => {
  const noSpecAmp: Component = { ...integratedWithDac, dac: undefined };
  const recs = recommendForChain(chainOf(networkStreamer, noSpecAmp));
  const placement = recs.find((r) => r.kind === "da_placement");
  assert.ok(placement);
  assert.equal(placement!.confidence, "heuristic");
});

test("da_placement: absent when only one path exists", () => {
  // Streamer → desktop DAC: digital-only inputs, no analog alternative.
  const recs = recommendForChain(chainOf(networkStreamer, desktopDac));
  assert.ok(!recs.some((r) => r.kind === "da_placement"));
});

// ---- Connection-type ranking ----------------------------------------------------

test("digital_connection: async USB ranks first among shared connectors", () => {
  const recs = recommendForChain(chainOf(networkStreamer, desktopDac));
  const conn = recs.find((r) => r.kind === "digital_connection");
  assert.ok(conn, "expected a digital_connection recommendation");
  assert.equal(conn!.suggestedConnector, "usb");
  assert.equal(conn!.confidence, "spec");
  assert.match(conn!.detail, /same bits/);
});

test("digital_connection: reclocking coax beats unknown-mode USB", () => {
  const vagueUsbDac: Component = {
    ...desktopDac,
    inputs: desktopDac.inputs.map((p) =>
      p.connector === "usb"
        ? { ...p, specs: { kind: "digital_in" as const, formats: ["pcm" as const], maxSampleRateKhz: 192, maxBitDepth: 24 } }
        : p,
    ),
  };
  const recs = recommendForChain(chainOf(networkStreamer, vagueUsbDac));
  const conn = recs.find((r) => r.kind === "digital_connection");
  assert.ok(conn);
  // usb base 60 + adaptive 0 = 60; coax base 66 + reclocking 10 = 76.
  assert.equal(conn!.suggestedConnector, "coax");
});

test("digital_connection: optical is penalized when the gear outruns its bandwidth", () => {
  const opticalStreamer: Component = {
    ...networkStreamer,
    outputs: [
      networkStreamer.outputs[0]!, // usb 384 kHz
      { domain: "digital", connector: "optical", balanced: false,
        specs: { kind: "digital_out", formats: ["pcm"], maxSampleRateKhz: 192, maxBitDepth: 24 } },
    ],
  };
  const recs = recommendForChain(chainOf(opticalStreamer, integratedWithDac));
  const conn = recs.find((r) => r.kind === "digital_connection");
  assert.ok(conn);
  const optical = conn!.options.find((o) => o.connector === "optical");
  assert.ok(optical);
  assert.match(optical!.rationale, /caps PCM/);
  assert.notEqual(conn!.suggestedConnector, "optical");
});

test("digital_connection: absent with fewer than two shared connectors", () => {
  const usbOnlyDac: Component = {
    ...desktopDac,
    inputs: desktopDac.inputs.filter((p) => p.connector === "usb"),
  };
  const recs = recommendForChain(chainOf(networkStreamer, usbOnlyDac));
  assert.ok(!recs.some((r) => r.kind === "digital_connection"));
});

// ---- Integration with evaluateChain ---------------------------------------------

test("evaluateChain still resolves the combo pair over line while recommending", () => {
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15, distanceM: 2, roomGainDb: 3 },
    nodes: [
      { component: networkStreamer },
      { component: integratedWithDac, cableToNext: speakerCable12awg },
      { component: towerSpeaker },
    ],
  };
  const report = evaluateChain(chain);
  assert.equal(report.links[0]!.domain, "line", "DOMAIN_PRIORITY must keep picking line");
  assert.ok(report.recommendations.some((r) => r.kind === "da_placement"));
});

test("evaluateChain: digital info notes never add warn/fail (score invariance)", () => {
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15 },
    nodes: [{ component: networkStreamer, cableToNext: usbCable }, { component: desktopDac }],
  };
  const report = evaluateChain(chain);
  const newIds = new Set(["digital_interface", "digital_clock_jitter", "digital_dsd_rate"]);
  const added = report.links.flatMap((l) => l.results).filter((r) => newIds.has(r.id));
  assert.ok(added.length >= 1, "expected the new info rows on a digital link");
  for (const r of added) assert.equal(r.verdict, "info");
  assert.equal(report.links[0]!.verdict, "pass", "digital link must remain a bit-perfect pass");
});

test("evaluateChain: pure-analog chain yields no recommendations", () => {
  const analogOnlyStreamer: Component = {
    ...networkStreamer,
    outputs: networkStreamer.outputs.filter((p) => p.domain === "line"),
    dac: undefined,
  };
  const report = evaluateChain(chainOf(analogOnlyStreamer, integratedWithDac, towerSpeaker));
  assert.deepEqual(report.recommendations, []);
});