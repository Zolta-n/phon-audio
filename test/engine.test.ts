import { test } from "node:test";
import assert from "node:assert/strict";
import type { Chain } from "../src/types";
import { evaluateChain } from "../src/engine";
import {
  networkStreamer,
  desktopDac,
  linePreamp,
  solidStateAmp,
  towerSpeaker,
  usbCable,
  xlrInterconnect,
  speakerCable12awg,
} from "../src/seed/components";

const goodChain: Chain = {
  context: { targetSplDb: 85, crestFactorDb: 15, distanceM: 3, roomGainDb: 3 },
  nodes: [
    { component: networkStreamer, cableToNext: usbCable },
    { component: desktopDac, cableToNext: xlrInterconnect },
    { component: linePreamp, cableToNext: xlrInterconnect },
    { component: solidStateAmp, cableToNext: speakerCable12awg },
    { component: towerSpeaker },
  ],
};

test("full speaker chain resolves four links", () => {
  const report = evaluateChain(goodChain);
  assert.equal(report.links.length, 4);
  assert.deepEqual(
    report.links.map((l) => l.domain),
    ["digital", "line", "line", "speaker"],
  );
});

test("well-matched chain has no failures", () => {
  const report = evaluateChain(goodChain);
  const failures = report.links.flatMap((l) => l.results).filter((r) => r.verdict === "fail");
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
  assert.notEqual(report.overall, "fail");
});

test("system checks include SPL reach and gain structure", () => {
  const report = evaluateChain(goodChain);
  const ids = report.system.map((r) => r.id);
  assert.ok(ids.includes("system_spl_reach"));
  assert.ok(ids.includes("system_gain_structure"));
});

// ---- Added with the 2026-07 engine fixes ------------------------------------

import {
  desktopHeadphoneAmp,
  highImpedanceHeadphone,
  bookshelfSpeaker,
} from "../src/seed/components";
import type { Component } from "../src/types";

test("well-matched chain reads as an overall pass (info is neutral)", () => {
  // Gentler context than goodChain's default: at 80 dB / 2 m every check passes,
  // and the always-info system gain check must not drag the overall below pass.
  const relaxed: Chain = {
    ...goodChain,
    context: { targetSplDb: 80, crestFactorDb: 15, distanceM: 2, roomGainDb: 3 },
  };
  const report = evaluateChain(relaxed);
  const worst = report.links.flatMap((l) => l.results).filter((r) => r.verdict === "warn" || r.verdict === "fail");
  assert.equal(worst.length, 0, JSON.stringify(worst, null, 2));
  assert.ok(report.system.some((r) => r.verdict === "info"));
  assert.equal(report.overall, "pass");
});

test("headphone chain: DAC → HP amp → 300 Ω dynamic evaluates end to end", () => {
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15 },
    nodes: [
      { component: desktopDac, cableToNext: xlrInterconnect },
      { component: desktopHeadphoneAmp },
      { component: highImpedanceHeadphone },
    ],
  };
  const report = evaluateChain(chain);
  assert.deepEqual(report.links.map((l) => l.domain), ["line", "headphone"]);
  assert.equal(report.overall, "pass");
  const ids = report.links.flatMap((l) => l.results).map((r) => r.id);
  assert.ok(ids.includes("headphone_drive"));
  assert.ok(ids.includes("headphone_output_impedance"));
});

test("no compatible domain yields a no_link fail", () => {
  // Speaker has no outputs; headphone input can't connect to it.
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15 },
    nodes: [{ component: bookshelfSpeaker }, { component: highImpedanceHeadphone }],
  };
  const report = evaluateChain(chain);
  assert.equal(report.links.length, 1);
  assert.equal(report.links[0]!.results[0]!.id, "no_link");
  assert.equal(report.overall, "fail");
});

test("connector mismatch on a shared domain warns about an adapter", () => {
  const rcaOnlyPre: Component = {
    ...linePreamp,
    inputs: linePreamp.inputs.map((p) =>
      p.domain === "line" ? { ...p, connector: "rca" as const, balanced: false } : p,
    ),
  };
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15 },
    nodes: [
      { component: desktopDac, cableToNext: xlrInterconnect }, // xlr out
      { component: rcaOnlyPre }, // rca in
    ],
  };
  const report = evaluateChain(chain);
  const connector = report.links[0]!.results.find((r) => r.id === "connector_match");
  assert.ok(connector, "expected a connector_match result");
  assert.equal(connector!.verdict, "warn");
});

test("domain/kind disagreement is reported as malformed data, not mis-cast", () => {
  const corrupt: Component = {
    ...desktopDac,
    outputs: [
      {
        domain: "line",
        connector: "xlr",
        balanced: true,
        // speaker_out specs on a line port — malformed
        specs: { kind: "speaker_out", powerW: [{ ohm: 8, watts: 50 }], ratedMinImpedanceOhm: 4, outputImpedanceOhm: 0.1, gainDb: 26 },
      },
    ],
  };
  const chain: Chain = {
    context: { targetSplDb: 80, crestFactorDb: 15 },
    nodes: [{ component: corrupt }, { component: linePreamp }],
  };
  const report = evaluateChain(chain);
  const kindCheck = report.links[0]!.results.find((r) => r.id === "spec_kind_mismatch");
  assert.ok(kindCheck, "expected spec_kind_mismatch");
  assert.equal(kindCheck!.verdict, "fail");
});
