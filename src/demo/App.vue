<script setup lang="ts">
import { ref, watch } from 'vue';
import HeroDemo from './HeroDemo.vue';
import StateGallery from './StateGallery.vue';
import SizeScale from './SizeScale.vue';
import Playground from './Playground.vue';
import AgentMock from './AgentMock.vue';
import ApiTable from './ApiTable.vue';
import ThemeToggle from './ThemeToggle.vue';
import { applyTheme, initialThemeMode, type ThemeMode } from './theme-mode';

const theme = ref<ThemeMode>(initialThemeMode());
// Applying to <html> is the honest demo: every orb below uses theme="auto",
// so flipping a real ancestor attribute is what changes their ink.
watch(theme, applyTheme, { immediate: true });
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="1.9" />
            <circle cx="8" cy="1.6" r="1" />
            <circle cx="8" cy="14.4" r="1" />
            <circle cx="1.6" cy="8" r="1" />
            <circle cx="14.4" cy="8" r="1" />
            <circle cx="3.5" cy="3.5" r="0.8" />
            <circle cx="12.5" cy="12.5" r="0.8" />
            <circle cx="12.5" cy="3.5" r="0.8" />
            <circle cx="3.5" cy="12.5" r="0.8" />
          </svg>
        </span>
        <span>thinking-orbs-vue</span>
      </div>

      <span class="spacer" />

      <nav class="topbar-links">
        <a
          class="hide-sm"
          href="https://libraries.dev/orbs"
          target="_blank"
          rel="noreferrer"
          >upstream demo</a
        >
        <a
          href="https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs"
          target="_blank"
          rel="noreferrer"
          >source</a
        >
      </nav>

      <ThemeToggle v-model="theme" />
    </header>

    <main>
      <HeroDemo />

      <section id="states" class="section">
        <div class="section-head">
          <h2>Nine states</h2>
          <p class="dim">
            Nine verbs an agent can be doing, each a distinct animation — shown at both avatar
            (64px) and inline (20px) scale.
          </p>
        </div>
        <StateGallery />
      </section>

      <section id="sizes" class="section">
        <div class="section-head">
          <h2>Sizes &amp; inline scale</h2>
          <p class="dim">Two hand-tuned anchors, one verified midpoint — and every value in between.</p>
        </div>
        <SizeScale />
      </section>

      <section id="playground" class="section">
        <div class="section-head">
          <h2>Playground</h2>
          <p class="dim">Every prop, live — size included, at any value, with the resolved engine state underneath.</p>
        </div>
        <Playground v-model:theme-mode="theme" />
      </section>

      <section id="context" class="section">
        <div class="section-head">
          <h2>In context</h2>
          <p class="dim">
            The same component doing what it is for: one orb per running tool call, plus a cycling
            status row.
          </p>
        </div>
        <AgentMock />
      </section>

      <section id="api" class="section">
        <div class="section-head">
          <h2>API</h2>
          <p class="dim">Props, exports, and the Vue-free geometry surface.</p>
        </div>
        <ApiTable />
      </section>

      <section id="verify" class="section">
        <div class="section-head">
          <h2>Verification</h2>
        </div>
        <div class="grid verify-grid">
          <div class="card verify">
            <div class="verify-num mono">72</div>
            <div class="tiny mute">frozen frames compared</div>
            <p class="dim">
              9 states × 2 sizes × 4 timestamps, checked dot-for-dot against the upstream golden
              vectors at 1e-4.
            </p>
          </div>
          <div class="card verify">
            <div class="verify-num mono">11,288</div>
            <div class="tiny mute">dots + 341 edges matched</div>
            <p class="dim">
              Positions, radii, ink and alpha all equal to the React original — the port shares the
              engine, so parity is by construction.
            </p>
          </div>
          <div class="card verify">
            <div class="verify-num mono">0</div>
            <div class="tiny mute">runtime dependencies</div>
            <p class="dim">
              Plain 2D canvas arcs only. No WebGL, no <span class="mono">ctx.filter</span>, no SVG
              filters — identical pixels across browsers.
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>
        A Vue 3 port of
        <a
          href="https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs"
          target="_blank"
          rel="noreferrer"
          >thinking-orbs</a
        >
        — MIT © Jakub Antalik. Ported to Vue, engine unchanged.
      </span>
      <span class="spacer" />
      <span class="mono tiny mute">vue 3 · vite · canvas 2d</span>
    </footer>
  </div>
</template>

<style scoped>
.verify-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 860px) {
  .verify-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.verify {
  padding: 18px 20px;
  display: grid;
  gap: 7px;
}

.verify-num {
  font-size: 26px;
  letter-spacing: -0.02em;
}
</style>
