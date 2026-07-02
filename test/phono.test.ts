import { test } from "node:test";
import assert from "node:assert/strict";
import {
  phonoCartridgeMatch,
  phonoImpedanceLoading,
  phonoCapacitanceLoading,
  phonoGainAdequacy,
} from "../src/engine/checks/phonoLink";
import type { PhonoOut, PhonoIn, InterconnectCable } from "../src/types";

const mmCart: PhonoOut = {
  kind: "phono_out",
  cartridgeType: "mm",
  outputVoltageMv: 5,
  recommendedLoadCapacitancePf: 200,
};

const mcCart: PhonoOut = {
  kind: "phono_out",
  cartridgeType: "mc",
  outputVoltageMv: 0.4,
  internalImpedanceOhm: 10,
};

const mmStage: PhonoIn = {
  kind: "phono_in",
  cartridgeType: "mm",
  inputImpedanceOhm: 47000,
  inputCapacitancePf: 100,
  gainDb: 40,
};

const mcStage: PhonoIn = {
  kind: "phono_in",
  cartridgeType: "mc",
  inputImpedanceOhm: 100,
  gainDb: 60,
};

const lowCapCable: InterconnectCable = {
  kind: "interconnect",
  lengthM: 1,
  capacitancePfPerM: 60,
  balanced: false,
};

test("cartridge match: mm→mm passes, mc→mm-only fails, both accepts either", () => {
  assert.equal(phonoCartridgeMatch(mmCart, mmStage).verdict, "pass");
  assert.equal(phonoCartridgeMatch(mcCart, mmStage).verdict, "fail");
  assert.equal(
    phonoCartridgeMatch(mcCart, { ...mmStage, cartridgeType: "both" }).verdict,
    "pass",
  );
});

test("impedance loading: standard 47k passes MM, non-standard warns", () => {
  assert.equal(phonoImpedanceLoading(mmCart, mmStage).verdict, "pass");
  assert.equal(
    phonoImpedanceLoading(mmCart, { ...mmStage, inputImpedanceOhm: 10000 }).verdict,
    "warn",
  );
});

test("impedance loading: MC load ratio thresholds", () => {
  // 100 Ω load / 10 Ω internal = 10× → pass
  assert.equal(phonoImpedanceLoading(mcCart, mcStage).verdict, "pass");
  // 60 Ω / 10 Ω = 6× → warn
  assert.equal(
    phonoImpedanceLoading(mcCart, { ...mcStage, inputImpedanceOhm: 60 }).verdict,
    "warn",
  );
  // 30 Ω / 10 Ω = 3× → fail
  assert.equal(
    phonoImpedanceLoading(mcCart, { ...mcStage, inputImpedanceOhm: 30 }).verdict,
    "fail",
  );
});

test("impedance loading: missing stage impedance is info", () => {
  assert.equal(
    phonoImpedanceLoading(mmCart, { ...mmStage, inputImpedanceOhm: 0 }).verdict,
    "info",
  );
});

test("capacitance loading: within recommended range passes, far off warns", () => {
  // cable 60 pF + stage 100 pF = 160 pF vs recommended 200 pF (0.7–1.4× window) → pass
  assert.equal(phonoCapacitanceLoading(mmCart, mmStage, lowCapCable).verdict, "pass");
  // very high capacitance cable → warn
  const highCap: InterconnectCable = { ...lowCapCable, capacitancePfPerM: 400, lengthM: 2 };
  assert.equal(phonoCapacitanceLoading(mmCart, mmStage, highCap).verdict, "warn");
});

test("capacitance loading: not critical for MC, unknown caps are info", () => {
  assert.equal(phonoCapacitanceLoading(mcCart, mcStage, lowCapCable).verdict, "pass");
  assert.equal(
    phonoCapacitanceLoading({ ...mmCart, recommendedLoadCapacitancePf: undefined }, { ...mmStage, inputCapacitancePf: undefined }).verdict,
    "info",
  );
});

test("phono gain: MM at 40 dB gives healthy line level", () => {
  // 5 mV × 40 dB (100×) = 0.5 Vrms → pass
  const r = phonoGainAdequacy(mmCart, mmStage);
  assert.equal(r.verdict, "pass");
});

test("phono gain: MC through an MM-gain stage is too quiet", () => {
  // 0.4 mV × 40 dB (100×) = 40 mV → fail
  assert.equal(phonoGainAdequacy(mcCart, mmStage).verdict, "fail");
  // 0.4 mV × 60 dB (1000×) = 0.4 Vrms → pass
  assert.equal(phonoGainAdequacy(mcCart, mcStage).verdict, "pass");
});

test("phono gain: excessive output warns, missing gain is info (0 dB is a value)", () => {
  // 5 mV × 66 dB (~2000×) ≈ 10 Vrms → warn
  assert.equal(phonoGainAdequacy(mmCart, { ...mmStage, gainDb: 66 }).verdict, "warn");
  assert.equal(
    phonoGainAdequacy(mmCart, { ...mmStage, gainDb: undefined as unknown as number }).verdict,
    "info",
  );
  // gainDb of 0 is treated as a stated value, not missing → computes (and fails: 5 mV)
  assert.equal(phonoGainAdequacy(mmCart, { ...mmStage, gainDb: 0 }).verdict, "fail");
});
