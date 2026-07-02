// ---------------------------------------------------------------------------
// Every judgement threshold the engine uses, in one place, with its rationale.
// Checks import from here so the numbers are auditable and consistent.
// ---------------------------------------------------------------------------

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
