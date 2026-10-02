---
name: project-film
description: Use when the user points at a project directory (a codebase on disk) and wants an animated project film and a case study made for it and added to this portfolio. Reads the project, storyboards a long wordless canvas film in the house style, writes it into app/components/film, writes the case-study copy into app/lib/copy, registers the project, and verifies it renders. Triggers include "make a film for /path/to/project", "add this project to the portfolio with an animation", "create a preview animation for <dir>", "write the case study for <project>".
---

# Project film

Turn a project directory into a looping, wordless canvas film plus a case study, and wire both into
this portfolio: homepage and Work cards, thumbnails, the widgets drawer, and a case-study page with
the film as hero, one looping tile per chapter, and copy sections placed next to the chapters they
explain.

Design rules live in [film-brief.md](film-brief.md). Read it in full before designing. This file
covers the repo-specific workflow. Paths below are relative to the repo root (the folder holding
`app/` and `tools/`).

## Input

- **Required:** an absolute path to the project directory (a clone with full history, so the first
  commit year and the contributor list are available).
- **Optional:** the user may also give a palette, a slug, a target length, chapter names, or a
  homepage position. A value the user gives overrides anything you infer.

If the path doesn't exist or holds no recognisable code, stop and tell the user.

## Step 1: Understand the project

Read the project directory. Don't edit anything in it, and don't install, build or run it: several
projects bind ports, call paid APIs or need secrets. Everything you need is in the code, docs, specs,
fixtures and tests.

- **Docs and manifests:** README(s), `package.json` / `pom.xml` / `build.gradle` / `requirements.txt` /
  `pyproject.toml` / `Cargo.toml`, and any docs folder.
- **What the product does:** routes, pages or screens, API controllers, domain models or entities, and
  enums of states or statuses. These are the best source for chapters and for colour-means-state.
- **The real mechanics:** any genuine algorithm or workflow, such as a sort, scheduling, a status
  lifecycle, escalation levels, scoring or matching. The film animates these truthfully, with real
  counts, real tier numbers and real state names (as colours, never text), and the copy names them.
- **Facts for the copy,** each with the file path it came from: the problem, the architecture and
  data flow, two or three non-obvious engineering decisions and why, and what is verifiably true
  about the outcome (tests, determinism, modes, integrations).
- **Metadata:**

| Field | Where to find it |
|---|---|
| Live URL | README links, `homepage` in package.json, `CNAME`, deploy config |
| GitHub URL | `git -C <dir> remote get-url origin`, normalised to `https://github.com/<owner>/<repo>` |
| Year | year of the first commit: `git -C <dir> log --reverse --format=%ad --date=format:%Y \| head -1` |
| Contributors | `git -C <dir> shortlog -sne HEAD`; other substantive contributors mean "we", never sole authorship |
| Stack | dependencies, mapped to the names already used in `app/lib/content.ts` (React, Spring Boot, MySQL, AWS, Docker, Java, JavaScript, Tailwind, CSS, Firebase, PHP, Python, FastAPI, SQLite, Next.js, TypeScript, Bun, Terraform, …) |

Check whether the project is already in `allProjects` in `app/lib/content.ts`. Match on the GitHub
URL, the live URL or the client name. If it is, you are adding a film and copy to that entry; keep
its slug and wiring, and keep any existing fact you can't disprove.

## Step 2: Storyboard

Write a short board before drawing, in `local/boards/<id>.md` (git-ignored). It holds the logline,
the cast (6–12 hero tokens plus the secondary ensemble and where it emerges from and returns to),
the colour = state legend, a chapter table (`#`, one-word `label` ≤ 12 chars, `range`, beat, the
real mechanic it shows, freeze moment), the transitions (how each end state becomes the next start
state), the camera plan if any, and the copy outline (intro headline, section list with the chapter
each follows, and the fact sources). Then start building; don't wait for approval.

