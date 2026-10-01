#!/usr/bin/env node
// Records a page transition: clicks a link and screenshots fixed time offsets,
// logging the URL at each frame and whether the navigation was client-side
// (SPA) or a full document load.
//
//   node transition.mjs --url https://koto.com --click 'a[href="/work"]' --out ../reference/transitions/home-work
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { VIEWPORTS, launch, pad, writeJSON, log } from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'https://koto.com' },
    click: { type: 'string' },
    out: { type: 'string', default: '../reference/transitions/run' },
    vp: { type: 'string', default: 'desktop' },
    scroll: { type: 'string', default: '' }, // optional selector to scroll into view first
    proxy: { type: 'string', default: process.env.HTTPS_PROXY || process.env.https_proxy || '' },
  },
});
if (!args.click) {
  console.error('usage: node transition.mjs --url <page> --click <selector> [--out dir] [--vp desktop|mobile]');
  process.exit(1);
}
const OUT = path.resolve(args.out);
const TIMES = [0, 60, 120, 200, 300, 420, 560, 720, 900, 1150, 1500, 2000, 3000];

const browser = await launch(args.proxy);
try {
  const page = await (await browser.newContext(VIEWPORTS[args.vp])).newPage();
  await page.goto(args.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const target = page.locator(args.click).filter({ visible: true }).first();
  if (!(await target.count())) throw new Error(`no visible element for ${args.click}`);
  if (args.scroll) await page.locator(args.scroll).first().scrollIntoViewIfNeeded();
  else await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  // A marker on window survives client-side navigation but not a document load.
  await page.evaluate(() => { window.__transitionMarker = true; });
  let documentLoads = 0;
  page.on('load', () => documentLoads++);
  await fs.mkdir(OUT, { recursive: true });

  const frames = [];
  const t0 = Date.now();
  await target.click({ noWaitAfter: true });
  for (const ms of TIMES) {
    const wait = t0 + ms - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    const file = `t${pad(ms, 4)}ms.png`;
    await page.screenshot({ path: path.join(OUT, file) }).catch(() => {});
    frames.push({ ms, file, url: page.url(), scrollY: await page.evaluate(() => Math.round(scrollY)).catch(() => null) });
  }
  const spa = await page.evaluate(() => window.__transitionMarker === true).catch(() => false);
  const result = { from: args.url, click: args.click, vp: args.vp, navigation: spa ? 'client-side' : 'document load', documentLoads, frames };
  await writeJSON(path.join(OUT, 'transition.json'), result);
  log(`${result.navigation}; final url ${frames.at(-1).url}; ${frames.length} frames -> ${OUT}`);
} finally {
  await browser.close();
}
