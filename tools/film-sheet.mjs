// Contact sheet and checks for one project film, rendered from a running app.
//
//   node film-sheet.mjs <slug> --times 0,3.4,7.9,12.6,17.2,22.4 [--loop 25.4] [--base http://localhost:3000]
//
// Writes ../local/film-sheet/<slug>.png (git-ignored), max 1200px wide:
//   row 1+: the case-study hero frozen at each --times value (via ?film-t=)
//   last rows: the live chapter tiles after they have played for a moment
// Prints canvas counts, console errors, and with --loop the pixel difference
// between t = loop - 0.05 and t = 0 (the loop seam; should be near 0).
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const slug = args[0];
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 ? args[i + 1] : d;
};
if (!slug || slug.startsWith('--')) {
  console.error('usage: node film-sheet.mjs <slug> --times 0,3.4,... [--loop 25.4] [--base http://localhost:3000]');
  process.exit(2);
}
const BASE = opt('base', 'http://localhost:3000');
const TIMES = opt('times', '0').split(',').map(Number).filter(Number.isFinite);
const LOOP = opt('loop') ? Number(opt('loop')) : null;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../local/film-sheet');
const CELL_W = 400, CELL_H = 225;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];

// Downscaled pixels of the first canvas inside #project-content.
async function grab(page, index = 0) {
  const cv = page.locator('#project-content canvas').nth(index);
  await cv.scrollIntoViewIfNeeded();
  return cv.evaluate((c, [w, h]) => {
    const o = document.createElement('canvas');
    o.width = w; o.height = h;
    const g = o.getContext('2d');
    g.drawImage(c, 0, 0, w, h);
    return { url: o.toDataURL('image/png'), data: Array.from(g.getImageData(0, 0, w, h).data) };
  }, [CELL_W, CELL_H]);
}

async function open(query = '') {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(`${BASE}/projects/${slug}${query}`, { waitUntil: 'networkidle' });
  if (!res || res.status() >= 400) throw new Error(`/projects/${slug} returned ${res ? res.status() : 'no response'}`);
  await page.waitForTimeout(400);
  return page;
}

const cells = [];
for (const t of TIMES) {
  const page = await open(`?film-t=${t}`);
  cells.push((await grab(page)).url);
  await page.close();
}

let seam = null;
if (LOOP) {
  const a = await open(`?film-t=${LOOP - 0.05}`);
  const A = (await grab(a)).data;
  await a.close();
  const b = await open('?film-t=0');
  const B = (await grab(b)).data;
  await b.close();
  let sum = 0;
  for (let i = 0; i < A.length; i += 4) sum += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
  seam = +(sum / (A.length / 4) / 3).toFixed(2); // mean abs difference per channel, 0..255
}

const live = await open();
const count = await live.locator('#project-content canvas').count();
const tiles = [];
for (let i = 1; i < count; i++) {
  await live.locator('#project-content canvas').nth(i).scrollIntoViewIfNeeded();
  await live.waitForTimeout(2200);
  tiles.push((await grab(live, i)).url);
}

const all = [...cells, ...tiles];
const sheet = await live.evaluate(async ([urls, w, h]) => {
  const o = document.createElement('canvas');
  o.width = w * 3; o.height = h * Math.max(1, Math.ceil(urls.length / 3));
  const g = o.getContext('2d');
  for (let i = 0; i < urls.length; i++) {
    const img = new Image();
    img.src = urls[i];
    await img.decode();
    g.drawImage(img, (i % 3) * w, Math.floor(i / 3) * h);
  }
  return o.toDataURL('image/png');
}, [all, CELL_W, CELL_H]);
await live.close();
await browser.close();

await fs.mkdir(OUT, { recursive: true });
const file = path.join(OUT, `${slug}.png`);
await fs.writeFile(file, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(JSON.stringify({ sheet: file, heroFrames: cells.length, chapterTiles: tiles.length, canvases: count, seam, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
