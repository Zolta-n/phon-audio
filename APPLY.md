# Learn module expert-tier upgrade — apply guide

Adds a schematic/waveform/plot figure and typeset display equations to the
expert tier of every parameter, on both surfaces:

- `/learn/[id]` pages — figure at the top of the "For experts" section,
  equations after the prose (statically rendered, crawlable SVG + MathML)
- In-app `ParameterExplainer` — same figure + equations when the "For experts"
  tab is active

## Files

New:
- `web/components/figures/shared.tsx` — palette constants (`--pa-*` vars),
  text styles, resistor/ground/source primitives, `Fig` frame
- `web/components/figures/TargetSpl.tsx` — SPL ladder + power-cost column
- `web/components/figures/CrestFactor.tsx` — compressed vs dynamic waveforms
- `web/components/figures/Distance.tsx` — inverse-square arcs + critical distance
- `web/components/figures/RoomGain.tsx` — pressure-zone FR plot + boundary steps
- `web/components/figures/DigitalEye.tsx` — open vs closed eye diagram
- `web/components/figures/ImpedanceBridging.tsx` — divider schematic +
  insertion-loss curve with the engine's fail/warn/pass bands (5x / 10x)
- `web/components/figures/HfRolloff.tsx` — RC schematic + Bode plot (16 MHz vs
  20 kHz corner cases)
- `web/components/figures/GainStaging.tsx` — gain-structure voltage ladder
- `web/components/figures/SpeakerHeadroom.tsx` — SPL budget waterfall (the
  engine's computation chain, drawn)
- `web/components/figures/ImpedanceStability.tsx` — |Z| + EPDR traces
- `web/components/figures/DampingFactor.tsx` — damping loop (resistor length
  drawn proportional to resistance) + error-vs-DF asymptote
- `web/components/figures/PowerHandling.tsx` — clipped waveform + 1/n harmonic
  spectrum with tweeter-band shading
- `web/components/figures/HeadphoneDrive.tsx` — V–I plane with voltage/current
  walls and 300 Ω vs 32 Ω load lines
- `web/components/figures/HeadphoneOutputZ.tsx` — IEM impedance curve + FR
  deviation for 0.5 Ω vs 10 Ω sources
- `web/components/figures/index.tsx` — `FIGURES` registry keyed by explainer slug
- `web/components/Equation.tsx` — MathML display-equation block

Replaced (drop-in; existing prose untouched):
- `web/lib/explainers.ts` — adds `ExplainerEquation` and an optional
  `equations` field, populated for all 14 entries
- `web/components/ParameterExplainer.tsx` — renders figure + equations on the
  expert tier
- `web/app/learn/[id]/page.tsx` — renders figure + equations in the expert
  section

## Design notes

- Figures are pure server-safe SVG components: no client JS, no state, no
  dependencies. They inherit the site theme through `--pa-*` CSS variables.
- Equations are native MathML strings rendered via `dangerouslySetInnerHTML`
  from static trusted data — supported in all evergreen browsers since 2023,
  zero bundle cost, indexable by crawlers. No KaTeX/MathJax needed.
- The registry is keyed by slug, so a parameter without a figure simply renders
  none; adding a figure later is one file + one registry line.
- Threshold shading in the bridging figure mirrors the engine's actual 5x/10x
  bands, tying the learn pages to the tool's verdicts.

## Verify

```bash
cd web
npx tsc --noEmit        # passes strict in isolation with Next stubs; should
                        # pass against your real tsconfig too
npm run dev             # open /learn/impedance_bridging, toggle "For experts"
npm run build           # all /learn/[id] pages statically generate
```

Spot-check in the builder: open any result row's "Learn more", switch to
"For experts" — figure above the prose, equations below it.

## Known trade-offs

- All 14 figures are imported by the client-side `ParameterExplainer` through
  the registry (~55 KB raw JSX, small after gzip). If you want the in-app
  panel lighter, drop the figure block from `ParameterExplainer.tsx` and keep
  the "Full explainer →" link as the path to the visuals.
- MathML rendering quality varies slightly across browsers (Chromium's is the
  plainest). If you ever want typeset perfection, swap `Equation` internals
  for KaTeX server-side rendering without touching the data.
