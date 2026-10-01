# Brief: an abstract animated film for a software project

> Standalone version of the design brief. Fill in the placeholders to hand it to any agent. Inside
> this repo, the `project-film` skill (SKILL.md next to this file) uses these rules and handles the
> project input, integration and verification itself.

You are building a short looping animation ("film") that explains what a software project does using only moving shapes. It plays inside a portfolio, in project cards and on a case-study page. Work alone and deliver a finished, verified result.

## Project input (fill in before sending)

- **Project:** {{PROJECT_NAME}}
- **What it does, in one sentence:** {{ONE_LINER}}
- **Five pillars, in the order a user experiences them** (each a short verb plus what happens):
  1. {{PILLAR_1}}
  2. {{PILLAR_2}}
  3. {{PILLAR_3}}
  4. {{PILLAR_4}}
  5. {{PILLAR_5}}
- **Palette:** ground {{GROUND_HEX}}, ink {{INK_HEX}}, accent {{ACCENT_HEX}}, plus an optional warning colour {{WARN_HEX}}. If these are blank, choose them yourself (see the palette section).
- **Deliverable:** {{FORMAT}}. Either `standalone`: one self-contained `.html` file, or `module`: a TypeScript module matching the interface at the end of this brief.

## The idea that makes it work

1. **One cast, never replaced.** Pick 6–9 tokens (rounded rects, discs, bars). The same tokens play every chapter: sorted bars fold into tree nodes, become racers, then leaderboard rows, then map stages. Never create or delete the main cast between chapters. Change its position, size, corner radius and colour instead. This continuity is what makes the film feel fluid and deliberate.
2. **Chapters are roles, not cuts.** Each pillar is one chapter of about 4.5–5 s, in which the cast takes on a new role. Write each role as a pure function `roleN(k, t) -> state` for token `k` at time `t`.
3. **Morph between roles.** When a chapter begins, tween each token from its final state in the previous role to its first settled state in the next. Use about 0.6–1.2 s with a per-token stagger of 0.04–0.1 s and a slight upward arc (`y -= sin(PI·p)·20–36`). Interpolate x, y, w, h, radius, rotation, alpha and colour.
4. **Close the loop exactly.** The last scene morphs the cast back to `role1(k, 0)`, so frame `LOOP` matches frame `0` pixel for pixel. A loop of about 25 s is typical.
5. **Everything is a pure function of `t`.** There is no state that accumulates between frames: no physics integration and no `Math.random()` at draw time. Use a seeded PRNG at load if you need variety. This lets any moment be frozen, any chapter looped on its own, and stills taken.

## Visual language

- **Solid ground, no gradients behind the scene.** Use one flat ground colour, one ink colour and one accent colour.
- **Derive every other tone by mixing ground and ink.** Use these ratios:
  - `edge` 0.14: tracks and gridlines
  - `idle` 0.22: inactive shapes
  - `lock` 0.34: outlines and settled shapes
  - `grey` 0.55: secondary shapes
  This keeps the palette coherent on any ground.
- **Colour means state, consistently across all chapters.** For example: idle, then in progress (ink), then done or success (accent), with an optional warning colour for a failure or breach.
- **Palette direction if you're choosing.** Aim for saturated or deep editorial grounds such as plum `#3b0d36`, forest `#1d3b2a`, signal green `#14e05a`, cream `#f1ece4` or vermilion `#f05a28`. Pair each with a high-contrast ink and an accent that pops.
- **No text at all.** That means no captions, labels, numbers, counters or chapter indicators. Wherever text would carry meaning, a shape does it instead:
  - rank becomes dots
  - a counter becomes a growing bar
  - a status becomes a colour change
  - "north" becomes a chevron
  - "checkout complete" becomes a tick that draws itself
  If the film doesn't read without words, the motion needs redesigning.
- **Background dot grid.** Draw 3 px squares on a 40 px pitch in ink at about 6–8% alpha, extending across the whole visible canvas, not just the stage.
- **Events get punctuation:**
  - **Echo:** one outline that grows 30–40 px outward from the shape over 0.8 s and fades out.
  - **Ripple:** a ring that sweeps outward through the dot grid over 1.4 s (radius `easeOut(dt/1.4)·800`, band width 50). Use it only for the 3–5 key moments.
  - **Pop:** the shape scales to 1.1–1.25 for 0.3 s, using `1 + a·sin(PI·seg)`.
