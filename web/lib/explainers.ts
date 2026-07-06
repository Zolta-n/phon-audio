// ---------------------------------------------------------------------------
// Phon.Audio — parameter explainers (single source of truth)
//
// Static editorial content for every metric the engine evaluates, plus the
// room/listening-context inputs that feed them. Keyed by the engine's stable
// check `id` (e.g. "damping_factor") for checks, and by the ContextSettings
// field name (e.g. "targetSplDb") for room/listening parameters.
//
// Consumed in two places:
//   1. In-app  — <ParameterExplainer> renders a "Learn more" disclosure under
//      each result row, with a Simple / Theory / Expert depth toggle.
//   2. SEO      — /learn and /learn/[id] statically render all three tiers.
//
// This module is pure data: no engine/server imports, safe in client and
// server components alike. Expert-tier figures live in
// components/figures (registry keyed by slug); the display equations below
// are MathML strings rendered by <Equation> — native browser MathML, no JS.
// ---------------------------------------------------------------------------

export type ExplainerTier = "simple" | "theory" | "expert";

export type ExplainerGroup =
  | "Room & listening"
  | "Digital"
  | "Line-level"
  | "Speaker"
  | "Headphone";

/** A display equation shown with the expert tier. `mathml` is a trusted,
 * static MathML string (single-quoted attributes so it nests in TS strings). */
export interface ExplainerEquation {
  mathml: string;
  caption: string;
}

export interface Explainer {
  /** Matches the engine check id, or the ContextSettings field name. */
  slug: string;
  label: string;
  group: ExplainerGroup;
  /** One-liner for cards and meta descriptions. */
  summary: string;
  simple: string;
  theory: string;
  expert: string;
  /** Display equations rendered with the expert tier. */
  equations?: ExplainerEquation[];
}

export const TIER_LABELS: Record<ExplainerTier, string> = {
  simple: "Simple",
  theory: "The theory",
  expert: "For experts",
};

export const GROUP_ORDER: ExplainerGroup[] = [
  "Room & listening",
  "Digital",
  "Line-level",
  "Speaker",
  "Headphone",
];

