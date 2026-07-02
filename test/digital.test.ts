import { test } from "node:test";
import assert from "node:assert/strict";
import { digitalLink } from "../src/engine/checks/digitalLink";
import type { DigitalOut, DigitalIn, DigitalCable } from "../src/types";

const pcmDsdOut: DigitalOut = {
  kind: "digital_out",
  formats: ["pcm", "dsd"],
  maxSampleRateKhz: 768,
  maxBitDepth: 32,
};

const pcmIn: DigitalIn = {
  kind: "digital_in",
  formats: ["pcm"],
  maxSampleRateKhz: 192,
  maxBitDepth: 24,
};

const usb: DigitalCable = { kind: "digital", lengthM: 1.5, connector: "usb", maxLengthM: 5 };

test("digital: compatible formats and rates are bit-perfect pass", () => {
  const out: DigitalOut = { ...pcmDsdOut, maxSampleRateKhz: 192, maxBitDepth: 24 };
  const r = digitalLink(out, pcmIn, usb);
  assert.equal(r.verdict, "pass");
  assert.match(r.explanation, /bit-perfect/);
});

test("digital: no shared format fails", () => {
  const dsdOnlyOut: DigitalOut = { ...pcmDsdOut, formats: ["dsd"] };
  assert.equal(digitalLink(dsdOnlyOut, pcmIn, usb).verdict, "fail");
});

test("digital: source above the DAC's rate/depth warns about downsampling", () => {
  const r = digitalLink(pcmDsdOut, pcmIn, usb);
  assert.equal(r.verdict, "warn");
  assert.match(r.explanation, /downsampled/);
});

test("digital: over-length cable warns about dropouts", () => {
  const out: DigitalOut = { ...pcmDsdOut, maxSampleRateKhz: 192, maxBitDepth: 24 };
  const longUsb: DigitalCable = { ...usb, lengthM: 8 };
  const r = digitalLink(out, pcmIn, longUsb);
  assert.equal(r.verdict, "warn");
  assert.match(r.explanation, /dropouts/);
});

test("digital: no cable still evaluates format compatibility", () => {
  const out: DigitalOut = { ...pcmDsdOut, maxSampleRateKhz: 192, maxBitDepth: 24 };
  assert.equal(digitalLink(out, pcmIn).verdict, "pass");
});
