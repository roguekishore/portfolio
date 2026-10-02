# Fable handoff: production-grade project films and case studies

You are the **orchestrator**. You don't animate or write copy yourself. You prepare the platform
(Phase 0), spawn one Fable **worker** subagent per project (Phase 1), review and verify each worker's
result, send polish passes back (Phase 2), and integrate and do final QA (Phase 3).

Each worker owns one project end to end:
- its **film**
- its **portfolio copy**: card title, description, sector, year and stack, plus the case-study intro
  and sections

Every worker gets this file's path and its own row from the scope table. Workers read
**§4 Worker brief** in full. Everything else is for you.

Repo: `D:\PROJECTS\koto-recreation` (Windows, PowerShell). App: `app/` (Next.js, see `app/AGENTS.md`).
Branch `wip` (tracks `origin/wip`), clean tree at handoff. **All work happens on `wip` only. Commit
locally, never push** (§7).

---

## 1. Goal and scope

Every in-scope project currently has a ~25 s film: 5 chapters × ~5 s, made with the `project-film`
skill (`.kiro/skills/project-film/`). Its case study is one sentence of description, the film tiles,
Stack and Links. Replace both:

- **Film:** a long, story-driven, production-grade flat 2D film. Chapter count and duration are free.
  Quality, visual density and fluidity must clearly beat the current films.
- **Copy:** professional case-study writing grounded in the repo. That means a sharp card title and
  description, a headline intro, and 3–6 sections (problem, architecture, the signature mechanic,
  engineering decisions, outcome), placed next to the film chapters they explain.

| Tier | Project | Repo | Slug | Film id | Work | Target length |
|---|---|---|---|---|---|---|
| **0** | RepoHIVE | `roguekishore/RepoHIVE` (+ companion `roguekishore/RepoHIVE-Context`) | `repohive` | `repohive` | **New project + new film** | 120–180 s |
| **1** | Vantage | `roguekishore/Vantage` (+ `roguekishore/Vantage-DSA-Visualizers`) | `vantage` | `vantage` | Rewrite | 90–150 s |
| **1** | Argus | `roguekishore/Argus` | `argus` | `argus` | Rewrite | 90–150 s |
| 2 | True North | `roguekishore/True-North` | `true-north` | `truenorth` | Rewrite | 60–90 s |
| 2 | SpiceRack | `roguekishore/SpiceRack` | `spicerack` | `spicerack` | Rewrite | 60–90 s |
| 2 | Truxpert | `roguekishore/Truxpert` | `truxpert` | `truxpert` | Rewrite | 60–90 s |
| 2 | Readify | `roguekishore/eBook-Store` | `readify` | `readify` | **New film** (project exists) | 60–90 s |
| 2 | SAGA | `roguekishore/Saga` | `saga` | `saga` | Rewrite | 60–90 s |
| 2 | CONDUIT | `roguekishore/Kiro-Conduit` | `conduit` | `conduit` | Rewrite | 60–90 s |
| 2 | QUANT | `roguekishore/Quant` | `quant` | `quant` | Rewrite | 60–90 s |
| 2 | Prospector | `roguekishore/Prospector` | `prospector` | `prospector` | **New project + new film** | 60–90 s |

Every row gets new copy.

**Out of scope, don't touch:** St. Josephs, FUEL, My Portfolio, UPS. Their entries keep their current
text.

**Whitelist:** the user tells you which rows run. Run only whitelisted rows. If no whitelist is given,
run every row. Every repo in the table is public.

**Priority means effort, not just order.** Tier 0 and 1 get the most review passes and the strictest
review (§5). Spawn them first. Never let tier 2 work delay or block tier 0/1.

---

## 2. Facts about the current system (verified)

- **Player** `app/components/film/Film.tsx`:
  - Paints the ground and fits the 1600×1000 stage so a centred **1360×800 core** is always visible.
  - Caps DPR at 2 (1 below 200 px wide).
  - Runs only while onscreen and the tab is visible, with rAF steps clamped to 0.1 s.
  - Reduced motion → draws `still`.
  - Chapter mode loops `chapters[i].range` and fades through the ground over 0.45 s at each restart.
    Its still is 72% into the range.
  - `?film-t=<s>` freezes every film on the page at `t mod loop`.
  - Films are pure `draw(p, t, view)` functions.
- **Kit** `app/components/film/kit.ts`:
  - Constants and helpers: `VW VH CX PI`, `seg bump clamp01 lerp mix css hex tones ripple`, and the
    easings `easeCubic easeOutCubic easeSine easeOutQuad`.
  - The `Painter` class: `ctx rrPath rrect rstroke line arc disc dots`.
  - Types: `FilmDef { ground, loop, still, chapters[{label, range}], draw }`, `RGB`, `View`.
