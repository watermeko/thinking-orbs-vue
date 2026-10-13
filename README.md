# thinking-orbs-vue

Dotted thought-orb loading indicators for AI & agent UIs — **Vue 3 port of
[`thinking-orbs`](https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs)**.

Nine hand-tuned animated states at **any size** (12–256px, the shipped
`64` / `32` / `20` included), rendered on a plain 2D canvas — no WebGL, no
filters, identical pixels in Chrome, Safari and Firefox.

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

## Sizes — any number, not a three-item menu

```tsx
<ThinkingOrb state="working" :size="64" />
<ThinkingOrb state="working" :size="47" />   <!-- any value, 12–256 -->
```

`64` (chat-avatar scale) and `20` (inline-text scale) are the hand-tuned
anchors. **Every other size is derived**: the dot count, dot radius multiplier
and speed interpolate between the two anchors in log space, because those knobs
are ratios. That is not a new invention — it is exactly how the shipped `32`
was made:

```
value(s) = v₆₄ · (v₂₀ / v₆₄) ^ t(s)        t(s) = ln(s/64) / ln(20/64)
```

`npm run test:sizes` checks the law against all nine shipped `32` rows and
reproduces them to 4.8e-4 relative — the table's own four-significant-digit
rounding. So `64` / `32` / `20` keep their hand-tuned values bit-for-bit, and
everything else is the same curve evaluated off the anchors, in both
directions.

| size | `working` dots / mean radius | `searching` dots / mean radius |
|---|---|---|
| 20 | 39 / 0.545px | 54 / 0.522px |
| 64 | 516 / 0.387px | 204 / 0.691px |
| 128 | 2,716 / 0.333px | 466 / 0.825px |
| 256 | 14,784 / 0.305px | 1,034 / 0.989px |

The ink density (Σr² over the orb's area) stays inside a 0.07–0.17 band across
that whole range, so a large orb reads like the same object, not a different
one.

Caveats, measured rather than guessed:

- **Range.** `12`–`256` px. Below ~14px dots sit on the 0.3px sub-pixel floor;
above ~256px the extra dots buy nothing. `size` is clamped, and snapped to a
whole number of device pixels so it never renders soft.
- **The largest mode stops gaining detail.** `working` grows *quadratically*
(its orbit count and its ghosts-per-orbit both scale: 516 dots at 64px → ~15k at
256px → ~82k at 512px). A per-frame dot budget applies above that — see
`maxDots`.
- **Counts quantise.** Knobs round to whole dots, and `ring` / `ribbon`
multiply their rounded lane count by a `bandMul` that is tuned *down* as the orb
grows, so where `round(lanes · bandMul)` crosses an integer the density wobbles
by up to ~10% for one pixel of size (measured: `composing` 9.6% at 25px,
`breathing` 9.5% at 42px). It never collapses. To animate scale smoothly,
keep one `size` and animate a CSS transform instead of the prop.

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
| `size` | `number` | `64` | any value 12–256; 64/32/20 jump to the hand-tuned rows, everything else is the size law |
| `theme` | `'auto' \| 'dark' \| 'light'` | `'auto'` | live-resolved |
| `speed` | `number` | `1` | multiplier on the preset's baked speed |
| `paused` | `boolean` | `false` | freeze on the current frame |
| `dots` | `number` | `1` | density multiplier (paired counts scale by √) |
| `dotSize` | `number` | `1` | radius multiplier for every dot |
| `color` | `string` | — | optional ink tint; depth ramp preserved |
| `opts` | `ModeOpts` | — | advanced: the engine's own knobs, merged last |
| `maxDots` | `number` | `4000` | per-frame dot budget; `0` disables. Only `working` really needs it |
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
  ORB_STATES, TUNED_SIZES,           // the nine states, the three hand-tuned sizes
  resolveDrawOptions,                // (state, size, {dots,dotSize,opts,maxDots}) → finished profile
  resolvePreset, STATE_TO_MODE,      // (state, size) → { mode, speed, opts } — cached, any size
  interpolatePreset, presetFor,      // the size law, if you want it directly
  clampSize, SIZE_MIN, SIZE_MAX,     // 12 / 256, and the clamp between them
  DOT_BUDGET, presetAt,
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

Three independent checks — geometry, the size law, and the live UI.

```bash
npm run test:parity   # geometry vs. the upstream golden vectors
npm run test:sizes    # the size law, 12–256px × 9 states
npm run verify:ui     # mounts the demo headless and drives it via CDP
npm run verify        # all three
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

**`test:sizes`** proves the extension: it re-derives all nine shipped `32`
rows from the two anchors (worst relative delta 4.8e-4, i.e. the table's own
rounding), confirms `64` / `32` / `20` still resolve to *exactly* the
hand-tuned options (252 values compared against upstream's pipeline
transcribed inline), sweeps 11,025 frames across 12–256px checking for NaN,
degenerate frames and out-of-range ink, asserts the dot count grows with size
up to rounding, and proves the budget binds where it is needed:

```
working @256  uncapped 14,784  →  capped 3,795 (budget 4000)
monotone: 7/9 states step-free; rounding wobble: composing 9.6% @25px, breathing 9.5% @42px
11025 frames / 11,302,975 dots, largest 14,784 (uncapped)

PASS — arbitrary sizes hold: 9 modes, 12–256px,
       11025 frames checked, tuned rows untouched, budget enforced.
```

**`verify:ui`** launches the local Chromium headless, drives the demo over the
DevTools Protocol (no test dependencies — Node's global `WebSocket` + `fetch`),
and asserts 17 things: 43 canvases mount and every one paints ink; `role="img"`
+ per-state labels everywhere; the hero chips, playground state select, size
buttons, arbitrary size slider (`47px`, `16px`, `113px` all resize the backing
store and keep painting), `opts.shape` escape hatch, `paused`, and the dots
slider all re-render live; the budget caps `working` at 256px and releases at
64px; and pinning `data-theme` on `<html>` flips every orb's ink.

## Project layout

```
src/lib/                 the Vue port (this is the library)
  ThinkingOrb.vue        the component: canvas + loop + theme + a11y
  theme.ts               useResolvedDark / useReducedMotion composables
  tuning.ts              size law + dots/dotSize + dot budget → draw profile
  types.ts               OrbState / OrbSize / OrbTheme / props
  presets.ts             three tuned rows + the log-space size law
  gravity.ts             document-level pointer tracker        ← shared verbatim
  engine/                9 mode painters, profiles, registry    ← shared verbatim
src/demo/                the live demo app (hero, gallery, playground, agent mock)
scripts/parity.ts        golden-vector check
scripts/size-law.ts      arbitrary-size + budget checks
scripts/verify-ui.mjs    headless CDP interaction + a11y check
spec/orbs-golden.json    upstream golden vectors (MIT, © Jakub Antalik)
```

Everything under `src/lib/engine/`, plus `gravity.ts`, is the upstream
TypeScript **unchanged** — which is what makes the parity check a one-line
assertion instead of a visual judgement. `presets.ts` is the one shared file
this port extends (upstream's three rows plus the law they imply); the tuned
rows and the options they resolve to are untouched, and `test:sizes` proves it
value by value.

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
