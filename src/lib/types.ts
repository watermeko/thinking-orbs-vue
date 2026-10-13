import type { StyleValue } from 'vue';
import type { ModeOpts } from './engine/profiles';
import type { ModeFrame } from './engine/types';
import type { GravityOptions } from './gravity';

/**
 * The nine shipped states — each a hand-tuned animation:
 * - `working`    — particles on tilted orbits
 * - `searching`  — a scan meridian sweeps a dotted globe
 * - `solving`    — bands scramble in quarter turns, then click back
 * - `listening`  — a waveform rolls through latitude rings
 * - `connecting` — a constellation wires itself, packets running the edges
 * - `weaving`    — three strands plait around the sphere
 * - `composing`  — an undulating multi-band sash
 * - `breathing`  — a face-on ring slowly morphing
 * - `shaping`    — a dotted outline morphs circle → triangle → square
 */
export type OrbState =
  | 'working'
  | 'searching'
  | 'solving'
  | 'listening'
  | 'connecting'
  | 'weaving'
  | 'composing'
  | 'breathing'
  | 'shaping';

/** Every state, in presentation order. */
export const ORB_STATES: readonly OrbState[] = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'shaping'
];

/**
 * Rendered size in CSS pixels — **any number**, not a fixed set.
 *
 * The engine's geometry is continuous in `size` (every mode lays its dots out
 * as fractions of the frame), so a size only has to pick the *tuning*: the dot
 * count, dot radius multiplier and speed that make the mark read well at that
 * scale. `64` (chat-avatar scale) and `20` (inline-text scale) are the two
 * hand-tuned anchors; every other size is the log-space law between them
 * (see `interpolatePreset`), which is exactly how the shipped `32` was made.
 *
 * Practical notes:
 * - `12`–`256` is the supported range (`clampSize`); below ~14px dots hit the
 *   sub-pixel floor and read as a blob, and above ~256px they are wasted.
 * - Between 20 and 64 the law is validated by `32`. Outside it the same law
 *   extrapolates (measured ink density stays in a 0.07–0.17 band), but the
 *   largest mode keeps its tuned look to about 128–160px, after which dot
 *   radii sit on the 0.3px floor — nudge `dotSize` there if you want bolder
 *   dots.
 * - Counts round to whole dots, so resizing shows discrete density steps
 *   rather than a smooth scale — and where `ring` / `ribbon` multiply their
 *   rounded lane count by a `bandMul` that is tuned *down* as the orb grows,
 *   crossing an integer can dip the density by up to ~10% for one pixel of
 *   size. It never collapses. To animate scale smoothly, keep one `size` and
 *   animate a CSS transform.
 */
export type OrbSize = number;

/** The sizes that were hand-tuned (or, for 32, verified against the law). */
export const TUNED_SIZES = [64, 32, 20] as const;

/** A hand-tuned preset size. */
export type TunedSize = (typeof TUNED_SIZES)[number];

/**
 * Theme mode.
 *
 * - `auto` (default) resolves in three layers, live-updating on change:
 *   1. a `data-theme="dark|light"` attribute or `dark`/`light` class on
 *      any ancestor (the Tailwind / shadcn convention), watched via
 *      `MutationObserver`;
 *   2. otherwise `matchMedia('(prefers-color-scheme: dark)')`,
 *      subscribed for live OS/browser theme switches;
 *   3. during SSR (no DOM) the first client render resolves the theme
 *      before anything is painted — the canvas is client-only.
 * - `dark` / `light` pin the palette regardless of context.
 *
 * Dark renders light ink on the transparent canvas (for dark
 * backgrounds); light renders dark ink (for light backgrounds).
 */
export type OrbTheme = 'auto' | 'dark' | 'light';

/** Props for the ThinkingOrb Vue component. */
export interface ThinkingOrbProps {
  /** Which animation to show. @default 'working' */
  state?: OrbState;

  /** Tuned size preset — 64 or 20 are hand-tuned, 32 is verified, anything
   *  else (12–256) is the log-space law between the two anchors.
   *  @default 64 */
  size?: OrbSize;

  /** Theme mode; `auto` detects from the host project. @default 'auto' */
  theme?: OrbTheme;

  /**
   * Animation speed multiplier on top of the preset's baked speed.
   * @default 1
   */
  speed?: number;

  /** Freeze the animation on the current frame. @default false */
  paused?: boolean;

  /**
   * Optional ink tint — any `#rgb`, `#rrggbb` or `rgb()` color. The orb's
   * depth-shading ramp is preserved on the tint (fading toward black on
   * dark substrates, toward white on light ones), so colored orbs read
   * with the same 3D language as the grayscale default. Omit for the
   * stock grayscale ink.
   */
  color?: string;

  /**
   * Density multiplier for the mode's dot/strand/node counts, applied with
   * the same paired-count scaler the size presets use so the mode keeps
   * its balance. `1` (default) is the tuned look; `0.5` halves density,
   * `2` doubles it. Clamped to a 0.1 floor.
   */
  dots?: number;

  /**
   * Radius multiplier for every dot, applied with the same scaler the size
   * presets use so near/far falloff keeps its proportion. `1` (default) is
   * the tuned mark; `0.7` reads finer, `1.5` bolder.
   */
  dotSize?: number;

  /**
   * Advanced: raw draw options merged over the resolved preset, last. These
   * are the engine's own knobs, so they reach past the tuned surface — the
   * orbit paths' `ghostA` and `particles` (working), the globe's `scanMul`
   * and `dimBase` (searching), the constellation's `thr`, `signals`, `lineW`
   * and `spread` (connecting), the plait's `turns` (weaving), the sash's
   * `wobMul`, `bandMul` and `spin` (composing, breathing), and the outline's
   * `spread` and `shape` (shaping — `shape` 0 / 1 / 2 holds the circle,
   * triangle or square instead of cycling). Unknown keys are ignored; a key
   * the current state does not read does nothing.
   */
  opts?: ModeOpts;

  /**
   * Per-frame dot budget. The size law grows a mode's density with the size,
   * and `working` grows *quadratically* (its orbit count and its ghosts-per-
   * orbit both scale), reaching ~15k dots at 256px. When the derived profile
   * would exceed this, the density is scaled back until it fits — the orb
   * stays balanced, it just stops gaining detail. `0` disables the cap.
   * @default 4000
   */
  maxDots?: number;

  /**
   * Escape hatch below `opts`: replace the state's geometry outright. The
   * function gets `(size, t, opts)` and returns the frame to paint — the
   * same contract every built-in mode implements (see `MODE_FRAMES` and the
   * helpers exported alongside it). The painter, theme, tint, pause and
   * offscreen handling all stay the library's.
   */
  frame?: ModeFrame;

  /**
   * Gravity: the orb pulls at the pointer. As the pointer nears, a raster
   * of the platform's cursor is drawn in its place with its body warped
   * toward the orb — the tip stays put, nothing rotates or scales. Needs the
   * platform's real pointer raster (`gravity.sprite`, or
   * `setGravitySprite`) or it stays off; off automatically under reduced
   * motion, forced colours, coarse pointers, zoom, and over anything but
   * the plain arrow. `true` takes the defaults. See gravity.ts.
   */
  gravity?: boolean | GravityOptions;

  /** Overrides the per-state default `aria-label`. */
  ariaLabel?: string;

  /** Inline styles merged onto the canvas (width/height are set from `size`). */
  style?: StyleValue;
}
