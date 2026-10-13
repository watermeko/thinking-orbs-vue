<script setup lang="ts">
// The playground: size is a continuous number here, not a three-item menu —
// the same log-space law that produced the shipped 32 fills in everything else.

import { ThinkingOrb } from '@lib';
import type { ModeOpts } from '@lib/engine/profiles';
import type { ModeKey } from '@lib/presets';
import { SIZE_MIN, SIZE_MAX } from '@lib/presets';
import { TUNED_SIZES, ORB_STATES, type OrbState } from '@lib/types';
import { computed, ref, watch } from 'vue';
import { benchFrame, resolveOrb, STATE_META } from './stateMeta';
import type { ThemeMode } from './theme-mode';
import CodeBlock from './CodeBlock.vue';
import ThemeToggle from './ThemeToggle.vue';

const themeMode = defineModel<ThemeMode>('themeMode', { required: true });

const state = ref<OrbState>('solving');
const size = ref<number>(64);
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

/** Exactly the profile the component will paint, budget included. */
const resolved = computed(() =>
  resolveOrb(state.value, size.value, {
    dots: dots.value,
    dotSize: dotSize.value,
    opts: optsOverride.value
  })
);

const bench = ref(0);
watch(
  resolved,
  (r) => {
    bench.value = benchFrame(r.mode as ModeKey, r.size, r.opts, 40);
  },
  { immediate: true }
);

const blurb = computed(() => STATE_META.find((m) => m.state === state.value)?.blurb ?? '');
const color = computed(() => (tinted.value ? tint.value : undefined));
const stageHeight = computed(() => Math.max(220, resolved.value.size + 96) + 'px');

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
        <label for="pg-size"><span>size</span><b>{{ size }}px</b></label>
        <input
          id="pg-size"
          v-model.number="size"
          type="range"
          :min="SIZE_MIN"
          :max="SIZE_MAX"
          step="1"
          aria-label="Rendered size in CSS pixels"
        />
        <div class="seg">
          <button
            v-for="s in TUNED_SIZES"
            :key="s"
            type="button"
            :aria-pressed="size === s"
            @click="size = s"
          >
            {{ s }}
          </button>
        </div>
        <p class="mute micro">
          any value {{ SIZE_MIN }}–{{ SIZE_MAX }}; the three buttons jump to the hand-tuned
          presets
        </p>
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
      <div class="preview-stage" :style="{ minHeight: stageHeight }">
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
          <span class="tiny mute">mode</span>
          <b>{{ resolved.mode }}</b>
        </div>
        <div>
          <span class="tiny mute">dots/frame</span>
          <b
            >{{ resolved.dotCount }}<em v-if="resolved.capped" class="capped">capped</em></b
          >
        </div>
        <div>
          <span class="tiny mute">density</span>
          <b>{{ resolved.density.toFixed(3) }}</b>
        </div>
        <div>
          <span class="tiny mute">radius</span>
          <b>{{ resolved.radius.toFixed(3) }}</b>
        </div>
        <div>
          <span class="tiny mute">speed</span>
          <b>{{ resolved.speed.toFixed(3) }}</b>
        </div>
        <div>
          <span class="tiny mute">geometry</span>
          <b>{{ bench.toFixed(2) }} ms</b>
        </div>
      </div>

      <p class="mute hint">
        {{ blurb }} Each size resolves its own density, radius and speed through the log-space law
        between the 64 and 20 anchors — no snapping, no fixed menu.
      </p>

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

.micro {
  font-size: 11.5px;
  line-height: 1.45;
}

.readout .tiny {
  white-space: nowrap;
}

.readout b {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.capped {
  font-style: normal;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 1px 6px;
}
</style>
