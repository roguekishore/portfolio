#!/usr/bin/env node
// Captures inner pages step by step, saving after every step so a dropped
// connection keeps partial results.
//
//   node pages.mjs project <slug> [--out ../reference/pages]
//   node pages.mjs work
//   node pages.mjs transitions
//   node pages.mjs mobile <path>
//
// DOM is recorded as a skeleton (tags, classes, sizes, text *styles*), never
// as text content.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { VIEWPORTS, launch, pad, writeJSON, log } from './lib.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: '../reference/pages' },
    base: { type: 'string', default: 'https://koto.com' },
    proxy: { type: 'string', default: process.env.HTTPS_PROXY || process.env.https_proxy || '' },
  },
});
const [step, target] = positionals;
const OUT = path.resolve(args.out);

// Browser-side: indented skeleton of an element (classes, size, text style).
function skeleton({ sel, maxDepth = 7, maxKids = 6 }) {
  const root = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!root) return null;
  const lines = [];
  const walk = (el, d) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none') return;
    const r = el.getBoundingClientRect();
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    const t = hasText ? ` ⟨${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0].replace(/"/g, '')} ${cs.fontWeight} ${cs.color}${cs.textTransform !== 'none' ? ' ' + cs.textTransform : ''}⟩` : '';
    const m = /^(IMG|VIDEO|IFRAME|CANVAS)$/.test(el.tagName) ? ' [media]' : '';
    const pos = cs.position !== 'static' ? ` pos:${cs.position}` : '';
    lines.push(`${'  '.repeat(d)}${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} .${[...el.classList].join('.').slice(0, 220)} ${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top + scrollY)}${pos}${t}${m}`);
    if (d >= maxDepth) return;
    const kids = [...el.children];
    kids.slice(0, maxKids).forEach((k) => walk(k, d + 1));
    if (kids.length > maxKids) lines.push(`${'  '.repeat(d + 1)}… +${kids.length - maxKids} more`);
  };
  walk(root, 0);
  return lines.join('\n');
}

async function newPage(browser, vp = 'desktop') {
  const page = await (await browser.newContext({ ...VIEWPORTS[vp], reducedMotion: 'no-preference' })).newPage();
  return page;
}

