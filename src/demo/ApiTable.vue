<script setup lang="ts">
// Two reference tables: the component's props, and the Vue-free engine
// surface for consumers driving their own canvas.
import CodeBlock from './CodeBlock.vue';

interface Row {
  name: string;
  type: string;
  def: string;
  note: string;
}

const PROPS: readonly Row[] = [
  { name: 'state', type: 'OrbState', def: "'working'", note: 'One of nine tuned animations.' },
  { name: 'size', type: '64 | 32 | 20', def: '64', note: 'Tuned preset, not a scale factor.' },
  { name: 'theme', type: "'auto' | 'dark' | 'light'", def: "'auto'", note: 'Auto reads ancestor data-theme/class, then prefers-color-scheme — live.' },
  { name: 'speed', type: 'number', def: '1', note: "Multiplier on the preset's baked speed." },
  { name: 'paused', type: 'boolean', def: 'false', note: 'Freeze on the current frame.' },
  { name: 'dots', type: 'number', def: '1', note: 'Density multiplier; paired counts scale by √.' },
  { name: 'dotSize', type: 'number', def: '1', note: 'Radius multiplier for every dot.' },
  { name: 'color', type: 'string', def: '—', note: 'Optional ink tint; the depth ramp is preserved.' },
  { name: 'opts', type: 'ModeOpts', def: '—', note: "Advanced: the engine's own knobs, merged last." },
  { name: 'frame', type: 'ModeFrame', def: '—', note: 'Escape hatch: replace the geometry outright.' },
  { name: 'gravity', type: 'boolean | GravityOptions', def: 'false', note: 'The orb pulls at the pointer. Needs a cursor sprite.' },
  { name: 'ariaLabel', type: 'string', def: 'per state', note: 'role="img" label, e.g. "Searching…".' }
];

const ENGINE: readonly [string, string][] = [
  ['ThinkingOrb', 'The Vue component (canvas + theme + loop + a11y).'],
  ['resolvePreset(state, size)', 'Resolve a pair to { mode, speed, opts } — cached.'],
  ['MODE_FRAMES[mode](size, t, opts)', 'Pure geometry: returns { dots, lines }, z-sorted.'],
  ['paintFrame(ctx, frame, dark, tint?)', 'Paint a finished frame onto any 2D context.'],
  ['countDots(opts)', 'How many dots a resolved profile draws.'],
  ['scaleCounts / scaleRadii', 'The paired scalers the presets themselves use.'],
  ['useResolvedDark / useReducedMotion', 'The theme + motion composables, standalone.'],
  ['attachGravity(el, options)', 'Document-level pointer tracker; returns the detach fn.']
];

const SUBPATH = `import { MODE_FRAMES, resolvePreset } from 'thinking-orbs-vue/engine'

const { mode, speed, opts } = resolvePreset('searching', 64)

// your own renderer: a worker, an offscreen canvas, WebGL, Skia
const { dots, lines } = MODE_FRAMES[mode](64, t * speed, opts)
// dots: { x, y, z, r, white, a }[] — already z-sorted
// lines draw first, then the dots on top`;
</script>

<template>
  <div class="api">
    <div class="table-wrap">
      <table class="props">
        <thead>
          <tr>
            <th>prop</th>
            <th>type</th>
            <th>default</th>
            <th>notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in PROPS" :key="r.name">
            <td>{{ r.name }}</td>
            <td class="type">{{ r.type }}</td>
            <td class="type">{{ r.def }}</td>
            <td class="dim">{{ r.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="api-grid">
      <div class="engines card">
        <h3>Exports</h3>
        <dl>
          <template v-for="[name, note] in ENGINE" :key="name">
            <dt class="mono">{{ name }}</dt>
            <dd class="dim">{{ note }}</dd>
          </template>
        </dl>
      </div>

      <div class="engine-sample">
        <h3>Vue-free geometry surface</h3>
        <p class="dim note">
          The engine is pure math, zero DOM and zero Vue — the same surface the upstream React
          Native and SwiftUI ports consume. Drive any renderer with it.
        </p>
        <CodeBlock :code="SUBPATH" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.api {
  display: grid;
  gap: 14px;
}

.api-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
}

@media (max-width: 860px) {
  .api-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.engines {
  padding: 18px 20px;
}

.engines dl {
  margin: 12px 0 0;
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 6px 16px;
  align-items: baseline;
}

.engines dt {
  font-size: 12.5px;
  color: var(--ink);
}

.engines dd {
  margin: 0;
  font-size: 13px;
}

.engine-sample {
  display: grid;
  gap: 12px;
  align-content: start;
}

.note {
  font-size: 13px;
}
</style>
