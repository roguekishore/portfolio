# Spec — koto.com homepage recreation

Captured 2026-10-01 from https://koto.com with `tools/capture.mjs` plus targeted
probes (frame sequences, 50px scroll sampling). Reference frames live in
`reference/`. Copy, brand names, logos, imagery and fonts in the build are
original placeholders; only layout, tokens and motion are reproduced.

## Stack observed

| | |
|---|---|
| Framework | Next.js (App Router chunks under `/_next/`), Tailwind CSS v4 (`--tw-*` props, `@supports color-mix`) |
| Motion | GSAP 3.11 + ScrollTrigger + SplitText + CustomEase (in bundles, not on `window`); CSS keyframes + Tailwind transitions for UI |
| Scrolling | Native scroll (no Lenis / Locomotive). One GSAP pin: `.pin-spacer-showreel-scroll` |
| Media | Vimeo iframes over poster images (showreel + project cards), Sanity CDN images, Rive in a bundle |
| Other | Cookiebot consent bar (third-party, not reproduced) |

Build stack: Next.js 16 + Tailwind v4 + GSAP 3.15 (ScrollTrigger, SplitText).

## Tokens

**Colour**

| token | value | use |
|---|---|---|
| black | `#060606` | page background (html is `#000`) |
| off-black | `#141414` | dropdown panel, chips, cards |
| darkest-grey | `#202020` | tag chips |
| dark-grey | `#2d2d2d` | — |
| mid-grey | `#595959` | footer text |
| grey | `#989898` | secondary text (2nd line of every heading, body copy) |
| light-grey | `#ccc` | — |
| white | `#fff` | primary text |
| yellow | `#ffe800` | logo only |
| glass | `rgb(6 6 6 / .5)` + `backdrop-filter: blur(20px)` (medium) / `blur(40px)` (strong) | pill header, buttons, overlays |
| lines | `white / 10%`, `white / 5%` | dividers |

**Type** (originals are a proprietary custom family; substitutes in brackets)

| role | spec (desktop / mobile) | substitute |
|---|---|---|
| display | condensed, weight 300, 48px/1, tracking −0.01em / 36px/1 | Archivo wdth 62, wght 300 |
| heading | condensed 300, 38px/1.1, −0.01em / 26px/1.2 | Archivo wdth 62, wght 300 |
| body | sans 350, 16px/1.25 / 15px/1.25 | Archivo wdth 100, wght 350 |
| small | sans 350, 14px/1.25 | Archivo |
| label | mono 400, 11px/1, uppercase, `top: 1px` optical nudge | Geist Mono |
| chip | mono 400, 9px/1, uppercase, −0.02em | Geist Mono |

**Layout**: page padding 16px (`px-4`); 16-column grid on md+ (8 cols mobile),
column gap 8px; content max 1600px. Breakpoints: sm 40rem, md 52.125rem (834px),
lg 74.625rem, xl 90rem, 2xl 96rem, 3xl 108rem. Radii 2/4/6px (xs/sm/md); pills
fully rounded. Sidebar widths: 20rem, 22.875rem (office card).

**Easing tokens**: `cubic-bezier(.65,0,.35,1)` (width), `(.36,.54,0,.99)` (nav
slide), `(0,0,0,1)` (text in), `(.75,0,.85,1)` (text out), `(.15,0,.15,1)`
(button grow), `(.14,.02,.25,1)` (drawer in), `(.75,0,.83,1)` (drawer out).
UI durations are multiples of 1/60s: 83, 133, 167, 250, 333, 383, 417, 517, 650ms.

## Sections (desktop 1440×900)

| # | section | y / height | layout |
|---|---|---|---|
| 0 | Fixed chrome | — | logo/nav top-left (16px inset), clock + widget toggle top-right, custom cursor, overlays |
| 1 | Hero / showreel | 0 / 1800 (200lvh, pinned 0–900) | full-bleed media; display headline bottom-left (col 1–6, pl 12px, bottom 24px) with `mix-blend-exclusion` |
| 2 | Intro statement | inside the hero pin | heading-size paragraph, cols 1–8, white then grey continuation; sits under a 1409×203 showreel banner |
| 3 | Our work | 1800 / 2818 | cols 1–6 sticky (100svh): heading + rolling project name at ~30% height, description (4 of 6 cols) + meta row at bottom. Cols 7–16: 16:9 cards, 12px gap, then a `[ VIEW ALL PROJECTS ]` card (aspect 922/168, white/10, p 36px, label bottom-right) |
| 4 | Studio news | 4618 / 785 | top divider row (mono label white + grey sub, `[ VIEW ALL ]` right); grid: feature card cols 1–7, two cards in cols 8–16; card = image (r 6px), 16px title, grey excerpt (feature only), chip + mono date |
| 5 | Contact | 5403 / 603 | cols 1–5 heading pair; cols 8–16 rows (top line, label cols 1–3, value cols 4–8 grey) |
| 6 | Footer | 6006 / 108 | office card bottom-left (366×220: photo, mono "say hello" + email, copy button); copyright cols 8–10 + legal links |

