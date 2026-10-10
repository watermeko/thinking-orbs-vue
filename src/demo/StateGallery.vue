<script setup lang="ts">
import { ThinkingOrb } from '@lib';
import { resolvePreset } from '@lib/presets';
import { STATE_META } from './stateMeta';

/** The engine mode each state maps to — shown as a small tag per card. */
const modeOf = (state: (typeof STATE_META)[number]['state']) => resolvePreset(state, 64).mode;
</script>

<template>
  <div class="grid gallery">
    <article v-for="m in STATE_META" :key="m.state" class="card orb-card">
      <header>
        <div>
          <h3>{{ m.verb }}</h3>
          <div class="mono tiny mute">{{ m.state }}</div>
        </div>
        <span class="mono tiny mode-tag">{{ modeOf(m.state) }}</span>
      </header>

      <div class="orb-row">
        <ThinkingOrb :state="m.state" :size="64" />
        <ThinkingOrb :state="m.state" :size="20" />
      </div>

      <p class="dim blurb">{{ m.blurb }}</p>
    </article>
  </div>
</template>

<style scoped>
.orb-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  transition: border-color 140ms ease, transform 140ms ease;
}

.orb-card:hover {
  border-color: var(--line-strong);
}

.orb-card header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.mode-tag {
  color: var(--ink-mute);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 1px 7px;
  line-height: 1.6;
}

.orb-row {
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 76px;
  padding: 6px 4px;
  border-radius: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  padding-left: 16px;
}

.blurb {
  font-size: 13px;
  min-height: 40px;
}
</style>