- **Optional attention spotlight.** Brighten the dot grid around a weighted average of whatever tokens are busy right now.
- **Shape craft.** Use generous corner radii, rounded line caps, and stroke widths of 3–7 px on the virtual stage.

## Motion rules

- **Helpers.** `seg(t,a,b)` clamps to 0..1, `bump(t,a,b) = sin(PI·seg)`, plus `lerp` and an RGB `mix`.
- **Easing.** Use cubic in-out for travel and cubic out for appearances. For a calm or wellbeing project, use sine in-out and quad out, with no shakes or bursts.
- **Beats.** Individual actions take 0.3–1.0 s. Never more than about 2 things should start in the same 100 ms. Stagger everything.
- **Truthful details.** Where the project has an algorithm or workflow, animate the real thing: a genuine sort trace generated at load and played back, a real tree, or real escalation levels. These details are what convince a technical viewer.
- **Consistency.** Every chapter needs one clear moment worth freezing on, ideally about 60–80% of the way through the chapter.

## Stage and rendering

- **Stage.** Draw on a virtual 1600×1000 stage. Keep the important content inside a centred 1360×800 core. Fit with `s = min(W/1360, H/800)` and centre it, so 16:9 cards, 4:5 crops and small thumbnails all show the core.
- **Canvas.** Use Canvas 2D. Cap the device pixel ratio at 2, and at 1 for canvases narrower than 200 px. Clear by filling the ground colour every frame.
- **Each frame:** `draw(t)` paints the dots, then scene furniture (tracks, edges, rungs), then the tokens, then the echoes.
- **Playback:**
  - Advance time with `requestAnimationFrame`, clamping each step to at most 0.1 s.
  - Run only while the canvas intersects the viewport (`IntersectionObserver` with a 100 px margin) and the document is visible.
  - Pause by stopping the clock. The frame stays where it is.
  - With `prefers-reduced-motion: reduce`, draw one representative still and don't animate. Listen for changes to the setting.
  - Repaint on resize (`ResizeObserver`).
  - Clean up every observer, listener and animation frame.
- **Chapter mode.** Given a chapter index, loop only that chapter's time range. Fade through the ground colour over about 0.45 s at each restart so the seam is invisible.
- **Standalone HTML extras.** Support `?t=<seconds>` to freeze a frame and `?chapter=<i>` for chapter mode. Use no external libraries and no web fonts.

## Deliverable

- **`standalone`:** a single `.html` file with a full-viewport canvas. Give it `role="img"` and an `aria-label` that describes the whole story in one or two sentences.
- **`module`:** a `.ts` file exporting:

```ts
type RGB = readonly [number, number, number];
type View = { x0: number; y0: number; x1: number; y1: number }; // visible region in stage units
type FilmDef = {
  ground: string;                 // hex ground colour, painted by the player
  loop: number;                   // seconds; frame `loop` equals frame 0
  still: number;                  // representative time for stills / reduced motion
  chapters: { label: string; range: [number, number] }[]; // five, in order
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

Use only these methods (plus `ctx` for custom paths). The player handles fitting the stage, the device pixel ratio, timing and chapter looping.

## Verify before you finish

Render frames headlessly with Playwright or a similar tool, at a 1280×800 viewport or smaller and device scale 1. Downscale stills to 400×225 or less before viewing them. Then check:

1. **Contact sheet.** One frame at about 70% through each chapter, plus `t = 0`. Each chapter must read as a distinct idea without any text.
2. **Loop seam.** Frames at `LOOP − 0.05` and `0` must be near-identical.
3. **Chapter mode.** The start and end of each chapter loop must fade cleanly.
4. **Small sizes.** At 400×225 and 80×80 the film must still show recognisable shapes, with nothing important cut off at a 4:5 crop.
5. **No text.** Zero `fillText` calls. No console errors.
6. **Performance.** A frame must draw in under 4 ms on a typical laptop, measured over 300 frames. Nothing may run while the canvas is offscreen or the tab is hidden.
7. **Reduced motion.** With reduced motion emulated, you get one still and no animation-frame loop.

Report the chapter timings, the palette and its state colours, the still time you chose and why, and the contact sheet.
