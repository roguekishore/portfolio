#!/usr/bin/env node
// Replays the reference scroll path against the local build and diffs frames.
//
//   node compare.mjs --ref ../reference --url http://localhost:3000 --out ../compare
//
// For every reference scroll frame, the local frame with the nearest scroll
// position is diffed. Writes <out>/<vp>/NNN_{diff,side}.png and report.md.
//
// Inner pages, against frames captured by pages.mjs / probes:
//   node compare.mjs --url http://localhost:3000 --path /work --only mobile \
//     --refdir ../reference/pages/mobile/work --out ../compare/work
//   node compare.mjs --url http://localhost:3000 --path /work --only desktop \
//     --reffull ../reference/pages/work.full.png --out ../compare/work
// --refdir frames are named *_y<scrollY>.png; the local page is scrolled to the
// same positions.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { VIEWPORTS, launch, pad, log, scrollThrough, scrollToTop } from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    ref: { type: 'string', default: '../reference' },
    url: { type: 'string', default: 'http://localhost:3000' },
    out: { type: 'string', default: '../compare' },
    threshold: { type: 'string', default: '0.12' },
    only: { type: 'string', default: '' },
    path: { type: 'string', default: '' },
    refdir: { type: 'string', default: '' },
    reffull: { type: 'string', default: '' },
  },
});
const REF = path.resolve(args.ref);
const OUT = path.resolve(args.out);

const readPNG = async (f) => PNG.sync.read(await fs.readFile(f));

// Crops both images to their common size, diffs, and builds ref|local|diff.
function diffImages(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    if (img.width === width && img.height === height) return img.data;
    const buf = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) img.data.copy(buf, y * width * 4, y * img.width * 4, y * img.width * 4 + width * 4);
    return buf;
  };
  const ca = crop(a), cb = crop(b);
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(ca, cb, diff.data, width, height, { threshold: Number(args.threshold), includeAA: false, alpha: 0.25 });
  const side = new PNG({ width: width * 3 + 16, height });
  side.data.fill(255);
  for (const [i, src] of [ca, cb, diff.data].entries()) {
    for (let y = 0; y < height; y++) src.copy(side.data, (y * side.width + i * (width + 8)) * 4, y * width * 4, (y + 1) * width * 4);
  }
  return { mismatch: mismatched / (width * height), diff, side, sizeNote: a.width !== b.width || a.height !== b.height ? `${a.width}x${a.height} vs ${b.width}x${b.height}` : '' };
}

