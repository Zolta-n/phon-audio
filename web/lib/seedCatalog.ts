/**
 * Seed catalog — used as fallback when Supabase is not yet configured.
 * Mirrors the engine's src/seed/components.ts but shaped as UIComponent[].
 */
import type { UIComponent } from "@/types";

export const SEED_CATALOG: UIComponent[] = [
  {
    id: "src-streamer",
    name: "Network Streamer",
    category: "source",
    manufacturer: "Seed",
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
  },
  {
    id: "dac-desktop",
    name: "Desktop DAC (SE + balanced)",
    category: "dac",
    manufacturer: "Seed",
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
  },
  {
    id: "pre-line",
    name: "Line Preamp",
    category: "preamp",
    manufacturer: "Seed",
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
  },
  {
    id: "amp-ss",
    name: "Solid-State Power Amp",
    category: "power_amp",
    manufacturer: "Seed",
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
          powerW: [{ ohm: 8, watts: 100 }, { ohm: 4, watts: 180 }],
          ratedMinImpedanceOhm: 2,
          outputImpedanceOhm: 0.05,
          gainDb: 29,
          inputSensitivityVrms: 1.4,
        },
      },
    ],
  },
  {
    id: "amp-tube",
    name: "Tube Power Amp",
    category: "power_amp",
    manufacturer: "Seed",
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
          powerW: [{ ohm: 8, watts: 30 }, { ohm: 4, watts: 28 }],
          ratedMinImpedanceOhm: 4,
          outputImpedanceOhm: 1.5,
          gainDb: 26,
          inputSensitivityVrms: 0.8,
        },
      },
    ],
  },
  {
    id: "amp-hp",
    name: "Desktop Headphone Amp",
    category: "headphone_amp",
    manufacturer: "Seed",
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
  },
  {
    id: "spk-bookshelf",
    name: "Bookshelf Speaker (86 dB, 8 Ω)",
    category: "speaker",
    manufacturer: "Seed",
    note: "illustrative specs",
    inputs: [
      {
        domain: "speaker",
        connector: "speaker_binding",
        balanced: false,
        specs: { kind: "speaker_load", nominalImpedanceOhm: 8, minImpedanceOhm: 6, sensitivityDb_2_83V_1m: 86, powerHandlingW: 100 },
      },
    ],
    outputs: [],
  },
  {
    id: "spk-tower",
    name: "Floorstanding Tower (88 dB, 4 Ω)",
    category: "speaker",
    manufacturer: "Seed",
    note: "illustrative specs — dips to 3.2 Ω",
    inputs: [
      {
        domain: "speaker",
        connector: "speaker_binding",
        balanced: false,
        specs: { kind: "speaker_load", nominalImpedanceOhm: 4, minImpedanceOhm: 3.2, sensitivityDb_2_83V_1m: 88, powerHandlingW: 200 },
      },
    ],
    outputs: [],
  },
  {
    id: "spk-hard",
    name: "Low-Sensitivity Speaker (84 dB, 4 Ω)",
    category: "speaker",
    manufacturer: "Seed",
    note: "illustrative specs — power-hungry, dips to 3 Ω",
    inputs: [
      {
        domain: "speaker",
        connector: "speaker_binding",
        balanced: false,
        specs: { kind: "speaker_load", nominalImpedanceOhm: 4, minImpedanceOhm: 3.0, sensitivityDb_2_83V_1m: 84, powerHandlingW: 250 },
      },
    ],
    outputs: [],
  },
  {
    id: "hp-300",
    name: "Open Dynamic (300 Ω, 102 dB/mW)",
    category: "headphone",
    manufacturer: "Seed",
    note: "illustrative specs",
    inputs: [
      {
        domain: "headphone",
        connector: "xlr4",
        balanced: true,
        specs: { kind: "headphone_load", nominalImpedanceOhm: 300, sensitivity: { value: 102, unit: "dB/mW" } },
      },
    ],
    outputs: [],
  },
  {
    id: "hp-planar",
    name: "Planar Magnetic (32 Ω, 90 dB/mW)",
    category: "headphone",
    manufacturer: "Seed",
    note: "illustrative specs — current-hungry",
    inputs: [
      {
        domain: "headphone",
        connector: "xlr4",
        balanced: true,
        specs: { kind: "headphone_load", nominalImpedanceOhm: 32, sensitivity: { value: 90, unit: "dB/mW" } },
      },
    ],
    outputs: [],
  },
];
