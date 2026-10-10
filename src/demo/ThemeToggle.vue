<script setup lang="ts">
import type { ThemeMode } from './theme-mode';

const model = defineModel<ThemeMode>({ required: true });
const MODES: readonly ThemeMode[] = ['auto', 'dark', 'light'];
</script>

<template>
  <div class="seg" role="group" aria-label="Theme mode">
    <button
      v-for="m in MODES"
      :key="m"
      type="button"
      :aria-pressed="model === m"
      :title="
        m === 'auto'
          ? 'Follow the host project (ancestor data-theme / prefers-color-scheme)'
          : `Pin ${m} ink`
      "
      @click="model = m"
    >
      {{ m }}
    </button>
  </div>
</template>