async function open(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.locator('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll').click({ timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(400);
}

const frames = async (page, dir, name, times, opts = {}) => {
  await fs.mkdir(dir, { recursive: true });
  const t0 = Date.now();
  for (const ms of times) {
    const w = t0 + ms - Date.now();
    if (w > 0) await page.waitForTimeout(w);
    await page.screenshot({ path: path.join(dir, `${name}_t${pad(ms, 4)}.png`), ...opts }).catch(() => {});
  }
};

async function project(browser, slug) {
  const dir = path.join(OUT, slug);
  await fs.mkdir(dir, { recursive: true });
  const page = await newPage(browser);
  await open(page, `${args.base}/projects/${slug}`);
  await page.waitForSelector('#project-content', { timeout: 20000 });

  // load sequence of the case study itself
  await page.reload({ waitUntil: 'commit' });
  await frames(page, path.join(dir, 'load'), 'load', [0, 300, 700, 1200, 1800, 2600, 4000]);
  await page.waitForSelector('#project-content', { timeout: 20000 });
  await page.waitForTimeout(1500);

  const top = await page.evaluate(skeleton, { sel: '#project-main > div', maxDepth: 9, maxKids: 12 });
  await fs.writeFile(path.join(dir, 'sidebar.txt'), top ?? 'missing');
  const meta = await page.evaluate(() => {
    const content = document.querySelector('#project-content');
    const kids = [...content.children];
    const box = kids.reduce((a, b) => (b.children.length > a.children.length ? b : a));
    box.setAttribute('data-cap-modules', '');
    [...box.children].forEach((m, i) => m.setAttribute('data-cap-module', i));
    return { kids: kids.length, modules: box.children.length, height: document.documentElement.scrollHeight };
  });
  log(`[${slug}] ${meta.modules} modules, page ${meta.height}px`);
  await fs.writeFile(path.join(dir, 'hero-intro.txt'), [await page.evaluate(skeleton, { sel: '#project-content > :nth-child(1)', maxDepth: 8 }), await page.evaluate(skeleton, { sel: '#introduction', maxDepth: 9, maxKids: 10 })].join('\n\n'));

  // Each module: skeleton, reveal frames as it scrolls in, settled screenshot.
  const modules = [];
  for (let i = 0; i < meta.modules; i++) {
    const loc = page.locator(`[data-cap-module="${i}"]`);
    const sk = await page.evaluate(skeleton, { sel: `[data-cap-module="${i}"]`, maxDepth: 7, maxKids: 8 });
    // put the module's top just below the fold, then scroll it in with the wheel
    const y = await loc.evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => scrollTo(0, Math.max(0, y - innerHeight)), y);
    await page.waitForTimeout(500);
    await page.mouse.move(900, 450);
    await page.mouse.wheel(0, 450);
    if (i < 6) await frames(page, path.join(dir, 'reveal'), `m${pad(i, 2)}`, [0, 120, 300, 600, 1000]);
    await page.waitForTimeout(700);
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(600);
    await loc.screenshot({ path: path.join(dir, `module${pad(i, 2)}.png`), timeout: 15000 }).catch(() => {});
    modules.push({ i, skeleton: sk });
    await writeJSON(path.join(dir, 'modules.json'), modules);
  }

  // Footer: scroll to the end in steps and record how the pinned footer reveals.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const fdir = path.join(dir, 'footer');
  await fs.mkdir(fdir, { recursive: true });
  for (let k = 0; k <= 6; k++) {
    await page.evaluate(([h, k]) => scrollTo(0, h - innerHeight - (6 - k) * 200), [h, k]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(fdir, `end-${(6 - k) * 200}px.png`) });
  }
  await fs.writeFile(path.join(dir, 'footer.txt'), (await page.evaluate(skeleton, { sel: '#main > div:last-child, [class*="md:fixed"][class*="md:bottom-0"]', maxDepth: 10, maxKids: 8 })) ?? 'missing');
  log(`[${slug}] done`);
}

async function work(browser) {
  const dir = path.join(OUT, 'work');
  await fs.mkdir(dir, { recursive: true });
  const page = await newPage(browser);
  await open(page, `${args.base}/work`);
  await fs.writeFile(path.join(dir, 'sidebar.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:first-child', maxDepth: 10, maxKids: 10 })) ?? 'missing');
  await fs.writeFile(path.join(dir, 'grid.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:nth-child(2)', maxDepth: 9, maxKids: 5 })) ?? 'missing');
  await page.screenshot({ path: path.join(dir, 'top.png') });

  // hover a card: card treatment + sidebar preview
  const cards = page.locator('#main .grid > div a').filter({ visible: true });
  const n = await cards.count();
  log(`[work] ${n} visible card links`);
  for (const idx of [0, 1, 3]) {
    if (idx >= n) break;
    const b = await cards.nth(idx).boundingBox();
    if (!b) continue;
    await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 300), { steps: 6 });
    await frames(page, path.join(dir, 'hover'), `card${idx}`, [0, 120, 300, 700]);
  }
  await fs.writeFile(path.join(dir, 'preview.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:first-child .mt-auto', maxDepth: 10, maxKids: 8 })) ?? 'missing');
  await page.mouse.move(150, 500);
  await page.waitForTimeout(600);

  // filter overlay
  const filter = page.locator('button:has-text("Filter")').filter({ visible: true }).first();
  if (await filter.count()) {
    await filter.click();
    await frames(page, path.join(dir, 'filter'), 'open', [0, 100, 200, 350, 500, 800, 1200]);
    await fs.writeFile(path.join(dir, 'filter.txt'), (await page.evaluate(() => {
      const o = [...document.querySelectorAll('div.fixed')].find((d) => d.querySelectorAll('a').length >= 4 && getComputedStyle(d).zIndex === '100');
      return o ? o.outerHTML.replace(/>[^<]+</g, '><').replace(/\s(href|src|srcset)="[^"]*"/g, '').slice(0, 20000) : 'missing';
    })));
    // hover then click the second category
    const opts = page.locator('div.fixed a').filter({ visible: true });
    const oc = await opts.count();
    log(`[work] filter options: ${oc}`);
    if (oc > 1) {
      const ob = await opts.nth(1).boundingBox();
      await page.mouse.move(ob.x + ob.width / 2, ob.y + ob.height / 2, { steps: 4 });
      await frames(page, path.join(dir, 'filter'), 'opthover', [0, 200, 500]);
      const before = page.url();
      await opts.nth(1).click();
      await frames(page, path.join(dir, 'filter'), 'apply', [0, 100, 250, 400, 600, 900, 1400, 2200]);
      log(`[work] filter url ${before} -> ${page.url()}`);
      await fs.writeFile(path.join(dir, 'filtered-url.txt'), page.url());
    }
  } else log('[work] no filter button');

  // Partnerships tab
  await open(page, `${args.base}/work`);
  const tab = page.locator('a:has-text("Partnerships")').filter({ visible: true }).first();
  if (await tab.count()) {
    await tab.click();
    await frames(page, path.join(dir, 'tab'), 'partnerships', [0, 120, 250, 400, 600, 900, 1400, 2200]);
    await fs.writeFile(path.join(dir, 'partnerships-url.txt'), page.url());
    await fs.writeFile(path.join(dir, 'partnerships-grid.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:nth-child(2)', maxDepth: 9, maxKids: 5 })) ?? 'missing');
  }

  // scroll states
  await open(page, `${args.base}/work`);
  for (let k = 0; k < 6; k++) {
    await page.mouse.move(900, 450);
    await page.mouse.wheel(0, 540);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(dir, `scroll${k}.png`) });
  }
  log('[work] done');
}

