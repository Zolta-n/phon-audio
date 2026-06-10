import type { Chain } from "../src/types";
import { evaluateChain, formatReport } from "../src/engine";
import {
  networkStreamer,
  desktopDac,
  linePreamp,
  solidStateAmp,
  tubeAmp,
  desktopHeadphoneAmp,
  bookshelfSpeaker,
  towerSpeaker,
  highImpedanceHeadphone,
  usbCable,
  xlrInterconnect,
  speakerCable12awg,
  speakerCableThin,
} from "../src/seed/components";

function run(title: string, chain: Chain) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log(formatReport(evaluateChain(chain)));
}

// --- 1. Full speaker system: well-matched solid-state rig ------------------
run("FULL SPEAKER SYSTEM — Streamer → DAC → Preamp → SS Amp → Tower", {
  context: { targetSplDb: 80, crestFactorDb: 12, distanceM: 2.5, roomGainDb: 4 },
  nodes: [
    { component: networkStreamer, cableToNext: usbCable },
    { component: desktopDac, cableToNext: xlrInterconnect },
    { component: linePreamp, cableToNext: xlrInterconnect },
    { component: solidStateAmp, cableToNext: speakerCable12awg },
    { component: towerSpeaker },
  ],
});

// --- 2. Mismatch demo: small tube amp + thin cable on a hard load ----------
run("MISMATCH DEMO — Tube Amp + thin 18 AWG / 8 m → Bookshelf at 4 m", {
  context: { targetSplDb: 90, crestFactorDb: 15, distanceM: 4, roomGainDb: 0 },
  nodes: [
    { component: networkStreamer, cableToNext: usbCable },
    { component: desktopDac, cableToNext: xlrInterconnect },
    { component: tubeAmp, cableToNext: speakerCableThin },
    { component: bookshelfSpeaker },
  ],
});

// --- 3. Headphone chain ----------------------------------------------------
run("HEADPHONE CHAIN — Streamer → DAC → HP Amp → 300 Ω dynamic", {
  context: { targetSplDb: 85, crestFactorDb: 15 },
  nodes: [
    { component: networkStreamer, cableToNext: usbCable },
    { component: desktopDac, cableToNext: xlrInterconnect },
    { component: desktopHeadphoneAmp },
    { component: highImpedanceHeadphone },
  ],
});