Mobile (390×844): logo top-left, glass `MENU` + widget buttons top-right; hero
centre play button; showreel banner aspect 377/250; work becomes a single column
of 4:3 cards with title + subtitle + ↗ under each; news = feature card then a
compact list (thumb + title); contact rows 2-up; office card full width.

## Motion

### Load (time-based, from navigation)
| element | animation |
|---|---|
| page | black until fonts/poster ready |
| nav + clock | `fade-in .25s linear 1s forwards` |
| hero headline | `fade-in .25s linear 1.3s forwards` |
| showreel media | fades in once the poster/video is ready (~1.5–3s) |

### Hero pin (ScrollTrigger, `pin: true`, `scrub: true`, linear, scroll 150 → 900)
| target | from → to |
|---|---|
| media mask | `clip-path: inset(0 round 0)` → `inset(.5rem .5rem 76.5556% round .25rem)` (ends as a 1409×203 banner at top, 8px inset) |
| media inner | `yPercent: 0 → −37.5` (parallax inside the mask) |
| headline spans | opacity 1 → 0 over scroll 0 → 150 (separate scrub) |
| intro wrapper | `y: 75svh → 0` |
| intro lines (SplitText lines, overflow-clip masks) | each `yPercent 100 → 0`, ease-out, ~150px of scroll each, 50px stagger, first starts ≈610px |
After 900 the pin releases and everything scrolls normally.

### Header
| trigger | animation |
|---|---|
| scrollY > ~300 (toggle, reversible) | nav links slide left `translateX(−255px)` 650ms `(.36,.54,0,.99)` inside an overflow-hidden window, so they disappear under the logo. Pill gets glass bg; width 151 → 195px 400ms `(.65,0,.35,1)`; page label (mono "HOME") fades in |
| hover pill | width → 320px (same transition); chevron dot moves to the right edge |
| click pill | dropdown panel (off-black, r 6px, 320px): six nav items in 24px sans, divider, mono "CHANNELS" list; links stagger in |
| nav link hover | colour/opacity 167ms linear |

### Clock / widgets
| trigger | animation |
|---|---|
| always | live local time `HH:MM UTC±H:MM`, mono 11px, 70% white |
| hover | text → white; 4-dot icon dots translate ±1.9px, 167ms linear |
| click | full-screen glass blur overlay; office tab bar + panels slide in from the right (`translateX(28.125rem) → 0`, 517ms `(.14,.02,.25,1)`; second column delayed ~34ms, content fades 117ms after 167–200ms). Esc / click-out → 383ms `(.75,0,.83,1)` |

### Our work
| trigger | animation |
|---|---|
| section enters | left column (heading, name, description, meta) fades in |
| active card changes (card crosses viewport centre) | inactive cards `opacity .2`, active `1` (167ms linear). Project name: old exits up 133ms `(.75,0,.85,1)`, new chars slide up from 100% 333ms `(0,0,0,1)` with ~20ms stagger. Description + meta: crossfade 167ms linear, incoming delayed 333ms |
| hover card (md+) | native cursor hidden; glass pill cursor "VIEW CASE" + icon follows pointer (positioned with inline top/left, lerped) |
| media button | circular progress ring (stroke-dasharray) + pause/play icon, opacity .5 → 1 on hover, bg white/0 → white/10 |
| `[ VIEW ALL ]` hover | brackets move outward 4px 333ms; text grey → white 167ms |

### Elsewhere
| element | animation |
|---|---|
| contact rows | fade in as they enter (opacity 0 → 1), divider lines draw left → right |
| office card | scales in from bottom-left when the footer is reached; hover copy button: width 26 → 62px, inner scale .7 → 1, 250ms `(.15,0,.15,1)`, "COPY" label slides up from 10px |
| footer links | underline `translateX(−100% → 0)` 200ms linear on enter, `0 → 100%` on leave |
| mobile menu | full-screen black overlay; nav items 26px condensed; label swaps MENU → CLOSE |
| marquee | `ticker 30s linear infinite` (consent text; not reproduced) |
| vinyl icon | `play-record 20s linear infinite` rotate (widgets drawer) |