async function transitions(browser) {
  const dir = path.join(OUT, 'transitions');
  const runs = [
    { name: 'home-to-work', url: '/', click: '#section-our-work a[href="/work"]', scroll: true },
    { name: 'nav-to-work', url: '/', click: '.mix-blend-exclusion a[href="/work"]' },
    { name: 'home-to-project', url: '/', click: 'a[href="/projects/instagram"]', scroll: true },
    { name: 'work-to-project', url: '/work', click: '#main .grid a[href^="/projects/"]' },
    { name: 'project-to-next', url: '/projects/instagram', click: '[class*="md:fixed"][class*="md:bottom-0"] a[href^="/projects/"]', end: true },
  ];
  for (const r of runs) {
    try {
      const page = await newPage(browser);
      await open(page, args.base + r.url);
      const target = page.locator(r.click).filter({ visible: true }).first();
      if (r.end) {
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.evaluate((h) => scrollTo(0, h), h);
        await page.waitForTimeout(1500);
      }
      if (!(await target.count())) { log(`[transition] ${r.name}: no target ${r.click}`); continue; }
      if (r.scroll) await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      const href = await target.getAttribute('href');
      await page.evaluate(() => { window.__m = true; });
      const b = await target.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 200));
      await page.waitForTimeout(300);
      await page.mouse.down(); await page.mouse.up();
      const fdir = path.join(dir, r.name);
      await frames(page, fdir, 'f', [0, 80, 160, 250, 350, 500, 650, 800, 1000, 1250, 1600, 2200, 3200]);
      const spa = await page.evaluate(() => window.__m === true).catch(() => false);
      await writeJSON(path.join(fdir, 'transition.json'), { ...r, href, finalUrl: page.url(), navigation: spa ? 'client-side' : 'document load' });
      log(`[transition] ${r.name}: ${href} -> ${page.url()} (${spa ? 'client-side' : 'document load'})`);
      await page.context().close();
    } catch (e) {
      log(`[transition] ${r.name} failed: ${e.message.split('\n')[0]}`);
    }
  }
}

