/**
 * Screenshot helper: loads a URL in the Chromium already on this machine and
 * writes a PNG. Used to eyeball the demo at a few viewports.
 *
 *   node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs]
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const [url, out, w = '1280', h = '900', wait = '2500'] = process.argv.slice(2);
if (!url || !out) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [width] [height] [waitMs]');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'orb-shot-'));

const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=2',
  `--user-data-dir=${profile}`,
  `--window-size=${w},${h}`,
  `--virtual-time-budget=${wait}`,
  `--screenshot=${out}`,
  url
];

const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
let stderr = '';
child.stderr.on('data', (d) => {
  stderr += d.toString();
});
child.on('close', (code) => {
  if (code !== 0) {
    console.error(stderr.split('\n').slice(-8).join('\n'));
    process.exit(code ?? 1);
  }
  console.log(`wrote ${out}`);
});
