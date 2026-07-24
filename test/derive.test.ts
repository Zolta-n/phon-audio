import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveSpecs, type DerivedField } from "../web/lib/deriveSpecs";

const close = (a: number, b: number, eps = 0.1) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

function find(list: DerivedField[], field: string): DerivedField | undefined {
  return list.find((d) => d.field === field);
}

test("speaker_out: derives gainDb from power + input sensitivity", () => {
  // 100 W into 8 Ω → 28.28 Vrms full output. 1.4 Vrms sensitivity → gain ≈ 26.1 dB.
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "speaker_out", powerW: [{ ohm: 8, watts: 100 }], inputSensitivityVrms: 1.4 } }],
  });
  const gain = find(derived, "gainDb");
  assert.ok(gain, "expected a gainDb derivation");
  close(gain!.value as number, 20 * Math.log10(Math.sqrt(800) / 1.4));
});

test("speaker_out: derives inputSensitivityVrms from power + gain", () => {
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "speaker_out", powerW: [{ ohm: 8, watts: 100 }], gainDb: 26 } }],
  });
  const sens = find(derived, "inputSensitivityVrms");
  assert.ok(sens, "expected an inputSensitivityVrms derivation");
  close(sens!.value as number, Math.sqrt(800) / Math.pow(10, 26 / 20));
});

test("speaker_out: prefers the 8 Ω rating as the sensitivity reference", () => {
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "speaker_out", powerW: [{ ohm: 4, watts: 180 }, { ohm: 8, watts: 100 }], gainDb: 26 } }],
  });
  const sens = find(derived, "inputSensitivityVrms");
  // Uses 8 Ω (√800), not 4 Ω (√720).
  close(sens!.value as number, Math.sqrt(800) / Math.pow(10, 26 / 20));
});

test("never overwrites an existing value", () => {
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "speaker_out", powerW: [{ ohm: 8, watts: 100 }], gainDb: 26, inputSensitivityVrms: 1.4 } }],
  });
  assert.equal(derived.length, 0, "nothing should be derived when both fields present");
});

test("does nothing without enough inputs", () => {
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "speaker_out", gainDb: 26 } }], // no powerW
  });
  assert.equal(derived.length, 0);
});

test("headphone_out: derives maxVrms from rated power at the strongest load", () => {
  // 1000 mW into 32 Ω → √(1·32) = 5.66 Vrms; 100 mW into 300 Ω → √(0.1·300) = 5.48.
  const derived = deriveSpecs({
    outputs: [{ specs: { kind: "headphone_out", powerMw: [{ ohm: 32, mw: 1000 }, { ohm: 300, mw: 100 }] } }],
  });
  const v = find(derived, "maxVrms");
  assert.ok(v, "expected a maxVrms derivation");
  close(v!.value as number, Math.sqrt((1000 / 1000) * 32));
});