- **Palette.** Choose a ground, ink and accent (plus an optional warn colour) that differ clearly from
  the films already in `app/components/film/*.ts`. Read their `ground` values; at the time of writing
  they are vantage `#1d3b2a` forest, argus `#3b0d36` plum, truenorth `#14e05a` signal green,
  spicerack `#f1ece4` cream, truxpert `#f05a28` vermilion, saga `#2440d8` blue, quant `#0b3048` navy,
  conduit `#f5b82e` amber, repohive `#b7a6f2` lilac, readify `#5c1620` oxblood and prospector
  `#0f5f5c` deep teal. The site chrome is near-black (`#141414`), so avoid near-black grounds. Pick
  colours that look good next to these in the Work grid.
- **Length.** Chapter count and duration are free. Six to twelve chapters of 6–16 s each is typical;
  a flagship runs 120–180 s, a focused project 60–90 s. Every chapter must also stand alone as a
  looping tile. A final morph back to `t = 0` sits outside the last chapter's range.
- **Still.** Pick the single most telling frame. It shows at 40 px, 76 px and in reduced motion.

## Step 3: Write the film

Create `app/components/film/<id>.ts`. The `<id>` is lowercase letters only, for example `readify`.
Use the existing films as the reference implementation.

**Import only from `./kit`:**

| Kind | Names |
|---|---|
| Stage constants | `VW` (1600), `VH` (1000), `CX` (800), `PI` |
| Helpers | `seg`, `bump`, `clamp01`, `lerp`, `mix(rgbA, rgbB, p)`, `css(rgb, a)`, `hex("#rrggbb")` |
| Tone derivation | `tones(ground, ink)`, which returns `{ edge, idle, lock, grey }` |
| Easings | `easeCubic`, `easeOutCubic`, `easeSine`, `easeOutQuad` |
| Grid ripple | `ripple(t, t0, ex, ey, x, y)`, the ring alpha for a dot |
| Types | `FilmDef`, `RGB`, `View` |
| Painter | an instance `p` with `p.ctx`, `p.rrPath`, `p.rrect`, `p.rstroke`, `p.line`, `p.arc`, `p.disc` and `p.dots(view, ink, base, lit?, litCol?)` |

Anything else you need (camera, spring, bezier, seeded PRNG, path sampler, `easeOutBack`) is defined
inside your own film file. Never edit `kit.ts`, `Film.tsx` or another film.

The player paints the ground colour, fits the stage to the frame (keeping a centred 1360×800 core
visible), handles the device pixel ratio, pause, offscreen, reduced motion and chapter looping. The
film only draws.

**Export** `export const <id>: FilmDef = { ground, loop, still, chapters, draw }`:

- **`chapters`:** `{ label, range: [start, end] }` entries, contiguous and in order, starting at 0,
  with the last range ending before `loop`. Labels are one word, ≤ 12 chars, unique. The case study
  derives its tile labels and sidebar entries from this array.
- **`draw(p, t, view)`:** draws the dots (screen-fixed, before any camera transform), then the
  furniture, then the cast, then echoes and particles.

**Hard rules:**

- No `fillText` or `strokeText`, no digits or glyph-like letterforms. No gradients, `shadowBlur`,
  filters, images or fonts.
- `draw` is a pure function of `t`: no `Math.random()`, `Date` or `performance.now()`, no state
  carried between frames, no module-level mutable state touched from `draw`. Precompute traces,
  layouts and seeded variety at module load with a seeded PRNG.
- Performance: median frame ≤ 4 ms and p95 ≤ 8 ms on the 1280×800 hero, zero long tasks.
  Precompute paths, avoid per-frame allocations in hot loops, batch dot-grid fills like `kit.dots`,
  cull anything outside `view`.
- Structure a long film (~1000 lines is fine) under these headings: palette and tones, precomputed
  data, per-chapter role functions `roleN(k, t) → state`, transition helpers, furniture, cast and fx
  painters, `draw`.

**Draft, then swap.** The live film and copy files are imported by every page, so a syntax error in
either breaks the whole site. Iterate in `app/components/film/<id>.wip.ts` and
`app/lib/copy/<slug>.wip.ts`: they aren't imported, so the app never runs them, but `tsc` still
checks them. Copy a draft over its live file only when `npx tsc --noEmit` shows no errors in your
files, and delete both drafts when you finish. This matters most when a dev server is shared or
other people are editing sibling films at the same time; in that case also never start or stop the
server, never run `next build`, and leave git to whoever owns the branch.