## Build decisions
- Placeholder brand "Orbe", original copy, fictional clients.
- Videos → animated CSS compositions (`components/Media.tsx`) so cards have
  motion without proprietary footage; play/pause toggles `animation-play-state`.
- Fonts: Archivo variable (wdth + wght axes) and Geist Mono via fontsource (self-hosted).
- Not reproduced: Cookiebot, Vimeo, page-transition overlay to case-study routes (no routes exist).

---

# Inner pages — work index and case studies

Captured 2026-10-01 with `tools/links.mjs`, `tools/pages.mjs` and probes
(`reference/pages/`): homepage link map, `/work` (desktop, mobile, hover, filter,
scroll), 3 case studies module-by-module (instagram, tripadvisor,
microsoft-copilot-pc) plus module surveys of amazon and fitbit-ace-lte, mobile
scroll frames of `/work` and 2 case studies, and 50ms transition frames.

## Routes

| route | linked from (homepage) | notes |
|---|---|---|
| `/work` | pill menu "Work", inline nav "Work", `[ VIEW ALL PROJECTS ]` card | projects index |
| `/work?filter=<category>` | filter panel on `/work` | client-side, same page |
| `/work/partnerships` | "Partnerships" switch on `/work` | separate list layout — **not built (pending decision)** |
| `/projects/<slug>` | each featured card | case study; "next" follows index order |

Other routes linked from the homepage and **not built**: `/about`, `/services`,
`/careers`, `/contact`, `/latest` + 6 `/latest/<article>`, `/privacy-policy`,
`/terms-of-use`. All navigations between built pages are client-side.

## Shared inner-page shell (desktop)

- `px-4` page gutter; row of **sidebar 320px** (`w-sidebar`, sticky, `h-svh`,
  `py-4`, content starts `pt-12 + 46px` below the pill) + 16px gap + content column
  (1057px at 1440).
- Header pill is **always solid** on inner pages, width = sidebar (320px), and
  carries a breadcrumb: mono 11px section label (white/60) and, on case studies,
  the project name (grey). Inline nav row is hidden. Clock unchanged.
- Sidebar heading pair: 24px/1.2 condensed 300, white line + grey line(s).

## Work index `/work`

| part | spec |
|---|---|
| sidebar | heading pair at y≈124; view switch at y≈246: items 16px/20px (active white, inactive grey), `py-3`; a 3px dot sits 12px left of the active item (scale 0→1 on hover/active, 333ms `cubic-bezier(.38,.02,.41,.98)`); the *inactive* item shows a 14px/17.5px grey description under it (height auto vs 0) |
| featured card | bottom of sidebar (`mt-auto`), 320×92, off-black, r 6px, `p-2 pr-1`: 76px squircle thumb (r 1.5rem, scale .95), 16px title white + 16px subtitle grey, 9px mono chip (light-grey) at bottom, 26px glass arrow button top-right. Pops in after arrival: wrapper scale 0→1, content `translateY(10px)→0` + opacity |
| grid | 2 columns, 8px gaps, `py-4`. Card shapes by row span: **25 → 4:5 (525×656)**, **15 → 4:3 (525×393)**, **12 → 5:3 (525×315)**. Column pattern (period 7): col 1 = 4:5, 4:3, 4:5, 5:3, 4:3, 4:5, 5:3; col 2 = 5:3, 4:5, 5:3, 4:5, 4:3, 4:5, 4:3. Media only, r 6px |
| card hover | media height → `calc(100% − 24px)` 167ms linear; caption row (client white left, title grey right, 16px) fades in, 167ms with 167ms delay; every other card dims to ~35% |
| filter button | fixed bottom-right of content, glass, mono `FILTER` + sliders icon; when a filter is active it shows the category name and a clear "×" |
| filter panel | fixed full-screen, z 100: backdrop black/80 + blur 20px (fade 500ms); panel `max-w-[817px]` centred, scale 1.1→1 500ms `(.65,0,.35,1)`, content opacity 167ms after 167ms. Prompt line 16px light-grey, then 3×2 grid of category cards (glass, white/5, r 6px, `p-2 pr-6`): 76px thumb r 4px, 16px name white, 9px mono count mid-grey. Close "×" glass button bottom-right |
| apply filter | option stays highlighted ~250ms → panel fades (~400ms) → old grid fades out (~600ms) → filtered grid fades in (from ~900ms). URL `?filter=<slug>` |

