import { MODE_FRAMES } from '@lib/engine/registry';
import type { ModeOpts } from '@lib/engine/profiles';
import type { ModeKey } from '@lib/presets';
import { resolveDrawOptions, type DrawOptionsInput, type ResolvedDraw } from '@lib/tuning';
import type { OrbState } from '@lib/types';

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

/**
 * Resolve a profile exactly the way the component does — the library's own
 * pipeline, so the demo's readout can never drift from the painted pixels.
 */
export function resolveOrb(
  state: OrbState,
  size: number,
  input: DrawOptionsInput = {}
): ResolvedDraw {
  return resolveDrawOptions(state, size, input);
}

/** Mean geometry time per frame, in ms — pure math, no canvas. */
export function benchFrame(mode: ModeKey, size: number, opts: ModeOpts, runs = 60): number {
  const fn = MODE_FRAMES[mode];
  fn(size, 0, opts);
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn(size, i * 0.0163, opts);
  return (performance.now() - t0) / runs;
}
