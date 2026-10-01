#!/usr/bin/env node
// Captures reference screenshots and design data from a live site.
//
//   node capture.mjs --url https://koto.com --out ../reference
//
// Output layout (per viewport: desktop 1440x900, mobile 390x844@2x):
//   <out>/<vp>/load/*.png         load/intro sequence frames (time-stamped)
//   <out>/<vp>/scroll/*.png       one frame per scroll step (y in filename)
//   <out>/<vp>/fullpage.png       full-page screenshot after lazy content loaded
//   <out>/<vp>/sections/*.png     each top-level section, scrolled to its top
//   <out>/<vp>/data/*.json        extracted tokens/animation state
//   <out>/desktop/details/*.png   2x crops (header, hero, each section top)
//   <out>/desktop/hover/*.png     before/after hover pairs + diffs in hover.json
//   <out>/mobile/menu/*.png       mobile menu open sequence
//   <out>/network.json, libraries.json, css/*.css, summary.md
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { VIEWPORTS, DETAIL_VIEWPORT, launch, pad, writeJSON, log, scrollThrough, scrollBy, scrollToTop } from './lib.mjs';
import { extractDesign, animationSnapshot, pickHoverTargets, styleSnapshot } from './extract.mjs';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'https://koto.com' },
    out: { type: 'string', default: '../reference' },
    proxy: { type: 'string', default: process.env.HTTPS_PROXY || process.env.https_proxy || '' },
    timeout: { type: 'string', default: '60000' },
    hover: { type: 'string', default: '20' },
    only: { type: 'string', default: '' }, // "desktop" or "mobile"
  },
});
const OUT = path.resolve(args.out);
const TIMEOUT = Number(args.timeout);

