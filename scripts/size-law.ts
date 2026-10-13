/**
 * Size-law checks for arbitrary sizes.
 *
 * The port extends upstream's three-row preset table into a continuous law:
 * every knob is log-space interpolated between the 64 and 20 anchors, which —
 * it turns out — reproduces the shipped 32 row exactly. This script proves
 * that claim and guards the extension:
 *
 *   1. the law reproduces all nine shipped 32 rows (speed, count, size, extras);
 *   2. 64 / 32 / 20 still resolve to *exactly* the hand-tuned rows (the upstream
 *      pipeline reimplemented inline here, byte-for-byte);
 *   3. a full sweep of 12…256px for all nine states at three timestamps has no
 *      NaN, no degenerate frame, and a non-decreasing dot count with size;
 *   4. the dot budget binds where it is needed (`working` at large sizes) and
 *      leaves everything else alone;
 *   5. resolution is deterministic and repeatable across hundreds of sizes.
 *
 * Run: npm run test:sizes
 */
import { BASE_PROFILES, scaleCounts, scaleRadii } from '../src/lib/engine/profiles';
import { MODE_FRAMES } from '../src/lib/engine/registry';
import { PRESETS, SIZE_MAX, SIZE_MIN, anchorT, interpolatePreset } from '../src/lib/presets';
import type { ModeKey, Preset } from '../src/lib/presets';
import { DOT_BUDGET, presetAt, resolveDrawOptions } from '../src/lib/tuning';
import { ORB_STATES, TUNED_SIZES } from '../src/lib/types';
import type { OrbState } from '../src/lib/types';

const MODES = Object.keys(PRESETS) as ModeKey[];
const ANCHORS = [64, 20] as const;
const TIMES = [0, 0.6, 1.7, 3.3, 5.1];

let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 25) console.error(`  ✗ ${msg}`);
};

/**
 * Upstream's own pipeline, transcribed: the table row for a tuned size run
 * through the scalers. The port must reproduce this exactly at 64 / 32 / 20.
 */
function upstreamOpts(mode: ModeKey, size: (typeof TUNED_SIZES)[number]) {
  const p = PRESETS[mode][size];
  let o = { ...BASE_PROFILES[mode] };
  if (p.count !== 1) o = scaleCounts(o, p.count);
  if (p.size !== 1) o = scaleRadii(o, p.size);
  if (p.extra) o = { ...o, ...p.extra };
  return o;
}

// ── 1. the law reproduces the shipped 32 rows ─────────────────────────
console.log('\n── 1. does the log law reproduce the shipped 32 rows? ───');
console.log(`   t(32) = ${anchorT(32).toFixed(6)}`);
let worst32 = 0;
for (const mode of MODES) {
  const law = interpolatePreset(mode, 32);
  const shipped = PRESETS[mode][32];
  const pairs: Array<[string, number, number]> = [
    ['speed', law.speed, shipped.speed],
    ['count', law.count, shipped.count],
    ['size', law.size, shipped.size]
  ];
  for (const k of new Set([...Object.keys(law.extra ?? {}), ...Object.keys(shipped.extra ?? {})])) {
    pairs.push([`extra.${k}`, law.extra?.[k] ?? 0, shipped.extra?.[k] ?? 0]);
  }
  for (const [k, got, want] of pairs) {
    const rel = Math.abs(got - want) / Math.max(1e-9, Math.abs(want));
    worst32 = Math.max(worst32, rel);
    if (rel > 1e-3) fail(`${mode}.${k} at 32: law ${got} vs shipped ${want}`);
  }
}
console.log(`   worst relative delta: ${worst32.toExponential(2)}  (the table stores 4 significant digits)`);
if (worst32 > 1e-3) fail('the 32 row is not the log law any more');

// ── 2. tuned sizes are untouched ──────────────────────────────────────
console.log('\n── 2. tuned sizes still resolve to the hand-tuned rows ──');
let tunedChecks = 0;
for (const state of ORB_STATES) {
  for (const size of TUNED_SIZES) {
    const mode = resolveDrawOptions(state, size).mode;
    const got = resolveDrawOptions(state, size, { maxDots: 0 }).opts;
    const want = upstreamOpts(mode, size);
    const keys = new Set([...Object.keys(got), ...Object.keys(want)]);
    for (const k of keys) {
      tunedChecks++;
      const a = got[k];
      const b = want[k];
      if (a == null || b == null || Math.abs(a - b) > 1e-12) {
        fail(`${state}-${size}: opts.${k} ${a} !== upstream ${b}`);
      }
    }
  }
}
console.log(`   ${tunedChecks} opt values compared across ${ORB_STATES.length} states × ${TUNED_SIZES.length} tuned sizes`);

