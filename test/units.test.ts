import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dbPerVFromDbPerMw,
  dbPerMwFromDbPerV,
  toDbPerMw,
  sensitivityDbPer1W,
  speakerCableResistanceOhm,
  awgDiameterMm,
  powerForSpl,
  ampPowerAtImpedance,
} from "../src/units";

const close = (a: number, b: number, eps = 0.05) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

test("dB/mW ↔ dB/V round-trips", () => {
  const z = 300;
  const dbV = dbPerVFromDbPerMw(100, z);
  close(dbPerMwFromDbPerV(dbV, z), 100);
});

test("toDbPerMw passes through dB/mW and converts dB/V", () => {
  assert.equal(toDbPerMw({ value: 100, unit: "dB/mW" }, 32), 100);
  const z = 32;
  const dbV = dbPerVFromDbPerMw(100, z);
  close(toDbPerMw({ value: dbV, unit: "dB/V" }, z), 100);
});

test("speaker sensitivity: 8 Ω is unchanged, 4 Ω drops ~3 dB at 1 W", () => {
  close(sensitivityDbPer1W(88, 8), 88, 0.05);
  close(sensitivityDbPer1W(88, 4), 85, 0.1);
});

test("12 AWG diameter and round-trip resistance", () => {
  close(awgDiameterMm(12), 2.053, 0.01);
  // ~0.00521 Ω/m single → round trip over 3 m ≈ 0.0313 Ω
  close(speakerCableResistanceOhm(12, 3), 0.0313, 0.002);
});

test("powerForSpl: 1 W gives sensitivity SPL", () => {
  close(powerForSpl(88, 88), 1, 0.001);
  close(powerForSpl(98, 88), 10, 0.01);
});

test("ampPowerAtImpedance interpolates and clamps", () => {
  const p = [
    { ohm: 8, watts: 100 },
    { ohm: 4, watts: 180 },
  ];
  assert.equal(ampPowerAtImpedance(p, 8), 100);
  assert.equal(ampPowerAtImpedance(p, 4), 180);
  close(ampPowerAtImpedance(p, 6), 140); // midpoint
  assert.equal(ampPowerAtImpedance(p, 2), 180); // clamp below range
});
