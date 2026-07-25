import { test } from "node:test";
import assert from "node:assert/strict";
import { chipsetBaseline } from "../web/lib/chipsets";

test("recognizes a known chipset and returns baseline specs", () => {
  const b = chipsetBaseline("ES9038PRO");
  assert.ok(b, "expected a baseline");
  assert.equal(typeof b!.dynamicRangeDb, "number");
  assert.equal(typeof b!.thdPlusNPct, "number");
});

test("normalizes spacing/casing and prose around the chip id", () => {
  const a = chipsetBaseline("ess sabre es9038 pro");
  const b = chipsetBaseline("ES9038PRO");
  assert.deepEqual(a, b);
});

test("matches the most specific key (PRO variant, not bare family)", () => {
  const pro = chipsetBaseline("ES9038PRO");
  const q2m = chipsetBaseline("ES9038Q2M");
  assert.notDeepEqual(pro, q2m, "PRO and Q2M must not collapse to the same entry");
});

test("PCM5102A resolves even though PCM5102 is also a key", () => {
  const b = chipsetBaseline("TI PCM5102A");
  assert.ok(b);
  assert.equal(b!.dynamicRangeDb, 112);
});

test("returns null for unknown or empty chipset", () => {
  assert.equal(chipsetBaseline("SomeUnknownDAC123"), null);
  assert.equal(chipsetBaseline(""), null);
  assert.equal(chipsetBaseline(undefined), null);
  assert.equal(chipsetBaseline(null), null);
});
