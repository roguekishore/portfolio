// Browser-side extractors. Each function is self-contained because Playwright
// serialises it with toString() before running it in the page.

export function extractDesign() {
  const sel = (el) => {
    if (!el || el.nodeType !== 1) return '';
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].slice(0, 3);
    if (cls.length) s += '.' + cls.join('.');
    return s;
  };
  const pathOf = (el) => {
    const parts = [];
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 4; i++, n = n.parentElement) parts.unshift(sel(n));
    return parts.join(' > ');
  };
  const bump = (map, key, by = 1) => { map[key] = (map[key] || 0) + by; };
  const top = (map, n = 40) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
  const safe = (fn, fallback = null) => { try { return fn(); } catch (e) { return fallback ?? { error: String(e) }; } };

  const out = { url: location.href, title: document.title, viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio } };
  const all = [...document.querySelectorAll('body *')];
  const sized = all.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });

  // ---- document-level ----
  out.document = safe(() => {
    const h = getComputedStyle(document.documentElement);
    const b = getComputedStyle(document.body);
    return {
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      scrollHeight: document.documentElement.scrollHeight,
      htmlBg: h.backgroundColor, bodyBg: b.backgroundColor, bodyColor: b.color,
      bodyFont: b.fontFamily, bodyFontSize: b.fontSize, bodyLineHeight: b.lineHeight,
      cursor: b.cursor, scrollBehavior: h.scrollBehavior, overflow: [h.overflow, b.overflow],
      fontSmoothing: b.webkitFontSmoothing,
      // Mobile browsers zoom out when content is wider than the layout viewport.
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 ? {
        scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, innerWidth,
        offenders: (() => {
          const cw = document.documentElement.clientWidth + 1;
          const over = sized.filter((el) => getComputedStyle(el).position !== 'fixed' && el.getBoundingClientRect().right > cw);
          return over.filter((el) => !over.some((o) => o !== el && el.contains(o))).slice(0, 10).map(pathOf);
        })(),
      } : null,
      generator: document.querySelector('meta[name="generator"]')?.content || null,
      frameworkHints: {
        next: !!(window.__NEXT_DATA__ || window.next || document.querySelector('#__next, script[src*="/_next/"]')),
        nuxt: !!(window.__NUXT__ || document.querySelector('#__nuxt')),
        gatsby: !!document.querySelector('#___gatsby'),
        webflow: !!(window.Webflow || document.documentElement.dataset.wfPage),
        framer: !!document.querySelector('[data-framer-name], #__framer-badge-container'),
        astro: !!document.querySelector('astro-island'),
        sveltekit: !!document.querySelector('[data-sveltekit-preload-data], body > div[style*="display: contents"]'),
      },
    };
  });

  // ---- stylesheets: custom properties, keyframes, @font-face, breakpoints ----
  const sheets = [];
  const vars = [];
  const keyframes = [];
  const fontFaces = [];
  const media = {};
  const walk = (rules, ctx) => {
    for (const r of rules) {
      if (r instanceof CSSKeyframesRule) {
        keyframes.push({ name: r.name, css: r.cssText.slice(0, 2500) });
        continue;
      }
      if (r instanceof CSSFontFaceRule) {
        fontFaces.push({
          family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'),
          style: r.style.getPropertyValue('font-style'), display: r.style.getPropertyValue('font-display'),
          src: r.style.getPropertyValue('src').slice(0, 400),
        });
        continue;
      }
      if (r.conditionText !== undefined && r.cssRules) {
        bump(media, `${r.constructor.name.replace('CSS', '').replace('Rule', '')}: ${r.conditionText}`);
        walk(r.cssRules, r.conditionText);
        continue;
      }
      if (r.style) {
        for (const prop of r.style) {
          if (prop.startsWith('--')) vars.push({ selector: r.selectorText, media: ctx || undefined, name: prop, value: r.style.getPropertyValue(prop).trim() });
        }
      }
      if (r.cssRules?.length) walk(r.cssRules, ctx);
    }
  };
  for (const s of document.styleSheets) {
    try { walk(s.cssRules, ''); sheets.push({ href: s.href || '(inline)', rules: s.cssRules.length }); }
    catch { sheets.push({ href: s.href, rules: null, note: 'cross-origin; parsed from network copy instead' }); }
  }
  const rootCS = getComputedStyle(document.documentElement);
  const rootVars = {};
  for (const v of vars) if (!(v.name in rootVars)) rootVars[v.name] = rootCS.getPropertyValue(v.name).trim() || null;
  out.css = { sheets, customProperties: vars.slice(0, 1500), rootComputed: rootVars, keyframes, fontFaces, mediaQueries: top(media, 80) };

  // ---- fonts actually in use ----
  out.fonts = safe(() => ({
    documentFonts: [...document.fonts].map((f) => ({ family: f.family, weight: f.weight, style: f.style, status: f.status, display: f.display, stretch: f.stretch })),
  }));

  // ---- typography: unique text styles ----
  const typo = new Map();
  for (const el of sized) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    const key = [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing, cs.textTransform, cs.fontStyle].join('|');
    let e = typo.get(key);
    if (!e) {
      e = {
        fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, fontStyle: cs.fontStyle,
        fontFeatureSettings: cs.fontFeatureSettings, fontVariationSettings: cs.fontVariationSettings, textWrap: cs.textWrap,
        count: 0, tags: {}, colors: {}, samples: [],
      };
      typo.set(key, e);
    }
    e.count++;
    bump(e.tags, el.tagName.toLowerCase());
    bump(e.colors, cs.color);
    if (e.samples.length < 3) e.samples.push(pathOf(el));
  }
  out.typography = [...typo.values()].sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));

  // ---- colour usage (count + painted area) ----
  const text = {}, bg = {}, bgArea = {}, border = {}, svg = {}, gradients = {};
  for (const el of [document.documentElement, document.body, ...sized]) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (el instanceof SVGElement) {
      if (cs.fill && cs.fill !== 'none') bump(svg, `fill ${cs.fill}`);
      if (cs.stroke && cs.stroke !== 'none') bump(svg, `stroke ${cs.stroke}`);
      continue;
    }
    bump(text, cs.color);
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') { bump(bg, cs.backgroundColor); bump(bgArea, cs.backgroundColor, Math.round(r.width * r.height)); }
    if (cs.backgroundImage.includes('gradient')) bump(gradients, cs.backgroundImage.slice(0, 300));
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') bump(border, `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`);
    if (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') bump(border, `${cs.borderBottomWidth} ${cs.borderBottomStyle} ${cs.borderBottomColor}`);
  }
  out.colors = { text: top(text), background: top(bg), backgroundByArea: top(bgArea), border: top(border), svg: top(svg), gradients: top(gradients, 20) };

  // ---- spacing / layout ----
  const padding = {}, margin = {}, gap = {}, maxWidth = {}, radius = {}, grids = [];
  for (const el of sized) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 120) continue;
    for (const p of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) if (cs[p] !== '0px') bump(padding, `${p.replace('padding', '').toLowerCase()} ${cs[p]}`);
    for (const p of ['marginTop', 'marginBottom']) if (cs[p] !== '0px' && cs[p] !== 'auto') bump(margin, `${p.replace('margin', '').toLowerCase()} ${cs[p]}`);
    if (/flex|grid/.test(cs.display) && (cs.rowGap !== 'normal' || cs.columnGap !== 'normal')) bump(gap, `${cs.display} row ${cs.rowGap} col ${cs.columnGap}`);
    if (cs.maxWidth !== 'none') bump(maxWidth, cs.maxWidth);
    if (cs.borderRadius !== '0px') bump(radius, cs.borderRadius);
    if (cs.display.includes('grid') && grids.length < 60) grids.push({ el: pathOf(el), columns: cs.gridTemplateColumns, rows: cs.gridTemplateRows.slice(0, 120), gap: `${cs.rowGap} / ${cs.columnGap}`, width: Math.round(r.width) });
  }
  out.spacing = { padding: top(padding, 60), margin: top(margin, 40), gap: top(gap, 30), maxWidth: top(maxWidth, 20), borderRadius: top(radius, 20), grids };

  // ---- sections (tagged for later screenshots) ----
  const cand = new Set(document.querySelectorAll('header, nav, section, footer, main > *, body > div > *, [data-section], [class*="section" i]'));
  let sections = [...cand]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.height >= 80 && r.width >= document.documentElement.clientWidth * 0.5)
    .map(({ el, r }) => ({ el, top: Math.round(r.top + scrollY), height: Math.round(r.height) }))
    .sort((a, b) => a.top - b.top || b.height - a.height);
  sections = sections.map((s) => ({ ...s, depth: sections.filter((o) => o !== s && o.el.contains(s.el)).length }));
  out.sections = sections.map((s, i) => {
    s.el.setAttribute('data-cap-section', i);
    const cs = getComputedStyle(s.el);
    const heading = s.el.querySelector('h1, h2, h3, [class*="title" i], [class*="heading" i]');
    return {
      i, depth: s.depth, el: pathOf(s.el), top: s.top, height: s.height,
      position: cs.position, background: cs.backgroundColor, color: cs.color,
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      headingTag: heading?.tagName.toLowerCase() || null,
      headingHint: heading ? heading.textContent.trim().replace(/\s+/g, ' ').slice(0, 50) : null,
      counts: { img: s.el.querySelectorAll('img').length, video: s.el.querySelectorAll('video').length, svg: s.el.querySelectorAll('svg').length, canvas: s.el.querySelectorAll('canvas').length, a: s.el.querySelectorAll('a').length },
    };
  });

  // ---- media ----
  out.media = {
    images: [...document.images].slice(0, 120).map((im) => {
      const r = im.getBoundingClientRect();
      return { src: (im.currentSrc || im.src).slice(0, 200), natural: [im.naturalWidth, im.naturalHeight], rendered: [Math.round(r.width), Math.round(r.height)], objectFit: getComputedStyle(im).objectFit, loading: im.loading, parent: pathOf(im.parentElement) };
    }),
    videos: [...document.querySelectorAll('video')].map((v) => {
      const r = v.getBoundingClientRect();
      return { src: (v.currentSrc || v.querySelector('source')?.src || '').slice(0, 200), poster: v.poster?.slice(0, 200), autoplay: v.autoplay, loop: v.loop, muted: v.muted, playsInline: v.playsInline, size: [Math.round(r.width), Math.round(r.height)], objectFit: getComputedStyle(v).objectFit, parent: pathOf(v.parentElement) };
    }),
    canvases: [...document.querySelectorAll('canvas')].map((c) => ({ size: [c.width, c.height], css: [Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height)], engine: c.dataset.engine || null, parent: pathOf(c.parentElement) })),
    inlineSvgs: [...document.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().width > 40).length,
    lottieDom: document.querySelectorAll('lottie-player, dotlottie-player, dotlottie-wc, [id^="__lottie_element"], svg [clip-path^="url(#__lottie_element"]').length,
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src.slice(0, 200)),
  };

  // ---- animation state ----
  const transitions = {}, cssAnims = {}, willChange = [], inlineMotion = [], dataAttrs = {};
  for (const el of all) {
    const cs = getComputedStyle(el);
    if (cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) {
      bump(transitions, `${cs.transitionProperty} | ${cs.transitionDuration} | ${cs.transitionTimingFunction} | delay ${cs.transitionDelay}`);
    }
    if (cs.animationName !== 'none') bump(cssAnims, `${cs.animationName} | ${cs.animationDuration} | ${cs.animationTimingFunction} | ${cs.animationIterationCount} | delay ${cs.animationDelay}`);
    if (cs.willChange !== 'auto' && willChange.length < 80) willChange.push({ el: pathOf(el), value: cs.willChange });
    const st = el.style;
    if ((st.transform || st.opacity || st.clipPath || st.translate || st.visibility) && inlineMotion.length < 120) inlineMotion.push({ el: pathOf(el), style: el.getAttribute('style').slice(0, 200) });
    for (const a of el.attributes) if (/^data-(scroll|anim|aos|gsap|reveal|split|lenis|speed|parallax|motion|lag|delay|cursor|splitting|lottie|w-id)/.test(a.name)) bump(dataAttrs, `${a.name}=${a.value.slice(0, 40)}`);
  }
  const splitPieces = document.querySelectorAll('[class*="char" i], [class*="word" i], [class*="line" i], [class*="split" i]').length;
  out.animations = {
    cssTransitions: top(transitions, 50), cssAnimations: top(cssAnims, 40), willChange, inlineMotionStyles: inlineMotion,
    dataAttributes: top(dataAttrs, 60), splitTextPieces: splitPieces,
    waapi: safe(() => document.getAnimations().slice(0, 150).map((a) => {
      const t = a.effect?.getComputedTiming?.() || {};
      const kf = safe(() => a.effect.getKeyframes(), []);
      return {
        type: a.constructor.name, name: a.animationName || a.transitionProperty || a.id || null, target: pathOf(a.effect?.target),
        duration: t.duration, delay: t.delay, easing: a.effect?.getTiming?.().easing, iterations: t.iterations, fill: t.fill,
        direction: t.direction, playState: a.playState,
        props: [...new Set(kf.flatMap((k) => Object.keys(k).filter((p) => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))],
      };
    }), []),
    customCursor: [...document.querySelectorAll('body *')].filter((el) => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      return cs.position === 'fixed' && cs.pointerEvents === 'none' && r.width > 0 && r.width < 160 && r.height < 160;
    }).slice(0, 5).map(pathOf),
  };

  // ---- JS animation libraries exposed on window ----
  const g = window.gsap;
  out.libraries = {
    globals: Object.fromEntries(['gsap', 'ScrollTrigger', 'TweenMax', 'lottie', 'bodymovin', 'THREE', 'Lenis', 'lenis', 'LocomotiveScroll', 'barba', 'Swup', 'Swiper', 'Splitting', 'SplitType', 'PIXI', 'rive', 'anime', 'Motion', 'Webflow', 'jQuery', 'React', 'Vue', '__NEXT_DATA__']
      .map((k) => [k, typeof window[k] === 'undefined' ? false : (window[k]?.version || window[k]?.REVISION || true)])),
  };
  if (g) {
    const skip = new Set(['scrollTrigger', 'callbackScope', 'onComplete', 'onUpdate', 'onStart', 'onRepeat', 'onReverseComplete', 'onInterrupt', 'data']);
    const clean = (vars) => safe(() => JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(vars || {}).filter(([k]) => !skip.has(k))), (k, v) => (typeof v === 'function' ? 'ƒ' : v instanceof Element ? pathOf(v) : v?.nodeType ? '[node]' : v))), {});
    const ST = window.ScrollTrigger || safe(() => g.core.globals().ScrollTrigger, null);
    out.gsap = {
      version: g.version,
      registered: safe(() => Object.keys(g.core.globals()), []),
      tweens: safe(() => g.globalTimeline.getChildren(true, true, true).slice(0, 400).map((t) => ({
        kind: t.getChildren ? 'timeline' : 'tween', duration: t.duration(), delay: t.delay(), startTime: t.startTime(),
        ease: typeof t.vars?.ease === 'string' ? t.vars.ease : t.vars?.ease ? 'custom fn' : null,
        vars: clean(t.vars), targets: t.targets ? t.targets().slice(0, 3).map((x) => (x instanceof Element ? pathOf(x) : typeof x)) : [],
        hasScrollTrigger: !!t.scrollTrigger, progress: t.progress(),
      })), []),
      scrollTriggers: ST ? safe(() => ST.getAll().map((st) => ({
        trigger: st.trigger instanceof Element ? pathOf(st.trigger) : null, start: Math.round(st.start), end: Math.round(st.end),
        startVar: String(st.vars.start ?? ''), endVar: String(st.vars.end ?? ''), scrub: st.vars.scrub ?? null, pin: !!st.pin,
        toggleActions: st.vars.toggleActions ?? null, once: !!st.vars.once,
        animation: st.animation ? { duration: st.animation.duration(), ease: st.animation.vars?.ease ?? null } : null,
      })), []) : null,
    };
  }
  const lot = window.lottie || window.bodymovin;
  if (lot?.getRegisteredAnimations) {
    out.lottie = safe(() => lot.getRegisteredAnimations().map((a) => ({ name: a.name, frames: a.totalFrames, fps: a.frameRate, renderer: a.renderer?.rendererType, loop: a.loop, autoplay: a.autoplay, container: pathOf(a.wrapper) })), []);
  }
  const len = window.lenis || window.__lenis;
  if (len?.options) out.lenis = safe(() => ({ ...Object.fromEntries(Object.entries(len.options).map(([k, v]) => [k, typeof v === 'function' ? v.toString().slice(0, 160) : v instanceof Element || v === window ? String(v) : v])) }));
  return out;
}

