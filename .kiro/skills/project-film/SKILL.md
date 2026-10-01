---
name: project-film
description: Use when the user points at a project directory (a codebase on disk) and wants an animated project film made for it and added to this portfolio. Reads the project, designs a five-chapter wordless canvas film in the house style, writes it into app/components/film, registers the project and its case study, and verifies it renders. Triggers include "make a film for D:/path/to/project", "add this project to the portfolio with an animation", "create a preview animation for <dir>".
---

# Project film

Turn a project directory into a looping, wordless, five-chapter canvas film and wire it into this
portfolio: homepage and Work cards, thumbnails, the widgets drawer, and a case study page with the
film as hero plus one looping tile per chapter.

Design rules live in [film-brief.md](film-brief.md). Read it in full before designing. This file
covers the repo-specific workflow. Paths below are relative to the repo root (the folder holding
`app/` and `tools/`).

## Input

- **Required:** an absolute path to the project directory.
- **Optional:** the user may also give a palette, a slug, chapter names, or a homepage position. A
  value the user gives overrides anything you infer.

If the path doesn't exist or holds no recognisable code, stop and tell the user.

## Step 1: Understand the project

Read the project directory. Don't edit anything in it.

- **Docs and manifests:** README(s), `package.json` / `pom.xml` / `build.gradle` / `requirements.txt` /
  `pyproject.toml` / `Cargo.toml`, and any docs folder.
- **What the product does:** routes, pages or screens, API controllers, domain models or entities, and
  enums of states or statuses. These are the best source for the five pillars and for colour-means-state.
- **The real mechanics:** any genuine algorithm or workflow, such as a sort, scheduling, status
  lifecycle, escalation levels or matching. The film should animate these truthfully.
- **Metadata:**

| Field | Where to find it |
|---|---|
| Live URL | README links, `homepage` in package.json, `CNAME`, deploy config |
| GitHub URL | `git -C <dir> remote get-url origin`, normalised to `https://github.com/<owner>/<repo>` |
| Year | year of the first commit: `git -C <dir> log --reverse --format=%ad --date=format:%Y` (take the first line) |
| Stack | dependencies, mapped to the names already used in `app/lib/content.ts` (React, Spring Boot, MySQL, AWS, Docker, Java, JavaScript, Tailwind, CSS, Firebase, PHP, …) |

Then write down:

- **Client name, title, sector and description.** Use the house tone of the existing entries: the
  description is one or two plain sentences.
- **Five pillars, in the order a user experiences them.** Each one is a verb plus what happens.
- **Cast:** what the 6–9 tokens represent.
- **State colours:** what each colour means.
- **The real mechanic you will animate.**

Check whether the project is already in `allProjects` in `app/lib/content.ts`. Match on the GitHub
URL, the live URL or the client name. If it is, you are adding a film to that entry; keep its slug
and fields.

## Step 2: Design

Follow film-brief.md for these: one cast with no replacements, chapters as roles, morphs, an exact
loop, a pure function of `t`, no text, and a solid palette.

- **Palette.** Choose a ground, ink and accent that differ clearly from the films already in
  `app/components/film/*.ts`. Read their `ground` values; at the time of writing those are `#1d3b2a`
  forest, `#3b0d36` plum, `#14e05a` signal green, `#f1ece4` cream and `#f05a28` vermilion. Pick
  ground colours that look good next to these in the Work grid.
- **Timing.** Use five chapters of about 4.5–5 s each, plus a final morph back to frame 0. That gives
  a loop of about 25 s.
- **Still.** Pick a representative still time from the most telling chapter. It is used for
  thumbnails and for reduced motion.

## Step 3: Write the film

Create `app/components/film/<id>.ts`. The `<id>` is lowercase letters only, for example `readify`.
Use the existing films as the reference implementation. `vantage.ts` and `truxpert.ts` are the
clearest examples.

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

