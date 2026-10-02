// Contact sheets and checks for one project film, rendered from a running app.
//
//   node film-sheet.mjs <slug> --times 0,3.4,7.9,… [--loop 25.4] [--tiles 0,2,…] [--perf] [--text]
//                              [--base http://localhost:3000]
//
// Writes ../local/film-sheet/<slug>.png, <slug>-2.png, … (git-ignored). Each PNG holds at most
// 12 cells of 400×225 (3 × 4 = 1200 × 900):
//   first cells: the case-study hero frozen at each --times value (via ?film-t=)
//   then:        the live chapter tiles after they have played for a moment (all, or --tiles)
// Prints the sheet paths, canvas counts and console errors, plus:
//   --loop L  `seam`: mean per-channel pixel difference between t = L − 0.05 and t = 0 (near 0)
//   --perf    the hero's live frame cost over 5 s: mean / median / p95 draw ms and long tasks
//   --text    the rendered case-study text outline (title, sector, intro, nav, sections, lengths)
//             and the module order, e.g. tile0, sec:problem, pair1-2, …
// Exits 1 when `errors` is non-empty.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const slug = args[0];
const has = (name) => args.includes(`--${name}`);
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 && i + 1 < args.length && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
if (!slug || slug.startsWith('--')) {
  console.error('usage: node film-sheet.mjs <slug> --times 0,3.4,... [--loop 25.4] [--tiles 0,2] [--perf] [--text] [--base http://localhost:3000]');
  process.exit(2);
}
const BASE = opt('base', 'http://localhost:3000');
const TIMES = opt('times', '0').split(',').map(Number).filter(Number.isFinite);
const LOOP = opt('loop') ? Number(opt('loop')) : null;
const TILES = opt('tiles') ? new Set(opt('tiles').split(',').map(Number).filter(Number.isInteger)) : null;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../local/film-sheet');
const CELL_W = 400, CELL_H = 225, COLS = 3, PER_SHEET = 12;
const PERF_MS = 5000;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];

// Downscaled pixels of the n-th canvas inside #project-content (0 = hero).
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

async function open(query = '', before) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (before) await before(page);
  const res = await page.goto(`${BASE}/projects/${slug}${query}`, { waitUntil: 'networkidle' });
  if (!res || res.status() >= 400) throw new Error(`/projects/${slug} returned ${res ? res.status() : 'no response'}`);
  await page.waitForTimeout(400);
  return page;
}

// Hero frames at each requested time.
const cells = [];
for (const t of TIMES) {
  const page = await open(`?film-t=${t}`);
  cells.push((await grab(page)).url);
  await page.close();
}

// Loop seam.
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

// Hero frame cost. requestAnimationFrame is wrapped before any page script runs and every
// callback is timed, grouped by callback identity (each player instance schedules its own
// `tick`). Every canvas except the hero is hidden first, which makes the player stop those
// films, so the dominant group is the hero's draw; `callbacks` lists the others (e.g. GSAP).
let perf = null;
if (has('perf')) {
  const page = await open('', (pg) =>
    pg.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      const S = (window.__filmPerf = { on: false, long: 0, groups: new Map() });
      window.requestAnimationFrame = (cb) =>
        raf((now) => {
          const t0 = performance.now();
          try {
            return cb(now);
          } finally {
            if (S.on) {
              let g = S.groups.get(cb);
              if (!g) S.groups.set(cb, (g = { name: cb.name || '(anonymous)', samples: [], starts: [] }));
              g.samples.push(performance.now() - t0);
              g.starts.push(t0);
            }
          }
        });
      try {
        new PerformanceObserver((l) => {
          if (S.on) S.long += l.getEntries().length;
        }).observe({ entryTypes: ['longtask'] });
      } catch {}
    }),
  );
  await page.evaluate(() => {
    const hero = document.querySelector('#project-content canvas');
    document.querySelectorAll('canvas').forEach((c) => {
      if (c !== hero) c.style.display = 'none';
    });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const S = window.__filmPerf;
    S.groups = new Map();
    S.long = 0;
    S.on = true;
  });
  await page.waitForTimeout(PERF_MS);
  const r = await page.evaluate(() => {
    const S = window.__filmPerf;
    S.on = false;
    const hero = document.querySelector('#project-content canvas');
    const hb = hero ? hero.getBoundingClientRect() : { width: 0, height: 0 };
    const inView = [...document.querySelectorAll('canvas')].filter((c) => {
      const b = c.getBoundingClientRect();
      return b.width > 0 && b.bottom > -100 && b.top < innerHeight + 100;
    }).length;
    return { groups: [...S.groups.values()], long: S.long, hero: `${Math.round(hb.width)}x${Math.round(hb.height)}`, inView };
  });
  await page.close();
  const sum = (xs) => xs.reduce((x, y) => x + y, 0);
  const mean = (xs) => (xs.length ? +(sum(xs) / xs.length).toFixed(2) : null);
  const main = r.groups.slice().sort((x, y) => sum(y.samples) - sum(x.samples))[0] ?? { name: 'none', samples: [], starts: [] };
  const sorted = [...main.samples].sort((x, y) => x - y);
  const q = (p) => (sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))].toFixed(2) : null);
  const gaps = main.starts.slice(1).map((t, i) => t - main.starts[i]);
  perf = {
    meanFrameMs: mean(main.samples),
    medianFrameMs: q(0.5),
    p95FrameMs: q(0.95),
    maxFrameMs: sorted.length ? +sorted[sorted.length - 1].toFixed(2) : null,
    frames: sorted.length,
    meanIntervalMs: mean(gaps),
    longTasks: r.long,
    hero: r.hero,
    canvasesInView: r.inView,
    callbacks: r.groups.map((g) => ({ name: g.name, frames: g.samples.length, meanMs: mean(g.samples) })),
  };
}

