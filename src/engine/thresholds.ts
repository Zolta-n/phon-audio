// ---------------------------------------------------------------------------
// Every judgement threshold the engine uses, in one place, with its rationale.
// Checks import from here so the numbers are auditable and consistent.
// ---------------------------------------------------------------------------

import type { Connector, ComponentCategory } from "../types";

export const THRESHOLDS = {
  /** Line-level bridging: downstream input Z vs upstream output Z. ≥10× is the
   *  classic bridging rule; below 5× the response shift becomes clearly audible. */
  lineBridgingPassRatio: 10,
  lineBridgingWarnRatio: 5,

  /** Interconnect HF rolloff corner (kHz). ≥100 is far beyond audibility,
   *  ≥40 comfortably above the band, ≥20 is at the edge, below 20 is in-band. */
  hfCornerPassKhz: 100,
  hfCornerInfoKhz: 40,
  hfCornerWarnKhz: 20,

  /** Line gain staging: source max output vs downstream full-output sensitivity. */
  gainHeadroomTightDb: 1,

  /** Speaker power headroom (dB) at target peak SPL. <0 can't reach target,
   *  <3 is marginal for dynamics, >12 is far more power than the target needs. */
  speakerHeadroomWarnDb: 3,
  speakerHeadroomExcessDb: 12,

  /** Damping factor = speaker Z / (amp out Z + cable R). ≥20 is tight control,
   *  ≥8 adequate (typical of tube amps), below that bass control loosens. */
  dampingPass: 20,
  dampingInfo: 8,

  /** Amp power vs speaker handling: an amp under ¼ of the rating invites
   *  tweeter-killing clipping; over 2× just needs volume discipline. */
  powerHandlingUnderRatio: 0.25,
  powerHandlingOverRatio: 2,

  /** Headphone Z vs amp output Z ("rule of eighths"). */
  headphoneZRatioPass: 8,
  headphoneZRatioWarn: 4,

  /** Cumulative voltage gain across the chain before noise floor / cramped
   *  volume range become likely. */
  systemGainWarnDb: 40,

  /** MM phono: standard 47 kΩ load window, and the generic total-capacitance
   *  window (pF) when the cartridge doesn't specify one. */
  mmLoadMinOhm: 40_000,
  mmLoadMaxOhm: 50_000,
  mmCapPassMinPf: 100,
  mmCapPassMaxPf: 300,
  mmCapInfoMinPf: 50,
  mmCapInfoMaxPf: 400,

  /** MC phono: stage input Z vs cartridge internal Z. */
  mcLoadRatioPass: 10,
  mcLoadRatioWarn: 5,

  /** Phono stage output level windows (Vrms): line level is ~0.5–2 Vrms. */
  phonoOutFailVrms: 0.2,
  phonoOutWarnLowVrms: 0.3,
  phonoOutPassMaxVrms: 3,
  phonoOutInfoMaxVrms: 5,
} as const;

// ---------------------------------------------------------------------------
// Ranking constants for the recommendation layer. These NEVER gate a verdict —
// they only order alternatives that all already work (bit-perfect stance).
// ---------------------------------------------------------------------------

export const RANKING = {
  /** DAC quality sub-score normalization windows (each scores 0–100 within its
   *  window). Dynamic range: 95 dB is a competent budget DAC, 125 dB is state
   *  of the art. */
  dacDrFloorDb: 95,
  dacDrCeilDb: 125,
  /** THD+N expressed in dB (20·log10(pct/100)): −80 dB mediocre, −120 dB state of the art. */
  dacThdFloorDb: -80,
  dacThdCeilDb: -120,
  /** Conversion-clock jitter, log scale: 1000 ps poor, 10 ps excellent. */
  dacJitterFloorPs: 1000,
  dacJitterCeilPs: 10,
  /** Clock accuracy, log scale: 100 ppm consumer crystal, 1 ppm TCXO/OCXO grade. */
  dacClockFloorPpm: 100,
  dacClockCeilPpm: 1,
  /** Weights (renormalized over the fields actually present). DR and THD+N
   *  dominate because they are the audible-floor specs; jitter/ppm are
   *  tie-breakers. */
  dacWeights: { dynamicRange: 0.5, thd: 0.3, jitter: 0.15, clock: 0.05 },

  /** Category heuristic scores (0–100) when no DacSection specs exist.
   *  Dedicated DACs are optimized around the converter; streamer DAC sections
   *  are usually current-generation; amp DAC sections are most often
   *  cost-constrained add-ons. */
  dacHeuristicByCategory: {
    dac: 70,
    source: 55,
    headphone_amp: 50,
    preamp: 48,
    integrated: 45,
  } as Partial<Record<ComponentCategory, number>>,
  dacHeuristicDefault: 40,

  /** Digital connector base scores. Async USB is re-ranked via usbModeBonus. */
  connectorBase: { aes: 70, coax: 66, i2s: 62, usb: 60, optical: 56 } as Partial<Record<Connector, number>>,
  /** Async USB makes the source clock irrelevant — the decisive interface property. */
  usbModeBonus: { async: 25, adaptive: 0, synchronous: -10 },
  /** Receiver-side jitter handling matters most on embedded-clock links (S/PDIF/AES). */
  jitterRejectionBonus: { reclocking: 10, pll: 5, none: 0 },
  /** Galvanic isolation breaks ground loops; optical gets it inherently. */
  isolationBonus: 5,
  /** Practical bit-perfect PCM ceiling per connector (kHz). Optical is reliable
   *  to 96 on older TOSLINK parts; coax/AES top out at 192 in practice. */
  connectorMaxPcmKhz: { usb: 768, i2s: 768, aes: 192, coax: 192, optical: 96 } as Partial<Record<Connector, number>>,
  /** Penalty when the link's format ceiling is set by the connector, not the gear. */
  bandwidthLimitPenalty: 20,
} as const;