The player paints the ground colour, fits the stage to the frame (keeping a centred 1360×800 core
visible), handles the device pixel ratio, pause, offscreen, reduced motion and chapter looping. The
film only draws.

**Export** `export const <id>: FilmDef = { ground, loop, still, chapters, draw }`:

- **`chapters`:** exactly five `{ label, range: [start, end] }`, in order, covering the story. The
  final morph back to frame 0 sits outside the last range.
- **`draw(p, t, view)`:** draws the dots, then the furniture, then the tokens, then the echoes.

**Hard rules:**

- No `fillText` or `strokeText`.
- No `Math.random()` or `Date` inside `draw`.
- No state carried between frames. Precompute any traces, such as a sort trace, at module load.

## Step 4: Register it

1. `app/components/film/index.ts`: import the film and add it to `FILMS`.
2. `app/lib/content.ts`:
   - Add `<id>` to the `FilmId` union.
   - Add `<id>: [five labels]` to `FILM_CHAPTERS`. The labels must match the film's `chapters`
     labels exactly and in the same order.
   - For an existing project, add `film: "<id>",` to its entry.
   - For a new project, add a `Project` entry to `allProjects`:
     - Fill in slug, client, title, year, sector, description, `liveUrl`, `githubUrl` and `stack`.
     - Set `media` to the closest abstract variant (it is only a fallback) and `tint: "#141414"`.
     - Set `film: "<id>"`.
     - If the project has a screenshot, copy one into `app/public/media/<slug>.<ext>` and set `src`
       to it. Otherwise use `src: ""`; the film takes precedence everywhere.
     - If there's no live URL, ask the user rather than inventing one.
     - Position: the homepage shows only the first five projects, and order also sets "next project".
       Append at the end unless the user asked for a position.
   - If the stack adds a technology worth filtering by, you may add it to `techCategories`.

Don't touch other films, components or styles. The case study page builds itself from
`caseFor`: the film as hero, then chapter 1 wide, chapters 2–5 in pairs, then Stack and Links.

## Step 5: Verify

1. **Static checks.** In `app/`, run `npx tsc --noEmit`. It must exit 0.
2. **No text.** Grep the new film file for `fillText|strokeText|Math.random|Date\.` and expect no
   matches.
3. **Render.** You need the app running on `http://localhost:3000`:
   - Check whether something is already listening there. If so, check it is this app's dev server.
   - If nothing is running, start `npm run dev` in `app/` as a background process. Wait until
     `/projects/<slug>` returns 200, and stop the server when you are done.
   - Don't run `next build` while a dev server is using `.next`.
4. **Contact sheet.** In `tools/`, run:

   ```
   node film-sheet.mjs <slug> --times <t0>,<…> --loop <loop>
   ```

   - `--times`: `0` plus a point about 70% into each chapter.
   - It writes `local/film-sheet/<slug>.png`, which is git-ignored and at most 1200 px wide.
   - It prints the canvas count (6 for a film project), the chapter tile count (5), `seam` and
     console `errors`.
5. **Pass criteria:**
   - `errors` is empty.
   - `seam` is below 2. That is the mean per-channel difference between `loop − 0.05` and `0`. A
     high value means the final morph doesn't return to frame 0.
   - On the sheet, each chapter reads as a distinct idea without words. Nothing important is
     clipped. The chapter tiles show motion from their own chapter.
6. **Fix and repeat.** Fix anything that fails, then re-run. View the sheet only after a meaningful
   change, and keep it to a handful of views per session.
7. **Clean up.** Delete `local/film-sheet/` when you are done.

## Step 6: Report

Tell the user:

- the slug, the film id and the palette
- the five chapters with their time ranges, the still time, and what the cast and colours mean
- whether the project was new or existing, and its position in `allProjects`
- the verification results (tsc, seam and errors)
- anything inferred that they should confirm, such as the live URL, year or sector

Don't commit unless the user asks.
