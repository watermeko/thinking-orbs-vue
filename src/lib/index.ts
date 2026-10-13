// thinking-orbs-vue — public entry point.
//
// The Vue 3 port of `thinking-orbs` (https://libraries.dev/orbs, MIT ©
// Jakub Antalik). Same engine, same presets, same theme auto-detection,
// same gravity tracker — a `<ThinkingOrb>` SFC in place of the React one.

export { default as ThinkingOrb } from './ThinkingOrb.vue';

export {
  ORB_STATES,
  TUNED_SIZES,
  type ThinkingOrbProps,
  type OrbState,
  type OrbSize,
  type OrbTheme,
  type TunedSize
} from './types';

export { useResolvedDark, useReducedMotion } from './theme';

// Preset resolution. 64 / 32 / 20 resolve to the hand-tuned rows; any other
// size (12–256) is the log-space law between the two anchors.
export {
  resolvePreset,
  interpolatePreset,
  presetFor,
  anchorT,
  clampSize,
  STATE_TO_MODE,
  SIZE_MIN,
  SIZE_MAX,
  type ModeKey,
  type Resolved,
  type Preset,
  PRESETS
} from './presets';

// The draw-profile pipeline: size law + dots/dotSize multipliers + raw opts +
// the per-frame dot budget, in one place for the component, the demo and any
// consumer driving its own canvas.
export {
  resolveDrawOptions,
  presetAt,
  DOT_BUDGET,
  type DrawOptionsInput,
  type ResolvedDraw
} from './tuning';
export { MODE_DRAWS, MODE_FRAMES } from './engine/registry';
export { countDots, scaleCounts, scaleRadii, BASE_PROFILES } from './engine/profiles';

// The geometry toolkit the built-in modes are written with, so a custom
// `frame` can be built from the same parts.
export {
  finalizeFrame,
  paintFrame,
  paint,
  paintLines,
  makeProj,
  radiusScale,
  fibDir,
  hashD,
  vnoise,
  lerp,
  frac,
  angleDelta,
  type OrbTint
} from './engine/core';
export type { ModeFrame, ModeDraw, ModeOpts, OrbFrame, Dot, Line } from './engine/index';

// Gravity: the orb pulls the pointer in. The sprite has to be the
// platform's real pointer, so the consumer supplies it.
export {
  attachGravity,
  setGravitySprite,
  setGravityConfig,
  getGravityConfig,
  getGravityStatus,
  resetGravity,
  GRAVITY_DEFAULTS
} from './gravity';
export type { GravityOptions, CursorSprite } from './gravity';
