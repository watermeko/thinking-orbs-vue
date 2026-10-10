// thinking-orbs-vue — public entry point.
//
// The Vue 3 port of `thinking-orbs` (https://libraries.dev/orbs, MIT ©
// Jakub Antalik). Same engine, same presets, same theme auto-detection,
// same gravity tracker — a `<ThinkingOrb>` SFC in place of the React one.

export { default as ThinkingOrb } from './ThinkingOrb.vue';

export {
  ORB_SIZES,
  ORB_STATES,
  type ThinkingOrbProps,
  type OrbState,
  type OrbSize,
  type OrbTheme
} from './types';

export { useResolvedDark, useReducedMotion } from './theme';

// Power-user surface: the resolved presets + raw frame painters, for
// consumers driving their own canvas outside Vue.
export { resolvePreset, STATE_TO_MODE, type ModeKey, type Resolved, type Preset, PRESETS } from './presets';
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