Mobile `/work`: logo + MENU bar; heading pair; mono row "Featured projects" + `(count)`;
single column of 4:3 cards (r 6px) each with caption under it (client white,
title grey, ↗ right), 24px between; fixed bottom glass tab bar
`[ PROJECTS | PARTNERSHIPS | filter ]` (active segment bg white/10).

## Case study `/projects/<slug>`

| part | spec |
|---|---|
| sidebar | heading pair (client white / title grey, 24px condensed); meta row mono 11px grey `SECTOR · YEAR` with a 2px dot separator, 16px below; chapter list 16px/20px, `py-2` (36px pitch): first item = introduction, then one per chapter module; active = white + 3px dot, others grey; scroll-spy (active when its section reaches the top) |
| credits card | sidebar bottom, appears (scale/opacity like the featured card) once the last chapter is active: off-black r 6px, "Thanks" row with "+" toggle, grey 14px text, expands on toggle |
| hero | 16:9 (1057×595), r 6px, poster + video, 24px play/pause ring bottom-right (as homepage) |
| introduction | `#introduction`; dark-grey `border-t`, 12-col grid, `pt-3 pb-9`: cols 1–6 `pl-6` heading 24px condensed white (max 360px); cols 7–12 body 16px/20px grey, paragraphs 8px apart |
| modules | column, 8px gap, composed per project from 4 types (below) |
| next-project footer | fixed behind the content (content is `z-10 bg-black`, followed by a spacer the footer's height, so the page scrolls away to uncover it). Right of the 320px sidebar slot, `pt-37`: mono `NEXT UP` (grey) + next project as a 32px/1.15 condensed pair (white / grey); lower row: left block (border-t white/10) with a 14px white+grey contact prompt and a glass mono button; right 416px column with `[ VIEW ALL PROJECTS ]` bracket link + mono counter, and a 4:5 media card (r 4px) overhanging the bottom edge. Footer content fades in as it is uncovered |

Module types (all 1057px wide):

| type | spec | seen in |
|---|---|---|
| **chapter** | anchor `id`; same frame as the introduction; left = mono 11px grey label (optional 24px condensed heading under it on some projects), right = body 16px grey | all; Amazon has 12, Copilot/Tripadvisor 4 |
| **media** | 16:9, r 6px, image or video (+ play/pause), optional centred caption overlay | all |
| **pair** | two 4:5 cells (525×656) side by side, 8px gap, each image or video | all |
| **quote** | `border-t border-b` white/10, cols 3–10 of 12, `py-16`, centred: 8×7 quote glyph, quote 24px condensed white, attribution mono 11px name white + role grey, 6px apart | Instagram |

Compositions differ: Instagram = chapters with headings interleaved with media and
pairs, ends on a quote; Tripadvisor = short chapters, long runs of media, ends on a
captioned video; Copilot+PC = pairs and media alternating. No stats module exists
on any captured page.

Mobile case study: glass back button (←) top-left; hero 4:5 edge to edge; title
block (heading pair + meta) under the hero; intro + modules single column; chapter
label mono over heading; fixed bottom glass bar `[ PROJECT | CURRENT CHAPTER | + ]`;
footer = quote/credits, `NEXT UP` + `[ VIEW ALL PROJECTS ]`, next heading pair,
next media.

## Page transitions

**Loader wipe** — home → work, home → case study, work → case study, nav links:

| t (ms) | what happens |
|---|---|
| 0–250 | pressed element scales down slightly; nothing else |
| ~200 → ~650 | black panel (`#000`, full width) rises from the bottom, ease-out (≈60% covered after 100ms) |
| ~650 → ~1350 | hold: centred mono 11px row — left: origin label (grey) then load progress `NN%`; next: destination label (white); right edge: destination descriptor (grey) |
| ~1350 → ~1700 | panel lifts off upward while the new page slides up from below into place |
| +1.2s | featured/credits cards pop in |

**Next-project morph** — clicking the footer media on a case study:

| t (ms) | what happens |
|---|---|
| 0 → ~600 | footer text and controls fade out; media card stays put |
| ~650 → ~1050 | media card moves and grows into the hero rect (content column top, 16:9) |
| ~1100 | new case study renders around it (sidebar, intro), hero already in place |

## Build decisions (inner pages)

- Same fictional studio and original copy; projects grow from 5 to 10 so the masonry
  pattern reads; each project gets its own module composition.
- Six original filter categories; each project tagged with one or more.
- `/work/partnerships` and the non-work routes are not built; their links stay `#`.
- Transitions are implemented with a client provider that intercepts internal links
  (loader wipe) and a FLIP clone for the next-project morph.