// Snapshot of the scroll-dependent animation state at the current position.
export function animationSnapshot() {
  const p = (el) => {
    if (!el || el.nodeType !== 1) return '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : '');
  };
  return {
    running: document.getAnimations().filter((a) => a.playState === 'running').slice(0, 40)
      .map((a) => `${a.constructor.name}:${a.animationName || a.transitionProperty || ''} on ${p(a.effect?.target)}`),
    activeTriggers: window.ScrollTrigger?.getAll?.().filter((s) => s.isActive).map((s) => p(s.trigger)) ?? null,
    headerTransform: (() => { const h = document.querySelector('header'); return h ? getComputedStyle(h).transform : null; })(),
  };
}

// Picks one representative of each interactive element "kind" for hover tests.
export function pickHoverTargets(limit) {
  const p = (el) => {
    const parts = [];
    for (let n = el, i = 0; n && n.nodeType === 1 && i < 3; i++, n = n.parentElement) {
      parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : ''));
    }
    return parts.join(' > ');
  };
  const els = [...document.querySelectorAll('a, button, [role="button"], [data-cursor], [class*="card" i]')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width >= 8 && r.height >= 8 && getComputedStyle(el).visibility !== 'hidden'; });
  const seen = new Set();
  const picked = [];
  for (const el of els) {
    const sig = `${el.tagName}|${[...el.classList].sort().join('.')}|${el.querySelector('img, video, picture') ? 'media' : ''}|${el.closest('header, nav') ? 'nav' : el.closest('footer') ? 'footer' : ''}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    picked.push(el);
    if (picked.length >= limit) break;
  }
  picked.forEach((el, i) => el.setAttribute('data-cap-hover', i));
  return picked.map((el, i) => ({ i, el: p(el), label: (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30) }));
}

// Computed style of an element and up to 30 descendants, for hover diffs.
export function styleSnapshot(root) {
  const props = ['color', 'backgroundColor', 'opacity', 'transform', 'scale', 'translate', 'clipPath', 'filter', 'boxShadow', 'borderColor', 'textDecorationLine', 'letterSpacing', 'width', 'height', 'visibility'];
  const nodes = [root, ...root.querySelectorAll('*')].slice(0, 31);
  return nodes.map((n, idx) => {
    const cs = getComputedStyle(n);
    return { idx, tag: n.tagName.toLowerCase(), cls: [...n.classList].slice(0, 2).join('.'), transition: `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction} ${cs.transitionDelay}`, ...Object.fromEntries(props.map((k) => [k, cs[k]])) };
  });
}
