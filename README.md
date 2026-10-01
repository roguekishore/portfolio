# koto.com recreation

Front-end study of koto.com's homepage: layout, typography, tokens and motion,
rebuilt with a fictional studio ("Orbe"), original copy and placeholder media.
No logos, imagery, video, fonts or copy from the original are used in the build.

```
SPEC.md   sections, tokens, every animation with trigger / duration / easing
app/      the site — Next.js 16 + Tailwind v4 + GSAP 3.15 (ScrollTrigger, SplitText)
tools/    Playwright capture + visual-diff harness (optional)
```

## Setup

Requirements: **Node.js 20.9 or newer** and npm (bundled with Node). Check with
`node -v`.

Dependencies are not included in this archive. Each package has a lockfile, so
`npm ci` installs the exact versions this was built and tested with.

### 1. Run the site

```bash
cd app
npm ci             # creates app/node_modules (~380 MB)
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start          # http://localhost:3000  (add -- -p 4000 for another port)
```

Fonts (Archivo, Geist Mono) are npm packages and are self-hosted, so the site
needs no network access once installed.

### 2. Optional: capture and compare tools

Only needed to re-measure the live site or diff the build against it.

```bash
cd tools
npm ci                              # creates tools/node_modules
npx playwright install chromium     # one-time browser download (~150 MB)
```

```bash
# capture the live site into ../reference (screenshots, tokens, motion data)
node capture.mjs --url https://koto.com --out ../reference

# with the app running, diff it against the capture
node compare.mjs --ref ../reference --url http://localhost:3000 --out ../compare

node sheet.mjs out.png 0.5 2 a.png b.png ...   # contact sheet of frames
node crop.mjs in.png x y w h 2                 # crop and zoom a detail

# list every internal link on a page, grouped by route, with label and section
node links.mjs --url https://koto.com --out ../reference/links.json

# record a page transition: click a link, screenshot 0–3000ms, log SPA vs reload
node transition.mjs --url https://koto.com --click 'a[href="/work"]' --out ../reference/transitions/home-work

# inner pages, step by step (each step saves as it goes)
node pages.mjs work                 # /work: skeleton, hover, filter panel
node pages.mjs work2                # filter apply, Partnerships, scroll states
node pages.mjs project instagram    # case study: modules, reveals, footer
node pages.mjs sidebar instagram    # chapter scroll-spy states
node pages.mjs dense                # transitions at 50ms resolution
node pages.mjs survey amazon        # module list only
node pages.mjs mobile /work         # mobile scroll frames

# diff an inner page against saved frames (scrolls to the same y positions)
node compare.mjs --url http://localhost:3000 --path /work --only mobile \
  --refdir ../reference/pages/mobile/work --out ../compare/pages/work-mobile
node compare.mjs --url http://localhost:3000 --path /work --only desktop \
  --reffull ../reference/pages/work.full.png --out ../compare/pages/work-desktop
```

Behind a proxy, capture uses `HTTPS_PROXY` automatically; pass `--proxy ''` to
connect directly.

`reference/` and `compare/` are not in this archive. They contain screenshots
and stylesheet copies of the live site, which are third-party material; generate
them locally and don't redistribute them.

### Troubleshooting

- `npm ci` fails with a lockfile error: use `npm install` instead (resolves
  versions within the ranges in `package.json`).
- Port 3000 in use: `npm run dev -- -p 3001`.
- `capture.mjs` says the browser is missing: run `npx playwright install chromium`
  inside `tools/`.

## Status

### Homepage

Layout matches the reference geometry at 1440×900 (section heights: intro 1800,
work 2818, cards 868×488, news image 592×333 — all exact; news +6px, contact
+4px). Full page 6124px vs 6114px desktop, 9904px vs 9924px mobile.

Pixel mismatch in a compare run (~28% desktop, ~42% mobile) is dominated by
media and copy, which are intentionally different.