- **Registry** `app/components/film/index.ts`: `FILMS: Record<FilmId, FilmDef>`.
- **Content** `app/lib/content.ts`:
  - The `FilmId` union and the `allProjects` order. The homepage shows the first 5, the widgets drawer
    the first 4, and order also sets "next project".
  - `FILM_CHAPTERS` duplicates the labels. `filmModules()` **hardcodes exactly 5 tiles** (one wide,
    then two pairs). Both block variable chapter counts; Phase 0 fixes this.
  - `caseFor()` builds every case study:
    - intro: `{ heading: p.title, body: [p.description] }`
    - then the film tiles
    - then a `Stack` chapter and a `Links` chapter
- **Where text appears** (all plain strings rendered in `<p>`/`<h*>`, no markdown):

  | Field | Where it shows | Limit |
  |---|---|---|
  | `title` | Work index cards (`truncate`), homepage meta, case-study title block, next-project footer | ≤ 32 chars |
  | `sector` | Work index chip, homepage meta (`year, sector`), title block | ≤ 18 chars |
  | `description` | Homepage "Our work" paragraph, `<meta name="description">` on the project page | 1–2 sentences, ≤ 200 chars |
  | `intro.heading` | Case-study "Overview" headline (`t-subhead`) | ≤ 70 chars |
  | `intro.body` | Overview paragraphs | — |
  | chapter modules | One section each. `label` goes in the sidebar scroll-spy nav and the section tag; `heading` is optional; `body` paragraphs; optional `links` | — |

  React keys paragraphs by their text, so **paragraphs within one section must be unique**.
- **Where films appear:**
  - Homepage and Work cards play the full loop.
  - 40 px and 76 px thumbnails draw `still`.
  - The case-study hero plays the full loop, followed by one looping tile per chapter, labelled
    `01 <Label>`.
  - The next-project footer shows the **next** project's film. A crashing film therefore also puts
    errors on the previous project's page.
- **Tool** `tools/film-sheet.mjs <slug> --times a,b,… --loop L`:
  - Uses Playwright with a 1280×800 viewport at DPR 1, and writes `local/film-sheet/<slug>.png`
    (`local/` is git-ignored).
  - Prints canvases, chapter tiles, `seam` (mean per-channel diff between `L−0.05` and `0`) and
    console `errors`.
  - The sheet is 3 cells (400×225) per row, so **long films overflow 2000 px tall**. Phase 0 fixes this.
- **Existing grounds** (so new palettes stay distinct): vantage `#1d3b2a`, argus `#3b0d36`, truenorth
  `#14e05a`, spicerack `#f1ece4`, truxpert `#f05a28`, saga `#2440d8`, quant `#0b3048`, conduit `#f5b82e`.
  The site chrome is near-black (`#141414`), so avoid near-black grounds.

---

## 3. Phase 0: platform prep (orchestrator, before spawning anyone)

Do these steps yourself, in order, in a single session. They touch shared files; workers never do.

0. **Branch check:** `git branch --show-current` must print `wip`. If it doesn't, stop and tell the
   user (§7).

1. **Variable chapter count in case studies** (`app/lib/content.ts`):
   - Delete `FILM_CHAPTERS`. Derive labels from the film itself:
     `import { FILMS } from "@/components/film";` and `FILMS[p.film].chapters.map((c) => c.label)`.
     `film/index.ts` only imports the *type* `FilmId` from content, so there's no runtime cycle.
   - Generalise `filmModules` to N chapters: tile 0 wide, then pairs, and a trailing odd tile goes wide.
     Return each module together with the index of the **last tile** it holds, so step 3 can
     interleave sections:
     ```ts
     type Placed = { last: number; module: CaseModule };
     const out: Placed[] = [{ last: 0, module: { type: "media", visual: tile(0) } }];
     for (let i = 1; i < labels.length; i += 2)
       out.push(i + 1 < labels.length
         ? { last: i + 1, module: { type: "pair", wide: true, left: tile(i), right: tile(i + 1) } }
         : { last: i, module: { type: "media", visual: tile(i) } });
     return out;
     ```