## Step 4: Write the copy

Write the copy after the film's chapters are locked, because `after` refers to chapter indices.
Create `app/lib/copy/<slug>.ts` as `export default { … } satisfies ProjectCopy;`, importing only
`import type { ProjectCopy } from "./types";`. Everything is a plain string rendered in `<p>`/`<h*>`:
no markdown or HTML, US spelling, unique paragraphs within a section.

A hiring manager skims the card and the intro in 15 seconds; an engineer reads the sections and
checks the claims against the repo. Write for both.

| Field | Rule |
|---|---|
| `title` | A noun phrase naming what it is, ≤ 32 chars, e.g. "Gamified DSA Visualization Engine". No brand name (the client name already shows beside it). |
| `sector` | ≤ 18 chars. Reuse an existing one where it fits ("Developer tools", "EdTech", "Civic tech", "Fintech", "E-commerce", "Wellness", "SaaS"). |
| `year` | The first-commit year, unless the repo was clearly re-created later than the project; then keep the known year and say so in the report. |
| `description` | 1–2 sentences, ≤ 200 chars: what it is, who it's for, and the one distinctive *how*. It's the homepage line and the meta description. |
| `stack` | ≤ 10 items, named the way `content.ts` already names them, ordered frontend → backend → data → infra. Only what the manifests prove. |
| `intro.heading` | ≤ 70 chars. States the outcome or the idea, not the product name. |
| `intro.body` | 2–3 paragraphs of 40–80 words: the problem, the approach, the result. |
| `sections` | 3–5 for a focused project, 4–6 for a flagship. Pick from **Problem**, **Architecture**, **the signature mechanic** (named for what it is, e.g. "Escalation", "Scoring", "Replay"), **Engineering decisions**, **Outcome**. Each has a unique kebab-case `id` (not `introduction`, `stack` or `links`), a 1–2 word `label`, a `heading` ≤ 70 chars, and 1–3 paragraphs of ≤ 90 words. Short highlight lines (≤ 14 words) may be separate `body` entries. |
| `after` | The 0-based film chapter index the section follows: Problem after chapter 0, the mechanic after its chapter, Outcome with no `after` (it goes last). Never put two sections back to back where a tile could sit between them. |
| `links` | Optional, on a section: public URLs into the repo. No localhost, no private links. Stack and Links sections are generated; don't add them. |

**Voice:** plain, specific and confident. Make the product the subject; use "I" only where an actor
is needed, and "we" if `shortlog` shows other substantive contributors. Show with specifics (real
stages, states, tiers, formulas, trade-offs) instead of adjectives. Banned: seamless, cutting-edge,
revolutionary, robust, leverage, powerful, blazing, world-class, state-of-the-art, effortless,
next-gen, game-changing. No exclamation marks; em dashes only sparingly.

**Truth:** every factual claim traces to a file in the repo (list the sources in the board). Numbers
only if the repo states or proves them. No invented users, traffic, uptime, adoption, performance
figures or awards. Never copy secrets, keys, hostnames or `.env` values, even from `.env.example`.

The case study assembles itself: the intro, then the film tiles (tile 0 wide, then pairs, a trailing
odd tile wide) with each section slotted after the tile holding its chapter, then sections without
`after`, then Stack and Links.

## Step 5: Register it

