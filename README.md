# thinking-orbs-vue

Dotted thought-orb loading indicators for AI & agent UIs — **Vue 3 port of
[`thinking-orbs`](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs)**.

Nine hand-tuned animated states, three tuned sizes, rendered on a plain 2D
canvas — no WebGL, no filters, identical pixels in Chrome, Safari and Firefox.

---

## Quick start

```bash
npm install
npm run dev        # live demo → http://127.0.0.1:5173
```

```vue
<script setup lang="ts">
import { ThinkingOrb } from 'thinking-orbs-vue';
</script>

<template>
  <ThinkingOrb state="searching" :size="64" />
</template>
```

Or drive your own renderer with the Vue-free engine:

```ts
import { MODE_FRAMES, resolvePreset } from 'thinking-orbs-vue/engine';

const { mode, speed, opts } = resolvePreset('searching', 64);
const { dots, lines } = MODE_FRAMES[mode](64, elapsedSeconds * speed, opts);
// dots: { x, y, z, r, white, a }[] — already z-sorted into draw order
```

## States

Nine verbs an agent can be doing, each a distinct animation:

| state | engine mode | what it does |
|---|---|---|
| `working` | `orbits` | particles on tilted orbits |
| `searching` | `globe` | a scan meridian sweeps a dotted globe |
| `solving` | `rubik` | bands scramble in quarter turns, then click back solved |
| `listening` | `wave` | a waveform rolls through the latitude rings |
| `connecting` | `web` | a constellation wires itself, packets running the edges |
| `weaving` | `braid` | three strands plait around the sphere |
| `composing` | `ribbon` | an undulating multi-band sash |
| `breathing` | `ring` | a face-on ring slowly morphing |
| `shaping` | `morph` | a dotted outline morphs circle → triangle → square |

## Sizes

`64` (chat-avatar scale) and `20` (inline-text scale) are separate designs, not
a scale factor — each carries its own dot count, dot size and speed. `32`
(compact avatar) sits between them, interpolated in log space; it reads
correctly but has not had a tuning pass of its own.

```vue
<ThinkingOrb state="working" :size="64" />
<ThinkingOrb state="working" :size="20" />
```

The canvas is `display: block` out of the box (as upstream). For inline prose,
override it on the `style` prop:

```vue
<ThinkingOrb state="working" :size="20" :style="{ display: 'inline-block', verticalAlign: '-4px' }" />
```

## Theme

Strictly monochrome — light ink for dark backgrounds, dark ink for light
backgrounds — with the mode picked automatically from the host project:

```vue
<ThinkingOrb theme="auto" />   <!-- default — detects from the project -->
<ThinkingOrb theme="dark" />   <!-- pin: light dots for dark backgrounds -->
<ThinkingOrb theme="light" />  <!-- pin: dark dots for light backgrounds -->
```

`auto` resolves in three layers and updates live when any of them change:

1. an ancestor `data-theme="dark|light"` attribute or `dark`/`light` class (the
   Tailwind / shadcn convention), watched via `MutationObserver`;
2. otherwise `prefers-color-scheme`, subscribed for live OS theme switches;
3. SSR-safe — the canvas paints only on the client, after the theme resolves.

## Props

| prop | type | default | notes |
|---|---|---|---|
| `state` | `OrbState` | `'working'` | one of the nine states |
| `size` | `64 \| 32 \| 20` | `64` | tuned preset, not a scale factor |
| `theme` | `'auto' \| 'dark' \| 'light'` | `'auto'` | live-resolved |
| `speed` | `number` | `1` | multiplier on the preset's baked speed |
| `paused` | `boolean` | `false` | freeze on the current frame |
| `dots` | `number` | `1` | density multiplier (paired counts scale by √) |
| `dotSize` | `number` | `1` | radius multiplier for every dot |
| `color` | `string` | — | optional ink tint; depth ramp preserved |
| `opts` | `ModeOpts` | — | advanced: the engine's own knobs, merged last |
| `frame` | `ModeFrame` | — | escape hatch: replace the geometry outright |
| `gravity` | `boolean \| GravityOptions` | `false` | the orb pulls at the pointer¹ |
| `ariaLabel` | `string` | per state | template `aria-label` binds here |
| `style` | `StyleValue` | — | merged onto the canvas |

¹ Gravity needs the platform's real pointer raster (`gravity.sprite` or
`setGravitySprite`) — without one the effect stays off, and it is disabled
automatically under reduced motion, forced colours, coarse pointers and zoom.

Every other attribute (`class`, `data-*`, listeners, …) falls through to the
`<canvas>`.

All props are reactive: changing `state`, `size`, `speed`, `paused`, `color`,
`dots`, `dotSize`, `opts` or the resolved theme rebuilds the paint loop in
place.

