import type { CheckResult } from "../checkResult";
import type { DigitalOut, DigitalIn, DigitalCable } from "../../types";

/**
 * Digital links either carry the bits correctly or they don't. We check format,
 * sample-rate and bit-depth support plus cable length limits. If everything is
 * compatible, the honest verdict is "bit-perfect — no sonic effect" (this is the
 * cable-myth stance baked into the engine).
 */
export function digitalLink(
  out: DigitalOut,
  inp: DigitalIn,
  cable?: DigitalCable,
): CheckResult {
  const outFormats = out.formats ?? [];
  const inpFormats = inp.formats ?? [];
  const sharedFormats = outFormats.filter((f) => inpFormats.includes(f));
  const formatOk = outFormats.length === 0 || inpFormats.length === 0 || sharedFormats.length > 0;
  const srOk = !inp.maxSampleRateKhz || !out.maxSampleRateKhz || inp.maxSampleRateKhz >= out.maxSampleRateKhz;
  const bitOk = !inp.maxBitDepth || !out.maxBitDepth || inp.maxBitDepth >= out.maxBitDepth;
  const lengthOk =
    !cable || cable.maxLengthM === undefined || cable.lengthM <= cable.maxLengthM;

  if (!formatOk) {
    return {
      id: "digital_link",
      label: "Digital compatibility",
      verdict: "fail",
      explanation: `No common format: source offers ${outFormats.join("/")}, DAC accepts ${inpFormats.join("/")}.`,
    };
  }
  if (!srOk || !bitOk) {
    return {
      id: "digital_link",
      label: "Digital compatibility",
      verdict: "warn",
      explanation: `Source can output up to ${out.maxSampleRateKhz} kHz / ${out.maxBitDepth}-bit, but the DAC tops out at ${inp.maxSampleRateKhz} kHz / ${inp.maxBitDepth}-bit — high-res streams will be downsampled.`,
    };
  }
  if (!lengthOk) {
    return {
      id: "digital_link",
      label: "Digital compatibility",
      verdict: "warn",
      explanation: `Cable length (${cable!.lengthM} m) exceeds the reliable limit for ${cable!.connector} (~${cable!.maxLengthM} m) — risk of dropouts.`,
    };
  }
  return {
    id: "digital_link",
    label: "Digital compatibility",
    verdict: "pass",
    explanation: `Formats and rates match; link is bit-perfect — the digital cable has no sonic effect.`,
  };
}
