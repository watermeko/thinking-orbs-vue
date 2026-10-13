// The draw-profile pipeline: (state, size) → finished draw options.
//
// `presets.ts` answers "what does the size law say at this size"; this module
// applies everything a caller layers on top of it — the `dots` density
// multiplier, the `dotSize` radius multiplier, raw `opts` overrides — and caps
// the result with a per-frame dot budget.
//
// It exists so the component and every other consumer (`thinking-orbs-vue/engine`,
// the demo's readout and benchmark) resolve a profile through exactly the same
// order of operations instead of each re-deriving it.

import { BASE_PROFILES, scaleCounts, scaleRadii, type ModeOpts } from './engine/profiles';
import { MODE_FRAMES } from './engine/registry';
import { clampSize, presetFor, STATE_TO_MODE, type ModeKey, type Preset } from './presets';
import type { OrbState } from './types';

/**
 * Default per-frame dot budget.
 *
 * The size law grows a mode's density with its size. For eight of the nine
 * modes that growth is roughly linear in the dot total; for `working`
 * (`orbits`) it is *quadratic*, because `orbitN` and `ghostN` are independent
 * counts and both scale — 516 dots at 64px, ~2.7k at 128px, ~15k at 256px,
 * ~82k at 512px. When a profile would exceed this budget the density is scaled
 * back until the measured frame fits, so an arbitrarily large orb stays inside
 * a sane frame cost. The orb keeps its balance; it just stops gaining detail.
 * `0` disables the cap.
 */
export const DOT_BUDGET = 4000;

/** How far the budget may scale a profile's density back. */
const COUNT_FLOOR = 0.05;

/** Floor on the caller's own density / radius multipliers (upstream's 0.1). */
const MUL_FLOOR = 0.1;

/** Bisection steps for the budget fit — resolution is 20^(1/2^7) ≈ 1.02×. */
const FIT_STEPS = 7;

export interface DrawOptionsInput {
  /** Density multiplier on top of the size law. @default 1 */
  dots?: number;
  /** Radius multiplier for every dot. @default 1 */
  dotSize?: number;
  /** Raw engine knobs, merged last. @default undefined */
  opts?: ModeOpts;
  /** Per-frame dot budget; `0` disables it. @default DOT_BUDGET */
  maxDots?: number;
}

export interface ResolvedDraw {
  mode: ModeKey;
  /** Speed baked for this (state, size) — multiply by the clock. */
  speed: number;
  /** Finished draw options, ready for a frame function. */
  opts: ModeOpts;
  /** The size used, after clamping. */
  size: number;
  /** Dots a frame draws with this profile, measured (not estimated). */
  dotCount: number;
  /** Effective total density multiplier: `dots` × any budget shrink. */
  density: number;
  /** Effective radius multiplier: the size law's `size` knob × `dotSize`. */
  radius: number;
  /** Whether the dot budget scaled the density back. */
  capped: boolean;
}

/** The preset a (state, size) pair resolves to, before any caller multipliers. */
export function presetAt(state: OrbState, size: number): Preset {
  return presetFor(STATE_TO_MODE[state], clampSize(size));
}

/**
 * Resolve a (state, size) pair into a finished draw profile.
 *
 * Order of operations, unchanged from the component's original pipeline: the
 * size law's count and radius multipliers, the mode's `extra` knobs, then
 * `dots`, then `dotSize`, then raw `opts` last — so overrides always win.
 *
 * The dot budget is enforced on the **measured** frame rather than on a
 * formula. Every count knob rounds to whole dots and each mode assembles them
 * differently — a lat/lon grid draws fewer dots near its poles, `ribbon`
 * multiplies its lane count by `bandMul` at draw time, `braid` lays three
 * strands, `morph` has no count knob at all — so the only honest count is the
 * frame's own. (Upstream's `countDots` sums the count knobs, which is a 15×
 * under-estimate for `orbits` and an over-estimate for the grids.) Dot count
 * is independent of the clock for every mode, so one frame at `t = 0` settles
 * it, and because rounding makes this a step function rather than a scale, the
 * fit is a bisection over the density multiplier.
 */
export function resolveDrawOptions(state: OrbState, size: number, input: DrawOptionsInput = {}): ResolvedDraw {
  const s = clampSize(size);
  const mode = STATE_TO_MODE[state];
  const preset = presetFor(mode, s);

  const density = Math.max(MUL_FLOOR, input.dots ?? 1);
  const dotScale = Math.max(MUL_FLOOR, input.dotSize ?? 1);
  const budget = input.maxDots == null ? DOT_BUDGET : Math.max(0, input.maxDots);

  const build = (budgetMul: number): ModeOpts => {
    let opts: ModeOpts = { ...BASE_PROFILES[mode] };
    if (preset.count !== 1) opts = scaleCounts(opts, preset.count);
    // the size law's radius multiplier, before the caller's own `dotSize` —
    // two separate scaler calls, exactly as upstream applied them
    if (preset.size !== 1) opts = scaleRadii(opts, preset.size);
    if (preset.extra) opts = { ...opts, ...preset.extra };
    const count = density * budgetMul;
    if (count !== 1) opts = scaleCounts(opts, count);
    if (dotScale !== 1) opts = scaleRadii(opts, dotScale);
    if (input.opts) opts = { ...opts, ...input.opts };
    return opts;
  };

  const measure = (budgetMul: number): { opts: ModeOpts; dots: number } => {
    const opts = build(budgetMul);
    return { opts, dots: MODE_FRAMES[mode](s, 0, opts).dots.length };
  };

  let best = measure(1);
  let budgetMul = 1;

  if (budget > 0 && best.dots > budget) {
    const floor = measure(COUNT_FLOOR);
    if (floor.dots > budget) {
      // nothing left to give: every count knob is already at its floor
      best = floor;
      budgetMul = COUNT_FLOOR;
    } else {
      let lo = COUNT_FLOOR; // known to fit
      let hi = 1; // known not to
      let fit = floor;
      let fitMul = COUNT_FLOOR;
      for (let i = 0; i < FIT_STEPS; i++) {
        const mid = Math.sqrt(lo * hi);
        const cand = measure(mid);
        if (cand.dots <= budget) {
          fit = cand;
          fitMul = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      best = fit;
      budgetMul = fitMul;
    }
  }

  return {
    mode,
    speed: preset.speed,
    opts: best.opts,
    size: s,
    dotCount: best.dots,
    density: density * budgetMul,
    radius: preset.size * dotScale,
    capped: budgetMul < 1 - 1e-9
  };
}