async function mobile(browser, p) {
  const dir = path.join(OUT, 'mobile', p.replace(/\//g, '_').replace(/^_/, '') || 'home');
  await fs.mkdir(dir, { recursive: true });
  const page = await newPage(browser, 'mobile');
  await open(page, args.base + p);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  let k = 0;
  for (let y = 0; y < h && k < 40; y += 640, k++) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(dir, `s${pad(k, 2)}_y${pad(y, 5)}.png`) });
  }
  log(`[mobile] ${p}: ${k} frames, page ${h}px`);
}

// Case-study sidebar: skeleton plus its state as each chapter anchor scrolls in.
async function sidebar(browser, slug) {
  const dir = path.join(OUT, slug, 'sidebar');
  await fs.mkdir(dir, { recursive: true });
  const page = await newPage(browser);
  await open(page, `${args.base}/projects/${slug}`);
  const sel = '#project-main > div[class*="md:w-sidebar"]';
  await fs.writeFile(path.join(OUT, slug, 'sidebar.txt'), (await page.evaluate(skeleton, { sel, maxDepth: 12, maxKids: 12 })) ?? 'missing');
  await page.screenshot({ path: path.join(dir, 'top.png'), clip: { x: 0, y: 0, width: 720, height: 900 } });
  const anchors = await page.evaluate(() => [...document.querySelectorAll('#project-content [id]')].map((e) => e.id).filter((id) => id !== 'introduction'));
  for (const [k, id] of anchors.entries()) {
    await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start' }), id);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(dir, `chapter${k}.png`), clip: { x: 0, y: 0, width: 720, height: 900 } });
  }
  // click the second chapter link in the sidebar and watch the scroll
  const links = page.locator(`${sel} a[href^="#"], ${sel} button`).filter({ visible: true });
  log(`[${slug}] sidebar anchors: ${anchors.join(', ')}; ${await links.count()} sidebar links/buttons`);
  await writeJSON(path.join(dir, 'anchors.json'), anchors);
}

// Remaining /work states: apply a filter, Partnerships view, scroll states.
async function work2(browser) {
  const dir = path.join(OUT, 'work');
  const page = await newPage(browser);
  await open(page, `${args.base}/work`);
  await page.locator('button:has-text("Filter")').filter({ visible: true }).first().click();
  await page.waitForTimeout(1200);
  const opts = page.locator('div.fixed.z-100 a').filter({ visible: true });
  const n = await opts.count();
  log(`[work] filter options visible: ${n}`);
  if (n > 1) {
    await opts.nth(1).click({ force: true });
    await frames(page, path.join(dir, 'filter'), 'apply', [0, 100, 250, 400, 600, 900, 1400, 2200]);
    await fs.writeFile(path.join(dir, 'filtered-url.txt'), page.url());
    await fs.writeFile(path.join(dir, 'filtered-sidebar.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:first-child', maxDepth: 10, maxKids: 10 })) ?? 'missing');
    log(`[work] filtered url ${page.url()}; cards ${await page.locator('#main .grid > div').count()}`);
  }
  await open(page, `${args.base}/work`);
  const tab = page.locator('#main a:has-text("Partnerships"), #main div:has-text("Partnerships") >> nth=-1').filter({ visible: true }).first();
  if (await tab.count()) {
    await tab.click({ force: true });
    await frames(page, path.join(dir, 'tab'), 'partnerships', [0, 120, 250, 400, 600, 900, 1400, 2200]);
    await fs.writeFile(path.join(dir, 'partnerships-url.txt'), page.url());
    await fs.writeFile(path.join(dir, 'partnerships-grid.txt'), (await page.evaluate(skeleton, { sel: '#main > div > div:nth-child(2)', maxDepth: 9, maxKids: 5 })) ?? 'missing');
    log(`[work] partnerships url ${page.url()}`);
  }
  await open(page, `${args.base}/work`);
  for (let k = 0; k < 5; k++) {
    await page.mouse.move(900, 450);
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(dir, `scroll${k}.png`) });
  }
}