## Exports

```ts
import {
  ThinkingOrb,                       // the component
  ORB_STATES, ORB_SIZES,             // the nine states, the three sizes
  resolvePreset, STATE_TO_MODE,      // (state, size) → { mode, speed, opts } — cached
  MODE_FRAMES, MODE_DRAWS,           // pure geometry / canvas painters
  paintFrame, finalizeFrame,         // frame painting + the z-sort/clamp step
  countDots, scaleCounts, scaleRadii, BASE_PROFILES,
  makeProj, fibDir, hashD, vnoise,   // the geometry toolkit the modes are written with
  useResolvedDark, useReducedMotion, // the composables, standalone
  attachGravity, setGravitySprite, GRAVITY_DEFAULTS,
} from 'thinking-orbs-vue';
```

## Accessibility & performance

- `role="img"` with a sensible per-state `aria-label` out of the box.
- `prefers-reduced-motion: reduce` renders a static representative frame — no
  animation — and still follows the live theme.
- Every instance pauses automatically when scrolled offscreen
  (`IntersectionObserver`) or when the tab is hidden, and resumes in phase — all
  instances share one clock (`performance.now`).
- Plain 2D canvas arcs only: no `ctx.filter`, no SVG filters, no WebGL. Device
  pixel ratio capped at 2.
- The demo page mounts **43 live orbs** at once; every canvas paints, and the
  UI check below asserts it.

## Verification

Two independent checks, both runnable against a local dev server.

```bash
npm run test:parity   # geometry vs. the upstream golden vectors
npm run verify:ui     # mounts the demo headless and drives it via CDP
npm run verify        # both
```

**`test:parity`** replays every frozen case in `spec/orbs-golden.json` — the
file the upstream repo generates for its SwiftUI port — through this port's
engine and diffs position, radius, ink and alpha per dot, plus the resolved
presets per (state, size):

```
parity: thinking-orbs@0.3.1 → thinking-orbs-vue

  golden cases      72
  presets checked   18
  values compared   70115 (67728 dot + 2387 line)
  dots / edges      11288 / 341
  worst delta       5.00e-7 (tolerance 0.0001)

PASS — geometry matches the React original.
```

**`verify:ui`** launches the local Chromium headless, drives the demo over the
DevTools Protocol (no test dependencies — Node's global `WebSocket` + `fetch`),
and asserts: 43 canvases mount and every one paints ink; `role="img"` +
per-state labels everywhere; the hero chips, playground state select, size
seg, `opts.shape` escape hatch, `paused`, and the dots slider all re-render
live; and pinning `data-theme` on `<html>` flips every orb's ink.

## Project layout

```
src/lib/                 the Vue port (this is the library)
  ThinkingOrb.vue        the component: canvas + loop + theme + a11y
  theme.ts               useResolvedDark / useReducedMotion composables
  types.ts               OrbState / OrbSize / OrbTheme / props
  presets.ts             (state, size) → mode + scaled opts  ← shared verbatim
  gravity.ts             document-level pointer tracker        ← shared verbatim
  engine/                9 mode painters, profiles, registry    ← shared verbatim
src/demo/                the live demo app (hero, gallery, playground, agent mock)
scripts/parity.ts        golden-vector check
scripts/verify-ui.mjs    headless CDP interaction + a11y check
spec/orbs-golden.json    upstream golden vectors (MIT, © Jakub Antalik)
```

Everything under `src/lib/engine/`, plus `presets.ts` and `gravity.ts`, is the
upstream TypeScript **unchanged** — that is what makes the parity check a
one-line assertion instead of a visual judgement.

## Vue vs. React API

| | React | Vue |
|---|---|---|
| component | `<ThinkingOrb />` | `<ThinkingOrb />` (SFC) |
| label | `aria-label` | `aria-label` (binds to the `ariaLabel` prop) |
| theme resolution | `useResolvedDark` hook | `useResolvedDark` composable |
| reduced motion | `useReducedMotion` hook | `useReducedMotion` composable |
| inline runtime | `style` object | `style` object or string |
| engine import | `thinking-orbs/engine` | `thinking-orbs-vue/engine` |

Behaviour is otherwise identical, including DPR capping, offscreen pausing,
shared-clock phase, the content-compared `opts`/`gravity` objects (inline
literals do not restart the loop), and SSR safety.

## Build

```bash
npm run build        # the demo app → dist/
npm run build:lib    # the library → dist-lib/ (ESM + CJS + .d.ts, engine subpath)
npm run typecheck    # vue-tsc, both projects
```

## License

MIT. Original `thinking-orbs` © Jakub Antalik —
[live demo](https://libraries.dev/orbs). Vue port © the port's contributors.
See [LICENSE](./LICENSE).