1. `app/components/film/index.ts`: import the film and add it to `FILMS`.
2. `app/lib/copy/index.ts`: import the copy file and add it to `COPY`, keyed by slug.
3. `app/lib/content.ts`:
   - Add `<id>` to the `FilmId` union. There is no chapter table to update: labels come from the
     film's `chapters`.
   - For an existing project, add `film: "<id>",` to its entry.
   - For a new project, add a `Project` entry to the base array:
     - Fill in slug, client, `liveUrl`, `githubUrl`, `media` (the closest abstract variant, only a
       fallback), `tint: "#141414"` and `film: "<id>"`. The text fields (`title`, `sector`, `year`,
       `description`, `stack`) are overridden by the copy file, but the entry still needs values; use
       the same ones.
     - If the project has a screenshot, copy one into `app/public/media/<slug>.<ext>` and set `src`
       to it. Otherwise use `src: ""`; the film takes precedence everywhere.
     - If there's no live URL, leave it empty only for local-only tools; otherwise ask the user
       rather than inventing one.
     - Position: the homepage shows only the first five projects, the widgets drawer the first four,
       and order also sets "next project". Append at the end unless the user asked for a position.
   - If the stack adds a technology worth filtering by, you may add it to `techCategories`.
   - Keep `workCopy.subheading` ("Projects from … to …") matching the real year range.

Don't touch other films, components or styles.

## Step 6: Verify

Do these in order; don't skip steps.

1. **Static checks.** In `app/`, run `npx tsc --noEmit`. It must exit 0 (for a shared tree, no errors
   in your files). Then swap the drafts into the live files.
2. **No text or clock.** `grep -nE 'fillText|strokeText|Math\.random|Date\.|performance\.now'
   app/components/film/<id>.ts` must print nothing.
3. **Render.** You need the app running on `http://localhost:3000`:
   - Check whether something is already listening there. If so, check it is this app's dev server.
   - If nothing is running, start `npm run dev` in `app/` as a background process. Wait until
     `/projects/<slug>` returns 200, and stop the server when you are done.
   - Don't run `next build` while a dev server is using `.next`.
4. **Contact sheet and checks.** In `tools/`, run:

   ```
   node film-sheet.mjs <slug> --times 0,<~70% into each chapter> --loop <loop> --perf --text
   ```

   - It writes `local/film-sheet/<slug>.png`, `<slug>-2.png`, … (git-ignored), at most 12 cells of
     400×225 per PNG (1200×900), and prints every path under `sheets`.
   - `--tiles i,j,…` captures only those chapter tiles (default: all); `canvases` is still counted.
   - `--perf` hides every canvas but the hero, times its frame callback for 5 s and prints
     `meanFrameMs`, `medianFrameMs`, `p95FrameMs`, `maxFrameMs`, `longTasks` and `canvasesInView`.
   - `--text` prints the rendered case-study outline (title, sector, year, description, intro, nav,
     every section with paragraph, char and word counts) and the module `order`, e.g.
     `tile0, sec:problem, pair1-2, …`, so placement can be checked without screenshots.
   - The exit code is 1 when `errors` is non-empty.
5. **Pass criteria:**
   - `errors` is empty (an error whose stack names another film is that film's: the next-project
     footer renders the next project's film).
   - `seam` is below 2: the mean per-channel difference between `loop − 0.05` and `0`. A high value
     means the final morph doesn't return to frame 0.
   - `canvases` equals chapters + 1.
   - perf: median ≤ 4 ms, p95 ≤ 8 ms, zero long tasks, one canvas in view.
   - the text outline shows every section, in the intended order, within the Step 4 limits.
6. **Look at the sheets** (at most ~6 views per session, each ≤ 1200×900, never an image over
   2000 px on a side). Each chapter reads as a distinct idea without words; nothing important is
   clipped at 16:9; the tiles show motion from their own chapter; the frame is full and composed.
   Spot-check transitions with `--times` placed mid-transition: they should look intentional.
7. **Copy self-check.** Re-read every claim against its source file. Grep the copy for the banned
   words and count the title, description and heading lengths.
8. **Clean up.** Delete both `.wip.ts` drafts, `local/film-sheet/` and `local/boards/`.

## Step 7: Report

Tell the user:

- the slug, the film id, the loop length, the palette and its colour legend
- the chapters with their time ranges, the still time, and what the cast means
- the copy: title, sector, year, description, intro heading, section labels and where each sits,
  the contributors found and the voice used, any existing fact you corrected
- whether the project was new or existing, and its position in `allProjects`
- the verification results: tsc, grep, seam, errors, canvases, perf, text outline
- anything inferred that they should confirm, such as the live URL, year, stack names or sector

Don't commit unless the user asks.
