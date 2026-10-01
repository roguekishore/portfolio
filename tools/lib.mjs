import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const { defaultBrowserType: _ignored, ...iphone } = devices['iPhone 13'];

export const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { ...iphone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 },
};

// 2x desktop context, used only for zoomable detail crops.
export const DETAIL_VIEWPORT = { ...VIEWPORTS.desktop, deviceScaleFactor: 2 };

export async function launch(proxy) {
  return chromium.launch({
    proxy: proxy ? { server: proxy, bypass: '127.0.0.1,localhost' } : undefined,
  });
}

export const pad = (n, w = 3) => String(n).padStart(w, '0');

export async function writeJSON(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

export function log(...a) {
  console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
}

// Scroll position that also works for transform-based scrollers
// (locomotive-scroll v4 style) and overflow containers.
export async function getScrollY(page) {
  return page.evaluate(() => {
    if (window.scrollY > 0) return Math.round(window.scrollY);
    const loco = document.querySelector('[data-scroll-container]');
    if (loco) {
      const m = new DOMMatrixReadOnly(getComputedStyle(loco).transform);
      if (m.m42) return Math.round(-m.m42);
    }
    let best = null;
    for (const el of document.querySelectorAll('body *')) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight - el.clientHeight > 200 && el.clientHeight > innerHeight * 0.6) {
        if (!best || el.scrollHeight > best.scrollHeight) best = el;
      }
    }
    return best ? Math.round(best.scrollTop) : 0;
  });
}

// Real wheel events on desktop so smooth-scroll libraries (Lenis etc.) and
// ScrollTrigger see a genuine scroll; plain scrollBy on touch devices.
export async function scrollBy(page, dy, { wheel }) {
  if (wheel) {
    const { width, height } = page.viewportSize();
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, dy);
  } else {
    await page.evaluate((d) => window.scrollBy(0, d), dy);
  }
}

export async function scrollToTop(page) {
  await page.evaluate(() => {
    const lenis = window.lenis || window.__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
}

// Walks the page top to bottom in viewport-relative steps, calling onStep at
// every new scroll position. Stops when the position stops changing.
export async function scrollThrough(page, { wheel, stepRatio = 0.6, settleMs = 900, maxSteps = 150, onStep }) {
  const step = Math.round(page.viewportSize().height * stepRatio);
  let prev = null;
  let stuck = 0;
  let i = 0;
  while (i < maxSteps) {
    const y = await getScrollY(page);
    if (y !== prev) {
      await onStep(i++, y);
      prev = y;
      stuck = 0;
    } else if (++stuck >= 3) {
      break;
    }
    await scrollBy(page, step, { wheel });
    await page.waitForTimeout(settleMs);
  }
  return i;
}
