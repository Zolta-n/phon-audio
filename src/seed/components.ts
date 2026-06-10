// ---------------------------------------------------------------------------
// Seed dataset — a few representative components per category.
//
// NOTE: these specs are ILLUSTRATIVE placeholders chosen to be realistic, not
// verified manufacturer data. Replace/verify before using in production. The
// point is to give the engine something that compiles and runs end-to-end.
// ---------------------------------------------------------------------------

import type { Component, Cable } from "../types";

// --- Sources ----------------------------------------------------------------

export const networkStreamer: Component = {
  id: "src-streamer",
  name: "Network Streamer",
  category: "source",
  note: "illustrative specs",
  inputs: [],
  outputs: [
    {
      domain: "digital",
      connector: "usb",
      balanced: false,
      specs: { kind: "digital_out", formats: ["pcm", "dsd"], maxSampleRateKhz: 384, maxBitDepth: 32 },
    },
  ],
};

// --- DACs -------------------------------------------------------------------

export const desktopDac: Component = {
  id: "dac-desktop",
  name: "Desktop DAC (SE + balanced)",
  category: "dac",
  note: "illustrative specs",
  inputs: [
    {
      domain: "digital",
      connector: "usb",
      balanced: false,
      specs: { kind: "digital_in", formats: ["pcm", "dsd"], maxSampleRateKhz: 384, maxBitDepth: 32 },
    },
  ],
  outputs: [
    {
      domain: "line",
      connector: "xlr",
      balanced: true,
      specs: { kind: "line_out", outputImpedanceOhm: 100, maxOutputVrms: 4.0 },
    },
  ],
};

// --- Preamps ----------------------------------------------------------------

export const linePreamp: Component = {
  id: "pre-line",
  name: "Line Preamp",
  category: "preamp",
  note: "illustrative specs",
  inputs: [
    {
      domain: "line",
      connector: "xlr",
      balanced: true,
      specs: { kind: "line_in", inputImpedanceOhm: 47000, inputSensitivityVrms: 1.0, maxInputVrms: 8.0 },
    },
  ],
  outputs: [
    {
      domain: "line",
      connector: "xlr",
      balanced: true,
      specs: { kind: "line_out", outputImpedanceOhm: 150, maxOutputVrms: 8.0, gainDb: 6 },
    },
  ],
};

// --- Power amps -------------------------------------------------------------

export const solidStateAmp: Component = {
  id: "amp-ss",
  name: "Solid-State Power Amp",
  category: "power_amp",
  note: "illustrative specs",
  inputs: [
    {
      domain: "line",
      connector: "xlr",
      balanced: true,
      specs: { kind: "line_in", inputImpedanceOhm: 22000, inputSensitivityVrms: 1.4 },
    },
  ],
  outputs: [
    {
      domain: "speaker",
      connector: "speaker_binding",
      balanced: false,
      specs: {
        kind: "speaker_out",
        powerW: [
          { ohm: 8, watts: 100 },
          { ohm: 4, watts: 180 },
        ],
        ratedMinImpedanceOhm: 2,
        outputImpedanceOhm: 0.05, // damping factor ~160 into 8 Ω
        gainDb: 29,
        inputSensitivityVrms: 1.4,
      },
    },
  ],
};

export const tubeAmp: Component = {
  id: "amp-tube",
  name: "Tube Power Amp",
  category: "power_amp",
  note: "illustrative specs — high output impedance on purpose",
  inputs: [
    {
      domain: "line",
      connector: "rca",
      balanced: false,
      specs: { kind: "line_in", inputImpedanceOhm: 100000, inputSensitivityVrms: 0.8 },
    },
  ],
  outputs: [
    {
      domain: "speaker",
      connector: "speaker_binding",
      balanced: false,
      specs: {
        kind: "speaker_out",
        powerW: [
          { ohm: 8, watts: 30 },
          { ohm: 4, watts: 28 },
        ],
        ratedMinImpedanceOhm: 4,
        outputImpedanceOhm: 1.5, // low damping factor by design
        gainDb: 26,
        inputSensitivityVrms: 0.8,
      },
    },
  ],
};

