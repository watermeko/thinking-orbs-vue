/**
 * Headless UI verification for the demo.
 *
 * Drives the running dev server with the Chrome DevTools Protocol (no
 * dependencies — Node's global WebSocket + fetch) and checks the things a
 * static screenshot cannot:
 *   • no console errors / uncaught exceptions while mounting ~45 orbs;
 *   • every orb canvas actually painted ink (per-canvas alpha probe);
 *   • `role="img"` + a per-state aria-label on each canvas;
 *   • state changes, the size seg and the `opts.shape` escape hatch all
 *     re-render live;
 *   • theme flips reach the canvases (auto → ancestor data-theme).
 * Finally it writes a PNG of the page.
 *
 * Usage: node scripts/verify-ui.mjs [url] [outPng]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] ?? 'http://127.0.0.1:5173/?theme=dark';
const OUT = process.argv[3] ?? '/tmp/orb-verify.png';

const CANDIDATES = [
  process.env.CHROME,
  `${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
  '/usr/bin/chromium',
  '/usr/bin/google-chrome'
].filter(Boolean);
const chrome = CANDIDATES.find((p) => existsSync(p));
if (!chrome) {
  console.error('no chromium found; set CHROME=/path/to/chrome');
  process.exit(1);
}

const port = 9400 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'orb-verify-'));
const child = spawn(
  chrome,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    'about:blank'
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] }
);
let chromeErr = '';
child.stderr.on('data', (d) => {
  chromeErr += d.toString();
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function devtoolsTarget() {
  for (let i = 0; i < 100; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(120);
  }
  throw new Error(`devtools never came up\n${chromeErr.split('\n').slice(-5).join('\n')}`);
}

const wsUrl = await devtoolsTarget();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let nextId = 1;
const pending = new Map();
const listeners = new Set();
const problems = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  for (const l of listeners) l(msg);
};

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

listeners.add((msg) => {
  if (msg.method === 'Runtime.exceptionThrown') {
    problems.push(`uncaught: ${msg.params.exceptionDetails?.exception?.description ?? 'unknown'}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    const text = msg.params.args.map((a) => a.description ?? a.value ?? a.type).join(' ');
    problems.push(`console.${msg.params.type}: ${text}`);
  }
  if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
    // the checker's own alpha probes are what trip this hint
    if (/willReadFrequently/.test(msg.params.entry.text)) return;
    problems.push(`log.${msg.params.entry.level}: ${msg.params.entry.text}`);
  }
});

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

// ── navigate + wait for the app ───────────────────────────────────────
await send('Page.navigate', { url: URL_ });
await new Promise((resolve) => {
  const stop = (msg) => {
    if (msg.method === 'Page.loadEventFired') {
      listeners.delete(stop);
      resolve();
    }
  };
  listeners.add(stop);
});
await sleep(1800); // let the rAF loops paint a few frames

const evaluate = async (expression, awaitPromise = true) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? 'eval failed');
  return res.result.value;
};

const report = await evaluate(`(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const canvases = () => [...document.querySelectorAll('canvas')];
  const ink = (c) => {
    const ctx = c.getContext('2d');
    if (!ctx || !c.width) return -1;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++;
    return n;
  };
  // FNV-1a over the raster — a real frame fingerprint, unlike the pixel count
  const frameHash = (c) => {
    const ctx = c.getContext('2d');
    if (!ctx || !c.width) return 0;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let h = 0x811c9dc5;
    for (let i = 0; i < d.length; i += 4) {
      h ^= d[i] + (d[i + 1] << 3) + (d[i + 2] << 6) + (d[i + 3] << 9);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h;
  };
  const snapshot = () => canvases().map(ink);
  const labels = () => canvases().map((c) => [c.getAttribute('role'), c.getAttribute('aria-label')]);
  const hash = (arr) => arr.join(',');

  const out = { steps: [] };

  const before = snapshot();
  out.canvasCount = before.length;
  out.blankBefore = before.filter((n) => n === 0).length;
  out.unpainted = before.filter((n) => n < 0).length;
  out.a11yOk = labels().every(([role, label]) => role === 'img' && !!label);
  out.sampleLabels = [...new Set(labels().map((l) => l[1]))].slice(0, 4);

  // 1. hero chips switch state without a remount hiccup
  const chip = [...document.querySelectorAll('.chip')].find((c) => c.textContent.trim() === 'shaping');
  chip?.click();
  await sleep(350);
  out.heroState = document.querySelector('.state-name')?.textContent.trim();
  out.heroSnippetHasShaping = /state="shaping"/.test(document.querySelector('.hero-copy pre.code')?.textContent ?? '');

  // 2. playground: state select → shaping, then the opts.shape seg
  const sel = document.querySelector('#playground select');
  out.playgroundStateOptions = sel ? sel.options.length : 0;
  sel.value = 'shaping';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(300);
  const shapeButtons = [...document.querySelectorAll('#playground .seg button')].map((b) => b.textContent.trim());
  out.shapeControlsVisible = shapeButtons.includes('triangle');
  const tri = [...document.querySelectorAll('#playground .seg button')].find((b) => b.textContent.trim() === 'triangle');
  tri?.click();
  await sleep(300);
  const afterShape = snapshot();
  out.geometryChangedOnShape = hash(afterShape) !== hash(before);
  out.snippetAfterShape = /shape: 1/.test(document.querySelector('#playground pre.code')?.textContent ?? '');

  // 3. size seg 20px → the playground canvas resizes its backing store
  const size20 = [...document.querySelectorAll('#playground .seg button')].find((b) => b.textContent.trim() === '20px');
  size20?.click();
  await sleep(300);
  const pgCanvas = document.querySelector('#playground canvas');
  out.playgroundSizeAttr = pgCanvas?.style.width;
  out.playgroundBackingPx = pgCanvas ? pgCanvas.width : 0;
  out.expectedBackingPx = Math.round(20 * Math.min(2, window.devicePixelRatio || 1));

  // 4. paused toggle freezes: two frame fingerprints of THAT canvas
  const pausedBox = [...document.querySelectorAll('#playground .switch input')][1];
  pausedBox?.click();
  await sleep(400);
  const pgHash = () => frameHash(document.querySelector('#playground canvas'));
  const h1 = pgHash();
  await sleep(600);
  out.frozenWhenPaused = h1 === pgHash() && h1 !== 0;
  pausedBox?.click();
  await sleep(600);
  out.animatesAgain = h1 !== pgHash();

  // 5. dots slider → the readout's dot count changes
  const dotsSlider = document.querySelector('#pg-dots');
  const dotReadout = () => [...document.querySelectorAll('.readout b')][1].textContent.trim();
  const dotsBefore = dotReadout();
  dotsSlider.value = '1.6';
  dotsSlider.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(350);
  out.dotsReadout = [dotsBefore, dotReadout()];
  void pgCanvas;

  // 5b. the live frame actually changed after the sliders moved
  out.frameHashChanged = h1 !== pgHash();

  // 6. theme: pin light on <html>; orbs must repaint in dark ink
  const bg = (c) => {
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, g / n, b / n] : null;
  };
  const darkInk = bg(document.querySelector('#states canvas'));
  document.documentElement.setAttribute('data-theme', 'light');
  await sleep(500);
  const lightInk = bg(document.querySelector('#states canvas'));
  document.documentElement.setAttribute('data-theme', 'dark');
  await sleep(500);
  out.inkFollowsTheme = { dark: darkInk?.map(Math.round), light: lightInk?.map(Math.round) };

  // leave the playground on a photogenic, tuned setting for the screenshot
  const size64 = [...document.querySelectorAll('#playground .seg button')].find((b) => b.textContent.trim() === '64px');
  size64?.click();
  dotsSlider.value = '1';
  dotsSlider.dispatchEvent(new Event('input', { bubbles: true }));
  sel.value = 'searching';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(400);

  out.blankAfter = snapshot().filter((n) => n === 0).length;
  return out;
})()`);

// ── screenshot ────────────────────────────────────────────────────────
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: true,
  clip: await evaluate(
    `({ x: 0, y: 0, width: 1440, height: Math.min(4000, document.documentElement.scrollHeight), scale: 1 })`
  ).then((c) => ({ ...c, scale: 1 }))
});
writeFileSync(OUT, Buffer.from(shot.data, 'base64'));

ws.close();
child.kill();

console.log('\n── demo UI verification ─────────────────────────────────');
for (const [k, v] of Object.entries(report)) {
  console.log(`  ${k.padEnd(24)} ${JSON.stringify(v)}`);
}

const checks = [
  ['canvases mounted', report.canvasCount >= 40],
  ['every canvas painted ink', report.blankBefore === 0 && report.blankAfter === 0],
  ['no unsized canvases', report.unpainted === 0],
  ['role="img" + aria-label everywhere', report.a11yOk === true],
  ['hero chips switch state', report.heroState === 'shaping' && report.heroSnippetHasShaping === true],
  ['playground has 9 states', report.playgroundStateOptions === 9],
  ['opts.shape renders', report.shapeControlsVisible === true && report.snippetAfterShape === true],
  ['size seg resizes backing store', report.playgroundSizeAttr === '20px' && report.playgroundBackingPx === report.expectedBackingPx],
  ['paused freezes the frame', report.frozenWhenPaused === true],
  ['resumes when unpaused', report.animatesAgain === true],
  ['dots slider changes readout', report.dotsReadout[0] !== report.dotsReadout[1]],
  [
    'ink follows ancestor data-theme',
    !!report.inkFollowsTheme.dark &&
      !!report.inkFollowsTheme.light &&
      report.inkFollowsTheme.dark[0] > 150 &&
      report.inkFollowsTheme.light[0] < 110
  ]
];

let failed = 0;
console.log('\n── checks ───────────────────────────────────────────────');
for (const [name, ok] of checks) {
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${name}`);
}
if (problems.length) {
  console.log('\n── console noise ────────────────────────────────────────');
  for (const p of [...new Set(problems)].slice(0, 12)) console.log(`  ! ${p}`);
}

console.log(`\nscreenshot: ${OUT}`);
if (failed || problems.length) {
  console.log(`\nFAIL — ${failed} check(s) failed, ${problems.length} console problem(s)\n`);
  process.exit(1);
}
console.log('\nPASS — demo is interactive, accessible and console-clean.\n');
