#!/usr/bin/env node
// Lists every same-origin link on a page, grouped by route, with the label and
// section each one sits in. Scrolls the page first so lazy content renders.
//
//   node links.mjs --url https://koto.com [--out ../reference/links.json]
import { parseArgs } from 'node:util';
import { VIEWPORTS, launch, writeJSON, scrollThrough, scrollToTop } from './lib.mjs';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string', default: 'https://koto.com' },
    out: { type: 'string', default: '' },
    proxy: { type: 'string', default: process.env.HTTPS_PROXY || process.env.https_proxy || '' },
  },
});

const browser = await launch(args.proxy);
try {
  const page = await (await browser.newContext(VIEWPORTS.desktop)).newPage();
  await page.goto(args.url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await scrollThrough(page, { wheel: true, settleMs: 400, onStep: async () => {} });
  await scrollToTop(page);

  const links = await page.evaluate(() => {
    const label = (a) => (a.innerText || a.getAttribute('aria-label') || a.querySelector('img')?.alt || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    const where = (a) => {
      const s = a.closest('[id^="section-"], section[id], header, nav, footer, #widgets, #menu-overlay, [class*="header-bar"]');
      if (!s) return '(page)';
      return s.id ? `#${s.id}` : s.tagName.toLowerCase() + (s.className && typeof s.className === 'string' ? '.' + s.className.split(' ')[0] : '');
    };
    return [...document.querySelectorAll('a[href]')].map((a) => {
      const u = new URL(a.getAttribute('href'), location.href);
      const r = a.getBoundingClientRect();
      return {
        href: a.getAttribute('href'),
        path: u.origin === location.origin ? u.pathname + u.hash : null,
        external: u.origin !== location.origin ? u.origin : null,
        label: label(a),
        section: where(a),
        visible: r.width > 0 && r.height > 0,
        y: Math.round(r.top + scrollY),
        cursor: a.closest('[data-cursor]')?.getAttribute('data-cursor') ?? null,
      };
    });
  });

  const routes = new Map();
  for (const l of links.filter((l) => l.path)) {
    const key = l.path.split('#')[0] || '/';
    const e = routes.get(key) || { route: key, count: 0, labels: new Set(), sections: new Set() };
    e.count++;
    if (l.label) e.labels.add(l.label);
    e.sections.add(l.section);
    routes.set(key, e);
  }
  const table = [...routes.values()].sort((a, b) => a.route.localeCompare(b.route));
  console.log(`${links.length} links, ${table.length} internal routes on ${args.url}\n`);
  for (const r of table) console.log(`${r.route.padEnd(70)} ×${r.count}  in ${[...r.sections].join(', ')}  "${[...r.labels].slice(0, 3).join('" | "')}"`);
  const ext = [...new Set(links.filter((l) => l.external).map((l) => l.external))];
  if (ext.length) console.log(`\nexternal: ${ext.join(', ')}`);
  if (args.out) await writeJSON(args.out, { url: args.url, links, routes: table.map((r) => ({ ...r, labels: [...r.labels], sections: [...r.sections] })) });
} finally {
  await browser.close();
}
