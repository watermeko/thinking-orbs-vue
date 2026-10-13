<script setup lang="ts">
// Sizes: `64` and `20` are hand-tuned anchors, `32` is the law between them —
// and so is every other value. The second row is the point: nothing about the
// design depends on the size being one of three numbers.
import { ThinkingOrb } from '@lib';
import { SIZE_MAX, SIZE_MIN } from '@lib/presets';
import { TUNED_SIZES, ORB_STATES } from '@lib/types';
import type { CSSProperties } from 'vue';

const LABEL: Record<number, string> = {
  64: 'chat avatar',
  32: 'compact avatar',
  20: 'inline text'
};

/** Arbitrary sizes — the law evaluated off the anchors, both directions. */
const ANY_SIZES = [16, 24, 40, 56, 80, 112, 160, 224];

// The canvas is `display: block` out of the box (like the React original);
// for inline prose, override it on the style prop.
const inlineOrb: CSSProperties = {
  display: 'inline-block',
  verticalAlign: '-4px',
  margin: '0 3px'
};
</script>

<template>
  <div class="sizes">
    <div class="size-row card">
      <div v-for="s in TUNED_SIZES" :key="s" class="size-cell">
        <div class="size-canvas">
          <ThinkingOrb state="searching" :size="s" />
        </div>
        <div class="mono size-id">{{ s }}<span class="mute">px</span></div>
        <div class="tiny mute">{{ LABEL[s] }}</div>
      </div>
    </div>

    <div class="any-card card">
      <div class="any-head">
        <div class="tiny mute any-label">
          any size — {{ SIZE_MIN }}…{{ SIZE_MAX }}px, no snapping
        </div>
        <p class="dim any-note">
          Between 20 and 64 the density, dot radius and speed interpolate in log space — the
          200-odd values below are the same curve evaluated off the three anchors, in both
          directions.
        </p>
      </div>
      <div class="any-row">
        <div v-for="s in ANY_SIZES" :key="s" class="any-item">
          <div class="any-canvas">
            <ThinkingOrb state="searching" :size="s" />
          </div>
          <span class="mono any-id">{{ s }}</span>
        </div>
      </div>
    </div>

    <div class="inline-card card">
      <div class="tiny mute inline-label">inline text scale — 20px</div>
      <div class="inline-row">
        <span v-for="s in ORB_STATES" :key="s" class="inline-item">
          <ThinkingOrb :state="s" :size="20" />
          <span class="mono inline-name">{{ s }}</span>
        </span>
      </div>
      <p class="dim prose">
        Drop it inline in a paragraph and it sits on the baseline without moving the line box, e.g.
        <ThinkingOrb state="working" :size="20" :style="inlineOrb" /> working through your request,
        <ThinkingOrb state="searching" :size="20" :style="inlineOrb" /> searching the repository, or
        <ThinkingOrb state="connecting" :size="20" :style="inlineOrb" /> connecting to the tool
        server. Any size works the same way — 17px reads like a 20px one, because the law answers
        for it.
      </p>
    </div>
  </div>
</template>

<style scoped>
.sizes {
  display: grid;
  gap: 14px;
}

.size-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.size-cell {
  display: grid;
  gap: 6px;
  place-items: center;
  padding: 20px 16px;
  border-right: 1px solid var(--line);
  text-align: center;
}

.size-cell:last-child {
  border-right: 0;
}

@media (max-width: 620px) {
  .size-row {
    grid-template-columns: minmax(0, 1fr);
  }
  .size-cell {
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .size-cell:last-child {
    border-bottom: 0;
  }
}

.size-canvas {
  display: grid;
  place-items: center;
  /* one shared box, so the three presets and their labels line up */
  min-height: 104px;
}

.size-id {
  font-size: 15px;
  color: var(--ink);
}

.any-card {
  padding: 18px 20px;
  display: grid;
  gap: 16px;
}

.any-head {
  display: grid;
  gap: 5px;
}

.any-label {
  letter-spacing: 0.08em;
}

.any-note {
  font-size: 13px;
  max-width: 82ch;
}

.any-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 22px;
}

.any-item {
  display: grid;
  gap: 6px;
  place-items: center;
}

.any-canvas {
  display: grid;
  place-items: end center;
}

.any-id {
  font-size: 11.5px;
  color: var(--ink-mute);
}

.inline-card {
  padding: 18px 20px;
  display: grid;
  gap: 14px;
}

.inline-label {
  letter-spacing: 0.08em;
}

.inline-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.inline-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.inline-name {
  font-size: 12px;
  color: var(--ink-mute);
}

.prose {
  font-size: 14px;
  color: var(--ink-dim);
  max-width: 78ch;
}
</style>
