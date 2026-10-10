/**
 * Parity check for the Vue port.
 *
 * The port shares the upstream geometry engine file-for-file, so the honest
 * check is not "does it look right" but "are the numbers equal". This script
 * replays every frozen case in `spec/orbs-golden.json` (produced by the
 * upstream `npm run spec`) through the local engine and diffs positions,
 * radii, ink and alpha per dot, plus the resolved presets.
 *
 * Run: npm run test:parity
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODE_FRAMES } from '../src/lib/engine/registry';
import { resolvePreset } from '../src/lib/presets';
import type { ModeKey } from '../src/lib/presets';
import type { OrbSize, OrbState } from '../src/lib/types';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

interface GoldenCase {
  key: string;
  state: OrbState;
  size: OrbSize;
  mode: ModeKey;
  t: number;
  dotCount: number;
  lineCount: number;
  dots: number[];
  lines: number[];
}

interface Golden {
  specVersion: string;
  sourceLibrary: { name: string; version: string };
  tolerance: number;
  resolved: Record<string, { mode: ModeKey; speed: number; opts: Record<string, number | undefined> }>;
  cases: GoldenCase[];
}

const golden = JSON.parse(readFileSync(resolve(root, 'spec/orbs-golden.json'), 'utf8')) as Golden;
const TOL = golden.tolerance;

let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 25) console.error(`  ✗ ${msg}`);
};

// ── resolved presets (mode, speed, every scaled opt) ──────────────────
let presetChecks = 0;
for (const [key, expected] of Object.entries(golden.resolved)) {
  const [state, sizeText] = key.split('-');
  const { mode, speed, opts } = resolvePreset(state as OrbState, Number(sizeText) as OrbSize);
  presetChecks++;
  if (mode !== expected.mode) fail(`${key}: mode ${mode} !== ${expected.mode}`);
  if (Math.abs(speed - expected.speed) > 1e-9) fail(`${key}: speed ${speed} !== ${expected.speed}`);
  for (const [k, v] of Object.entries(expected.opts)) {
    const got = opts[k];
    if (got == null || Math.abs(got - (v as number)) > 1e-9) fail(`${key}: opts.${k} ${got} !== ${v}`);
  }
}

// ── geometry, per dot and per line ────────────────────────────────────
let dotChecks = 0;
let lineChecks = 0;
let worst = 0;

for (const c of golden.cases) {
  const { mode, speed: _speed, opts } = resolvePreset(c.state, c.size);
  const frame = MODE_FRAMES[mode](c.size, c.t, opts);

  if (frame.dots.length !== c.dotCount) {
    fail(`${c.key}: dotCount ${frame.dots.length} !== ${c.dotCount} (frame shape changed)`);
    continue;
  }
  if (frame.lines.length !== c.lineCount) {
    fail(`${c.key}: lineCount ${frame.lines.length} !== ${c.lineCount}`);
    continue;
  }

  for (let i = 0; i < frame.dots.length; i++) {
    const d = frame.dots[i];
    const g = c.dots.slice(i * 6, i * 6 + 6);
    const got = [d.x, d.y, d.z, d.r, d.white, d.a ?? 1];
    for (let k = 0; k < 6; k++) {
      const diff = Math.abs(got[k] - g[k]);
      if (diff > worst) worst = diff;
      if (diff > TOL) {
        fail(`${c.key}: dot ${i} field ${['x', 'y', 'z', 'r', 'white', 'a'][k]} ${got[k]} !== ${g[k]}`);
        break;
      }
    }
    dotChecks += 6;
  }

  for (let i = 0; i < frame.lines.length; i++) {
    const l = frame.lines[i];
    const g = c.lines.slice(i * 7, i * 7 + 7);
    const got = [l.x1, l.y1, l.x2, l.y2, l.white, l.a ?? 1, l.w];
    for (let k = 0; k < 7; k++) {
      const diff = Math.abs(got[k] - g[k]);
      if (diff > worst) worst = diff;
      if (diff > TOL) {
        fail(`${c.key}: line ${i} field ${k} ${got[k]} !== ${g[k]}`);
        break;
      }
    }
    lineChecks += 7;
  }
}

const totals = golden.cases.reduce(
  (acc, c) => ({ dots: acc.dots + c.dotCount, lines: acc.lines + c.lineCount }),
  { dots: 0, lines: 0 }
);

console.log(`\nparity: ${golden.sourceLibrary.name}@${golden.sourceLibrary.version} → thinking-orbs-vue\n`);
console.log(`  golden cases      ${golden.cases.length}`);
console.log(`  presets checked   ${presetChecks}`);
console.log(`  values compared   ${dotChecks + lineChecks} (${dotChecks} dot + ${lineChecks} line)`);
console.log(`  dots / edges      ${totals.dots} / ${totals.lines}`);
console.log(`  worst delta       ${worst.toExponential(2)} (tolerance ${TOL})\n`);

if (failures) {
  console.error(`FAIL — ${failures} mismatch${failures === 1 ? '' : 'es'}\n`);
  process.exit(1);
}
console.log('PASS — geometry matches the React original within the tolerance above.\n');
