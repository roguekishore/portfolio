// Prospector: Phase 0 placeholder (ground, dot grid, one breathing disc) until the
// real film lands. Keeps the registry, pages and thumbnails valid meanwhile.
import { CX, PI, VH, hex, type FilmDef, type Painter, type View } from "./kit";

const GROUND = "#0f5f5c";
const INK = hex("#eaf4ef");
const ACCENT = hex("#ffd23f");
const LOOP = 10;

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07);
  const breathe = Math.sin((t / LOOP) * 2 * PI);
  p.disc(CX, VH / 2, 120 + 8 * breathe, ACCENT);
}

export const prospector: FilmDef = {
  ground: GROUND,
  loop: LOOP,
  still: 2.5,
  chapters: [{ label: "Grid", range: [0, 9.5] }],
  draw,
};