Implemented motion (details in SPEC.md):
- load fades (nav 1s, headline 1.3s, media 1.5s)
- hero: sticky 200lvh, scrubbed 150→900px — clip-path to banner, −37.5% parallax,
  intro rising 75svh→0, SplitText line masks; headline fade 0→150px
- header: collapse at 300px (staggered link hide + 650ms slide, pill 151→195px),
  hover 320px, dropdown with blur backdrop
- clock with live UTC offset, dot-spread hover, widgets drawer (517ms in / 383ms out)
- work: sticky column scrubbed in, active card at 50% viewport, 20% inactive
  opacity, per-character name roll, description/meta crossfade with 333ms delay
- custom glass cursor ("View case", "Play reel"), reel player overlay
- bracket links, underline wipes, copy button grow, office card scale-in
- mobile: MENU/CLOSE overlay, single-column cards with captions

Substitutions: the original's proprietary typeface → Archivo variable at 82%
width / 300 for the condensed cut (within ~2% of reference text widths), Archivo
100% / 350 for body, Geist Mono +0.04em for labels. Videos → animated CSS/SVG
scenes in `app/components/Media.tsx`.

Not reproduced: cookie consent bar, Vimeo embeds.

Unchanged by the inner-page work (re-run after: 27.58% / 41.46% mean mismatch,
page heights 6124 / 9904px).

### Work index and case studies

Built from captures taken on 2026-10-01 (`reference/pages/`); see SPEC.md ›
Inner pages. Routes:

- `/work` — projects index, `?filter=<category>` filtering (client-side)
- `/projects/[slug]` — statically generated for all 10 projects
  (`generateStaticParams`, `dynamicParams = false`)

Homepage wiring: "View all projects" → `/work`; project cards (and the "View case"
cursor over them) → their case study; "Work" in the pill menu, inline nav and
mobile menu → `/work`. Other nav and footer links remain `#`.

Matches the captures:
- shell: 320px sticky sidebar + 1057px content column at 1440; solid pill at
  sidebar width with breadcrumb (`WORK` / project name)
- index: heading pair, Projects/Partnerships switch (dot, inactive description),
  featured card popping in, 2-column masonry using the measured 4:5 / 4:3 / 5:3
  pattern, hover (media −24px, caption after 167ms, others dimmed), filter button,
  filter panel (blur backdrop, scale 1.1→1, 3×2 category cards with counts),
  grid fade-out/in on apply
- case study: sidebar heading pair + `SECTOR · YEAR`, chapter scroll-spy with
  dot, credits card at the last chapter; 16:9 hero at (352,16) 1057×595;
  introduction and chapter frames (12-col, label/heading left, body right);
  media, 4:5 pair and quote modules, composed differently per project (chapter-led
  with closing quote, media-led with captioned video, pair/media alternating, …)
- end of page: content pins and slides left by its width while dimming, footer
  copy fades in, next card grows 0.67→1 — checked against the reference frames at
  400px before the end and at the end
- transitions: loader wipe (press → panel up ~450ms ease-out → label + progress →
  panel lifts while the page slides up) for home/index/case navigations; footer
  media morphs into the next case study's hero slot after the copy fades
- mobile: index list with captions and bottom tab bar; case study with back
  button, edge-to-edge 4:5 hero, title block, body-only intro, bottom chapter bar

Pixel diffs for these pages (`compare/pages/*/report.md`, 39–64%) are dominated
by intended differences: placeholder media, original copy, 10 projects instead
of 35 (index page is 2477px vs 8959px tall), and case studies with fewer
modules than the reference pages they are compared against.

Known differences / not built:
- `/work/partnerships` (separate list layout) — captured, not built; the switch
  item links to `#`
- not built: `/about`, `/services`, `/careers`, `/contact`, `/latest` and its
  articles, `/privacy-policy`, `/terms-of-use`
- the loader's progress counter is simulated (no real asset loading to measure)
- transition and reveal timings come from 50ms frame captures, so values are
  accurate to roughly ±50ms; easing curves are fitted, not read from source
- fewer modules per case study than the reference pages, and no video playback
