import type { CheckResult } from "../checkResult";
import type { DigitalOut, DigitalIn, DigitalCable, Port } from "../../types";

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

/** Human-readable clocking-topology note for the connector actually in use. */
function interfaceNote(connector: string, inp: DigitalIn): string {
  switch (connector) {
    case "usb":
      if (inp.usbMode === "async") {
        return "Asynchronous USB: the DAC's own clock paces the transfer, so source jitter and the cable cannot affect timing.";
      }
      if (inp.usbMode === "adaptive" || inp.usbMode === "synchronous") {
        return `USB in ${inp.usbMode} mode: timing follows the host clock; the DAC's clock recovery does the smoothing.`;
      }
      return "USB (transfer mode not reported): most modern DAC inputs are asynchronous, making source jitter irrelevant.";
    case "coax":
    case "aes": {
      const label = connector === "aes" ? "AES/EBU" : "Coax S/PDIF";
      const rejection =
        inp.jitterRejection === "reclocking"
          ? " This input re-clocks through a buffer, making recovered-clock jitter moot."
          : inp.jitterRejection === "pll"
            ? " This input cleans the recovered clock with a PLL."
            : "";
      return `${label} embeds the clock in the data stream; the receiver recovers it.${rejection}`;
    }
    case "optical":
      return "TOSLINK is inherently galvanically isolated (no ground loops) but bandwidth-limited (~96 kHz reliable).";
    case "i2s":
      return "I2S carries separate clock and data lines — jitter-transparent but only standardized for short runs.";
    default:
      return "Digital link: as long as the bits arrive intact, the interface has no sonic signature.";
  }
}

/**
 * Info-only companions to digitalLink: interface topology and clock/jitter
 * specs. These NEVER return warn/fail — a bit-perfect link stays a pass
 * regardless of jitter or clock numbers (they sit far below audibility on a
 * working link). They exist to inform and to feed the recommendation layer.
 */
export function digitalInterfaceNotes(
  outPort: Port,
  inPort: Port,
  cable?: DigitalCable,
): CheckResult[] {
  const out = outPort.specs as DigitalOut;
  const inp = inPort.specs as DigitalIn;
  const connector = inPort.connector ?? cable?.connector ?? outPort.connector;
  const results: CheckResult[] = [];

  results.push({
    id: "digital_interface",
    label: "Interface clocking",
    verdict: "info",
    explanation: interfaceNote(connector, inp),
  });

  const isolated =
    connector === "optical" || out.galvanicIsolation === true || inp.galvanicIsolation === true;
  const clockParts: string[] = [];
  if (out.intrinsicJitterPs !== undefined) clockParts.push(`source interface jitter ${out.intrinsicJitterPs} ps RMS`);
  if (out.clockAccuracyPpm !== undefined) clockParts.push(`source clock accuracy ±${out.clockAccuracyPpm} ppm`);
  if (inp.jitterRejection) clockParts.push(`receiver jitter rejection: ${inp.jitterRejection}`);
  if (isolated) clockParts.push("link is galvanically isolated");
  if (clockParts.length > 0) {
    results.push({
      id: "digital_clock_jitter",
      label: "Clock & jitter",
      verdict: "info",
      value: out.intrinsicJitterPs,
      unit: out.intrinsicJitterPs !== undefined ? "ps" : undefined,
      explanation:
        `${clockParts.join("; ")}. At these levels jitter sits far below audibility on a working link — ` +
        `reported for completeness, not as a fault.`,
    });
  }

  if (
    out.dsdMaxRateMhz !== undefined &&
    inp.dsdMaxRateMhz !== undefined &&
    out.dsdMaxRateMhz > inp.dsdMaxRateMhz
  ) {
    results.push({
      id: "digital_dsd_rate",
      label: "DSD rate ceiling",
      verdict: "info",
      value: inp.dsdMaxRateMhz,
      unit: "MHz",
      explanation:
        `Source supports DSD up to ${out.dsdMaxRateMhz} MHz but this input tops out at ${inp.dsdMaxRateMhz} MHz — ` +
        `native DSD above that will be converted or down-rated; PCM playback is unaffected.`,
    });
  }

  return results;
}
