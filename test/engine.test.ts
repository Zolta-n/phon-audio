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
