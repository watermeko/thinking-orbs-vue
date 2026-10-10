<script setup lang="ts">
// The orbs where they actually live: an agent session. One orb per running
// tool call, and a cycling "now" row that walks all nine states in context.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ThinkingOrb } from '@lib';
import { ORB_STATES, type OrbState } from '@lib/types';

const LABELS: Record<OrbState, string> = {
  working: 'Working…',
  searching: 'Searching…',
  solving: 'Solving…',
  breathing: 'Thinking…',
  listening: 'Listening…',
  connecting: 'Connecting…',
  weaving: 'Weaving…',
  composing: 'Composing…',
  shaping: 'Shaping…'
};

const TOOLS: ReadonlyArray<{ state: OrbState; label: string; status: string }> = [
  { state: 'searching', label: 'grep · auth middleware', status: '12 matches' },
  { state: 'connecting', label: 'mcp · postgres', status: 'connected' },
  { state: 'weaving', label: 'edit · src/auth/middleware.ts', status: '+38 −12' },
  { state: 'composing', label: 'patch · session-cookie.ts', status: '+9 −3' },
  { state: 'solving', label: 'run · vitest', status: '142 passed' }
];

const now = ref<OrbState>('working');
const seconds = ref(4.2);

let stateTimer = 0;
let clockTimer = 0;
onMounted(() => {
  stateTimer = window.setInterval(() => {
    const i = ORB_STATES.indexOf(now.value);
    now.value = ORB_STATES[(i + 1) % ORB_STATES.length];
  }, 2200);
  clockTimer = window.setInterval(() => {
    seconds.value += 0.1;
  }, 100);
});
onBeforeUnmount(() => {
  window.clearInterval(stateTimer);
  window.clearInterval(clockTimer);
});

const elapsed = computed(() => seconds.value.toFixed(1));
</script>

<template>
  <div class="chat card">
    <div class="chat-head">
      <span class="dot-live" aria-hidden="true" />
      <span class="mono tiny">agent-session</span>
      <span class="spacer" />
      <span class="mono tiny mute">{{ elapsed }}s</span>
    </div>

    <div class="chat-body">
      <div class="msg user">
        <div class="who mono">you</div>
        <div class="bubble">
          <p>Refactor the auth middleware to use signed session cookies, then run the test suite.</p>
        </div>
      </div>

      <div class="msg">
        <div class="who mono">ai</div>
        <div class="bubble">
          <p class="dim">
            Reading the middleware, wiring the new cookie store, and re-running the auth suite.
          </p>

          <div v-for="t in TOOLS" :key="t.label" class="tool-row">
            <ThinkingOrb :state="t.state" :size="20" />
            <span class="mono">{{ t.label }}</span>
            <span class="status">{{ t.status }}</span>
          </div>

          <div class="tool-row now">
            <ThinkingOrb :state="now" :size="20" />
            <span class="mono">{{ now }}</span>
            <span class="status">{{ LABELS[now] }}</span>
          </div>

          <div class="thinking-line">
            <ThinkingOrb state="breathing" :size="20" />
            <span class="shimmer">{{ LABELS[now] }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="composer">
      <ThinkingOrb state="listening" :size="20" />
      <div class="field-mock">Message the agent…</div>
      <button type="button" class="btn ghost">Stop</button>
    </div>
  </div>
</template>

<style scoped>
.now {
  border-color: var(--line-strong);
}

.thinking-line {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-top: 2px;
}
</style>
