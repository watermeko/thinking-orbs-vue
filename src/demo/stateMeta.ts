import { MODE_FRAMES } from '@lib/engine/registry';
import { countDots, scaleCounts, scaleRadii, type ModeOpts } from '@lib/engine/profiles';
import { resolvePreset } from '@lib/presets';
import type { OrbSize, OrbState } from '@lib/types';

export interface StateMeta {
  state: OrbState;
  verb: string;
  blurb: string;
}

/** The nine states, verb-first, in the order the upstream demo lists them. */
export const STATE_META: readonly StateMeta[] = [
  { state: 'working', verb: 'Working', blurb: 'Particles ride a dozen tilted orbits around an empty core.' },
  { state: 'searching', verb: 'Searching', blurb: 'A scan meridian sweeps a dotted globe, dot by dot.' },
  { state: 'solving', verb: 'Solving', blurb: 'Bands scramble in quarter turns, then click back solved.' },
  { state: 'listening', verb: 'Listening', blurb: 'A waveform rolls through the latitude rings.' },
  { state: 'connecting', verb: 'Connecting', blurb: 'A constellation wires itself, packets running the edges.' },
  { state: 'weaving', verb: 'Weaving', blurb: 'Three strands plait pole to pole around the sphere.' },
  { state: 'composing', verb: 'Composing', blurb: 'An undulating multi-band sash rides a great circle.' },
  { state: 'breathing', verb: 'Breathing', blurb: 'A face-on ring slowly morphs, in and out of round.' },
  { state: 'shaping', verb: 'Shaping', blurb: 'A dotted outline morphs circle → triangle → square.' }
];

/** The same `dots` / `dotSize` / `opts` scaling the component applies. */
export function resolveOpts(
  state: OrbState,
  size: OrbSize,
  dots = 1,
  dotSize = 1,
  optsOverride?: ModeOpts
): { mode: string; speed: number; opts: ModeOpts } {
  const { mode, speed, opts: presetOpts } = resolvePreset(state, size);
  // resolvePreset caches — never mutate its result
  let opts = dots !== 1 ? scaleCounts(presetOpts, Math.max(0.1, dots)) : presetOpts;
  if (dotSize !== 1) opts = scaleRadii(opts, Math.max(0.1, dotSize));
  if (optsOverride) opts = { ...opts, ...optsOverride };
  return { mode, speed, opts };
}

/**
 * Dots a resolved profile draws per frame.
 *
 * `countDots` sums the count knobs, which is right for eight of the nine
 * modes. `shaping` has no count knob — its density is `iconD`, a multiplier
 * the morph mode turns into `max(6, round(34 * iconD))` dots — so `countDots`
 * reports 0 for it. Mirror that formula here so the readout is honest.
 */
export function dotsPerFrame(state: OrbState, opts: ModeOpts): number {
  if (state === 'shaping') return Math.max(6, Math.round(34 * (opts.iconD ?? 1)));
  return countDots(opts);
}

/** Mean geometry time per frame, in ms — pure math, no canvas. */
export function benchFrame(state: OrbState, size: OrbSize, opts: ModeOpts, runs = 60): number {
  const { mode } = resolvePreset(state, size);
  const fn = MODE_FRAMES[mode as keyof typeof MODE_FRAMES];
  fn(size, 0, opts);
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn(size, i * 0.0163, opts);
  return (performance.now() - t0) / runs;
}
