<script setup lang="ts">
// The playground: every public prop wired to a control, with a live readout of
// what the engine is actually doing (resolved mode, dot count, geometry cost).
import { computed, ref, watch } from 'vue';
import { ThinkingOrb } from '@lib';
import type { ModeOpts } from '@lib/engine/profiles';
import { ORB_SIZES, ORB_STATES, type OrbSize, type OrbState } from '@lib/types';
import { benchFrame, dotsPerFrame, resolveOpts, STATE_META } from './stateMeta';
import type { ThemeMode } from './theme-mode';
import ThemeToggle from './ThemeToggle.vue';
import CodeBlock from './CodeBlock.vue';

const themeMode = defineModel<ThemeMode>('themeMode', { required: true });

const state = ref<OrbState>('solving');
const size = ref<OrbSize>(64);
const speed = ref(1.5);
const dots = ref(1);
const dotSize = ref(1);
const tinted = ref(false);
const tint = ref('#8e9bff');
const paused = ref(false);
const shape = ref(-1); // -1 = cycle, 0/1/2 = held circle/triangle/square

const SHAPES = [
  { v: -1, label: 'cycle' },
  { v: 0, label: 'circle' },
  { v: 1, label: 'triangle' },
  { v: 2, label: 'square' }
] as const;

/** The `opts` escape hatch, exercised only where it means something. */
const optsOverride = computed<ModeOpts | undefined>(() =>
  state.value === 'shaping' && shape.value >= 0 ? { shape: shape.value } : undefined
);

const resolved = computed(() => resolveOpts(state.value, size.value, dots.value, dotSize.value, optsOverride.value));

const dotCount = computed(() => dotsPerFrame(state.value, resolved.value.opts));
const bench = ref(0);
watch(
  resolved,
  () => {
    bench.value = benchFrame(state.value, size.value, resolved.value.opts, 40);
  },
  { immediate: true }
);

const blurb = computed(() => STATE_META.find((m) => m.state === state.value)?.blurb ?? '');
const color = computed(() => (tinted.value ? tint.value : undefined));

const snippet = computed(() => {
  const lines: string[] = [`<ThinkingOrb`, `  state="${state.value}"`, `  :size="${size.value}"`];
  if (speed.value !== 1) lines.push(`  :speed="${speed.value}"`);
  if (dots.value !== 1) lines.push(`  :dots="${dots.value}"`);
  if (dotSize.value !== 1) lines.push(`  :dot-size="${dotSize.value}"`);
  if (tinted.value) lines.push(`  color="${tint.value}"`);
  if (optsOverride.value) lines.push(`  :opts="{ shape: ${shape.value} }"`);
  if (paused.value) lines.push(`  paused`);
  lines.push(`/>`);
  return lines.join('\n');
});
</script>

<template>
  <div class="playground card">
    <div class="controls">
      <div class="field">
        <span class="field-label"><span>state</span></span>
        <select v-model="state">
          <option v-for="s in ORB_STATES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="field">
        <span class="field-label"><span>size preset</span></span>
        <div class="seg">
          <button
            v-for="s in ORB_SIZES"
            :key="s"
            type="button"
            :aria-pressed="size === s"
            @click="size = s"
          >
            {{ s }}px
          </button>
        </div>
      </div>

      <div class="field">
        <label for="pg-speed"><span>speed</span><b>{{ speed.toFixed(2) }}×</b></label>
        <input id="pg-speed" v-model.number="speed" type="range" min="0" max="3" step="0.05" />
      </div>

      <div class="field">
        <label for="pg-dots"><span>dots (density)</span><b>{{ dots.toFixed(2) }}×</b></label>
        <input id="pg-dots" v-model.number="dots" type="range" min="0.2" max="2" step="0.05" />
      </div>

      <div class="field">
        <label for="pg-dotsize"><span>dot size</span><b>{{ dotSize.toFixed(2) }}×</b></label>
        <input id="pg-dotsize" v-model.number="dotSize" type="range" min="0.4" max="2" step="0.05" />
      </div>

      <div v-if="state === 'shaping'" class="field">
        <span class="field-label"><span>opts.shape</span></span>
        <div class="seg">
          <button
            v-for="s in SHAPES"
            :key="s.v"
            type="button"
            :aria-pressed="shape === s.v"
            @click="shape = s.v"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="field row-inline">
        <label class="switch"><input v-model="tinted" type="checkbox" /> color tint</label>
        <input v-if="tinted" v-model="tint" type="color" aria-label="Ink tint" />
      </div>

      <div class="field row-inline">
        <label class="switch"><input v-model="paused" type="checkbox" /> paused</label>
      </div>

      <div class="field">
        <span class="field-label"><span>theme</span></span>
        <ThemeToggle v-model="themeMode" />
      </div>
    </div>

    <div class="preview">
      <div class="preview-stage">
        <ThinkingOrb
          :state="state"
          :size="size"
          :speed="speed"
          :dots="dots"
          :dot-size="dotSize"
          :color="color"
          :opts="optsOverride"
          :paused="paused"
        />
      </div>

      <div class="readout">
        <div>
          <span class="tiny mute">engine mode</span>
          <b>{{ resolved.mode }}</b>
        </div>
        <div>
          <span class="tiny mute">dots / frame</span>
          <b>{{ dotCount }}</b>
        </div>
        <div>
          <span class="tiny mute">preset speed</span>
          <b>{{ resolved.speed.toFixed(3) }}</b>
        </div>
        <div>
          <span class="tiny mute">geometry</span>
          <b>{{ bench.toFixed(2) }} ms</b>
        </div>
      </div>

      <p class="mute hint">{{ blurb }} Sizes are tuned presets, not a scale factor.</p>

      <CodeBlock :code="snippet" />
    </div>
  </div>
</template>

<style scoped>
.row-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hint {
  font-size: 12.5px;
}
</style>