2. **Per-project copy files.** Workers own these, so content.ts never needs editing in parallel.
   - Create `app/lib/copy/types.ts`. **It imports nothing**, which keeps the copy files free of
     import cycles.
     ```ts
     export type CopyLink = { label: string; href: string };
     export type CopySection = {
       id: string;          // unique kebab-case; not "introduction", "stack" or "links"
       label: string;       // sidebar nav + section tag, 1–2 words
       heading?: string;    // one-line headline, ≤ 70 chars
       body: string[];      // plain-text paragraphs, unique within the section
       links?: CopyLink[];  // optional, public URLs only
       after?: number;      // film chapter index this section follows; omit → after the last tile
     };
     export type ProjectCopy = {
       title: string;
       sector: string;
       year: string;
       description: string;
       stack: string[];
       intro: { heading: string; body: string[] };
       sections: CopySection[];
     };
     ```
   - Create one `app/lib/copy/<slug>.ts` per in-scope slug, each `export default { … } satisfies ProjectCopy;`.
     - **Stubs for rewrites reproduce today's text exactly**, so nothing visibly changes before a
       worker writes: current `title`, `sector`, `year`, `description` and `stack`,
       `intro: { heading: title, body: [description] }`, `sections: []`.
     - **Stubs for RepoHIVE and Prospector** use short placeholders (`title: "RepoHIVE"`,
       `year: "2026"`, etc.).
   - Create `app/lib/copy/index.ts`: `export const COPY: Record<string, ProjectCopy> = { … }`, keyed by
     slug.
3. **Wire copy into `content.ts`:**
   - Keep the base entries as they are. After the array, apply `title`, `sector`, `year`,
     `description` and `stack` from `COPY[slug]` when present. Keep `allProjects` exported with the
     same type.
   - In `caseFor`:
     - Use `COPY[p.slug]?.intro` for the intro when present.
     - Build the modules in this order:
       1. for each placed film module: the module, then every section whose
          `after ∈ (previous module's last, this module's last]`
       2. sections with no `after` (or `after` ≥ the last tile)
       3. `Stack`
       4. `Links`
     - Sections become `{ type: "chapter", id, label, heading, body, links }` modules.
     - For non-film projects, sections go after `extra`.
4. **New ids and stubs:**
   - Add `"repohive" | "readify" | "prospector"` to `FilmId`.
   - Create `app/components/film/repohive.ts`, `readify.ts` and `prospector.ts` as minimal valid
     stubs: ground colour, dot grid, one disc, `loop: 10`, one chapter. Register all three in `FILMS`.
   - Set `film: "readify"` on the Readify entry. Its `src` mp4 stays as the fallback.
5. **New project entries** in `allProjects`. Their text fields come from the copy files.
   - **RepoHIVE:**
     - `slug: "repohive"`, `client: "RepoHIVE"`,
       `githubUrl: "https://github.com/roguekishore/RepoHIVE"`, `liveUrl: ""` (no deployment, same as
       SAGA and CONDUIT).
     - `media: "dots"`, `tint: "#141414"`, `src: ""`, `film: "repohive"`.
     - **Position: index 0**, so it's the first homepage card. This pushes Truxpert off the homepage
       five. The user may override this.
   - **Prospector:** the same shape.
     - `slug: "prospector"`, `client: "Prospector"`,
       `githubUrl: "https://github.com/roguekishore/Prospector"`, `liveUrl: ""` (a local,
       loopback-only tool), `film: "prospector"`.
     - **Position: append at the end**, after CONDUIT.
6. **`tools/film-sheet.mjs` upgrades:**
   - **Paginate:** at most 12 cells per PNG (3×4 = 1200×900): `<slug>.png`, `<slug>-2.png`, …
     Print every path.
   - **`--tiles i,j,…`:** capture only those chapter tiles (default: all). Expected canvases are still
     reported.
   - **`--perf`:** play the hero live for 5 s and record rAF intervals, plus a `PerformanceObserver`
     for `longtask`. Print `{ meanFrameMs, p95FrameMs, longTasks }`.
   - **`--text`:** print the rendered case-study text outline as JSON: `title`, `sector`,
     `intro.heading`, the nav labels, and every section's `id`/`label`/`heading` with its paragraph
     count and character counts. It also prints the module order, e.g. `tile0, sec:problem, pair1-2, …`,
     so placement can be checked without screenshots.
   - Keep the exit code non-zero when `errors` is non-empty.
7. **Clone sources** into `local/repos/<RepoName>` with `gh repo clone roguekishore/<Repo>`, using full
   history (workers need the first-commit year and the contributor list). Include the companion repos
   in the table. Workers only read these clones.
8. **Shared dev server:** if nothing is on `http://localhost:3000`, start `npm run dev` in `app/` as a
   background process. If something is already there, confirm it's this app. You own the server and
   are the only one who starts or stops it. **Nobody runs `next build`** while it's up.
9. **Gate:**
   - `npx tsc --noEmit` in `app/` exits 0.
   - `/projects/repohive`, `/projects/readify` and `/projects/prospector` return 200.
   - `node film-sheet.mjs vantage --times 0 --loop 25.4 --tiles 0 --text` runs, paginates, and shows
     today's Vantage text unchanged.
