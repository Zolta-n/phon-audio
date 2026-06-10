# Phon.Audio

A deterministic **compatibility engine for full audio signal chains** —
source → DAC → preamp → power amp → speaker (and headphone chains), including
cables and room/listening context.

This is the *trustworthy core*. The product's headline feature — synthesizing
subjective reviewer sentiment with AI — is deliberately a **separate, later
layer**. The rule that makes the whole thing credible:

> The deterministic engine owns every number. The AI layer never touches them.

The engine is provably correct and always available; the AI annotations are
additive, cited, and clearly the "soft" layer. You can ship the entire
electrical engine and system builder before any AI exists.

## What it does

Given an ordered chain of components plus cables and a listening context, the
engine resolves each **link** (an upstream output port → a downstream input
port) and runs the checks appropriate to that link's signal domain.

| Link domain | Checks |
|---|---|
| `digital` | format / sample-rate / bit-depth compatibility, cable length; otherwise "bit-perfect — no sonic effect" |
| `line` | impedance bridging (≥10×), HF rolloff from cable capacitance, gain staging |
| `speaker` | power / headroom (SPL at distance + room gain), impedance stability vs the dip, damping factor (incl. speaker-cable resistance), power handling |
| `headphone` | drive capability (voltage **and** current), output-impedance ratio (≥8×) |

Plus system-wide checks: end-to-end target-SPL reach and overall gain structure.

Every check returns a structured `CheckResult` (`{ verdict, value, threshold, unit, explanation }`),
never a bare string — so a UI and the future AI layer can both consume it.

## The cable stance

The engine models the genuinely electrical effects of cables (speaker-cable
resistance → damping factor and level loss; interconnect capacitance → HF
rolloff on long runs) and explicitly reports when a cable is electrically
neutral or a digital link is bit-perfect. Honesty here is a feature.

## Quick start

```bash
npm install
npm run demo        # build three example chains and print reports
npm test            # run the unit + engine tests
npm run typecheck   # type-only check
```

## Layout

```
src/
  types.ts                 port-based schema (components, ports, loads, cables, context, chain)
  units.ts                 conversions & audio math (dB/mW↔dB/V, AWG→resistance, SPL/power)
  engine/
    checkResult.ts         CheckResult type + verdict roll-up
    checks/
      lineLink.ts          impedance bridging, HF rolloff, gain staging
      speakerLink.ts       power/headroom, impedance stability, damping, power handling
      headphoneLink.ts     drive capability, output-impedance ratio
      digitalLink.ts       format/length compatibility + bit-perfect verdict
    system.ts              end-to-end SPL reach, gain structure
    index.ts               chain orchestration + report formatting
  seed/components.ts       representative components & cables (ILLUSTRATIVE specs)
examples/demo.ts           runnable full-system + mismatch + headphone demos
test/                      unit, check, and end-to-end tests
```

## Where the AI layer plugs in (not built here)

A separate module should do grounded retrieval over a **review-sentiment store**
and return tagged, cited, confidence-rated opinion (e.g. "reviewers consistently
call this amp warm — 8 sources [links]"). It consumes `CheckResult`s and adds
annotations; it must never recompute or override them. Do **not** republish
review text (copyright); store sentiment + attributed links, and surface
"no reviewer data" rather than inventing pairings.

## Important

Seed specs in `src/seed/components.ts` are **illustrative placeholders**, not
verified manufacturer data. Replace and verify before any production use.
Impedance is modeled as nominal for v1; the schema leaves room for a frequency
curve later, which is where amp/speaker matching gets genuinely interesting.

## Roadmap hints

- Replace nominal impedance with impedance/phase curves; compute worst-case current.
- Add room-mode / placement modeling for the speaker context.
- Build the chain-builder UI on top of `evaluateChain`.
- Add the AI sentiment service as an independent, swappable annotator.

MIT
