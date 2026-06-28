// Shared UI types — what the API returns to the client.
// The engine's Port/PortSpec types are intentionally re-used via JSON serialization.

export type SignalDomain = "digital" | "line" | "phono" | "speaker" | "headphone";
export type ComponentCategory =
  | "source" | "turntable" | "dac" | "preamp" | "power_amp"
  | "tube_amp_se" | "tube_amp_pp" | "integrated"
  | "headphone_amp" | "speaker" | "headphone";

export interface PortSpec {
  kind: string;
  [key: string]: unknown;
}

export interface Port {
  domain: SignalDomain;
  connector: string;
  balanced: boolean;
  specs: PortSpec;
}

/** A component as returned by /api/components (DB row unwrapped into engine shape) */
export interface UIComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  inputs: Port[];
  outputs: Port[];
  note?: string;
  manufacturer?: string;
  affiliateUrl?: string | null;
  imageUrl?: string | null;
}

/** A single node in the user's chain */
export interface ChainEntry {
  component: UIComponent;
  cableId: string;    // key into CABLE_DEFS; last node's cableId is ignored
}

/** Listening context settings */
export interface ContextSettings {
  targetSplDb: number;
  crestFactorDb: number;
  distanceM: number;
  roomGainDb: number;
}

// ---- Cable definitions (client-side constants) ----------------------------

export interface CableDef {
  id: string;
  label: string;
  // Serialized Cable object (or null = no cable)
  cable: null | {
    kind: "digital" | "interconnect" | "speaker";
    lengthM: number;
    connector?: string;
    maxLengthM?: number;
    capacitancePfPerM?: number;
    balanced?: boolean;
    awg?: number;
  };
}

export const CABLE_DEFS: CableDef[] = [
  { id: "none",             label: "No cable / built-in",           cable: null },
  { id: "usb",              label: "USB (1.5 m)",                   cable: { kind: "digital",       lengthM: 1.5, connector: "usb",  maxLengthM: 5 } },
  { id: "coax",             label: "Coax S/PDIF (1.5 m)",          cable: { kind: "digital",       lengthM: 1.5, connector: "coax", maxLengthM: 10 } },
  { id: "optical",          label: "Optical (1.5 m)",               cable: { kind: "digital",       lengthM: 1.5, connector: "optical", maxLengthM: 10 } },
  { id: "xlr-1m",           label: "XLR Interconnect (1 m, bal.)", cable: { kind: "interconnect",  lengthM: 1.0, capacitancePfPerM: 100, balanced: true } },
  { id: "xlr-3m",           label: "XLR Interconnect (3 m, bal.)", cable: { kind: "interconnect",  lengthM: 3.0, capacitancePfPerM: 100, balanced: true } },
  { id: "rca-1m",           label: "RCA Interconnect (1 m)",       cable: { kind: "interconnect",  lengthM: 1.0, capacitancePfPerM: 150, balanced: false } },
  { id: "rca-3m",           label: "RCA Interconnect (3 m)",       cable: { kind: "interconnect",  lengthM: 3.0, capacitancePfPerM: 150, balanced: false } },
  { id: "speaker-12awg-3m", label: "Speaker 12 AWG (3 m)",         cable: { kind: "speaker",       lengthM: 3.0, awg: 12 } },
  { id: "speaker-12awg-5m", label: "Speaker 12 AWG (5 m)",         cable: { kind: "speaker",       lengthM: 5.0, awg: 12 } },
  { id: "speaker-14awg-3m", label: "Speaker 14 AWG (3 m)",         cable: { kind: "speaker",       lengthM: 3.0, awg: 14 } },
  { id: "speaker-16awg-3m", label: "Speaker 16 AWG (3 m)",         cable: { kind: "speaker",       lengthM: 3.0, awg: 16 } },
  { id: "speaker-18awg-8m", label: "Speaker 18 AWG (8 m, thin)",   cable: { kind: "speaker",       lengthM: 8.0, awg: 18 } },
  { id: "phono-rca-1m",    label: "Phono RCA (1 m, low-cap)",    cable: { kind: "interconnect",  lengthM: 1.0, capacitancePfPerM: 60, balanced: false } },
  { id: "phono-rca-1.5m",  label: "Phono RCA (1.5 m, low-cap)",  cable: { kind: "interconnect",  lengthM: 1.5, capacitancePfPerM: 60, balanced: false } },
];

export const CABLE_BY_ID = Object.fromEntries(CABLE_DEFS.map(c => [c.id, c]));

// ---- Display helpers -------------------------------------------------------

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  source:       "Sources",
  turntable:    "Turntables",
  dac:          "DACs",
  preamp:       "Preamps",
  power_amp:    "Power Amps",
  tube_amp_se:  "Tube Amps (SE)",
  tube_amp_pp:  "Tube Amps (PP)",
  integrated:   "Integrated Amps",
  headphone_amp:"Headphone Amps",
  speaker:      "Speakers",
  headphone:    "Headphones",
};

export const CATEGORY_BADGE: Record<ComponentCategory, string> = {
  source:       "SRC",
  turntable:    "TT",
  dac:          "DAC",
  preamp:       "PRE",
  power_amp:    "AMP",
  tube_amp_se:  "T-SE",
  tube_amp_pp:  "T-PP",
  integrated:   "INT",
  headphone_amp:"HP-AMP",
  speaker:      "SPK",
  headphone:    "HP",
};

export const CATEGORY_ORDER: ComponentCategory[] = [
  "source", "turntable", "dac", "preamp", "power_amp",
  "tube_amp_se", "tube_amp_pp", "integrated",
  "headphone_amp", "speaker", "headphone",
];

// Smart cable suggestion based on upstream→downstream category pair
export const CABLE_SUGGESTION: Partial<Record<string, string>> = {
  "turntable->integrated": "phono-rca-1m",
  "turntable->preamp":     "phono-rca-1m",
  "source->dac":           "usb",
  "source->integrated":    "coax",
  "dac->preamp":           "xlr-1m",
  "dac->power_amp":        "xlr-1m",
  "dac->tube_amp_se":      "rca-1m",
  "dac->tube_amp_pp":      "rca-1m",
  "dac->integrated":       "xlr-1m",
  "dac->headphone_amp":    "xlr-1m",
  "preamp->power_amp":     "xlr-1m",
  "preamp->tube_amp_se":   "rca-1m",
  "preamp->tube_amp_pp":   "rca-1m",
  "preamp->integrated":    "xlr-1m",
  "power_amp->speaker":    "speaker-12awg-3m",
  "tube_amp_se->speaker":  "speaker-12awg-3m",
  "tube_amp_pp->speaker":  "speaker-12awg-3m",
  "integrated->speaker":   "speaker-12awg-3m",
  "headphone_amp->headphone": "none",
};

// ---- Result types (mirror of engine's CheckResult / SystemReport) ----------

export type Verdict = "pass" | "info" | "warn" | "fail";

export interface CheckResult {
  id: string;
  label: string;
  verdict: Verdict;
  value?: number;
  threshold?: number;
  unit?: string;
  explanation: string;
}

export interface LinkReport {
  from: string;
  to: string;
  domain: SignalDomain;
  results: CheckResult[];
  verdict: Verdict;
}

export interface SystemReport {
  links: LinkReport[];
  system: CheckResult[];
  overall: Verdict;
}