// Dense transition timing (every 50ms) and the next-project footer click.
async function dense(browser) {
  const dir = path.join(OUT, 'transitions');
  const T = Array.from({ length: 49 }, (_, i) => i * 50);
  const runs = [
    { name: 'dense-home-to-work', url: '/', sel: '#section-our-work a[href="/work"]' },
    { name: 'dense-work-to-project', url: '/work', sel: '#main .grid a[href^="/projects/"]' },
    { name: 'dense-project-to-next', url: '/projects/instagram', footer: true },
  ];
  for (const r of runs) {
    try {
      const page = await newPage(browser);
      await open(page, args.base + r.url);
      let x, y;
      if (r.footer) {
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(1800);
        const box = await page.evaluate(() => {
          const v = [...document.querySelectorAll('[class*="md:fixed"][class*="md:bottom-0"] video, [class*="md:fixed"][class*="md:bottom-0"] img')].map((e) => e.getBoundingClientRect()).find((b) => b.width > 100 && b.top < innerHeight);
          return v ? { x: v.left + v.width / 2, y: Math.min(v.top + 60, innerHeight - 20) } : null;
        });
        if (!box) { log(`[dense] ${r.name}: footer media not found`); continue; }
        ({ x, y } = box);
        await page.screenshot({ path: path.join(dir, `${r.name}-before.png`) }).catch(() => {});
      } else {
        const t = page.locator(r.sel).filter({ visible: true }).first();
        await t.scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        const b = await t.boundingBox();
        x = b.x + b.width / 2; y = b.y + Math.min(b.height / 2, 200);
      }
      await page.mouse.move(x, y);
      await page.waitForTimeout(400);
      await page.evaluate(() => { window.__m = true; });
      await page.mouse.down(); await page.mouse.up();
      await frames(page, path.join(dir, r.name), 'f', T);
      const spa = await page.evaluate(() => window.__m === true).catch(() => false);
      await writeJSON(path.join(dir, r.name, 'transition.json'), { ...r, finalUrl: page.url(), navigation: spa ? 'client-side' : 'document load' });
      log(`[dense] ${r.name} -> ${page.url()} (${spa ? 'client-side' : 'document load'})`);
      await page.context().close();
    } catch (e) {
      log(`[dense] ${r.name} failed: ${e.message.split('\n')[0]}`);
    }
  }
}

// Module list only (no screenshots) — for surveying long pages quickly.
async function survey(browser, slug) {
  const page = await newPage(browser);
  await open(page, `${args.base}/projects/${slug}`);
  await page.waitForSelector('#project-content', { timeout: 20000 });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 900) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(120); }
  const list = await page.evaluate(() => {
    const kids = [...document.querySelector('#project-content').children];
    const box = kids.reduce((a, b) => (b.children.length > a.children.length ? b : a));
    return [...box.children].map((m, i) => {
      const r = m.getBoundingClientRect();
      const first = m.firstElementChild;
      return { i, id: m.id || null, size: `${Math.round(r.width)}x${Math.round(r.height)}`, media: m.querySelectorAll('img,video,iframe').length, layout: (first?.className.match(/aspect-\[[^\]]+\]|flex gap-x-2|grid-cols-\d+|border-t|py-16/g) || []).join(' '), fonts: [...new Set([...m.querySelectorAll('*')].filter((n) => [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).map((n) => getComputedStyle(n).fontSize + ' ' + getComputedStyle(n).fontFamily.split(',')[0].replace(/"/g, '')))] };
    });
  });
  await writeJSON(path.join(OUT, slug, 'survey.json'), list);
  log(`[${slug}] ${list.length} modules`);
  for (const m of list) console.log(`  #${m.i} ${m.size}${m.id ? ' #' + m.id : ''} media:${m.media} ${m.layout} ${m.fonts.join(', ')}`);
}

const browser = await launch(args.proxy);
try {
  if (step === 'sidebar') await sidebar(browser, target);
  else if (step === 'work2') await work2(browser);
  else if (step === 'dense') await dense(browser);
  else if (step === 'survey') await survey(browser, target);
  else if (step === 'project') await project(browser, target);
  else if (step === 'work') await work(browser);
  else if (step === 'transitions') await transitions(browser);
  else if (step === 'mobile') await mobile(browser, target || '/work');
  else console.error('steps: project <slug> | work | transitions | mobile <path>');
} finally {
  await browser.close();
}
