<script setup lang="ts">
// Tiny, dependency-free syntax highlighter for the demo's code samples.
// Tokenises in a single pass over an escaped string, so inserted markup can
// never be re-matched. Input is always a static literal from this repo.
import { computed } from 'vue';

const props = defineProps<{ code: string }>();

const TOKEN = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(&lt;\/?[A-Za-z][\w.:-]*)|(&gt;|\/&gt;)/g;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const html = computed(() =>
  escapeHtml(props.code).replace(TOKEN, (m, cm: string, str: string, tag: string, close: string) => {
    if (cm) return `<span class="cm">${cm}</span>`;
    if (str) return `<span class="str">${str}</span>`;
    if (tag) return `<span class="tag">${tag}</span>`;
    if (close) return `<span class="tag">${close}</span>`;
    return m;
  })
);
</script>

<template>
  <pre class="code"><code v-html="html" /></pre>
</template>
