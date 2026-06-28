import type {
  Chain,
  Component,
  Port,
  SignalDomain,
  Cable,
  InterconnectCable,
  SpeakerCable,
  DigitalCable,
  LineOut,
  LineIn,
  SpeakerOut,
  SpeakerLoad,
  HeadphoneOut,
  HeadphoneLoad,
  DigitalOut,
  DigitalIn,
  PhonoOut,
  PhonoIn,
} from "../types";
import type { CheckResult, Verdict } from "./checkResult";
import { worstVerdict } from "./checkResult";
import { impedanceBridging, hfRolloff, gainStaging } from "./checks/lineLink";
import {
  speakerPowerHeadroom,
  speakerImpedanceStability,
  dampingFactor,
  powerHandling,
} from "./checks/speakerLink";
import { headphoneDrive, headphoneOutputImpedance } from "./checks/headphoneLink";
import {
  phonoCartridgeMatch,
  phonoImpedanceLoading,
  phonoCapacitanceLoading,
  phonoGainAdequacy,
} from "./checks/phonoLink";
import { digitalLink } from "./checks/digitalLink";
import { gainStructure, endToEndSpl } from "./system";

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

// Priority for picking the link domain when more than one matches.
const DOMAIN_PRIORITY: SignalDomain[] = ["speaker", "headphone", "line", "phono", "digital"];

function resolveLink(
  from: Component,
  to: Component,
): { domain: SignalDomain; out: Port; in: Port } | undefined {
  for (const domain of DOMAIN_PRIORITY) {
    const out = (from.outputs ?? []).find((p) => p.domain === domain);
    const inp = (to.inputs ?? []).find((p) => p.domain === domain);
    if (out && inp) return { domain, out, in: inp };
  }
  return undefined;
}

function asInterconnect(cable?: Cable): InterconnectCable | undefined {
  return cable?.kind === "interconnect" ? cable : undefined;
}
function asSpeakerCable(cable?: Cable): SpeakerCable | undefined {
  return cable?.kind === "speaker" ? cable : undefined;
}
function asDigitalCable(cable?: Cable): DigitalCable | undefined {
  return cable?.kind === "digital" ? cable : undefined;
}

/** Run all checks for a single resolved link. */
function checkLink(
  domain: SignalDomain,
  out: Port,
  inp: Port,
  cable: Cable | undefined,
  chain: Chain,
): CheckResult[] {
  switch (domain) {
    case "digital":
      return [
        digitalLink(out.specs as DigitalOut, inp.specs as DigitalIn, asDigitalCable(cable)),
      ];
    case "line": {
      const o = out.specs as LineOut;
      const i = inp.specs as LineIn;
      return [
        impedanceBridging(o.outputImpedanceOhm, i.inputImpedanceOhm),
        hfRolloff(o.outputImpedanceOhm, asInterconnect(cable)),
        gainStaging(o.maxOutputVrms, i.inputSensitivityVrms, i.maxInputVrms),
      ];
    }
    case "phono": {
      const cart = out.specs as PhonoOut;
      const stage = inp.specs as PhonoIn;
      return [
        phonoCartridgeMatch(cart, stage),
        phonoImpedanceLoading(cart, stage),
        phonoCapacitanceLoading(cart, stage, asInterconnect(cable)),
        phonoGainAdequacy(cart, stage),
      ];
    }
    case "speaker": {
      const amp = out.specs as SpeakerOut;
      const spk = inp.specs as SpeakerLoad;
      return [
        speakerPowerHeadroom(spk, amp, chain.context),
        speakerImpedanceStability(spk, amp),
        dampingFactor(spk, amp, asSpeakerCable(cable)),
        powerHandling(spk, amp),
      ];
    }
    case "headphone": {
      const amp = out.specs as HeadphoneOut;
      const hp = inp.specs as HeadphoneLoad;
      return [
        headphoneDrive(hp, amp, chain.context),
        headphoneOutputImpedance(hp, amp),
      ];
    }
  }
}

/** Evaluate a full chain: per-link checks plus system-wide checks. */
export function evaluateChain(chain: Chain): SystemReport {
  const links: LinkReport[] = [];

  for (let i = 0; i < chain.nodes.length - 1; i++) {
    const fromNode = chain.nodes[i]!;
    const toNode = chain.nodes[i + 1]!;
    const link = resolveLink(fromNode.component, toNode.component);
    if (!link) {
      links.push({
        from: fromNode.component.name,
        to: toNode.component.name,
        domain: "line",
        results: [
          {
            id: "no_link",
            label: "Connection",
            verdict: "fail",
            explanation: `No compatible port domain between ${fromNode.component.name} and ${toNode.component.name}.`,
          },
        ],
        verdict: "fail",
      });
      continue;
    }
    const results = checkLink(link.domain, link.out, link.in, fromNode.cableToNext, chain);
    links.push({
      from: fromNode.component.name,
      to: toNode.component.name,
      domain: link.domain,
      results,
      verdict: worstVerdict(results),
    });
  }

  // Terminal power/drive check feeds the end-to-end SPL roll-up.
  const terminalLink = links[links.length - 1];
  const terminalPowerCheck = terminalLink?.results.find(
    (r) => r.id === "speaker_power_headroom" || r.id === "headphone_drive",
  );

  const system: CheckResult[] = [endToEndSpl(terminalPowerCheck), gainStructure(chain)];

  const overall = worstVerdict([...links.flatMap((l) => l.results), ...system]);
  return { links, system, overall };
}

/** Pretty-print a report to a string (used by the demo). */
export function formatReport(report: SystemReport): string {
  const icon: Record<Verdict, string> = { pass: "✅", info: "ℹ️ ", warn: "⚠️ ", fail: "❌" };
  const lines: string[] = [];
  lines.push(`OVERALL: ${icon[report.overall]} ${report.overall.toUpperCase()}\n`);
  for (const link of report.links) {
    lines.push(`${link.from}  →  ${link.to}   [${link.domain}]  ${icon[link.verdict]}`);
    for (const r of link.results) {
      lines.push(`    ${icon[r.verdict]} ${r.label}: ${r.explanation}`);
    }
    lines.push("");
  }
  lines.push("SYSTEM");
  for (const r of report.system) {
    lines.push(`    ${icon[r.verdict]} ${r.label}: ${r.explanation}`);
  }
  return lines.join("\n");
}
