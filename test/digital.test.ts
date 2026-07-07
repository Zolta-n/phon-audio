import { test } from "node:test";
import assert from "node:assert/strict";
import { digitalLink, digitalInterfaceNotes } from "../src/engine/checks/digitalLink";
import type { DigitalOut, DigitalIn, DigitalCable, Port, Connector } from "../src/types";

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

// ---- digitalInterfaceNotes: info-only companions -----------------------------

function port(connector: Connector, specs: DigitalOut | DigitalIn): Port {
  return { domain: "digital", connector, balanced: false, specs };
}

test("interface notes are info-only across every connector permutation", () => {
  const cases: [Connector, DigitalIn][] = [
    ["usb", { ...pcmIn, usbMode: "async" }],
    ["usb", pcmIn], // mode unknown
    ["usb", { ...pcmIn, usbMode: "adaptive" }],
    ["coax", { ...pcmIn, jitterRejection: "reclocking" }],
    ["coax", pcmIn],
    ["aes", { ...pcmIn, jitterRejection: "pll" }],
    ["optical", { ...pcmIn, galvanicIsolation: true }],
    ["i2s", pcmIn],
  ];
  const richOut: DigitalOut = { ...pcmDsdOut, intrinsicJitterPs: 80, clockAccuracyPpm: 10, dsdMaxRateMhz: 11.3 };
  for (const [connector, inSpecs] of cases) {
    const results = digitalInterfaceNotes(port(connector, richOut), port(connector, inSpecs));
    assert.ok(results.length >= 1, `${connector}: expected at least the interface note`);
    for (const r of results) {
      assert.equal(r.verdict, "info", `${connector}/${r.id}: new digital notes must never gate a verdict`);
    }
  }
});

test("interface note describes async USB as source-jitter-immune", () => {
  const results = digitalInterfaceNotes(port("usb", pcmDsdOut), port("usb", { ...pcmIn, usbMode: "async" }));
  const note = results.find((r) => r.id === "digital_interface");
  assert.ok(note);
  assert.match(note!.explanation, /[Aa]synchronous USB/);
});

test("clock/jitter note appears only when specs are present", () => {
  const bare = digitalInterfaceNotes(port("coax", pcmDsdOut), port("coax", pcmIn));
  assert.equal(bare.length, 1);
  assert.equal(bare[0]!.id, "digital_interface");

  const specd = digitalInterfaceNotes(
    port("coax", { ...pcmDsdOut, intrinsicJitterPs: 120 }),
    port("coax", { ...pcmIn, jitterRejection: "pll" }),
  );
  const clock = specd.find((r) => r.id === "digital_clock_jitter");
  assert.ok(clock, "expected a clock & jitter info row");
  assert.equal(clock!.verdict, "info");
  assert.match(clock!.explanation, /below audibility/);
});

test("DSD rate ceiling note appears only on an actual shortfall", () => {
  const out: DigitalOut = { ...pcmDsdOut, dsdMaxRateMhz: 11.3 };
  const shortfall = digitalInterfaceNotes(port("usb", out), port("usb", { ...pcmIn, dsdMaxRateMhz: 5.6 }));
  const note = shortfall.find((r) => r.id === "digital_dsd_rate");
  assert.ok(note, "expected a DSD ceiling note");
  assert.equal(note!.verdict, "info");

  const equal = digitalInterfaceNotes(port("usb", out), port("usb", { ...pcmIn, dsdMaxRateMhz: 11.3 }));
  assert.ok(!equal.some((r) => r.id === "digital_dsd_rate"));
  const missing = digitalInterfaceNotes(port("usb", out), port("usb", pcmIn));
  assert.ok(!missing.some((r) => r.id === "digital_dsd_rate"));
});