async function compareViewport(browser, vp) {
  const refDir = path.join(REF, vp, 'scroll');
  const refFrames = (await fs.readdir(refDir).catch(() => [])).filter((f) => /^\d+_y\d+\.png$/.test(f)).sort();
  if (!refFrames.length) { log(`[${vp}] no reference frames in ${refDir}`); return []; }
  const outDir = path.join(OUT, vp);
  await fs.mkdir(path.join(outDir, 'local'), { recursive: true });

  const context = await browser.newContext({ ...VIEWPORTS[vp], reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(args.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const local = [];
  await scrollThrough(page, {
    wheel: vp === 'desktop',
    onStep: async (i, y) => {
      const file = path.join(outDir, 'local', `${pad(i)}_y${pad(y, 5)}.png`);
      await page.screenshot({ path: file });
      local.push({ y, file });
    },
  });
  await scrollToTop(page);
  await page.screenshot({ path: path.join(outDir, 'local', 'fullpage.png'), fullPage: true });
  await context.close();

  const rows = [];
  for (const f of refFrames) {
    const refY = Number(f.match(/_y(\d+)/)[1]);
    const match = local.reduce((best, l) => (Math.abs(l.y - refY) < Math.abs(best.y - refY) ? l : best), local[0]);
    const r = diffImages(await readPNG(path.join(refDir, f)), await readPNG(match.file));
    const base = f.replace('.png', '');
    await fs.writeFile(path.join(outDir, `${base}_diff.png`), PNG.sync.write(r.diff));
    await fs.writeFile(path.join(outDir, `${base}_side.png`), PNG.sync.write(r.side));
    rows.push({ frame: f, refY, localY: match.y, mismatch: r.mismatch, sizeNote: r.sizeNote });
  }
  const refFull = path.join(REF, vp, 'fullpage.png');
  if (await fs.stat(refFull).catch(() => null)) {
    const r = diffImages(await readPNG(refFull), await readPNG(path.join(outDir, 'local', 'fullpage.png')));
    await fs.writeFile(path.join(outDir, 'fullpage_side.png'), PNG.sync.write(r.side));
    rows.push({ frame: 'fullpage.png', refY: '-', localY: '-', mismatch: r.mismatch, sizeNote: r.sizeNote });
  }
  log(`[${vp}] compared ${rows.length} frames`);
  return rows;
}

// Inner-page mode: fixed reference scroll positions and/or a full-page image.
async function comparePage(browser, vp) {
  const outDir = path.join(OUT, vp);
  await fs.mkdir(path.join(outDir, 'local'), { recursive: true });
  const page = await (await browser.newContext({ ...VIEWPORTS[vp], reducedMotion: 'no-preference' })).newPage();
  await page.goto(args.url + args.path, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const rows = [];
  const frames = args.refdir ? (await fs.readdir(path.resolve(args.refdir))).filter((f) => /_y\d+\.png$/.test(f)).sort() : [];
  for (const f of frames) {
    const y = Number(f.match(/_y(\d+)\.png$/)[1]);
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(800);
    const localY = await page.evaluate(() => Math.round(scrollY));
    const file = path.join(outDir, 'local', f);
    await page.screenshot({ path: file });
    const r = diffImages(await readPNG(path.join(path.resolve(args.refdir), f)), await readPNG(file));
    const base = f.replace('.png', '');
    await fs.writeFile(path.join(outDir, `${base}_side.png`), PNG.sync.write(r.side));
    rows.push({ frame: f, refY: y, localY, mismatch: r.mismatch, sizeNote: r.sizeNote || (localY !== y ? 'page shorter than reference' : '') });
  }
  if (args.reffull) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    const file = path.join(outDir, 'local', 'fullpage.png');
    await page.screenshot({ path: file, fullPage: true });
    const r = diffImages(await readPNG(path.resolve(args.reffull)), await readPNG(file));
    await fs.writeFile(path.join(outDir, 'fullpage_side.png'), PNG.sync.write(r.side));
    rows.push({ frame: 'fullpage.png', refY: '-', localY: '-', mismatch: r.mismatch, sizeNote: r.sizeNote });
  }
  await page.context().close();
  log(`[${vp}] ${args.path}: compared ${rows.length} frames`);
  return rows;
}

const browser = await launch('');
const report = ['# Visual diff report\n', `Reference: \`${args.refdir || args.reffull || REF}\`  \nLocal: ${args.url}${args.path}  \nThreshold: ${args.threshold}\n`];
const pageMode = Boolean(args.refdir || args.reffull);
try {
  for (const vp of ['desktop', 'mobile']) {
    if (args.only && args.only !== vp) continue;
    const rows = pageMode ? await comparePage(browser, vp) : await compareViewport(browser, vp);
    if (!rows.length) continue;
    const avg = rows.reduce((s, r) => s + r.mismatch, 0) / rows.length;
    report.push(`## ${vp} — mean mismatch ${(avg * 100).toFixed(2)}%\n`, '| frame | ref y | local y | mismatch | note |', '|---|---|---|---|---|');
    for (const r of [...rows].sort((a, b) => b.mismatch - a.mismatch)) report.push(`| ${r.frame} | ${r.refY} | ${r.localY} | ${(r.mismatch * 100).toFixed(2)}% | ${r.sizeNote} |`);
    report.push('');
  }
} finally {
  await browser.close();
  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, 'report.md'), report.join('\n'));
  log(`report -> ${path.join(OUT, 'report.md')}`);
}
