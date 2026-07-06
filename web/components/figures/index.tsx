// ---------------------------------------------------------------------------
// Phon.Audio — expert-tier figure registry
//
// Keyed by the explainer slug (engine check id or ContextSettings field name).
// Consumers look up FIGURES[slug]; a missing key simply means the parameter
// has no figure yet. All figures are pure, server-safe SVG components.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

import TargetSpl from "./TargetSpl";
import CrestFactor from "./CrestFactor";
import Distance from "./Distance";
import RoomGain from "./RoomGain";
import DigitalEye from "./DigitalEye";
import ImpedanceBridging from "./ImpedanceBridging";
import HfRolloff from "./HfRolloff";
import GainStaging from "./GainStaging";
import SpeakerHeadroom from "./SpeakerHeadroom";
import ImpedanceStability from "./ImpedanceStability";
import DampingFactor from "./DampingFactor";
import PowerHandling from "./PowerHandling";
import HeadphoneDrive from "./HeadphoneDrive";
import HeadphoneOutputZ from "./HeadphoneOutputZ";

export const FIGURES: Record<string, ComponentType> = {
  targetSplDb: TargetSpl,
  crestFactorDb: CrestFactor,
  distanceM: Distance,
  roomGainDb: RoomGain,
  digital_link: DigitalEye,
  impedance_bridging: ImpedanceBridging,
  hf_rolloff: HfRolloff,
  gain_staging: GainStaging,
  speaker_power_headroom: SpeakerHeadroom,
  impedance_stability: ImpedanceStability,
  damping_factor: DampingFactor,
  power_handling: PowerHandling,
  headphone_drive: HeadphoneDrive,
  headphone_output_impedance: HeadphoneOutputZ,
};
