# Brief: a long, wordless animated film for a software project

> Standalone version of the design brief. Fill in the placeholders to hand it to any agent. Inside
> this repo, the `project-film` skill (SKILL.md next to this file) uses these rules and handles the
> project input, the case-study copy, integration and verification itself.

You are building a long, story-driven, flat 2D looping animation ("film") that explains what a
software project does, and how, using only moving shapes. It plays inside a portfolio: in project
cards, as the hero of a case-study page, and as one looping tile per chapter next to the written
case study. A technical viewer must understand the project without reading a word. Work alone and
deliver a finished, verified result.

## Project input (fill in before sending)

- **Project:** {{PROJECT_NAME}}
- **What it does, in one sentence:** {{ONE_LINER}}
- **The real mechanics to show** (the actual algorithm or workflow, with its real states, tiers and
  counts): {{MECHANICS}}
- **Target length:** {{LENGTH}} (60–90 s for a focused project, 120–180 s for a flagship)
- **Palette:** ground {{GROUND_HEX}}, ink {{INK_HEX}}, accent {{ACCENT_HEX}}, plus an optional
  warning colour {{WARN_HEX}}. If these are blank, choose them yourself (see the palette section).
- **Deliverable:** {{FORMAT}}. Either `standalone`: one self-contained `.html` file, or `module`: a
  TypeScript module matching the interface at the end of this brief.

## Storyboard first

Before drawing, write a short board: a one-sentence logline (what the viewer understands by the
end); the cast (6–12 hero tokens and what each represents, plus the secondary ensemble and where it
emerges from and returns to); a colour = state legend that stays fixed for the whole film; a chapter
table (`#`, one-word label ≤ 12 chars, range, beat, the real mechanic it shows, freeze moment); the
transitions, as morphs and not cuts; and the camera plan, if any.

## The idea that makes it work

1. **One cast, never replaced.** The hero tokens (rounded rects, discs, bars, pills) persist for the
   whole film and change role through morphs: position, size, radius, rotation, colour, alpha and
   shape blends (rect ↔ pill ↔ disc ↔ bar). Secondary elements appear only by emerging from a hero
   token or structure (split, emit, unfold, extrude) and leave by returning into one (merge, absorb,
   collapse). Nothing pops in from nowhere.
2. **Chapters are roles, not cuts.** Each chapter is a role the cast takes on. Write each role as a
   pure function `roleN(k, t) -> state` for token `k` at time `t`. Chapter count and length are free:
   6–12 chapters of 6–16 s each is typical. Every chapter must also stand alone as a looping tile:
   start from a settled composition, build to one clear freeze-worthy moment around 60–80% through,
   and end settled.
3. **Tell a story.** A beginning, a rising middle and a payoff, never a list of features. Chapters
   escalate: more tokens involved, higher stakes, a bigger payoff. Prefer one or two hero moments per
   chapter over many small beats, and give each room: anticipation, the action, the reaction, then a
   hold of about 0.4–0.8 s.
4. **Morph between roles.** Transitions run 0.8–1.6 s, staggered 0.04–0.1 s per token, along curved
   paths (arcs or quadratic béziers, never straight lerps for travel), with different but related
   easings for different tokens. Interpolate x, y, w, h, radius, rotation, alpha and colour.
5. **Close the loop exactly.** The film ends by morphing the cast back to `role1(k, 0)`, so frame
   `LOOP` matches frame `0` pixel for pixel. That final morph sits outside the last chapter's range.
6. **Everything is a pure function of `t`.** No state accumulates between frames: no physics
   integration, no `Math.random()`, `Date` or `performance.now()` at draw time. Use a seeded PRNG at
   load for variety and precompute traces, layouts and paths. This lets any moment be frozen, any
   chapter looped on its own, and stills taken.

## Motion quality

- **Anticipation:** a small counter-move of 4–10 px or a squash before a big move.
- **Follow-through and overlap:** children lag their parent by 40–120 ms and settle with a damped
  overshoot, e.g. `1 − e^(−kx)·cos(ωx)` or `easeOutBack`.
- **Squash and stretch:** at most 8–15% along the motion vector, area roughly preserved.
- **Arcs, slow-in/slow-out, secondary action:** idle tokens breathe with ±1–2 px or a slight alpha
  drift, so the frame is never dead.
