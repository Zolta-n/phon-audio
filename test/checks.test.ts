import { test } from "node:test";
import assert from "node:assert/strict";
import { impedanceBridging, gainStaging } from "../src/engine/checks/lineLink";
import {
  speakerPowerHeadroom,
  dampingFactor,
  speakerImpedanceStability,
} from "../src/engine/checks/speakerLink";
import { headphoneDrive, headphoneOutputImpedance } from "../src/engine/checks/headphoneLink";
import type { SpeakerLoad, SpeakerOut, HeadphoneLoad, HeadphoneOut } from "../src/types";

test("impedance bridging verdicts", () => {
  assert.equal(impedanceBridging(100, 47000).verdict, "pass"); // 470x
  assert.equal(impedanceBridging(100, 700).verdict, "warn"); // 7x
  assert.equal(impedanceBridging(100, 300).verdict, "fail"); // 3x
});

test("gain staging flags underdrive and overload", () => {
  assert.equal(gainStaging(4.0, 1.4).verdict, "pass");
  assert.equal(gainStaging(0.5, 1.4).verdict, "fail"); // can't reach full output
  assert.equal(gainStaging(10, 1.4, 8).verdict, "warn"); // exceeds overload point
});

const amp: SpeakerOut = {
  kind: "speaker_out",
  powerW: [
    { ohm: 8, watts: 100 },
    { ohm: 4, watts: 180 },
  ],
  ratedMinImpedanceOhm: 4,
  outputImpedanceOhm: 0.05,
  gainDb: 29,
  inputSensitivityVrms: 1.4,
};

const speaker: SpeakerLoad = {
  kind: "speaker_load",
  nominalImpedanceOhm: 8,
  minImpedanceOhm: 6,
  sensitivityDb_2_83V_1m: 88,
  powerHandlingW: 100,
};

test("power headroom: ample power at 1 m gives lots of headroom", () => {
  const r = speakerPowerHeadroom(speaker, amp, {
    targetSplDb: 90,
    crestFactorDb: 0,
    distanceM: 1,
    roomGainDb: 0,
  });
  // need 90 dB from 88 dB/1W → ~1.58 W; 100 W → ~18 dB headroom
  assert.ok(Math.abs(r.value! - 18) < 0.5, `headroom ${r.value}`);
  assert.equal(r.verdict, "info"); // >12 dB = more than needed
});

test("power headroom: distant + low sensitivity can fail", () => {
  const hard: SpeakerLoad = { ...speaker, sensitivityDb_2_83V_1m: 84, nominalImpedanceOhm: 4, minImpedanceOhm: 3 };
  const weak: SpeakerOut = { ...amp, powerW: [{ ohm: 4, watts: 10 }] };
  const r = speakerPowerHeadroom(hard, weak, {
    targetSplDb: 95,
    crestFactorDb: 15,
    distanceM: 4,
    roomGainDb: 0,
  });
  assert.equal(r.verdict, "fail");
});

test("damping factor: low output impedance passes, high warns", () => {
  assert.equal(dampingFactor(speaker, amp).verdict, "pass");
  const tube: SpeakerOut = { ...amp, outputImpedanceOhm: 1.5 };
  assert.equal(dampingFactor(speaker, tube).verdict, "warn");
});

test("impedance stability fails when speaker dips below amp rating", () => {
  const tough: SpeakerLoad = { ...speaker, minImpedanceOhm: 3 };
  assert.equal(speakerImpedanceStability(tough, amp).verdict, "fail");
});

const hpAmp: HeadphoneOut = {
  kind: "headphone_out",
  outputImpedanceOhm: 0.5,
  maxVrms: 7,
  maxCurrentMa: 300,
};

test("headphone drive: easy 300 Ω load passes", () => {
  const hp: HeadphoneLoad = {
    kind: "headphone_load",
    nominalImpedanceOhm: 300,
    sensitivity: { value: 102, unit: "dB/mW" },
  };
  assert.equal(headphoneDrive(hp, hpAmp, { targetSplDb: 85, crestFactorDb: 15 }).verdict, "pass");
});

test("headphone drive: weak amp fails an insensitive planar", () => {
  const planar: HeadphoneLoad = {
    kind: "headphone_load",
    nominalImpedanceOhm: 32,
    sensitivity: { value: 86, unit: "dB/mW" },
  };
  const weakAmp: HeadphoneOut = { ...hpAmp, maxVrms: 1, maxCurrentMa: 30 };
  assert.equal(headphoneDrive(planar, weakAmp, { targetSplDb: 90, crestFactorDb: 18 }).verdict, "fail");
});

test("headphone output impedance rule", () => {
  const hp: HeadphoneLoad = {
    kind: "headphone_load",
    nominalImpedanceOhm: 32,
    sensitivity: { value: 100, unit: "dB/mW" },
  };
  assert.equal(headphoneOutputImpedance(hp, hpAmp).verdict, "pass"); // 64x
  const highZout: HeadphoneOut = { ...hpAmp, outputImpedanceOhm: 10 };
  assert.equal(headphoneOutputImpedance(hp, highZout).verdict, "fail"); // 3.2x
});