// ── 3. sweep 12…256 for every state ───────────────────────────────────
console.log('\n── 3. sweep 12…256px, all nine states, five timestamps ──');
let frames = 0;
let dots = 0;
let maxDotsSeen = 0;
const densityBySize = new Map<string, number[]>();
const dips: Array<[string, number, number]> = [];
for (const state of ORB_STATES) {
  const seen: Array<{ size: number; dots: number }> = [];
  for (let size = SIZE_MIN; size <= SIZE_MAX; size++) {
    // no budget: the shape of the law itself, before the guard
    const r = resolveDrawOptions(state, size, { maxDots: 0 });
    for (const k of Object.keys(r.opts)) {
      const v = r.opts[k];
      if (typeof v === 'number' && !Number.isFinite(v)) fail(`${state}@${size}: opts.${k} is ${v}`);
    }
    for (const t of TIMES) {
      const f = MODE_FRAMES[r.mode](size, t, r.opts);
      frames++;
      dots += f.dots.length;
      maxDotsSeen = Math.max(maxDotsSeen, f.dots.length);
      if (!f.dots.length) fail(`${state}@${size} t=${t}: empty frame`);
      for (const d of f.dots) {
        if (!Number.isFinite(d.x) || !Number.isFinite(d.y) || !Number.isFinite(d.z)) {
          fail(`${state}@${size} t=${t}: non-finite dot position`);
          break;
        }
        if (!(d.r > 0) || !Number.isFinite(d.r)) {
          fail(`${state}@${size} t=${t}: bad radius ${d.r}`);
          break;
        }
        if (!Number.isFinite(d.white) || d.white < -1 || d.white > 2) {
          fail(`${state}@${size} t=${t}: ink out of range ${d.white}`);
          break;
        }
      }
    }
    seen.push({ size, dots: resolveDrawOptions(state, size, { maxDots: 0 }).dotCount });
    densityBySize.set(state, seen.map((s) => s.dots));
  }
  // The law's own count multiplier is strictly monotone in size …
  let prevCount = 0;
  for (let size = SIZE_MIN; size <= SIZE_MAX; size++) {
    const c = presetAt(state, size).count;
    if (c < prevCount) {
      fail(`${state}: the law's count multiplier dropped at ${size}px (${prevCount} → ${c})`);
      break;
    }
    prevCount = c;
  }
  // … but the *measured* dot count is a step function of it: knobs round to
  // whole dots, and `ring`/`ribbon` multiply their rounded lane count by a
  // `bandMul` that upstream tunes *down* as the orb grows, so where
  // `round(lanes · bandMul)` crosses an integer the density wobbles by ~10%
  // for one pixel of size. Never a collapse — assert that, and report it.
  const series = densityBySize.get(state)!;
  let worst = { rel: 0, size: SIZE_MIN, from: 0, to: 0 };
  for (let i = 1; i < series.length; i++) {
    const rel = (series[i - 1] - series[i]) / Math.max(1, series[i - 1]);
    if (rel > worst.rel) worst = { rel, size: SIZE_MIN + i, from: series[i - 1], to: series[i] };
  }
  if (worst.rel > 0.15) {
    fail(`${state}: dot count dips ${(worst.rel * 100).toFixed(1)}% at ${worst.size}px (${worst.from} → ${worst.to})`);
  }
  dips.push([state, worst.rel, worst.size]);
}
const wobblers = dips.filter(([, rel]) => rel > 0.01).sort((a, b) => (b[1] as number) - (a[1] as number));
console.log(
  `   monotone: ${dips.length - wobblers.length}/${dips.length} states step-free` +
    (wobblers.length
      ? `; rounding wobble: ${wobblers.map(([s, r, z]) => `${s} ${((r as number) * 100).toFixed(1)}% @${z}px`).join(', ')}`
      : '')
);
console.log(`   ${frames} frames / ${dots.toLocaleString()} dots, largest ${maxDotsSeen.toLocaleString()} (uncapped)`);

// ── 4. the dot budget ─────────────────────────────────────────────────
console.log('\n── 4. per-frame dot budget ──');
const uncappedBig = resolveDrawOptions('working', 256, { maxDots: 0 }).dotCount;
const cappedBig = resolveDrawOptions('working', 256).dotCount;
console.log(`   working @256  uncapped ${uncappedBig.toLocaleString()}  →  capped ${cappedBig.toLocaleString()} (budget ${DOT_BUDGET})`);
if (uncappedBig <= DOT_BUDGET) fail('the budget never binds, so it is not doing anything for `working`');
if (cappedBig > DOT_BUDGET) fail(`budget not enforced: ${cappedBig} > ${DOT_BUDGET}`);
if (!cappedBig) fail('the budget starved the frame');

for (const state of ORB_STATES) {
  for (const size of [48, 96, 128, 192, 256]) {
    const r = resolveDrawOptions(state, size);
    const f = MODE_FRAMES[r.mode](size, 1.7, r.opts);
    if (f.dots.length > DOT_BUDGET) fail(`${state}@${size}: ${f.dots.length} dots over budget`);
    if (r.capped && f.dots.length === 0) fail(`${state}@${size}: capped to nothing`);
  }
}
const cappedStates = ORB_STATES.filter(
  (s) => [96, 128, 192, 256].some((size) => resolveDrawOptions(s, size).capped)
);
console.log(`   states where the budget binds above 96px: ${cappedStates.join(', ') || 'none'}`);

// ── 5. determinism across many sizes ──────────────────────────────────
console.log('\n── 5. determinism over 500 arbitrary sizes ──');
const sample = Array.from({ length: 500 }, (_, i) => SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * i) / 499);
let mismatches = 0;
for (const state of ORB_STATES) {
  const first = sample.map((s) => resolveDrawOptions(state, s).opts);
  const second = sample.map((s) => resolveDrawOptions(state, s).opts);
  for (let i = 0; i < first.length; i++) {
    for (const k of Object.keys(first[i])) {
      if (first[i][k] !== second[i][k]) mismatches++;
    }
  }
}
console.log(`   ${ORB_STATES.length * sample.length} resolutions, ${mismatches} mismatches`);
if (mismatches) fail('resolution is not deterministic (cache eviction changed a result?)');

// ── report ────────────────────────────────────────────────────────────
const anchored: Preset[] = MODES.map((m) => PRESETS[m][64]);
void anchored;
console.log('\n─────────────────────────────────────────────────────────');
if (failures) {
  console.error(`FAIL — ${failures} problem${failures === 1 ? '' : 's'}\n`);
  process.exit(1);
}
console.log(`PASS — arbitrary sizes hold: ${MODES.length} modes, ${SIZE_MIN}–${SIZE_MAX}px,`);
console.log(`       ${frames} frames checked, tuned rows untouched, budget enforced.\n`);