- **Stagger everything.** No more than ~2 things start in the same 100 ms; never move the whole cast
  in lockstep. Individual actions take 0.3–1.0 s.
- **Rhythm:** alternate busy passages with calm holds. Don't keep the screen equally busy for 90 s.
- **Easing.** Cubic in-out for travel, cubic out for appearances. For a calm or wellbeing project,
  sine in-out and quad out, with no shakes or bursts.
- **Camera** (optional, encouraged for long films): a pure function of `t` using
  `save()/translate/scale/restore` inside `draw`. Slow push-ins (≤ 1.25×) and drift for emphasis;
  the important action stays inside the 1360×800 core at every moment, because thumbnails crop to
  it; return to identity by the loop end. The dot grid stays screen-fixed, drawn before the camera
  transform.
- **Truthful details.** Where the project has an algorithm or workflow, animate the real thing: a
  genuine sort trace generated at load, a real tree, the real status lifecycle, the real scoring
  formula. These details convince a technical viewer.

## Visual language

- **Solid ground, no gradients behind the scene.** One flat ground colour, one ink colour, one
  accent colour and an optional warn colour. No gradients, `shadowBlur`, filters, images or fonts.
- **Derive every other tone by mixing ground and ink.** Use these ratios:
  - `edge` 0.14: tracks and gridlines
  - `idle` 0.22: inactive shapes
  - `lock` 0.34: outlines and settled shapes
  - `grey` 0.55: secondary shapes
  This keeps the palette coherent on any ground.
- **Colour means state, consistently across all chapters.** For example: idle, then in progress
  (ink), then done or success (accent), with an optional warning colour for a failure or breach.
- **Palette direction if you're choosing.** Saturated or deep editorial grounds that differ clearly
  from the films already in the grid: forest `#1d3b2a`, plum `#3b0d36`, signal green `#14e05a`,
  cream `#f1ece4`, vermilion `#f05a28`, blue `#2440d8`, navy `#0b3048`, amber `#f5b82e`, lilac
  `#b7a6f2`, oxblood `#5c1620` and deep teal `#0f5f5c` are taken. The site chrome is near-black, so
  avoid near-black grounds. Pair each ground with a high-contrast ink and an accent that pops.
- **Fill the frame deliberately.** Layered compositions with furniture (tracks, lanes, grids, rails,
  graph edges, containers) drawn in the derived tones, the hero cast on top, and echoes and particles
  last. Aim for compositions you'd put on a poster; avoid a few shapes floating in empty space.
- **Shape craft.** Generous corner radii, rounded line caps, 3–7 px strokes, hairlines at 1.5–2 px
  for furniture, and spacing on a 40 px rhythm that matches the dot grid.
- **No text at all.** No captions, labels, numbers, counters, chapter indicators or glyph-like
  letterforms. Wherever text would carry meaning, a shape does it instead:
  - rank becomes dots
  - a counter becomes a growing bar
  - a status becomes a colour change
  - success becomes a tick that draws itself
  - time becomes an arc sweeping
  If the film doesn't read without words, the motion needs redesigning.
- **Background dot grid.** 3 px squares on a 40 px pitch in ink at about 6–8% alpha, extending across
  the whole visible canvas, not just the stage.
- **Punctuation:**
  - **Echo:** one outline that grows 30–40 px outward from the shape over 0.8 s and fades out.
  - **Pop:** the shape scales by `1 + a·sin(π·seg)` with `a` between 0.1 and 0.25, over 0.3 s.
  - **Ripple:** a ring that sweeps outward through the dot grid over 1.4 s (radius
    `easeOut(dt/1.4)·800`, band width 50). Use it only for the 4–8 biggest moments in the whole film.
  - An optional **dot-grid spotlight** following the busiest tokens.
- **Thumbnails.** The `still` must be the single most telling frame: it shows at 40 px, 76 px and in
  reduced motion, so it needs bold shapes that read at 40 px.

## Stage and rendering

- **Stage.** Draw on a virtual 1600×1000 stage. Keep the important content inside a centred 1360×800
  core. Fit with `s = min(W/1360, H/800)` and centre it, so 16:9 cards, 4:5 crops and small
  thumbnails all show the core.
