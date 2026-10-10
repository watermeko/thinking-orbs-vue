<script setup lang="ts">
// The hero: one live orb on a stage, flip through all nine states by hand or
// let it auto-cycle. Everything below is the library's public surface.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ThinkingOrb } from '@lib';
import { STATE_META } from './stateMeta';
import CodeBlock from './CodeBlock.vue';

const index = ref(0);
const auto = ref(true);
const current = computed(() => STATE_META[index.value]);

let timer = 0;
onMounted(() => {
  timer = window.setInterval(() => {
    if (auto.value) index.value = (index.value + 1) % STATE_META.length;
  }, 2600);
});
onBeforeUnmount(() => window.clearInterval(timer));

function pick(i: number) {
  auto.value = false;
  index.value = i;
}

const snippet = computed(
  () => `<script setup>
import { ThinkingOrb } from 'thinking-orbs-vue'
<\/script>

<template>
  <ThinkingOrb state="${current.value.state}" :size="64" />
</template>`
);
</script>

<template>
  <section class="hero">
    <div class="hero-copy">
      <div class="badges">
        <span class="badge">Vue 3</span>
        <span class="badge">zero runtime deps</span>
        <span class="badge">plain 2D canvas</span>
        <span class="badge">MIT</span>
      </div>
      <h1>thinking&#8209;orbs<span class="dim">, for Vue</span></h1>
      <p class="dim lead">
        Nine hand-tuned dotted thought-orbs for AI &amp; agent UIs — each a distinct verb an agent
        can be doing. Rendered with plain 2D canvas arcs: no WebGL, no filters, identical pixels in
        Chrome, Safari and Firefox.
      </p>
      <p class="mute note">
        A faithful Vue 3 port of
        <a href="https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs" target="_blank" rel="noreferrer"
          >thinking-orbs</a
        >
        by Jakub Antalik. The geometry engine, presets, theme auto-detection and gravity tracker are
        shared verbatim, so the dots land in exactly the same places.
      </p>
      <CodeBlock :code="snippet" />
    </div>

    <div class="hero-stage stage">
      <div class="stage-glow" aria-hidden="true" />
      <div class="stage-orb">
        <ThinkingOrb :state="current.state" :size="64" />
      </div>
      <div class="stage-caption">
        <div class="mono state-name">{{ current.state }}</div>
        <p class="dim state-blurb">{{ current.blurb }}</p>
      </div>
      <div class="chip-row stage-chips">
        <button
          v-for="(m, i) in STATE_META"
          :key="m.state"
          type="button"
          class="chip"
          :aria-pressed="i === index"
          @click="pick(i)"
        >
          {{ m.state }}
        </button>
      </div>
      <button type="button" class="btn ghost stage-toggle" @click="auto = !auto">
        {{ auto ? 'pause cycle' : 'resume cycle' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: 32px;
  align-items: start;
  padding-top: 28px;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
}

.hero-copy {
  display: grid;
  gap: 16px;
  align-content: start;
}

.lead {
  font-size: 16px;
  max-width: 56ch;
}

.note {
  font-size: 13px;
  max-width: 56ch;
}

.hero-stage {
  display: grid;
  gap: 16px;
  place-items: center;
  padding: 30px 22px 22px;
  text-align: center;
}

.stage-glow {
  position: absolute;
  inset: -40% -10% auto;
  height: 320px;
  background: radial-gradient(50% 60% at 50% 40%, var(--accent-soft), transparent 70%);
  filter: blur(6px);
  pointer-events: none;
}

.stage-orb {
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 1px dashed var(--line-strong);
  position: relative;
}

.stage-caption {
  display: grid;
  gap: 4px;
  min-height: 58px;
}

.state-name {
  font-size: 15px;
  color: var(--ink);
}

.state-blurb {
  font-size: 13px;
  max-width: 34ch;
}

.stage-chips {
  justify-content: center;
}

.stage-toggle {
  font-size: 12px;
  padding: 5px 11px;
}
</style>
