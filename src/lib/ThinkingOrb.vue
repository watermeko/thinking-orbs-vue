<script setup lang="ts">
// The ThinkingOrb component (Vue 3 port).
//
// One shared clock (performance.now) keeps every mounted orb in phase; each
// instance runs its own rAF loop but pauses automatically while offscreen
// (IntersectionObserver) or when the tab is hidden (visibilitychange).
// Reduced-motion users get a static representative frame that still follows
// the live theme.
//
// Ported from thinking-orbs' `src/ThinkingOrb.tsx`. The geometry engine,
// presets, theme resolution and gravity tracker are shared verbatim, so the
// pixels match the React original dot for dot.

import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import type { StyleValue } from 'vue';
import { paintFrame, type OrbTint } from './engine/core';
import { scaleCounts, scaleRadii } from './engine/profiles';
import { MODE_FRAMES } from './engine/registry';
import { attachGravity } from './gravity';
import { resolvePreset } from './presets';
import { useReducedMotion, useResolvedDark } from './theme';
import type { ModeOpts } from './engine/profiles';
import type { ModeFrame } from './engine/types';
import type { GravityOptions } from './gravity';
import type { OrbSize, OrbState, OrbTheme } from './types';

defineOptions({ name: 'ThinkingOrb', inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    state?: OrbState;
    size?: OrbSize;
    theme?: OrbTheme;
    speed?: number;
    paused?: boolean;
    color?: string;
    dots?: number;
    dotSize?: number;
    opts?: ModeOpts;
    frame?: ModeFrame;
    gravity?: boolean | GravityOptions;
    ariaLabel?: string;
    style?: StyleValue;
  }>(),
  {
    state: 'working',
    size: 64,
    theme: 'auto',
    speed: 1,
    paused: false,
    dots: 1,
    dotSize: 1
  }
);

/** Parse a CSS color into an RGB triple for the tinted ink painter.
 *  Supports #rgb, #rrggbb and rgb()/rgba(); anything else -> no tint. */
function parseTint(color: string | undefined): OrbTint | undefined {
  if (!color) return undefined;
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const fn = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
  return undefined;
}

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  listening: 'Listening…',
  connecting: 'Connecting…',
  weaving: 'Weaving…',
  composing: 'Composing…',
  breathing: 'Thinking…',
  shaping: 'Shaping…'
};

const attrs = useAttrs();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const dark = useResolvedDark(() => props.theme, canvasRef);
const reduced = useReducedMotion();

// `opts` / `gravity` are compared by content, so an inline literal in a
// template does not restart the loop (or re-attach gravity) every render.
const optsKey = computed(() => (props.opts ? JSON.stringify(props.opts) : ''));
const gravityKey = computed(() => (props.gravity ? JSON.stringify(props.gravity) : ''));

const canvasStyle = computed<StyleValue>(() => [
  { width: `${props.size}px`, height: `${props.size}px`, display: 'block' },
  props.style ?? {}
]);

const label = computed(() => props.ariaLabel ?? LABELS[props.state]);

// ─── Gravity: the orb pulls the pointer in ────────────────────────────
let detachGravity: (() => void) | undefined;

function syncGravity() {
  detachGravity?.();
  detachGravity = undefined;
  const canvas = canvasRef.value;
  if (!canvas || !props.gravity) return;
  detachGravity = attachGravity(canvas, props.gravity === true ? true : props.gravity);
}

watch(gravityKey, syncGravity);

// ─── Paint loop ───────────────────────────────────────────────────────
let teardown: (() => void) | undefined;

function setup() {
  teardown?.();
  teardown = undefined;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const dpr = Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
  canvas.width = Math.round(props.size * dpr);
  canvas.height = Math.round(props.size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = props.size;
  const isDark = dark.value;
  const { mode, speed: baseSpeed, opts: presetOpts } = resolvePreset(props.state, size);
  // `dots` rescales every count knob of the resolved preset with the same
  // sqrt-paired scaler the presets themselves use, so density changes keep
  // the mode's balance. resolvePreset caches — never mutate its result.
  let opts = props.dots !== 1 ? scaleCounts(presetOpts, Math.max(0.1, props.dots)) : presetOpts;
  if (props.dotSize !== 1) opts = scaleRadii(opts, Math.max(0.1, props.dotSize));
  // raw overrides land last, over everything the preset and multipliers set
  if (props.opts) opts = { ...opts, ...props.opts };
  const frameFn = props.frame ?? MODE_FRAMES[mode];
  const tint = parseTint(props.color);
  const effSpeed = baseSpeed * props.speed;

  const frame = (tSec: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    paintFrame(ctx, frameFn(size, tSec, opts), isDark, tint);
  };

  // reduced motion → one static, deterministic frame
  if (reduced.value) {
    frame(0.6);
    return;
  }

  let raf = 0;
  let running = false;
  const loop = () => {
    frame((performance.now() / 1000) * effSpeed);
    if (running) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running || props.paused) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // draw at least one frame even when paused/offscreen
  frame((performance.now() / 1000) * effSpeed);

  // pause offscreen + on hidden tabs — free when not visible
  let visible = true;
  const io =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && document.visibilityState !== 'hidden') start();
          else stop();
        })
      : null;
  io?.observe(canvas);

  const onVis = () => {
    if (document.visibilityState === 'hidden') stop();
    else if (visible) start();
  };
  document.addEventListener('visibilitychange', onVis);
  if (!io) start();

  teardown = () => {
    stop();
    io?.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}

const renderDeps = computed(
  () =>
    [
      props.state,
      props.size,
      dark.value,
      props.speed,
      props.paused,
      reduced.value,
      props.color,
      props.dots,
      props.dotSize,
      optsKey.value,
      props.frame
    ] as const
);

watch(renderDeps, setup);

onMounted(() => {
  setup();
  syncGravity();
});

onBeforeUnmount(() => {
  teardown?.();
  teardown = undefined;
  detachGravity?.();
  detachGravity = undefined;
});

defineExpose({ LABELS });
</script>

<template>
  <canvas ref="canvasRef" role="img" :aria-label="label" :style="canvasStyle" v-bind="attrs" />
</template>