10. **Palettes:** assign one to every new or rewritten film **before spawning**, so parallel workers
    can't collide. Rewrites keep their current ground unless you have a reason to change it, because
    brand continuity on the grid matters. New grounds must differ clearly from all of §2's grounds.
    These are suggestions; check them next to the grid:
    - RepoHIVE: lilac `#b7a6f2`, ink `#17122e`, accent `#ff5a36`
    - Readify: oxblood `#5c1620`, ink `#f4e9dc`, accent `#f2b84b`
    - Prospector: deep teal `#0f5f5c`, ink `#eaf4ef`, accent `#ffd23f`, warn `#ff6b5b`
      (a lead-scoring story naturally needs a reject or weak colour)

---

## 4. Worker brief (each worker reads this whole section)

You own **one** project, and you deliver two things:

1. **A film:** long, wordless and flat 2D. It must tell the project's story well enough that a
   technical viewer understands what the project does and how, without reading a word.
2. **The project's portfolio copy:** card title, description, sector, year, stack, the case-study
   intro, and sections. It's written to the standard of a senior engineer's portfolio and grounded
   entirely in the repo.

The film and the copy tell the same story. Each section sits next to the film chapter it explains.

### 4.1 Ownership and concurrency (hard rules)

- Other workers are editing sibling films and copy files at the same time, against the same dev server.
- **You may write only:**
  - `app/components/film/<id>.wip.ts` (your film draft)
  - `app/components/film/<id>.ts` (your film, only by swapping in a tsc-clean draft)
  - `app/lib/copy/<slug>.wip.ts` (your copy draft)
  - `app/lib/copy/<slug>.ts` (your copy, only by swapping in a tsc-clean draft)
  - `local/boards/<id>.md`
  - `local/film-sheet/<slug>*.png`
- **Never edit:** `kit.ts`, `Film.tsx`, `film/index.ts`, `content.ts`, `copy/types.ts`, `copy/index.ts`,
  other projects' files, components, styles, `tools/` or anything in `local/repos/`. If you need a
  helper (camera, spring, bezier, seeded PRNG, path sampler, `easeOutBack`), define it **inside your
  own film file**.
- **Draft, then swap.** Both of your live files are imported by every page, so a syntax error in either
  one breaks the site for every worker.
  - Iterate in the `.wip.ts` drafts. They aren't imported, so the app never runs them, but `tsc` still
    checks them.
  - Copy a draft over its live file only when `npx tsc --noEmit` shows **no errors in your files**.
  - Filter tsc output to your filenames. Errors in someone else's file aren't yours; ignore them.
  - Delete both drafts when you finish.
- **Don't start or stop servers.** Don't run `next build`. **Don't run any git command that writes**
  (`add`, `commit`, `stash`, `checkout`, `restore`, `reset`). The orchestrator commits your files after
  verifying them (§7). Parallel git writes collide on `index.lock` and sweep up other workers' files.
- In `film-sheet` output, a console error whose stack names another film isn't yours. The next-project
  footer renders the next project's film. Note it in your report and move on.

### 4.2 Research (read the clone under `local/repos/`, never edit it)

