// ---------------------------------------------------------------------------
// Phon.Audio — core schema
//
// Port-based model: every component declares input and output ports. Each port
// carries a signal *domain* and the electrical specs relevant to that domain.
// The engine runs checks on each *link* (an upstream output port connected to a
// downstream input port). This cleanly handles combo devices: a DAC/amp simply
// declares a `digital` input port and a `headphone` output port; an integrated
// amp declares a `line` input and a `speaker` output.
// ---------------------------------------------------------------------------

export type SignalDomain = "digital" | "line" | "phono" | "speaker" | "headphone";

export type Connector =
  | "usb"
  | "coax"
  | "optical"
  | "aes"
  | "i2s"
  | "rca"
  | "xlr"
  | "trs"
  | "xlr4"
  | "speaker_binding";

export type ComponentCategory =
  | "source"
  | "turntable"
  | "dac"
  | "preamp"
  | "power_amp"
  | "tube_amp_se"
  | "tube_amp_pp"
  | "integrated"
  | "headphone_amp"
  | "speaker"
  | "headphone";

// --- Output port specs ------------------------------------------------------

export interface LineOut {
  kind: "line_out";
  outputImpedanceOhm: number;
  /** Max output for a preamp; nominal output at 0 dBFS for a DAC. */
  maxOutputVrms: number;
  /** Voltage/gain stages only (preamps). */
  gainDb?: number;
}

export interface SpeakerOut {
  kind: "speaker_out";
  /** Rated continuous power into reference loads, e.g. [{ohm:8,watts:100},{ohm:4,watts:180}]. */
  powerW: { ohm: number; watts: number }[];
  /** Lowest impedance the amp is rated/stable into. */
  ratedMinImpedanceOhm: number;
  outputImpedanceOhm: number;
  gainDb: number;
  /**
   * Input voltage (Vrms) required to reach full rated output. Informational —
   * displayed in the UI but not (yet) read by any check.
   */
  inputSensitivityVrms?: number;
}

export interface HeadphoneOut {
  kind: "headphone_out";
  outputImpedanceOhm: number;
  maxVrms: number;
  maxCurrentMa: number;
  /**
   * Optional: rated power into reference loads (32 / 300 / 600 Ω). Informational —
   * headphoneDrive computes from maxVrms/maxCurrentMa instead.
   */
  powerMw?: { ohm: number; mw: number }[];
  gainDb?: number;
}

export interface DigitalOut {
  kind: "digital_out";
  formats: ("pcm" | "dsd")[];
  maxSampleRateKhz: number;
  maxBitDepth: number;
}

// --- Input port specs -------------------------------------------------------

export interface LineIn {
  kind: "line_in";
  inputImpedanceOhm: number;
  /** Voltage (Vrms) needed at this input to drive the device to full output. */
  inputSensitivityVrms: number;
  /** Input overload point, if known. */
  maxInputVrms?: number;
}

export interface DigitalIn {
  kind: "digital_in";
  formats: ("pcm" | "dsd")[];
  maxSampleRateKhz: number;
  maxBitDepth: number;
}

// --- Phono port specs ------------------------------------------------------

export interface PhonoOut {
  kind: "phono_out";
  /** "mm" (moving magnet) or "mc" (moving coil). */
  cartridgeType: "mm" | "mc";
  /** Cartridge output voltage in mV (e.g. 5 mV for MM, 0.4 mV for MC). */
  outputVoltageMv: number;
  /** Cartridge internal impedance / source impedance in ohms. */
  internalImpedanceOhm?: number;
  /** Recommended load impedance (47 kΩ standard for MM). */
  recommendedLoadImpedanceOhm?: number;
  /** Recommended total load capacitance in pF (100–300 pF typical for MM). */
  recommendedLoadCapacitancePf?: number;
}

export interface PhonoIn {
  kind: "phono_in";
  /** Which cartridge types this input accepts. */
  cartridgeType: "mm" | "mc" | "both";
  /** Input impedance in ohms (47 kΩ standard for MM, variable for MC). */
  inputImpedanceOhm: number;
  /** Internal capacitance of the phono input in pF (added to cable capacitance). */
  inputCapacitancePf?: number;
  /** Phono stage gain in dB (typically 40 dB for MM, 60 dB for MC). */
  gainDb: number;
}

// --- Loads (terminal components) -------------------------------------------

export interface HeadphoneLoad {
  kind: "headphone_load";
  nominalImpedanceOhm: number;
  /** Store sensitivity WITH its unit. The engine normalizes on read. */
  sensitivity: { value: number; unit: "dB/mW" | "dB/V" };
}

export interface SpeakerLoad {
  kind: "speaker_load";
  nominalImpedanceOhm: number;
  /** The impedance dip — matters for amp stability/current. */
  minImpedanceOhm: number;
  /** Standard speaker sensitivity, dB @ 2.83 V / 1 m. */
  sensitivityDb_2_83V_1m: number;
  /** Continuous (RMS) power handling. */
  powerHandlingW: number;
}

// --- Port + component -------------------------------------------------------

export type PortSpec =
  | LineOut
  | SpeakerOut
  | HeadphoneOut
  | DigitalOut
  | PhonoOut
  | LineIn
  | DigitalIn
  | PhonoIn
  | HeadphoneLoad
  | SpeakerLoad;

export interface Port {
  domain: SignalDomain;
  connector: Connector;
  balanced: boolean;
  specs: PortSpec;
}

export interface Component {
  id: string;
  name: string;
  category: ComponentCategory;
  inputs: Port[];
  outputs: Port[];
  /** Free-text note, e.g. "illustrative specs — verify before production". */
  note?: string;
}

// --- Cables -----------------------------------------------------------------

export interface InterconnectCable {
  kind: "interconnect";
  lengthM: number;
  capacitancePfPerM: number;
  balanced: boolean;
}

export interface SpeakerCable {
  kind: "speaker";
  lengthM: number;
  awg: number;
}

export interface DigitalCable {
  kind: "digital";
  lengthM: number;
  connector: Connector;
  /** Max usable length for this connector type, if constrained. */
  maxLengthM?: number;
}

export type Cable = InterconnectCable | SpeakerCable | DigitalCable;

// --- Listening context ------------------------------------------------------

export interface ListeningContext {
  /** Target average SPL at the listening position (e.g. 85 dB). */
  targetSplDb: number;
  /** Headroom for musical peaks above average (crest factor), default 15 dB. */
  crestFactorDb: number;
  /** Speaker chains only: distance from speaker to listener. */
  distanceM?: number;
  /** Optional room reinforcement (boundary/room gain), default 0. */
  roomGainDb?: number;
}

// --- Chain ------------------------------------------------------------------

export interface ChainNode {
  component: Component;
  /** Cable connecting this node's output to the next node's input. */
  cableToNext?: Cable;
}

export interface Chain {
  context: ListeningContext;
  nodes: ChainNode[];
}
