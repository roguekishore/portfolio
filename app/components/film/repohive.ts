// RepoHIVE: Phase 0 placeholder (ground, dot grid, one breathing disc) until the
// real film lands. Keeps the registry, pages and thumbnails valid meanwhile.
import { CX, PI, VH, hex, type FilmDef, type Painter, type View } from "./kit";

const GROUND = "#b7a6f2";
const INK = hex("#17122e");
const ACCENT = hex("#ff5a36");
const LOOP = 10;

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07);
  const breathe = Math.sin((t / LOOP) * 2 * PI);
  p.disc(CX, VH / 2, 120 + 8 * breathe, ACCENT);
}

export const repohive: FilmDef = {
  ground: GROUND,
  loop: LOOP,
  still: 2.5,
  chapters: [{ label: "Hive", range: [0, 9.5] }],
  draw,
};