// Live page: chapter tiles and the text outline.
const live = await open();
const count = await live.locator('#project-content canvas').count();
const tiles = [];
const captured = [];
for (let i = 1; i < count; i++) {
  if (TILES && !TILES.has(i - 1)) continue;
  await live.locator('#project-content canvas').nth(i).scrollIntoViewIfNeeded();
  await live.waitForTimeout(2200);
  tiles.push((await grab(live, i)).url);
  captured.push(i - 1);
}

let text = null;
if (has('text')) {
  text = await live.evaluate(() => {
    const T = (el) => (el ? el.textContent.trim() : null);
    const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
    const h1 = document.querySelector('main h1');
    const titleEl = h1 && h1.nextElementSibling;
    const metaRow = h1 && h1.parentElement && h1.parentElement.nextElementSibling;
    const metaSpans = metaRow ? [...metaRow.querySelectorAll('span')].map(T).filter(Boolean) : [];
    const description = document.querySelector('meta[name="description"]')?.content ?? null;
    const paras = (root) => (root ? [...root.querySelectorAll('p')].map(T) : []);
    const intro = document.querySelector('#introduction');
    const introHeading = T(intro && intro.querySelector('h2'));
    const introBody = paras(intro);
    const nav = [...document.querySelectorAll('main button > h2')].map(T);
    const sections = [...document.querySelectorAll('#project-content section')]
      .filter((s) => s.id !== 'introduction')
      .map((s) => {
        const body = paras(s);
        const heading = T(s.querySelector('h4'));
        return {
          id: s.id,
          label: T(s.querySelector('h3')),
          heading,
          headingChars: heading ? heading.length : 0,
          paragraphs: body.length,
          chars: body.map((x) => x.length),
          words: body.map(words),
          links: s.querySelectorAll('a').length,
        };
      });
    const container = document.querySelector('#project-content > div:last-child');
    const order = container
      ? [...container.children].map((el) => {
          if (el.tagName === 'SECTION') return `sec:${el.id}`;
          const idx = [...el.querySelectorAll('.t-label')].map((x) => parseInt(T(x), 10) - 1).filter(Number.isInteger);
          if (idx.length === 2) return `pair${idx[0]}-${idx[1]}`;
          if (idx.length === 1) return `tile${idx[0]}`;
          return el.tagName.toLowerCase();
        })
      : [];
    const title = T(titleEl);
    return {
      client: T(h1),
      title,
      titleChars: title ? title.length : 0,
      sector: metaSpans[0] ?? null,
      year: metaSpans[1] ?? null,
      description,
      descriptionChars: description ? description.length : 0,
      intro: { heading: introHeading, headingChars: introHeading ? introHeading.length : 0, paragraphs: introBody.length, chars: introBody.map((x) => x.length), words: introBody.map(words) },
      nav,
      sections,
      order,
    };
  });
}

// Sheets: 3 columns, at most 12 cells each.
const all = [...cells, ...tiles];
const sheets = [];
await fs.mkdir(OUT, { recursive: true });
for (let s = 0; s < all.length; s += PER_SHEET) {
  const chunk = all.slice(s, s + PER_SHEET);
  const png = await live.evaluate(async ([urls, w, h, cols]) => {
    const o = document.createElement('canvas');
    o.width = w * cols; o.height = h * Math.max(1, Math.ceil(urls.length / cols));
    const g = o.getContext('2d');
    for (let i = 0; i < urls.length; i++) {
      const img = new Image();
      img.src = urls[i];
      await img.decode();
      g.drawImage(img, (i % cols) * w, Math.floor(i / cols) * h);
    }
    return o.toDataURL('image/png');
  }, [chunk, CELL_W, CELL_H, COLS]);
  const file = path.join(OUT, sheets.length ? `${slug}-${sheets.length + 1}.png` : `${slug}.png`);
  await fs.writeFile(file, Buffer.from(png.split(',')[1], 'base64'));
  sheets.push(file);
}
await live.close();
await browser.close();

console.log(JSON.stringify({ sheets, heroFrames: cells.length, chapterTiles: tiles.length, tilesCaptured: captured, canvases: count, seam, perf, text, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