// --- Headphone amp ----------------------------------------------------------

export const desktopHeadphoneAmp: Component = {
  id: "amp-hp",
  name: "Desktop Headphone Amp",
  category: "headphone_amp",
  note: "illustrative specs",
  inputs: [
    {
      domain: "line",
      connector: "xlr",
      balanced: true,
      specs: { kind: "line_in", inputImpedanceOhm: 10000, inputSensitivityVrms: 1.0 },
    },
  ],
  outputs: [
    {
      domain: "headphone",
      connector: "xlr4",
      balanced: true,
      specs: { kind: "headphone_out", outputImpedanceOhm: 0.5, maxVrms: 7.0, maxCurrentMa: 300, gainDb: 18 },
    },
  ],
};

// --- Speakers ---------------------------------------------------------------

export const bookshelfSpeaker: Component = {
  id: "spk-bookshelf",
  name: "Bookshelf Speaker (86 dB, 8 Ω)",
  category: "speaker",
  note: "illustrative specs",
  inputs: [
    {
      domain: "speaker",
      connector: "speaker_binding",
      balanced: false,
      specs: {
        kind: "speaker_load",
        nominalImpedanceOhm: 8,
        minImpedanceOhm: 6,
        sensitivityDb_2_83V_1m: 86,
        powerHandlingW: 100,
      },
    },
  ],
  outputs: [],
};

export const towerSpeaker: Component = {
  id: "spk-tower",
  name: "Floorstanding Tower (88 dB, 4 Ω)",
  category: "speaker",
  note: "illustrative specs — dips to 3.2 Ω",
  inputs: [
    {
      domain: "speaker",
      connector: "speaker_binding",
      balanced: false,
      specs: {
        kind: "speaker_load",
        nominalImpedanceOhm: 4,
        minImpedanceOhm: 3.2,
        sensitivityDb_2_83V_1m: 88,
        powerHandlingW: 200,
      },
    },
  ],
  outputs: [],
};

export const hardToDriveSpeaker: Component = {
  id: "spk-hard",
  name: "Low-Sensitivity Speaker (84 dB, 4 Ω)",
  category: "speaker",
  note: "illustrative specs — power-hungry, dips to 3 Ω",
  inputs: [
    {
      domain: "speaker",
      connector: "speaker_binding",
      balanced: false,
      specs: {
        kind: "speaker_load",
        nominalImpedanceOhm: 4,
        minImpedanceOhm: 3.0,
        sensitivityDb_2_83V_1m: 84,
        powerHandlingW: 250,
      },
    },
  ],
  outputs: [],
};

// --- Headphones -------------------------------------------------------------

export const highImpedanceHeadphone: Component = {
  id: "hp-300",
  name: "Open Dynamic (300 Ω, 102 dB/mW)",
  category: "headphone",
  note: "illustrative specs",
  inputs: [
    {
      domain: "headphone",
      connector: "xlr4",
      balanced: true,
      specs: {
        kind: "headphone_load",
        nominalImpedanceOhm: 300,
        sensitivity: { value: 102, unit: "dB/mW" },
      },
    },
  ],
  outputs: [],
};

export const planarHeadphone: Component = {
  id: "hp-planar",
  name: "Planar Magnetic (32 Ω, 90 dB/mW)",
  category: "headphone",
  note: "illustrative specs — current-hungry",
  inputs: [
    {
      domain: "headphone",
      connector: "xlr4",
      balanced: true,
      specs: {
        kind: "headphone_load",
        nominalImpedanceOhm: 32,
        sensitivity: { value: 90, unit: "dB/mW" },
      },
    },
  ],
  outputs: [],
};

// --- Cables -----------------------------------------------------------------

export const usbCable: Cable = { kind: "digital", lengthM: 1.5, connector: "usb", maxLengthM: 5 };
export const xlrInterconnect: Cable = { kind: "interconnect", lengthM: 1.0, capacitancePfPerM: 100, balanced: true };
export const speakerCable12awg: Cable = { kind: "speaker", lengthM: 3.0, awg: 12 };
export const speakerCableThin: Cable = { kind: "speaker", lengthM: 8.0, awg: 18 };