// Library fingerprints searched for in every JS response body.
const SIGNATURES = {
  gsap: /\bgsap\b|GreenSock/,
  ScrollTrigger: /ScrollTrigger/,
  SplitText: /SplitText/,
  CustomEase: /CustomEase/,
  'gsap Flip': /\bFlip\.(getState|from)\b/,
  'lottie-web': /bodymovin|lottie-web|loadAnimation\(/,
  dotlottie: /dotlottie/i,
  'three.js': /WebGLRenderer|three\.module|THREE\.REVISION/,
  'react-three-fiber': /@react-three\/fiber|useFrame/,
  ogl: /\bnew\s+Renderer\(\{[^}]*dpr|ogl\/src/,
  lenis: /\blenis\b/i,
  'locomotive-scroll': /locomotive-scroll|LocomotiveScroll/,
  'barba.js': /@barba|barba\.init/,
  swup: /\bswup\b/i,
  swiper: /\bswiper\b/i,
  embla: /embla-carousel|EmblaCarousel/,
  'framer-motion': /framer-motion|AnimatePresence|useMotionValue/,
  'motion (one)': /@motionone|motion\/dom/,
  'anime.js': /animejs|anime\.timeline/,
  'split-type / splitting': /SplitType|Splitting\(/,
  'pixi.js': /PIXI\.|pixi\.js/,
  rive: /@rive-app|rive\.wasm/,
  spline: /@splinetool/,
  'theatre.js': /@theatre\/core/,
  'curtains.js': /curtainsjs|Curtains\(/,
  'matter-js': /Matter\.Engine/,
  'webflow ix2': /Webflow\.require\(['"]ix2/,
  'next.js runtime': /__NEXT_DATA__|next\/dist/,
  react: /react-dom\.production|__reactFiber/,
  vue: /__VUE__|createVNode/,
  svelte: /svelte-\w+|SvelteComponent/,
};
const BANNER = /\/\*![\s\S]{0,400}?\*\//g;

const network = [];
const libraries = { byUrl: {}, bySignature: {}, banners: [] };
let cssIndex = 0;

function attachNetwork(page, vp) {
  page.on('response', async (res) => {
    const req = res.request();
    const url = res.url();
    const type = req.resourceType();
    const ct = res.headers()['content-type'] || '';
    const entry = { vp, url: url.slice(0, 300), status: res.status(), type, contentType: ct.split(';')[0], size: Number(res.headers()['content-length']) || null };
    network.push(entry);
    if (vp !== 'desktop') return; // body analysis once is enough
    try {
      if (type === 'stylesheet' || ct.includes('text/css')) {
        const body = await res.text();
        entry.size ??= body.length;
        const name = `${pad(cssIndex++, 2)}-${path.basename(new URL(url).pathname).replace(/[^\w.-]/g, '_').slice(0, 60) || 'style'}${url.endsWith('.css') ? '' : '.css'}`;
        await fs.mkdir(path.join(OUT, 'css'), { recursive: true });
        await fs.writeFile(path.join(OUT, 'css', name), `/* source: ${url} */\n${body}`);
      } else if (type === 'script' || ct.includes('javascript')) {
        const body = await res.text();
        entry.size ??= body.length;
        for (const [lib, re] of Object.entries(SIGNATURES)) {
          const m = body.match(re);
          if (m) {
            const at = m.index;
            (libraries.bySignature[lib] ||= []).push({ url: url.slice(0, 200), context: body.slice(Math.max(0, at - 50), at + 70).replace(/\s+/g, ' ') });
          }
        }
        for (const b of body.match(BANNER) || []) if (/v?\d+\.\d+\.\d+|license/i.test(b)) libraries.banners.push(b.replace(/\s+/g, ' ').slice(0, 220));
        const ver = body.match(/(?:GSAP|gsap)\s+(\d+\.\d+\.\d+)/);
        if (ver) libraries.gsapVersion = ver[1];
      } else if (ct.includes('json')) {
        const body = await res.text();
        if (/"layers"\s*:/.test(body) && /"fr"\s*:/.test(body) && /"ip"\s*:/.test(body)) {
          const j = JSON.parse(body);
          (libraries.lottieFiles ||= []).push({ url: url.slice(0, 200), fps: j.fr, frames: j.op - j.ip, size: [j.w, j.h], version: j.v, layers: j.layers?.length });
        }
      }
    } catch { /* body unavailable for redirects/streams */ }
    for (const [lib, re] of Object.entries({
      gsap: /gsap|greensock/i, lottie: /lottie|bodymovin/i, three: /three(\.module)?(\.min)?\.js|\/three@/i, lenis: /lenis/i,
      'google fonts': /fonts\.(googleapis|gstatic)\.com/, 'adobe fonts': /use\.typekit\.net|p\.typekit\.net/, 'font file': /\.(woff2?|otf|ttf)(\?|$)/i,
      'next.js': /\/_next\//, nuxt: /\/_nuxt\//, webflow: /webflow/i, framer: /framerusercontent|framer\.com/, vimeo: /vimeo/i, mux: /mux\.com/i,
      sanity: /cdn\.sanity\.io/, contentful: /ctfassets\.net/, prismic: /prismic\.io/, datocms: /datocms/, cloudinary: /cloudinary/, vercel: /vercel|_vercel/,
    })) if (re.test(url)) (libraries.byUrl[lib] ||= new Set()).add(url.slice(0, 200));
  });
  page.on('requestfailed', (req) => network.push({ vp, url: req.url().slice(0, 300), failed: req.failure()?.errorText }));
}

async function shot(page, file, opts = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try { await page.screenshot({ path: file, animations: 'allow', timeout: 30000, ...opts }); return true; }
  catch (e) { log('  screenshot failed', path.basename(file), e.message.split('\n')[0]); return false; }
}

async function captureViewport(browser, vp) {
  const dir = path.join(OUT, vp);
  const wheel = vp === 'desktop';
  const context = await browser.newContext({ ...VIEWPORTS[vp], reducedMotion: 'no-preference' });
  const page = await context.newPage();
  attachNetwork(page, vp);

  // 1. Load sequence: frames at fixed times from navigation commit.
  log(`[${vp}] loading ${args.url}`);
  const t0 = Date.now();
  await page.goto(args.url, { waitUntil: 'commit', timeout: TIMEOUT });
  for (const ms of [0, 250, 500, 800, 1200, 1700, 2400, 3200, 4500, 6500]) {
    const wait = t0 + ms - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await shot(page, path.join(dir, 'load', `t${pad(ms, 5)}ms.png`));
  }
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => log(`[${vp}] networkidle not reached, continuing`));
  await page.waitForTimeout(1500);

  // 2. Design data at rest (before any scroll-triggered state changes).
  const design = await page.evaluate(extractDesign);
  for (const [k, v] of Object.entries(design)) await writeJSON(path.join(dir, 'data', `${k}.json`), v);
  log(`[${vp}] extracted ${design.typography.length} text styles, ${design.sections.length} sections, ${design.css.customProperties.length} custom props`);
  const ov = design.document.horizontalOverflow;
  if (ov) log(`[${vp}] WARNING horizontal overflow: content ${ov.scrollWidth}px > viewport ${ov.clientWidth}px (innerWidth ${ov.innerWidth}); offenders: ${ov.offenders.slice(0, 3).join(' | ')}`);

  // 3. Scroll states.
  const steps = [];
  const count = await scrollThrough(page, {
    wheel,
    onStep: async (i, y) => {
      await shot(page, path.join(dir, 'scroll', `${pad(i)}_y${pad(y, 5)}.png`));
      steps.push({ i, y, ...(await page.evaluate(animationSnapshot)) });
    },
  });
  // Header behaviour on scroll-up (hide/reveal patterns).
  await scrollBy(page, -Math.round(VIEWPORTS[vp].viewport.height * 0.4), { wheel });
  await page.waitForTimeout(900);
  await shot(page, path.join(dir, 'scroll', 'zz_after-scroll-up.png'));
  await writeJSON(path.join(dir, 'data', 'scroll-steps.json'), steps);
  log(`[${vp}] ${count} scroll states`);

  // 4. State after everything has been scrolled through once.
  const after = await page.evaluate(extractDesign);
  await writeJSON(path.join(dir, 'data', 'animations-after-scroll.json'), { animations: after.animations, gsap: after.gsap ?? null, lottie: after.lottie ?? null });

  // 5. Full page.
  await scrollToTop(page);
  await shot(page, path.join(dir, 'fullpage.png'), { fullPage: true });

  // 6. Each top-level section scrolled to the top of the viewport.
  const topLevel = design.sections.filter((s) => s.depth === 0);
  for (const s of topLevel) {
    await page.evaluate((y) => window.scrollTo(0, y), s.top);
    await page.waitForTimeout(1000);
    const slug = s.el.split(' > ').pop().replace(/[^\w-]+/g, '_').slice(0, 40);
    await shot(page, path.join(dir, 'sections', `${pad(s.i, 2)}_${slug}.png`));
  }

  // 7. Hover states (desktop) / menu (mobile).
  if (vp === 'desktop') await captureHovers(page, dir);
  else await captureMobileMenu(page, dir);

  await context.close();
  return { sections: topLevel.length, scrollSteps: count, design };
}

async function captureHovers(page, dir) {
  await scrollToTop(page);
  const targets = await page.evaluate(pickHoverTargets, Number(args.hover));
  const results = [];
  for (const t of targets) {
    const loc = page.locator(`[data-cap-hover="${t.i}"]`);
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(700);
      const box = await loc.boundingBox();
      if (!box) continue;
      const vpSize = page.viewportSize();
      const x = Math.max(0, box.x - 32), y = Math.max(0, box.y - 32);
      const clip = { x, y, width: Math.min(vpSize.width - x, box.width + 64), height: Math.min(vpSize.height - y, box.height + 64) };
      if (clip.width < 4 || clip.height < 4) continue;
      const before = await loc.evaluate(styleSnapshot);
      await shot(page, path.join(dir, 'hover', `${pad(t.i, 2)}_a_before.png`), { clip });
      await loc.hover({ force: true, timeout: 5000 });
      await page.waitForTimeout(160);
      await shot(page, path.join(dir, 'hover', `${pad(t.i, 2)}_b_mid160ms.png`), { clip });
      await page.waitForTimeout(700);
      await shot(page, path.join(dir, 'hover', `${pad(t.i, 2)}_c_after.png`), { clip });
      const afterStyles = await loc.evaluate(styleSnapshot);
      const changes = [];
      afterStyles.forEach((n, idx) => {
        const b = before[idx];
        if (!b) return;
        for (const k of Object.keys(n)) if (!['idx', 'tag', 'cls', 'transition'].includes(k) && n[k] !== b[k]) changes.push({ node: `${n.tag}.${n.cls}`, prop: k, from: b[k], to: n[k], transition: n.transition });
      });
      results.push({ ...t, changes });
    } catch (e) {
      results.push({ ...t, error: e.message.split('\n')[0] });
    }
  }
  await page.mouse.move(2, 2);
  await writeJSON(path.join(dir, 'data', 'hover.json'), results);
  log(`[desktop] ${results.length} hover targets, ${results.filter((r) => r.changes?.length).length} with visible style changes`);
}

async function captureMobileMenu(page, dir) {
  await scrollToTop(page);
  const btn = page.locator('header button, nav button, [aria-label*="menu" i], [class*="burger" i], [class*="hamburger" i], [class*="menu-toggle" i], [class*="menuToggle" i]').filter({ visible: true }).first();
  if (!(await btn.count())) { log('[mobile] no menu toggle found'); return; }
  const t0 = Date.now();
  await btn.click({ timeout: 5000 }).catch((e) => log('[mobile] menu click failed', e.message.split('\n')[0]));
  for (const ms of [0, 150, 300, 500, 800, 1300]) {
    const wait = t0 + ms - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
    await shot(page, path.join(dir, 'menu', `open_t${pad(ms, 4)}ms.png`));
  }
  await btn.click({ timeout: 5000 }).catch(() => page.keyboard.press('Escape'));
  await page.waitForTimeout(1000);
  await shot(page, path.join(dir, 'menu', 'closed_after.png'));
}

async function captureDetails(browser, sections) {
  const context = await browser.newContext({ ...DETAIL_VIEWPORT, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.goto(args.url, { waitUntil: 'networkidle', timeout: TIMEOUT }).catch(() => {});
  await page.waitForTimeout(4000);
  const dir = path.join(OUT, 'desktop', 'details');
  await shot(page, path.join(dir, 'hero_2x.png'));
  const header = page.locator('header').first();
  if (await header.count()) await header.screenshot({ path: path.join(dir, 'header_2x.png') }).catch(() => {});
  for (const s of sections) {
    await page.evaluate((y) => window.scrollTo(0, y), s.top);
    await page.waitForTimeout(1000);
    await shot(page, path.join(dir, `section${pad(s.i, 2)}_2x.png`));
  }
  const footer = page.locator('footer').first();
  if (await footer.count()) await footer.screenshot({ path: path.join(dir, 'footer_2x.png') }).catch(() => {});
  await context.close();
}

function summarize(results) {
  const d = results.desktop?.design;
  if (!d) return '# Capture summary\n\nDesktop capture did not complete.\n';
  const lines = [`# Capture summary\n`, `Source: ${args.url}  \nCaptured: ${new Date().toISOString()}\n`];
  const fam = (s) => s.split(',')[0].replace(/["']/g, '').trim();
  lines.push('## Libraries');
  lines.push(`- window globals: ${Object.entries(d.libraries.globals).filter(([, v]) => v).map(([k, v]) => (v === true ? k : `${k}@${v}`)).join(', ') || 'none exposed'}`);
  lines.push(`- found in JS bundles: ${Object.keys(libraries.bySignature).join(', ') || 'none'}${libraries.gsapVersion ? ` (GSAP ${libraries.gsapVersion})` : ''}`);
  lines.push(`- found in request URLs: ${Object.keys(libraries.byUrl).join(', ') || 'none'}`);
  lines.push(`- framework hints: ${Object.entries(d.document.frameworkHints).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}; html class: \`${d.document.htmlClass}\``);
  if (libraries.lottieFiles) lines.push(`- Lottie files: ${libraries.lottieFiles.length}`);
  if (d.gsap) lines.push(`- GSAP ${d.gsap.version}: ${d.gsap.tweens.length} tweens/timelines at rest, ${d.gsap.scrollTriggers?.length ?? 0} ScrollTriggers`);
  lines.push(`- canvases: ${d.media.canvases.length} (${d.media.canvases.map((c) => c.engine).filter(Boolean).join(', ') || 'no engine tag'}), videos: ${d.media.videos.length}, images: ${d.media.images.length}, lottie DOM nodes: ${d.media.lottieDom}\n`);
  lines.push('## Fonts');
  lines.push(`- loaded: ${[...new Set(d.fonts.documentFonts?.filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}${f.style !== 'normal' ? ' ' + f.style : ''}`))].join(', ') || 'none reported'}`);
  lines.push(`- @font-face families: ${[...new Set(d.css.fontFaces.map((f) => f.family))].join(', ') || 'none in same-origin CSS'}\n`);
  lines.push('## Type scale (desktop, largest first)\n\n| family | size | weight | line-height | tracking | transform | uses |\n|---|---|---|---|---|---|---|');
  for (const t of d.typography.slice(0, 24)) lines.push(`| ${fam(t.fontFamily)} | ${t.fontSize} | ${t.fontWeight} | ${t.lineHeight} | ${t.letterSpacing} | ${t.textTransform} | ${t.count} (${Object.keys(t.tags).join(',')}) |`);
  lines.push('\n## Colour\n');
  lines.push(`- backgrounds by painted area: ${d.colors.backgroundByArea.slice(0, 10).map(([c, a]) => `\`${c}\` (${Math.round(a / 1000)}k px²)`).join(', ')}`);
  lines.push(`- text colours: ${d.colors.text.slice(0, 10).map(([c, n]) => `\`${c}\` ×${n}`).join(', ')}`);
  lines.push(`- borders: ${d.colors.border.slice(0, 6).map(([c, n]) => `\`${c}\` ×${n}`).join(', ') || 'none'}`);
  const rootVars = Object.entries(d.css.rootComputed).slice(0, 60);
  if (rootVars.length) lines.push(`- custom properties (${Object.keys(d.css.rootComputed).length} total, first 60):\n${rootVars.map(([k, v]) => `  - \`${k}: ${v}\``).join('\n')}`);
  lines.push('\n## Layout & spacing\n');
  lines.push(`- max-widths: ${d.spacing.maxWidth.slice(0, 8).map(([v, n]) => `${v} ×${n}`).join(', ') || 'none'}`);
  lines.push(`- common padding: ${d.spacing.padding.slice(0, 14).map(([v, n]) => `${v} ×${n}`).join(', ')}`);
  lines.push(`- gaps: ${d.spacing.gap.slice(0, 8).map(([v, n]) => `${v} ×${n}`).join('; ') || 'none'}`);
  lines.push(`- radii: ${d.spacing.borderRadius.slice(0, 8).map(([v, n]) => `${v} ×${n}`).join(', ') || 'none'}`);
  lines.push(`- breakpoints: ${d.css.mediaQueries.slice(0, 15).map(([q, n]) => `\`${q}\` ×${n}`).join(', ') || 'none in same-origin CSS'}\n`);
  lines.push('## Sections (desktop, top level)\n\n| # | element | top | height | bg | heading tag | media |\n|---|---|---|---|---|---|---|');
  for (const s of d.sections.filter((x) => x.depth === 0)) lines.push(`| ${s.i} | \`${s.el.split(' > ').pop()}\` | ${s.top} | ${s.height} | \`${s.background}\` | ${s.headingTag ?? ''} | ${Object.entries(s.counts).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(' ')} |`);
  lines.push(`\nMobile: ${results.mobile?.sections ?? '?'} top-level sections, ${results.mobile?.scrollSteps ?? '?'} scroll states. Desktop: ${results.desktop.scrollSteps} scroll states.\n`);
  lines.push('## Motion\n');
  lines.push(`- CSS transitions:\n${d.animations.cssTransitions.slice(0, 15).map(([k, n]) => `  - \`${k}\` ×${n}`).join('\n') || '  - none'}`);
  lines.push(`- CSS animations:\n${d.animations.cssAnimations.slice(0, 10).map(([k, n]) => `  - \`${k}\` ×${n}`).join('\n') || '  - none'}`);
  lines.push(`- @keyframes: ${d.css.keyframes.map((k) => k.name).join(', ') || 'none in same-origin CSS'}`);
  lines.push(`- animation-related data attributes: ${d.animations.dataAttributes.slice(0, 12).map(([k, n]) => `\`${k}\` ×${n}`).join(', ') || 'none'}`);
  lines.push(`- elements with inline transform/opacity at rest (JS-animated): ${d.animations.inlineMotionStyles.length}; split-text pieces: ${d.animations.splitTextPieces}; custom cursor candidates: ${d.animations.customCursor.join(', ') || 'none'}`);
  if (d.gsap?.scrollTriggers?.length) lines.push(`- ScrollTriggers:\n${d.gsap.scrollTriggers.slice(0, 25).map((s) => `  - ${s.trigger} start=${s.startVar || s.start} end=${s.endVar || s.end} scrub=${s.scrub} pin=${s.pin} ${s.toggleActions ?? ''}`).join('\n')}`);
  if (d.lenis) lines.push(`- Lenis options: \`${JSON.stringify(d.lenis).slice(0, 300)}\``);
  lines.push('\nSee `*/data/*.json` for the full extraction and `*/hover`, `*/scroll`, `*/load` for frames.');
  return lines.join('\n');
}

const browser = await launch(args.proxy);
const results = {};
try {
  for (const vp of ['desktop', 'mobile']) {
    if (args.only && args.only !== vp) continue;
    results[vp] = await captureViewport(browser, vp);
  }
  if (results.desktop) {
    log('[details] 2x crops');
    await captureDetails(browser, results.desktop.design.sections.filter((s) => s.depth === 0));
  }
} finally {
  await browser.close();
  for (const k of Object.keys(libraries.byUrl)) libraries.byUrl[k] = [...libraries.byUrl[k]].slice(0, 15);
  libraries.banners = [...new Set(libraries.banners)].slice(0, 60);
  await writeJSON(path.join(OUT, 'network.json'), network);
  await writeJSON(path.join(OUT, 'libraries.json'), libraries);
  await fs.writeFile(path.join(OUT, 'summary.md'), summarize(results));
  log(`done -> ${OUT}`);
}