- **Canvas.** Use Canvas 2D. Cap the device pixel ratio at 2, and at 1 for canvases narrower than
  200 px. Clear by filling the ground colour every frame.
- **Each frame:** `draw(t)` paints the dots, then scene furniture (tracks, edges, rungs), then the
  tokens, then the echoes and particles.
- **Performance.** Median frame ≤ 4 ms and p95 ≤ 8 ms on a 1280×800 hero, with zero long tasks.
  Precompute paths, avoid per-frame allocations in hot loops, batch the dot-grid fills, and cull
  anything outside the visible region.
- **Playback:**
  - Advance time with `requestAnimationFrame`, clamping each step to at most 0.1 s.
  - Run only while the canvas intersects the viewport (`IntersectionObserver` with a 100 px margin)
    and the document is visible.
  - Pause by stopping the clock. The frame stays where it is.
  - With `prefers-reduced-motion: reduce`, draw one representative still and don't animate. Listen
    for changes to the setting.
  - Repaint on resize (`ResizeObserver`).
  - Clean up every observer, listener and animation frame.
- **Chapter mode.** Given a chapter index, loop only that chapter's time range. Fade through the
  ground colour over about 0.45 s at each restart so the seam is invisible. Its still is 72% into
  the range.
- **Standalone HTML extras.** Support `?t=<seconds>` to freeze a frame and `?chapter=<i>` for chapter
  mode. Use no external libraries and no web fonts.

## Deliverable

- **`standalone`:** a single `.html` file with a full-viewport canvas. Give it `role="img"` and an
  `aria-label` that describes the whole story in one or two sentences.
- **`module`:** a `.ts` file exporting:

```ts
type RGB = readonly [number, number, number];
type View = { x0: number; y0: number; x1: number; y1: number }; // visible region in stage units
type FilmDef = {
  ground: string;                 // hex ground colour, painted by the player
  loop: number;                   // seconds; frame `loop` equals frame 0
  still: number;                  // representative time for stills / reduced motion
  chapters: { label: string; range: [number, number] }[]; // contiguous, in order, any count
  draw: (p: Painter, t: number, view: View) => void;      // paints everything except the ground
};
```

`Painter` wraps a `CanvasRenderingContext2D` and exposes `ctx`, plus these methods:

- `rrPath(x, y, w, h, r)`
- `rrect(x, y, w, h, r, col, a?)`
- `rstroke(x, y, w, h, r, col, width, a?)`
- `line(x1, y1, x2, y2, col, width, a?)`
- `arc(x, y, r, from, sweep, col, width, a?)`
- `disc(x, y, r, col, a?)`
- `dots(view, ink, baseAlpha, lit?(x, y), litCol?)`

Use only these methods (plus `ctx` for custom paths and the camera transform). Structure a long film
under these headings: palette and tones, precomputed data, per-chapter role functions, transition
helpers, furniture, cast and fx painters, `draw`. The player handles fitting the stage, the device
pixel ratio, timing and chapter looping.

## Verify before you finish

Render frames headlessly with Playwright or a similar tool, at a 1280×800 viewport or smaller and
device scale 1. Downscale stills to 400×225 or less before viewing them, and keep every sheet at or
below 1200×900. Then check:

1. **Contact sheet.** One frame at about 70% through each chapter, plus `t = 0`. Each chapter must
   read as a distinct idea without any text; the frame must be full and composed.
2. **Loop seam.** Frames at `LOOP − 0.05` and `0` must be near-identical.
3. **Transitions.** Frames placed mid-transition look intentional, not like a pile-up.
4. **Chapter mode.** The start and end of each chapter loop must fade cleanly.
5. **Small sizes.** At 400×225 and 80×80 the film must still show recognisable shapes, with nothing
   important cut off at a 4:5 crop.
6. **No text.** Zero `fillText` calls. No console errors.
7. **Performance.** Median frame ≤ 4 ms and p95 ≤ 8 ms over 5 s on the hero, no long tasks. Nothing
   may run while the canvas is offscreen or the tab is hidden.
8. **Reduced motion.** With reduced motion emulated, you get one still and no animation-frame loop.

Report the chapter timings, the palette and its state colours, the still time you chose and why,
the cast and what it means, and the contact sheets.