**Read the source only; never install, build or run it.** Several projects bind ports
(Prospector's review deck uses `:3000`, the same port as the shared dev server), call paid APIs or
need secrets. Everything you need is in the code, docs, specs, fixtures and tests.

1. **Read the code that defines the product:** README, docs, manifests, routes and pages, controllers,
   entities, status or state enums, services, tests. Also read the existing film
   `app/components/film/<id>.ts` and copy `app/lib/copy/<slug>.ts` if they exist. They're what you
   must exceed, not copy.
2. **Find the real mechanics.** The best films and the best copy both show the actual algorithm or
   workflow. Examples:
   - a genuine sort or DSA trace generated at module load
   - the real complaint lifecycle and escalation tiers
   - RepoHIVE's real per-region keep-or-rebuild decision over a dependency graph, with recorded scores
   - SAGA's tee, redaction and replay
   - CONDUIT's event-stream header dispatch
   - QUANT's round-turn reconstruction from raw deals
   - Prospector's real pipeline: discover over a city grid → qualify (reachability and TLS) → audit
     in a browser → extract signals → score with the frozen `rules@1` formula → operator review

   Use real counts, real tier numbers and real state names. In the film these become colours, not text.
3. **Facts for the copy.** Collect these, recording the file path each one came from:
   - the problem the project solves
   - the architecture (components and how data flows)
   - two or three non-obvious engineering decisions and why they were made
   - what is verifiably true about the outcome (tests, determinism, modes, integrations)
   - the year of the first commit: `git -C <clone> log --reverse --format=%ad --date=format:%Y | Select-Object -First 1`
   - contributors: `git -C <clone> shortlog -sne HEAD`
   - the stack

### 4.3 Storyboard first

Write `local/boards/<id>.md` before drawing. Keep it short, because it's for the orchestrator's review.
It holds:

- **Logline:** one sentence of what the viewer will understand by the end.
- **Cast:**
  - the 6–12 hero tokens and what each represents
  - the secondary ensemble (particles, sub-nodes, packets) and **where it emerges from and returns to**
- **Colour = state:** a legend that stays fixed across the whole film.
- **Chapters:** a table with these columns:
  - `#`
  - `label`: one word, ≤ 12 chars, shown as the tile tag
  - `range`
  - `beat`: what happens
  - `the real mechanic it shows`
  - `freeze moment`
- **Transitions:** how each chapter's end state *becomes* the next chapter's start, as a morph and not
  a cut.
- **Camera plan,** if any.
- **Copy outline:** the intro headline, then the section list (id, label, heading, which chapter it
  follows), plus the **fact sources** list from §4.2.3, each claim → file path.

Then start building immediately. Don't wait for approval. The orchestrator may redirect you.

### 4.4 The craft bar (this is what "production grade" means here)

**Story and structure**
- Tell a story with a beginning, a rising middle and a payoff. Don't line up a list of features.
  Chapters escalate: more tokens involved, higher stakes, a bigger payoff.
- Choose the chapter count freely; ~6–12 is typical. Each chapter runs 6–16 s, long enough to develop
  an idea. **Every chapter must also stand alone** as a looping tile. Start it from a settled
  composition, build to one clear freeze-worthy moment around 60–80% through, and end settled.
- Prefer one or two hero moments per chapter over many small beats. Give each hero moment room:
  anticipation, the action, the reaction, then a hold of about 0.4–0.8 s.

**Continuity**
- The hero cast is **never replaced.** It persists for the whole film and changes role through morphs:
  position, size, radius, rotation, colour, alpha, and shape blends (rect ↔ pill ↔ disc ↔ bar).
- Secondary elements may appear only by **emerging from** a hero token or structure: split, emit,
  unfold, extrude. They leave by **returning into** one: merge, absorb, collapse. Nothing pops in from
  nowhere.
- Transitions run 0.8–1.6 s, staggered 0.04–0.1 s per token, along curved paths (arcs or quadratic
  béziers, never straight lerps for travel). Different tokens should use different but related easings.
- The film ends by morphing back to `t = 0` exactly. That final morph sits outside the last chapter's
  range.

**Motion quality**
- Use the classic principles concretely:
  - **Anticipation:** a small counter-move of 4–10 px or a squash before a big move.
  - **Follow-through and overlap:** children lag their parent by 40–120 ms and settle with a damped
    overshoot, e.g. `1 − e^(−kx)·cos(ωx)` or `easeOutBack`.
  - **Squash and stretch:** at most 8–15% along the motion vector, area roughly preserved.
  - **Arcs, slow-in/slow-out, secondary action:** idle tokens breathe with ±1–2 px or a slight alpha
    drift, so the frame is never dead.
- Stagger everything. No more than ~2 things should start in the same 100 ms, and never move the whole
  cast in lockstep.
- Rhythm: alternate busy passages with calm holds. Don't keep the screen equally busy for 90 s.
- **Camera** (optional, encouraged for long films): a pure function of `t` using
  `p.ctx.save()/translate/scale/restore` inside `draw`.
  - Use slow push-ins (≤ 1.25×) and drift for emphasis.
  - At every moment the important action must stay inside the 1360×800 core, because thumbnails crop
    to it.
  - Return to identity by the loop end.
  - The dot grid stays screen-fixed: draw it before the camera transform, using `view`.

**Visual density and craft**
- Fill the frame deliberately. Use layered compositions with furniture (tracks, lanes, grids, rails,
  graph edges, containers) drawn in `tones()`, the hero cast on top, and echoes and particles last.
  Aim for compositions you'd put on a poster. Avoid a few shapes floating in empty space.
- Keep the visual language flat: one ground, one ink, one accent, an optional warn colour. Derive
  every other tone with `tones()`/`mix`. No gradients, no `shadowBlur`, no filters, no images, no fonts.
- Craft details: generous radii, round caps, 3–7 px strokes, hairlines at 1.5–2 px for furniture, and
  consistent spacing on a 40 px rhythm, matching the dot grid.
- Punctuation:
  - **echo:** an outline grows 30–40 px and fades over 0.8 s
  - **pop:** `1 + a·sin(π·seg)` with `a` between 0.1 and 0.25, over 0.3 s
  - **ripple:** `kit.ripple`, only for the 4–8 biggest moments in the whole film
  - an optional **dot-grid spotlight** following the busiest tokens
- **No text.** That means no `fillText`/`strokeText`, no digits, no glyph-like letterforms. Use shapes
  instead: rank becomes dots, a counter becomes a growing bar, status becomes a colour, success
  becomes a tick that draws itself, time becomes an arc sweeping.

**Thumbnails**
- `still` must be the single most telling frame. It's what shows at 40 px, 76 px and in reduced
  motion, so it needs bold shapes that read at 40 px.

### 4.5 Hard technical rules

- Export `export const <id>: FilmDef = { ground, loop, still, chapters, draw }`. Import from `./kit`
  only, plus anything defined in your own file.
- `draw` is a pure function of `t`:
  - no `Math.random()`, no `Date`, no `performance.now()`
  - no state carried between frames
  - no module-level mutable state touched from `draw`
- Precompute traces, layouts and seeded variety at module load, using a seeded PRNG.
- `chapters` must be contiguous and in order, starting at 0, with the last range ending before `loop`.
  Labels are one word, ≤ 12 chars, unique.
- **Performance:** median frame ≤ 4 ms and p95 ≤ 8 ms on the 1280×800 hero (`--perf`), with zero long
  tasks.
  - Precompute paths.
  - Avoid per-frame allocations in hot loops.
  - Batch dot-grid fills as `kit.dots` does.
  - Cull anything outside `view`.
- The ~1000-line scale of a long film is fine. Structure it with these headings:
  - palette and tones
  - precomputed data
  - per-chapter role functions `roleN(k, t) → state`
  - transition helpers
  - furniture, cast and fx painters
  - `draw`

### 4.6 Copy (`app/lib/copy/<slug>.ts`)

Write the copy **after the film's chapters are locked**, because `after` refers to chapter indices.
The file is `export default { … } satisfies ProjectCopy;`, importing only
`import type { ProjectCopy } from "./types";`.

**Audience.** A hiring manager skims the card and the intro in 15 seconds. An engineer reads the
sections and checks your claims against the repo. Write for both.

**Fields:**

| Field | Rule |
|---|---|
| `title` | A noun phrase naming what it is, ≤ 32 chars, e.g. "Gamified DSA Visualization Engine". No brand name (the client name already shows beside it). |
| `sector` | ≤ 18 chars. Reuse an existing one where it fits ("Developer tools", "EdTech", "Civic tech", "Fintech", "E-commerce", "Wellness", "SaaS"). |
| `year` | The first-commit year. |
| `description` | 1–2 sentences, ≤ 200 chars: what it is, who it's for, and the one distinctive *how*. It's the homepage line and the meta description. |
| `stack` | ≤ 10 items, named the way `content.ts` already names them, ordered from frontend to backend to data to infra. Only what the manifests prove. |
| `intro.heading` | ≤ 70 chars. States the outcome or the idea, not the product name. |
| `intro.body` | 2–3 paragraphs of 40–80 words each, covering the problem, the approach and the result. |
| `sections` | 3–5 for tier 2, 4–6 for tier 0/1. Pick from: **Problem**, **Architecture**, **the signature mechanic** (named for what it is, e.g. "Escalation", "Scoring", "Replay"), **Engineering decisions**, **Outcome**. Each has a 1–2 word `label`, a `heading` ≤ 70 chars, and 1–3 paragraphs of ≤ 90 words. Short highlight lines (≤ 14 words) may be separate `body` entries. |
| `after` | Place each section after the film chapter it explains: Problem after chapter 0, the mechanic after its chapter, Outcome with no `after` (it goes last). Never put two sections back to back where a tile could sit between them. |
| `links` | Optional, on a section: public URLs into the repo, e.g. a design doc on GitHub. No localhost, no private links. Stack and Links sections are generated; don't add them. |

**Voice:**
- Plain, specific and confident. Make the product the subject, and use first person singular ("I
  designed…") only where an actor is needed. If `shortlog` shows other substantive contributors, say
  "we", or describe the product, and never claim sole authorship.
- Show with specifics instead of adjectives: name the real stages, states, tiers, formulas and
  trade-offs.
- Banned words: seamless, cutting-edge, revolutionary, robust, leverage, powerful, blazing,
  world-class, state-of-the-art, effortless, next-gen, game-changing. Use no exclamation marks and
  em dashes only sparingly.
- Use US spelling, plain strings only (no markdown or HTML), and unique paragraphs within a section.

**Truth (hard rule):**
- Every factual claim must trace to a file in the clone. List the sources in the board.
- Use numbers only if the repo states or proves them (e.g. a test count you counted, tier counts from
  an enum). No invented users, traffic, uptime, adoption, performance figures or awards.
- Never copy secrets, keys, internal hostnames or `.env` values into copy, even from `.env.example`.
- For rewrites, keep any existing fact you can't disprove, such as the live URL. Fix any you can
  disprove, and note the fix in your report.

### 4.7 Verify (in this order; don't skip steps)

1. `npx tsc --noEmit` in `app/` → no errors in your files. Then swap the drafts into the live files.
2. `Select-String -Path app/components/film/<id>.ts -Pattern 'fillText|strokeText|Math\.random|Date\.|performance\.now'`
   → no matches.
3. `node film-sheet.mjs <slug> --times 0,<~70% into each chapter> --loop <loop> --perf --text` in
   `tools/`. Pass criteria:
   - `errors` empty, or only errors attributable to another film (§4.1)
   - `seam` < 2
   - canvases = chapters + 1
   - perf within §4.5
   - the text outline shows every section, in the intended module order, within the §4.6 limits
4. **Look at the sheets.** Use at most ~6 sheet views across your whole session, and only after a
   meaningful change. Every sheet is ≤ 1200×900. Never open an image larger than 2000 px on either
   side. Check:
   - Each chapter reads as a distinct idea without words.
   - Nothing important is clipped at 16:9.
   - The tiles show motion from their own chapter.
   - The frame is full and composed, never sparse.
5. Spot-check the transitions between chapters with `--times` placed mid-transition. A transition
   frame should look intentional, not like a pile-up.
6. Copy self-check:
   - Re-read every claim against its source file.
   - Grep the copy for the banned words, then count the title, description and heading lengths.
7. Delete both `.wip.ts` drafts. Leave your sheets and board for the orchestrator.

### 4.8 Report (structured, so the orchestrator can parse it)

```
film: <id>   slug: <slug>   loop: <s>   still: <s>
palette: ground <hex> / ink <hex> / accent <hex> / warn <hex|none>
colour legend: <colour → state, …>
cast: <token → meaning, …>
chapters: <#. Label [start–end] — beat — real mechanic>, …
copy: title "<…>" (<n> chars) · sector "<…>" · year <yyyy> · description (<n> chars) · stack [<…>]
      intro "<heading>" · sections <id(label) after <i|end>>, …
      contributors: <from shortlog> · voice: <I|we|product>
      corrections to existing facts: <none|…>
checks: tsc <clean|errors-in-own-files> · grep <0> · seam <n> · errors <[]|…> · canvases <n> · perf mean/p95/long <ms/ms/n> · text-outline <ok|…>
sheets: <paths>   board: local/boards/<id>.md
foreign errors seen: <none|…>
known weaknesses: <honest list>
```

---

## 5. Phase 1–2: dispatch, review, polish (orchestrator)

- **Spawn order:**
  1. RepoHIVE
  2. Vantage and Argus
  3. the tier-2 rows, as slots allow

  Give each worker: this file's path, its scope row, its assigned palette, its clone paths, and the
  instruction "read §4 in full".
- **Storyboard check** (tier 0/1): read `local/boards/<id>.md` as soon as it appears. Redirect early if
  any of these hold:
  - the story is a feature list
  - the real mechanic is missing
  - the cast is replaced between chapters
  - it's shorter than the target
  - the copy outline lacks fact sources
- **Verify every report yourself.** Don't trust claims.
  - Re-run `film-sheet` with `--perf --text` and re-run the grep.
  - Check that the chapter ranges are contiguous.
  - View the sheets, keeping within your own image budget (≤ 1200×900 each).
  - **Fact-check the copy:** spot-check at least 3 claims per project (all of them for tier 0) against
    the cited files in `local/repos/`.
- **Review passes:** for tier 0 and tier 1, spawn a separate **reviewer** subagent per project. It gets
  the sheets, the board, the copy file and §4.4 + §4.6, and returns a ranked list of concrete fixes:
  - film fixes, e.g. "Ch3 travel is a straight lerp", "frame at 41 s is 60% empty", "still doesn't
    read at 40 px"
  - copy fixes, e.g. "intro heading names the product instead of the outcome", "Architecture claims
    Redis but no manifest lists it", "description is 231 chars"

  Then send a polish pass to the worker, or to a fresh worker if the original is gone.

  | Tier | Polish passes | Stop when |
  |---|---|---|
  | 0 | ≥ 3 | the reviewer finds nothing above cosmetic in either the film or the copy |
  | 1 | ≥ 2 | the reviewer finds nothing above cosmetic in either the film or the copy |
  | 2 | ≥ 1 | — |

- **Cross-project consistency:** after all copy lands, read every title, description and intro
  heading together. They should share one voice, without repeated phrasings and without two
  projects opening the same way. Send small fixes back to the owning worker, or make them yourself
  in Phase 3.
- If a film or copy file regresses or breaks the shared app, restore it and re-dispatch. Use
  `git show HEAD:<path>` for files that exist in git, or the Phase 0 stub for new ones.

## 6. Phase 3: integrate and final QA (orchestrator)

1. **Copy is already live** through the copy files.
   - Review it once more as a set.
   - If a stack adds a technology worth filtering by, you may add it to `techCategories` in
     `content.ts`.
   - Update `workCopy.subheading` ("Projects from 2023 to 2025") to match the real year range.
2. Run `npx tsc --noEmit` on the whole app → exit 0. Then run a full `film-sheet … --perf --text` for
   every in-scope slug. All must pass §4.7 with `errors` empty, now that no foreign errors are possible.
3. **Grid and page check:**
   - Open `/` and `/work` at 1280×800 (viewport screenshots only) and confirm the grounds look good
     side by side.
   - Confirm thumbnails read in the work index.
   - Confirm `?film-t=` stills look right on cards.
   - Confirm titles aren't truncated awkwardly.
   - On one tier-0 case study, take one viewport shot of the intro and one of a section between tiles.
4. Remove any leftover `.wip.ts` files. Delete `local/film-sheet/`, `local/boards/` and `local/repos/`.
   Stop the dev server if you started it.
5. Update `.kiro/skills/project-film/SKILL.md` and `film-brief.md` to the new rules. These are
   currently out of date:
   - variable chapter count and length
   - labels derived from `FILMS` (no `FILM_CHAPTERS`)
   - the `app/lib/copy/` files and the §4.6 copy rules
   - the draft-and-swap workflow
   - the `--tiles`/`--perf`/`--text`/pagination flags
   - the §4.4 craft bar
   - the eight-ground list in §2
6. Final report to the user:
   - per project: film id, loop, chapter count and labels, palette, the new title and description,
     section labels, checks, number of review passes
   - RepoHIVE's and Prospector's positions
   - anything inferred that needs confirming: years, contributor voice, stack names, corrected facts
   - anything skipped and why
   - the list of commits you made (`git log --oneline origin/wip..HEAD`), with confirmation that
     nothing was pushed

---

## 7. Git policy (orchestrator only)

**Commit locally; never push.** No `git push` in any form, no new remotes, no PRs. The user pushes.

**Work only on the `wip` branch.**
- Every commit goes on `wip`.
- Don't create, switch to, merge into, or rebase onto any other branch, including `main`/`master` and
  feature branches. No `git switch`, no `git checkout <branch>`, no `git branch <new>`, no worktrees.
- Before Phase 0 and before every commit, check that `git branch --show-current` prints `wip`. If it
  prints anything else, stop and report to the user; don't switch branches yourself.

- **Only the orchestrator runs git writes.** Workers never do (§4.1).
- **Stage explicit paths only:** `git add -- <path> <path>`. Never use `git add -A`, `git add .` or
  `git commit -a`. Other workers' half-finished files are in the tree at the same time.
- **Never stage** any of these:
  - `*.wip.ts`
  - anything under `local/` (it's git-ignored; keep it that way)
  - `FABLE_HANDOFF.md`
  - `app/next-env.d.ts` or `app/tsconfig.tsbuildinfo` churn
  - `app/AGENTS.md`/`app/CLAUDE.md` rewrites by `next dev`
- **No history rewriting:** no `--amend`, `rebase`, `reset --hard`, `--force`, `clean` or
  `branch -D`. Don't skip hooks (`--no-verify`). If a hook fails, fix the cause and make a new commit.
- **Before every commit:**
  - `git branch --show-current` prints `wip`.
  - `npx tsc --noEmit` in `app/` exits 0 for the whole app, not just the committed files.
  - `git diff --cached --stat` shows only the intended paths.
- **Message style** matches the existing history: conventional commits, lowercase, imperative, no
  trailing period. For example:
  - `feat(film): add repohive film and case study`
  - `feat(film): rebuild argus film as a 9-chapter story`
  - `feat(content): add case-study copy for argus`
  - `feat(tools): paginate film sheets and add --tiles, --perf, --text`
  - `refactor(content): derive chapter labels from films`
  - `fix(film): close the vantage loop seam`

  Add a short body listing what changed and the verification numbers: chapters, loop, seam, perf.
- **When to commit:**
  1. **End of Phase 0,** one or two commits:
     - platform: `content.ts`, `copy/types.ts`, `copy/index.ts`, the copy stubs, film stubs,
       `film/index.ts`
     - tools: `tools/film-sheet.mjs`
  2. **Each project, when it first passes verification:** one commit with
     `app/components/film/<id>.ts` and `app/lib/copy/<slug>.ts`. Include `content.ts` only if you
     changed that project's entry.
  3. **Each polish pass that passes verification:** a new follow-up commit, e.g.
     `refactor(film): polish repohive transitions`. Never amend.
  4. **Phase 3:**
     - the consistency, `techCategories` and subheading edits
     - the skill docs update (`chore(skills): update project-film for long films and copy`)
- **Recovery:** to roll back a bad film or copy file, restore that one path from the last good commit
  with `git show <sha>:<path> > <path>`. Then commit the revert as a new commit.