const ENTRIES: Explainer[] = [
  // ---- Room & listening context -------------------------------------------
  {
    slug: "targetSplDb",
    label: "Target SPL",
    group: "Room & listening",
    summary: "How loud you actually listen, in decibels at your chair.",
    simple:
      "How loud you actually listen, measured in decibels at your chair. Quiet background listening is around 65 dB; a lively session is 85 dB; live-concert loud is 100 dB+.",
    theory:
      "SPL (sound pressure level) is a logarithmic measure referenced to the threshold of hearing (20 µPa). Every +10 dB is roughly a doubling of perceived loudness but a tenfold increase in acoustic power. The engine treats your target as the average level — the steady loudness you'd read on a meter — and builds the peak requirement on top of it.",
    expert:
      "85 dB isn't arbitrary: it's the reference playback level baked into film mixing (the SMPTE/Dolby calibration target, per channel) and a sane proxy for \"engaged but not hearing-damaging\" listening. OSHA's 8-hour exposure limit is 90 dBA, and risk roughly doubles every 3 dB above that, so a 105 dB peak is fine for transients but you wouldn't want it sustained. Because power scales as 10^(dB/10), asking for 95 dB average instead of 85 demands ten times the amplifier watts — which is exactly why \"just turn it up 10 dB\" quietly wrecks a headroom budget.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><msub><mi>L</mi><mi>p</mi></msub><mo>=</mo><mn>20</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><mi>p</mi><msub><mi>p</mi><mn>0</mn></msub></mfrac><mo>)</mo></mrow><mtext>&#160;dB,&#160;&#160;</mtext><msub><mi>p</mi><mn>0</mn></msub><mo>=</mo><mn>20</mn><mtext>&#160;µPa</mtext></mrow></math>",
        caption:
          "Sound pressure level is logarithmic, referenced to the threshold of hearing.",
      },
      {
        mathml:
          "<math display='block'><mrow><mfrac><msub><mi>P</mi><mn>2</mn></msub><msub><mi>P</mi><mn>1</mn></msub></mfrac><mo>=</mo><msup><mn>10</mn><mrow><mo>&#x394;</mo><mi>L</mi><mo>/</mo><mn>10</mn></mrow></msup></mrow></math>",
        caption: "Every +10 dB of target level costs 10× the amplifier power.",
      },
    ],
  },
  {
    slug: "crestFactorDb",
    label: "Crest factor",
    group: "Room & listening",
    summary: "The power gap between average loudness and brief musical peaks.",
    simple:
      "The gap between the average loudness of music and its brief loud spikes — a drum hit, a cymbal crash. Even at a modest average volume, those spikes need a lot more power for a split second.",
    theory:
      "Crest factor is the ratio of peak amplitude to RMS (average) amplitude, expressed in dB. The engine adds it to your target SPL to get the peak SPL the system must reach cleanly: peakSPL = targetSPL + crestFactor. The default of 15 dB reflects typical well-recorded music; the power for those peaks is what separates \"loud enough\" from \"loud enough and clean.\"",
    expert:
      "15 dB is a deliberately honest default. Heavily compressed pop (\"loudness war\" masters) can sit at 6–9 dB crest, while uncompressed orchestral or live recordings hit 18–20 dB. The catch: peak power scales as 10^(crest/10), so a 20 dB-crest recording demands ~30× the peak watts of its 5 dB-crest counterpart at the same average level. This is why a 50 W amp can sound \"underpowered\" on classical but bulletproof on EDM — the music's dynamics, not just its loudness, set the bill. It's also why peak-vs-RMS amplifier specs matter and why momentary clipping on transients is the most common (and most overlooked) form of distortion.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mi>CF</mi><mo>=</mo><mn>20</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><msub><mi>V</mi><mtext>peak</mtext></msub><msub><mi>V</mi><mtext>rms</mtext></msub></mfrac><mo>)</mo></mrow></mrow></math>",
        caption: "Crest factor: the peak-to-average ratio of the signal, in dB.",
      },
      {
        mathml:
          "<math display='block'><mrow><mfrac><msub><mi>P</mi><mtext>peak</mtext></msub><msub><mi>P</mi><mtext>avg</mtext></msub></mfrac><mo>=</mo><msup><mn>10</mn><mrow><mi>CF</mi><mo>/</mo><mn>10</mn></mrow></msup></mrow></math>",
        caption:
          "A 15 dB crest factor means transients demand ~32× the average power.",
      },
    ],
  },
  {
    slug: "distanceM",
    label: "Listening distance",
    group: "Room & listening",
    summary: "How far you sit from the speakers — sets how much power you need.",
    simple:
      "How far your ears are from the speakers. The farther away you sit, the quieter the sound gets and the more power the amp needs to compensate. (Headphones ignore this — your \"distance\" is essentially zero.)",
    theory:
      "In a free field, sound from a point source obeys the inverse-square law: intensity falls with the square of distance, which is −6 dB SPL per doubling. The engine applies 20·log₁₀(distance) of attenuation relative to the 1 m reference, then asks the amp to make up the difference in power. Double your distance and you need 4× the power for the same loudness.",
    expert:
      "Real rooms aren't free fields, which is why this is a model, not gospel. Below the room's Schroeder frequency (~200–300 Hz domestically) you're in modal/pressure-zone behavior where the inverse-square law breaks down and standing waves dominate; above it, you transition toward a diffuse field where the falloff is gentler than 6 dB/doubling because reflected energy fills in. The full picture is the critical distance — the radius at which direct and reverberant energy are equal. Sit inside it and the direct-sound, inverse-square approximation holds well; sit beyond it and you're mostly hearing the room. The engine's 6 dB/doubling is the conservative (worst-case-for-power) end, which is the right way to size an amp.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mo>&#x394;</mo><mi>L</mi><mo>=</mo><mo>&#x2212;</mo><mn>20</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><mi>d</mi><msub><mi>d</mi><mn>0</mn></msub></mfrac><mo>)</mo></mrow></mrow></math>",
        caption:
          "Free-field attenuation: −6 dB per doubling of distance from a point source.",
      },
    ],
  },
  {
    slug: "roomGainDb",
    label: "Room gain",
    group: "Room & listening",
    summary: "Free bass reinforcement from walls, floor, and corners.",
    simple:
      "Free bass from your room. Walls, floor, and corners reinforce low frequencies, so a speaker near a boundary plays bass louder than it would in open air — sometimes a lot louder. You can dial this in from 0 (open space) up to ~12 dB (a small, boundary-loaded room).",
    theory:
      "Below the frequency where a room's longest dimension equals roughly half a wavelength, the room stops behaving like open space and starts acting like a pressure vessel: the speaker pressurizes the whole volume rather than radiating waves, and SPL rises as you go lower. Each reflecting boundary near the driver adds reinforcement. The engine treats this as a flat dB bonus added to effective sensitivity, easing the amp's power burden.",
    expert:
      "The mechanism is twofold. Boundary reinforcement (Roy Allison's work) is the discrete part: each nearby surface restricts radiation into a smaller solid angle, adding theoretically +3 dB per boundary (half-space → quarter → eighth) for wavelengths long enough to \"see\" the boundary as adjacent. Room/cabin gain is the continuous part: in a sealed-ish small room, below the pressure-zone cutoff (≈ c/2L for the longest dimension L), output rises at ~12 dB/octave as frequency drops — the same effect that makes car subwoofers hit absurdly hard in a tiny sealed cabin. The two stack, which is how you reach double-digit dB. The trade-off the model doesn't show: that same reinforcement excites room modes, so the gain is rarely flat — it's lumpy, and the lumps are why bass measures ±10 dB across a sofa.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><msub><mi>f</mi><mtext>pz</mtext></msub><mo>&#x2248;</mo><mfrac><mi>c</mi><mrow><mn>2</mn><mi>L</mi></mrow></mfrac></mrow></math>",
        caption:
          "Below the pressure-zone corner set by the room's longest dimension L, output rises at ~12 dB per octave.",
      },
    ],
  },

  // ---- Digital ------------------------------------------------------------
  {
    slug: "digital_link",
    label: "Digital compatibility",
    group: "Digital",
    summary: "Bits match or they don't — and a working digital cable is sonically neutral.",
    simple:
      "Checks that your source and DAC speak the same digital language — same file formats, sample rates, and bit depths — and that the cable isn't too long. If they match, the data arrives perfectly and the cable makes no difference to the sound. Full stop.",
    theory:
      "A digital link transmits discrete numbers, not a continuous waveform. As long as the receiver locks to the data and recovers every bit, the output is identical regardless of cable — there is no \"warmer\" or \"more detailed\" USB cable. The engine verifies format overlap (PCM/DSD), that the DAC's max sample rate and bit depth meet or exceed the source's, and that cable length stays within the connector's reliable limit. Failures here are categorical (no shared format) or bandwidth (high-res gets downsampled), never tonal.",
    expert:
      "This is the engine's honest-cable stance made explicit. The one real-world wrinkle is jitter — timing error in the clock recovering the bitstream — which can be cable-influenced on self-clocking interfaces like S/PDIF and AES3, where the clock is embedded in the data. But two things defang it: (1) asynchronous USB and any link where the DAC reclocks from its own buffer make the source clock irrelevant, and (2) measured jitter in competent modern DACs sits 100+ dB down, far below audibility thresholds established in controlled listening. So the model reports bit-perfect links as having no sonic effect, flags only genuine bandwidth/length problems, and refuses to launder jitter anxiety into a cable recommendation. Length limits are physical, not mystical: ~5 m for unrepeated USB 2.0, ~10 m for TOSLINK before the LED's rise-time smears the eye pattern, longer for AES3 over proper 110 Ω cable.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><msub><mi>f</mi><mi>s</mi></msub><mo>&#x2265;</mo><mn>2</mn><mo>&#x2062;</mo><msub><mi>f</mi><mtext>max</mtext></msub></mrow></math>",
        caption:
          "Nyquist: a locked, bit-perfect link preserves everything below half the sample rate — cable brand does not appear in this equation.",
      },
    ],
  },

  // ---- Line-level ---------------------------------------------------------
  {
    slug: "impedance_bridging",
    label: "Impedance bridging",
    group: "Line-level",
    summary: "The receiving input should look ≥10× bigger than the sending output.",
    simple:
      "The device receiving the signal should \"look\" much bigger (electrically) than the one sending it — at least 10× bigger. When it does, the signal passes through cleanly. When it doesn't, you lose bass and the tone shifts.",
    theory:
      "This is voltage bridging, the standard for line-level audio: a low source output impedance feeding a high input impedance. The two form a voltage divider, so the fraction of signal delivered is Zin / (Zin + Zout). At a 10:1 ratio you keep ~91% (−0.8 dB) and, crucially, it stays flat across frequency. The engine passes ≥10×, warns at ≥5×, and fails below — because a poor ratio interacts with frequency-dependent impedances to bend the response.",
    expert:
      "The reason a bad ratio is tonal and not just quieter is that output impedance is rarely flat — it often rises at the frequency extremes (coupling-capacitor reactance at the bottom, especially in tube gear with output transformers or single-cap-coupled outputs). Feed that into a too-low input impedance and the divider attenuates more where Zout peaks, producing audible bass rolloff and a midrange tilt. Vintage and tube preamps are the usual offenders — a 2 kΩ output staring into a 10 kΩ input is only 5×, and the bass goes soft. The 10× rule is the cheap insurance that keeps the divider frequency-independent. (Power transfer is the opposite goal — matched impedances — but you never want that for line level; matching halves your voltage and doubles your noise susceptibility.)",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mfrac><msub><mi>V</mi><mtext>in</mtext></msub><msub><mi>V</mi><mtext>src</mtext></msub></mfrac><mo>=</mo><mfrac><msub><mi>Z</mi><mtext>in</mtext></msub><mrow><msub><mi>Z</mi><mtext>in</mtext></msub><mo>+</mo><msub><mi>Z</mi><mtext>out</mtext></msub></mrow></mfrac></mrow></math>",
        caption:
          "The bridging divider: at a 10:1 ratio the loss is only −0.83 dB and stays flat with frequency.",
      },
    ],
  },
  {
    slug: "hf_rolloff",
    label: "Cable HF rolloff",
    group: "Line-level",
    summary: "Cable capacitance plus source impedance can gently roll off the top treble.",
    simple:
      "A long analog interconnect acts like a tiny tone control, very gently rolling off the highest treble — but only if the cable is long and the source is \"weak.\" For normal lengths it does nothing you can hear.",
    theory:
      "Every cable has capacitance, and that capacitance forms a low-pass filter with the source's output impedance: f = 1 / (2π · Zout · C_total). The corner frequency is where treble starts to drop. The engine computes it from the cable's capacitance-per-meter × length against the source impedance: above ~100 kHz it's electrically neutral, and it only warns once the corner creeps toward the audible band (≤20 kHz).",
    expert:
      "The interaction is what matters — neither factor alone is enough. A 100 pF/m cable at 1 m off a 100 Ω source puts the corner near 16 MHz: irrelevant. Stretch it to a 5 m run of high-capacitance cable (some hit 300+ pF/m) off a high-impedance tube output (say 5 kΩ), and the corner can fall to ~20 kHz — now it's a real, if mild, treble shelf. This is the one place the engine models an analog cable having an audible effect, and it does so through physics, not adjectives: the cure is a shorter run or a lower-capacitance cable, never a pricier one. Phono cartridges are the extreme case — there, loading capacitance is part of the cartridge's designed resonance, which is why turntable cable capacitance is specified, not hand-waved.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><msub><mi>f</mi><mi>c</mi></msub><mo>=</mo><mfrac><mn>1</mn><mrow><mn>2</mn><mi>&#x3C0;</mi><mo>&#x2062;</mo><msub><mi>Z</mi><mtext>out</mtext></msub><mo>&#x2062;</mo><mi>C</mi><mo>&#x2062;</mo><mi>&#x2113;</mi></mrow></mfrac></mrow></math>",
        caption:
          "Corner frequency of the low-pass formed by source impedance and total cable capacitance (per-meter capacitance × length).",
      },
      {
        mathml:
          "<math display='block'><mrow><mrow><mo>|</mo><mi>H</mi><mo>(</mo><mi>f</mi><mo>)</mo><mo>|</mo></mrow><mo>=</mo><mfrac><mn>1</mn><msqrt><mrow><mn>1</mn><mo>+</mo><msup><mrow><mo>(</mo><mi>f</mi><mo>/</mo><msub><mi>f</mi><mi>c</mi></msub><mo>)</mo></mrow><mn>2</mn></msup></mrow></msqrt></mfrac></mrow></math>",
        caption: "First-order rolloff: −3 dB at the corner, −20 dB per decade beyond it.",
      },
    ],
  },
  {
    slug: "gain_staging",
    label: "Gain staging",
    group: "Line-level",
    summary: "Enough voltage to reach full output, without overloading the next input.",
    simple:
      "Can the upstream device put out enough voltage to drive the next one to full volume — without overloading its input? Too little and you can never get loud enough; too much and the input distorts before you reach the top of the dial.",
    theory:
      "Gain staging checks voltage headroom between stages: headroom_dB = 20·log₁₀(maxOutput / inputSensitivity). Positive headroom means the source can reach the voltage the next stage needs for full output. The engine also flags the opposite failure — if the source's max output exceeds the downstream overload point, the input clips at high settings. Good structure means comfortable headroom on both ends.",
    expert:
      "The subtle, real-world failure mode here isn't too quiet — it's the gain mismatch that crushes usable volume range. Pair a high-output DAC (4 Vrms balanced) with a high-gain power amp (low input sensitivity, say 0.7 V for full output) and you reach ear-splitting levels in the first 9 o'clock of the volume knob, leaving you riding a tiny, channel-imbalance-prone arc at the bottom of the pot. It's not distortion, it's ergonomics — and it's why \"more gain\" is often actively worse. The flip side is the overload-clipping case the engine warns about: a 4 V source into a 2 V max input clips the input stage regardless of where the volume sits downstream, because the damage happens before attenuation. Unity-gain and the \"gain before attenuation\" ordering inside a preamp are the design answers; the engine just checks you haven't stacked the stages into a corner.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mtext>headroom</mtext><mo>=</mo><mn>20</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><msub><mi>V</mi><mtext>max</mtext></msub><msub><mi>V</mi><mtext>sens</mtext></msub></mfrac><mo>)</mo></mrow><mtext>&#160;dB</mtext></mrow></math>",
        caption:
          "Positive: the source can drive the next stage to full output. Also check V max against the input's overload ceiling.",
      },
    ],
  },

  // ---- Speaker ------------------------------------------------------------
  {
    slug: "speaker_power_headroom",
    label: "Power / headroom",
    group: "Speaker",
    summary: "Can the amp hit your peak SPL at your seat, with margin to spare?",
    simple:
      "Can the amplifier get your speakers loud enough — including the brief loud peaks — from where you sit? The answer depends on the speaker's efficiency, your distance, and how much spare power the amp has. Comfortable headroom means clean peaks; no headroom means the sound distorts when the music gets dynamic.",
    theory:
      "The engine chains several relationships: it converts the speaker's 2.83 V/1 m sensitivity to a 1-watt reference, subtracts inverse-square distance loss, adds room gain to get effective sensitivity at your seat, then computes the watts needed for your peak SPL and compares to the amp's actual power into that impedance. The result is headroom in dB: 10·log₁₀(ampPower / powerNeeded). Below 0 you clip before reaching target; 0–3 dB is marginal; 3–12 dB is the sweet spot.",
    expert:
      "Two nerd details the model bakes in. First, 2.83 V is only 1 watt into 8 Ω — into a 4 Ω speaker it's 2 watts, so the headline sensitivity number flatters low-impedance speakers by ~3 dB until you normalize to a true power reference, which the engine does (−10·log₁₀(8/Z)). Second, the engine caps \"good\" headroom at 12 dB and labels more as merely unnecessary, not better — but the real argument for big headroom is that clipping, not power, kills tweeters: a clipped waveform from an undersized amp dumps high-frequency harmonic energy into the tweeter that clean high power never would. So the counterintuitive truth is that a 200 W amp is often safer for your speakers than a 50 W one, provided you don't abuse it. The 3 dB minimum exists because music peaks are exactly the moments you can't afford to run out of runway.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><msub><mi>L</mi><mtext>1W</mtext></msub><mo>=</mo><msub><mi>L</mi><mtext>2.83V</mtext></msub><mo>&#x2212;</mo><mn>10</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><mn>8</mn><mi>Z</mi></mfrac><mo>)</mo></mrow></mrow></math>",
        caption: "Normalizing 2.83 V sensitivity to a true 1-watt reference.",
      },
      {
        mathml:
          "<math display='block'><mrow><msub><mi>P</mi><mtext>req</mtext></msub><mo>=</mo><msup><mn>10</mn><mrow><mo>(</mo><msub><mi>L</mi><mtext>peak</mtext></msub><mo>&#x2212;</mo><msub><mi>L</mi><mtext>eff</mtext></msub><mo>)</mo><mo>/</mo><mn>10</mn></mrow></msup><mtext>,&#160;&#160;</mtext><mtext>HR</mtext><mo>=</mo><mn>10</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>(</mo><mfrac><msub><mi>P</mi><mtext>amp</mtext></msub><msub><mi>P</mi><mtext>req</mtext></msub></mfrac><mo>)</mo></mrow></mrow></math>",
        caption:
          "Required watts from the SPL gap at your seat, and the headroom between available and required power.",
      },
    ],
  },
  {
    slug: "impedance_stability",
    label: "Impedance stability",
    group: "Speaker",
    summary: "Is the amp rated to survive the speaker's deepest impedance dip?",
    simple:
      "Speakers don't present a steady electrical load — their impedance dips at certain frequencies, and at those dips they demand more current from the amp. This check confirms the amp is built to survive the deepest dip without shutting down or misbehaving.",
    theory:
      "Nominal impedance (the \"8 Ω\" on the box) is a rough average; the actual impedance curve swings with frequency and can dip well below it. Since current draw is inversely proportional to impedance (I = V/Z), a dip is a current spike. The engine compares the speaker's minimum impedance to the lowest impedance the amp is rated stable into — if the speaker dips below the amp's rating, you're in the danger zone for current limiting, protection trips, or instability.",
    expert:
      "The villain isn't just the impedance magnitude — it's the electrical phase angle that coincides with the dip. A speaker can present 3 Ω at 45° of phase, and the combination of low impedance and reactive phase forces the amp to deliver high current while voltage and current are out of step, dumping heat in the output devices precisely when they're already stressed. This is the EPDR (equivalent peak dissipation resistance) problem that makes some nominally-4 Ω speakers behave like a 1.5 Ω load to the output stage. It's why a beefy amp's \"stable into 2 Ω\" rating matters more than its 8 Ω wattage for hard-to-drive speakers, and why class-AB amps with marginal heatsinking trip their protection on exactly these speakers. The engine's check is a magnitude proxy for this deeper reactive-load reality.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mi>I</mi><mo>=</mo><mfrac><mi>V</mi><mrow><mo>|</mo><mi>Z</mi><mo>(</mo><mi>f</mi><mo>)</mo><mo>|</mo></mrow></mfrac></mrow></math>",
        caption:
          "Current draw spikes where the impedance curve dips; a coincident phase angle raises output-device dissipation further — the EPDR effect (Howard, 2007).",
      },
    ],
  },
  {
    slug: "damping_factor",
    label: "Damping factor",
    group: "Speaker",
    summary: "How tightly the amp grips the woofer — cable resistance counts.",
    simple:
      "How tightly the amp grips the speaker cone and stops it from ringing after the signal stops — think of it as electronic brakes on the woofer. Higher means tighter, more controlled bass; very low can sound loose or boomy. Your speaker cable counts here.",
    theory:
      "Damping factor is speakerImpedance / (ampOutputImpedance + cableResistance). A low amp output impedance lets the speaker's own back-EMF (the voltage a moving cone generates) be shorted out through the amp, electrically braking cone motion. The engine includes the cable's series resistance in the denominator — long, thin cable adds resistance and lowers the effective damping. ≥20 is tight; 8–20 is adequate; below 8 the bass control loosens.",
    expert:
      "Here's the dirty secret the spec sheets hide: a damping factor of 20 vs. 2000 is nearly inaudible, because what actually matters is the total series resistance in the bass circuit relative to the speaker's own DC resistance — and the speaker's voice-coil resistance (typically 80–90% of nominal impedance) already dwarfs the amp's output impedance. Going from DF 500 to DF 50 changes the total damping of the system by a fraction of a dB. What genuinely moves the needle is cable resistance on long runs (which is why the engine folds it in) and tube amps with high output impedance (DF often 2–10), where the amp's output impedance interacts with the speaker's impedance curve to produce frequency-response bumps — that's an audible tonal effect, not a \"looseness\" effect. So the model's honest position: DF ≥8 is fine, the difference between \"good\" and \"spectacular\" DF is marketing, and the real story is impedance interaction, not cone grip.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mtext>DF</mtext><mo>=</mo><mfrac><msub><mi>Z</mi><mtext>sp</mtext></msub><mrow><msub><mi>Z</mi><mtext>out</mtext></msub><mo>+</mo><msub><mi>R</mi><mtext>cable</mtext></msub></mrow></mfrac></mrow></math>",
        caption: "Damping factor as the engine computes it — cable resistance included.",
      },
      {
        mathml:
          "<math display='block'><mrow><msub><mi>R</mi><mtext>loop</mtext></msub><mo>=</mo><msub><mi>Z</mi><mtext>out</mtext></msub><mo>+</mo><msub><mi>R</mi><mtext>cable</mtext></msub><mo>+</mo><msub><mi>R</mi><mtext>vc</mtext></msub></mrow></math>",
        caption:
          "The voice coil's own resistance dominates the damping loop — which is why DF 50 vs 500 is inaudible.",
      },
    ],
  },
  {
    slug: "power_handling",
    label: "Power handling",
    group: "Speaker",
    summary: "Amp power vs speaker rating — and why a small amp is the real danger.",
    simple:
      "Compares how much clean power the amp makes to how much the speaker can take. Counterintuitively, the bigger danger is usually an amp that's too small, not too big — a small amp pushed into distortion is what actually fries speakers.",
    theory:
      "The engine compares the amp's power into the speaker's impedance against the speaker's continuous (RMS) power rating. A well-matched pair sits in a comfortable band. If the amp makes less than ~25% of the speaker's rating, the warning isn't \"too quiet\" — it's that you'll be tempted to crank a small amp into clipping. If the amp greatly exceeds the rating, it's flagged as fine with discipline: clean power is safer than dirty power.",
    expert:
      "The mechanism behind \"small amps kill speakers\" is spectral. A sine wave clipped into a square wave roughly doubles its RMS power and shifts a big chunk of that energy into high-order harmonics — energy that lands in the tweeter, which is typically rated for only a small fraction of the system's total power handling. So an underpowered amp driven to clipping can deliver more destructive energy to a tweeter than a much larger amp playing cleanly. The rule of thumb among installers — pick an amp rated up to ~2× the speaker's continuous handling — exists precisely so you never need to clip it. The engine encodes this inverted intuition: it warns harder about the small amp than the big one, because the failure physics, not the wattage arithmetic, is what destroys drivers.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mfrac><msub><mi>a</mi><mi>n</mi></msub><msub><mi>a</mi><mn>1</mn></msub></mfrac><mo>=</mo><mfrac><mn>1</mn><mi>n</mi></mfrac><mtext>&#160;&#160;(odd&#160;n),&#160;&#160;</mtext><msub><mi>P</mi><mtext>square</mtext></msub><mo>&#x2248;</mo><mn>2</mn><mo>&#x2062;</mo><msub><mi>P</mi><mtext>sine</mtext></msub></mrow></math>",
        caption:
          "Hard clipping approaches a square wave: RMS power roughly doubles and the odd harmonics carry the excess into the tweeter's band.",
      },
    ],
  },

  // ---- Headphone ----------------------------------------------------------
  {
    slug: "headphone_drive",
    label: "Drive capability",
    group: "Headphone",
    summary: "Both voltage and current must clear what your peaks demand.",
    simple:
      "Can the headphone amp supply both the \"push\" (voltage) and the \"flow\" (current) your headphones need to hit your target volume on peaks? Different headphones run into different walls: some need lots of voltage, some need lots of current.",
    theory:
      "Power is voltage × current, but headphones don't draw them in the same proportion. The engine computes the power needed for your peak SPL from the headphone's sensitivity, then derives the voltage (V = √(P·Z)) and current (I = V/Z) that power demands, and checks both against the amp's max voltage and max current. Passing requires clearing both limits — failing either means underdriven peaks.",
    expert:
      "This two-bottleneck model is what single \"power\" specs miss. High-impedance dynamics (300 Ω Beyerdynamics, 600 Ω vintage) are voltage-hungry: at 300 Ω you might need 5–7 Vrms but trivial current, so they starve on phone outputs and battery dongles that top out around 2 V. Low-impedance planars (Audeze, HiFiMan at 32 Ω and low sensitivity) flip it: modest voltage but serious current, tens to hundreds of mA, which is why they sound limp on otherwise-fine amps that can't source current. The cruel case is a low-impedance, low-sensitivity planar that's both demanding — and it's exactly the combination a one-number \"milliwatt\" rating hides, because the same mW can be reached by very different V/I pairs. Checking voltage and current separately is the only honest way to predict whether an amp actually drives a given headphone.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mi>V</mi><mo>=</mo><msqrt><mrow><mi>P</mi><mo>&#x2062;</mo><mi>Z</mi></mrow></msqrt><mtext>,&#160;&#160;</mtext><mi>I</mi><mo>=</mo><msqrt><mfrac><mi>P</mi><mi>Z</mi></mfrac></msqrt></mrow></math>",
        caption:
          "The same milliwatts can be a voltage problem or a current problem — an amp must clear both.",
      },
    ],
  },
  {
    slug: "headphone_output_impedance",
    label: "Output-impedance ratio",
    group: "Headphone",
    summary: "Headphone impedance should be ≥8× the amp's output, or tone shifts.",
    simple:
      "The headphone should have at least 8× the impedance of the amp's output. Break this rule and the headphone's tone changes — bass and treble shift around — purely from an electrical mismatch, no matter how good the amp is otherwise.",
    theory:
      "The same voltage-divider physics as line-level bridging, applied to a frequency-dependent load. A headphone's impedance varies with frequency (especially around its bass resonance and, in multi-driver IEMs, across crossover points). Any output impedance forms a divider with that varying load, so the response sags wherever impedance dips. The engine enforces the 1/8 rule: ratio ≥8× passes, 4–8× warns, below 4× fails with audible tonal coloration.",
    expert:
      "This is where output impedance becomes a literal, measurable EQ. A dynamic headphone has an impedance peak at its bass resonance (often 2–4× nominal); feed it from a high-output-impedance source and that peak pulls more voltage right there, producing a bass bump — the \"warmer from the high-Z output\" effect that's really just an uncontrolled divider. Multi-driver IEMs are the nightmare: their impedance can swing from 30 Ω to 5 Ω across the audband as crossovers hand off, so even a few ohms of output impedance carves a visibly wavy frequency response — measurable swings of several dB. The 1/8 rule keeps the divider's variation under ~1 dB. It's also why the \"output impedance doesn't matter, it's just power\" claim is wrong for IEMs specifically, and why a 10 Ω vintage headphone-out jack is a tone control nobody asked for.",
    equations: [
      {
        mathml:
          "<math display='block'><mrow><mo>&#x394;</mo><mo>(</mo><mi>f</mi><mo>)</mo><mo>=</mo><mn>20</mn><mo>&#x2062;</mo><msub><mi>log</mi><mn>10</mn></msub><mrow><mo>[</mo><mfrac><mrow><mi>Z</mi><mo>(</mo><mi>f</mi><mo>)</mo><mo>/</mo><mo>(</mo><mi>Z</mi><mo>(</mo><mi>f</mi><mo>)</mo><mo>+</mo><msub><mi>Z</mi><mtext>out</mtext></msub><mo>)</mo></mrow><mrow><msub><mi>Z</mi><mtext>max</mtext></msub><mo>/</mo><mo>(</mo><msub><mi>Z</mi><mtext>max</mtext></msub><mo>+</mo><msub><mi>Z</mi><mtext>out</mtext></msub><mo>)</mo></mrow></mfrac><mo>]</mo></mrow></mrow></math>",
        caption:
          "Response deviation across a non-flat load; the 1/8 rule keeps the swing under ~1 dB.",
      },
    ],
  },
];

/** All explainers, in display order. */
export const ALL_EXPLAINERS: Explainer[] = ENTRIES;

/** Lookup by slug (engine check id or ContextSettings field name). */
export const EXPLAINERS: Record<string, Explainer> = Object.fromEntries(
  ENTRIES.map((e) => [e.slug, e]),
);

/** Every valid slug — useful for generateStaticParams. */
export const EXPLAINER_SLUGS: string[] = ENTRIES.map((e) => e.slug);

export function getExplainer(slug: string): Explainer | undefined {
  return EXPLAINERS[slug];
}

/** Explainers grouped, in GROUP_ORDER, for the /learn index. */
export function explainersByGroup(): { group: ExplainerGroup; items: Explainer[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    items: ENTRIES.filter((e) => e.group === group),
  })).filter((g) => g.items.length > 0);
}
