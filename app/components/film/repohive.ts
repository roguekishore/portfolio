// RepoHIVE: a Java repository is parsed into a flat dependency graph; every package becomes a
// region that is scored on cohesion and coupling against one boundary (0.5), kept as authored when
// it scores well and rebuilt by seeded Louvain when it does not; the result is stacked into a
// content-addressed hierarchy, written as a five-file index in one atomic move, then explored level
// by level with blast radius on top. Ink = authored by the developer; accent = computed by RepoHIVE.
import {
  PI, Painter, bump, clamp01, css, easeCubic as ease, easeOutCubic as easeOut, easeSine, hex, lerp, mix, ripple, seg,
  tones, type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────────── palette and tones ───────────────────────────── */

const GROUND = hex("#b7a6f2");
const INK = hex("#17122e");
const ACCENT = hex("#ff5a36");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const LOOP = 136;

/* small helpers defined here (kit has no spring/back easing) */
const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** Damped settle 1 − e^(−kx)·cos(ωx), pinned to 0 and 1 at the ends. */
const settle = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-5 * x) * Math.cos(2.4 * PI * x));
function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry(42); // the engine's default community seed, for the film's own planted variety

/* ───────────────────────────── precomputed data ───────────────────────────── */

/* A planted Java repo: 23 files in 5 regions (declared packages, plus one root-level file that falls
   back to its directory). Communities inside service and util are planted so Louvain has something to find. */
const N = 23;
const REG = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4];
const GRP = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 6, 6, 7];
const NR = 5, NG = 8;
const GROUP_REG = [0, 1, 1, 2, 2, 2, 3, 4];
const RFILES: number[][] = Array.from({ length: NR }, () => []);
const MEMBERS: number[][] = Array.from({ length: NG }, () => []);
for (let k = 0; k < N; k++) {
  RFILES[REG[k]].push(k);
  MEMBERS[GRP[k]].push(k);
}

/* Edges: source depends on target, with the contract's three frequency signals. */
type Edge = { s: number; t: number; sig: [number, number, number]; w: number };
const E = (s: number, t: number, i: number, c: number, sh: number): Edge => ({ s, t, sig: [i, c, sh], w: i + c + sh });
const EDGES: Edge[] = [
  // model (cohesive, heavily depended upon)
  E(1, 0, 1, 0, 2), E(2, 0, 1, 0, 1), E(3, 1, 1, 0, 1), E(4, 0, 1, 0, 1), E(3, 2, 1, 0, 0), E(4, 2, 1, 0, 1),
  // service: community A {5,6,7}, community B {8,9,10} with the S3→S5→S4→S3 cycle, one weak bridge S4→S0
  E(6, 5, 1, 0, 1), E(7, 5, 1, 0, 0), E(7, 6, 1, 0, 0), E(9, 8, 1, 0, 0), E(10, 9, 1, 0, 0), E(8, 10, 1, 0, 0), E(9, 5, 1, 0, 0),
  // util: communities {11,12,13}, {14,15}, {16,17}, barely connected
  E(12, 11, 1, 0, 0), E(13, 11, 1, 0, 0), E(13, 12, 1, 0, 0), E(15, 14, 1, 0, 0), E(17, 16, 1, 0, 0),
  // web (cohesive)
  E(19, 18, 1, 0, 1), E(20, 18, 1, 0, 1), E(21, 18, 1, 0, 0), E(21, 19, 1, 0, 0), E(20, 19, 1, 0, 1),
  // crossing: service → model / util
  E(5, 0, 1, 0, 1), E(6, 1, 1, 0, 0), E(8, 0, 1, 0, 1), E(9, 2, 1, 0, 0),
  E(5, 11, 1, 0, 0), E(7, 12, 1, 0, 0), E(8, 14, 1, 0, 0), E(10, 15, 1, 0, 0), E(6, 17, 1, 0, 0),
  // crossing: web → model / service / util
  E(18, 0, 1, 0, 0), E(20, 3, 1, 0, 0), E(18, 5, 1, 0, 1), E(19, 8, 1, 0, 0), E(21, 7, 1, 0, 0), E(19, 13, 1, 0, 0), E(21, 16, 1, 0, 0),
  // crossing: util → model, bootstrap → service
  E(15, 0, 1, 0, 0), E(22, 5, 1, 0, 0),
];
const NE = EDGES.length;

/* The engine's assessment, ported: strength = a·import + b·call + c·sharedType (all 1); edges are
   attributed to regions at file granularity; cohesion = Σ intra / n; coupling = Σ crossing / incident;
   cohesion_norm = c/(c+k); score = Σ w·value with the active weights renormalised (0.4/0.4 → 0.5/0.5,
   modularity off); degenerate (< 2 nodes, 0 internal edges or 0 intra strength) → 0.0; preserve iff
   score ≥ boundary; confidence = |score − boundary|. */
const BOUNDARY = 0.5, K_COH = 1.0, W_COH = 0.4, W_CPL = 0.4;
type Score = { cohesion: number; coupling: number; cohN: number; score: number; degenerate: boolean; preserve: boolean; confidence: number };
const SCORES: Score[] = (() => {
  const intra = new Array<number>(NR).fill(0), cross = new Array<number>(NR).fill(0), count = new Array<number>(NR).fill(0);
  for (const e of EDGES) {
    const rs = REG[e.s], rt = REG[e.t];
    if (rs === rt) {
      intra[rs] += e.w;
      count[rs] += 1;
    } else {
      cross[rs] += e.w;
      cross[rt] += e.w;
    }
  }
  const out: Score[] = [];
  for (let r = 0; r < NR; r++) {
    const n = RFILES[r].length;
    const cohesion = n > 0 ? intra[r] / n : 0;
    const incident = intra[r] + cross[r];
    const coupling = incident > 0 ? cross[r] / incident : 0;
    const degenerate = n < 2 || count[r] === 0 || intra[r] <= 0;
    const cohN = cohesion / (cohesion + K_COH);
    const total = W_COH + W_CPL;
    const score = degenerate ? 0 : clamp01((W_COH / total) * cohN + (W_CPL / total) * (1 - clamp01(coupling)));
    out.push({ cohesion, coupling, cohN, score, degenerate, preserve: score >= BOUNDARY, confidence: Math.abs(score - BOUNDARY) });
  }
  return out;
})();
const decisionCol = (r: number): RGB => (SCORES[r].degenerate ? GREY : SCORES[r].preserve ? INK : ACCENT);

/* Cross-group edges (level 2): leaf edges whose endpoints sit in different groups, summed per pair. */
type XG = { a: number; b: number; w: number; edges: number[] };
const XGS: XG[] = [];
{
  const byKey = new Map<string, XG>();
  EDGES.forEach((e, i) => {
    const a = GRP[e.s], b = GRP[e.t];
    if (a === b) return;
    const key = `${a}>${b}`;
    const x = byKey.get(key);
    if (x) {
      x.w += e.w;
      x.edges.push(i);
    } else byKey.set(key, { a, b, w: e.w, edges: [i] });
  });
  XGS.push(...byKey.values());
}

/* Content fingerprints: four pips per group derived from its membership only. */
const FINGER: boolean[][] = MEMBERS.map((m) => {
  let h = 17;
  for (const k of m) h = (Math.imul(h, 31) + k * 7 + 3) | 0;
  h >>>= 0;
  const bits = [1, 2, 4, 8].map((b) => (h & b) !== 0);
  if (!bits.some(Boolean)) bits[h % 4] = true;
  return bits;
});

/* ── layouts ── */
type Pt = { x: number; y: number };

/* L0: the project panel, folders of file squares. */
const PANEL = { x: 220, y: 160, w: 320, h: 680 };
const L0: Pt[] = new Array(N);
const FOLDER_Y: number[] = [];
{
  let cy = 194;
  for (let r = 0; r < NR; r++) {
    FOLDER_Y.push(cy);
    RFILES[r].forEach((k, i) => {
      L0[k] = { x: 300 + (i % 3) * 52, y: cy + 34 + Math.floor(i / 3) * 42 };
    });
    cy += 34 + Math.ceil(RFILES[r].length / 3) * 42 + 14;
  }
}

/* Cloud: the flat graph.json, two jittered rings around a centre, files shuffled onto slots. */
const CLOUD_OFF: Pt[] = [];
for (let i = 0; i < 8; i++) CLOUD_OFF.push({ x: Math.cos(0.3 + (i / 8) * 2 * PI) * 125 + (R() - 0.5) * 40, y: Math.sin(0.3 + (i / 8) * 2 * PI) * 125 + (R() - 0.5) * 40 });
for (let i = 0; i < 14; i++) CLOUD_OFF.push({ x: Math.cos((i / 14) * 2 * PI) * 255 + (R() - 0.5) * 44, y: Math.sin((i / 14) * 2 * PI) * 235 + (R() - 0.5) * 44 });
CLOUD_OFF.push({ x: (R() - 0.5) * 30, y: (R() - 0.5) * 30 });
const SLOT: number[] = [...Array(N).keys()];
for (let i = N - 1; i > 0; i--) {
  const j = Math.floor(R() * (i + 1));
  [SLOT[i], SLOT[j]] = [SLOT[j], SLOT[i]];
}
const CLOUD0 = { x: 1010, y: 500 }, CLOUD1 = { x: 870, y: 510 };
const LC0: Pt[] = SLOT.map((s) => ({ x: CLOUD0.x + CLOUD_OFF[s].x, y: CLOUD0.y + CLOUD_OFF[s].y }));
const LC1: Pt[] = SLOT.map((s) => ({ x: CLOUD1.x + CLOUD_OFF[s].x * 1.12, y: CLOUD1.y + CLOUD_OFF[s].y * 1.12 }));

/* Hull slots: one per region; files on a 60 px grid inside. */
type Slot = { x: number; y: number; cols: number; w: number; h: number };
const CELL = 70;
const HULL: Slot[] = [
  { x: 430, y: 280, cols: 3, w: 0, h: 0 },
  { x: 1170, y: 280, cols: 3, w: 0, h: 0 },
  { x: 430, y: 620, cols: 4, w: 0, h: 0 },
  { x: 1170, y: 620, cols: 2, w: 0, h: 0 },
  { x: 800, y: 450, cols: 1, w: 0, h: 0 },
];
const L2: Pt[] = new Array(N);
for (let r = 0; r < NR; r++) {
  const h = HULL[r], n = RFILES[r].length, rows = Math.ceil(n / h.cols);
  h.w = n === 1 ? 84 : h.cols * CELL + 50;
  h.h = n === 1 ? 84 : rows * CELL + 30;
  RFILES[r].forEach((k, i) => {
    const row = Math.floor(i / h.cols), inRow = Math.min(h.cols, n - row * h.cols), col = i - row * h.cols;
    L2[k] = { x: h.x + (col - (inRow - 1) / 2) * CELL, y: h.y + (row - (rows - 1) / 2) * CELL };
  });
}

/* Decide: reconstructed regions settle into their communities (sub-hulls). */
const SUB: Record<number, { x: number; y: number; w: number; h: number }> = {
  1: { x: 1112, y: 280, w: 84, h: 176 }, 2: { x: 1228, y: 280, w: 84, h: 176 },
  3: { x: 336, y: 620, w: 84, h: 176 }, 4: { x: 430, y: 620, w: 84, h: 124 }, 5: { x: 524, y: 620, w: 84, h: 124 },
};
const L4: Pt[] = L2.map((p) => ({ ...p }));
for (const g of [1, 2, 3, 4, 5]) {
  const s = SUB[g], m = MEMBERS[g];
  m.forEach((k, i) => {
    L4[k] = { x: s.x, y: s.y + (i - (m.length - 1) / 2) * 50 };
  });
}

/* Tree: root → level-1 pills (one per region) → level-2 groups → files along the bottom row. */
const TREE_ORDER = [22, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const TX: number[] = new Array(N);
TREE_ORDER.forEach((k, i) => (TX[k] = 206 + i * 54));
const TY_FILE = 650, TY_GROUP = 490, TY_PILL = 330, ROOT = { x: 800, y: 180 };
const GX: number[] = MEMBERS.map((m) => m.reduce((s, k) => s + TX[k], 0) / m.length);
const PX: number[] = [];
for (let r = 0; r < NR; r++) {
  const gs = GROUP_REG.map((rr, g) => (rr === r ? g : -1)).filter((g) => g >= 0);
  PX.push(gs.reduce((s, g) => s + GX[g], 0) / gs.length);
}

/* Record: the five index cards, staged then promoted. */
const STAGE = { x: 300, y: 772, w: 460, h: 110 }, INDEX = { x: 840, y: 772, w: 460, h: 110 };
const CARD_Y = 827, CARD_W = 60, CARD_H = 76;
const stageX = (i: number) => 345 + i * 88, indexX = (i: number) => 885 + i * 88;

/* Zoom: level-1 cards under the root; the service card expands two levels. */
const CARD_X: number[] = [500, 800, 1100, 1300, 300];
const ZCARD = { y: 400, w: 150, h: 96 }, ZROOT = { x: 800, y: 210 };
const ZG: Record<number, Pt> = { 1: { x: 745, y: 560 }, 2: { x: 855, y: 560 } };
const ZF: Record<number, Pt> = { 5: { x: 690, y: 690 }, 6: { x: 745, y: 690 }, 7: { x: 800, y: 690 } };
const CAM = { x: 800, y: 470 };

/* ── timing ── */
const tp = (k: number) => 0.7 + k * 0.4; // parse moment of file k
const tDep = (k: number) => tp(k) + 0.4, tLand = (k: number) => tp(k) + 1.15;
const TE: number[] = EDGES.map((e) => Math.max(tLand(e.s), tLand(e.t)) + 0.15);
const EXT = { x: 1450, y: 300 }, EXT_K = 7, EXT_T = 11.0;

const WAVE0 = 16, WAVE1 = 25;
const waveX = (t: number) => lerp(540, 1210, easeSine(seg(t, WAVE0, WAVE1)));
const TW: number[] = EDGES.map((e) => {
  const mx = (LC1[e.s].x + LC1[e.t].x) / 2;
  for (let t = WAVE0; t <= WAVE1; t += 0.01) if (waveX(t) >= mx) return t;
  return WAVE1;
});
const WF = (e: Edge) => 1.5 + 1.6 * e.w; // stroke width from strength

const tHull = (r: number) => 28.5 + r * 0.7; // hull self-draws over 0.9 s
const CI: number[] = [];
{
  let ci = 0;
  for (const e of EDGES) CI.push(REG[e.s] === REG[e.t] ? -1 : ci++);
}
const TC = (i: number) => 33 + CI[i] * 0.15; // crossing edge turns accent

const tGauge = (r: number) => 40.8 + r * 0.35;
const STRIP_Y = 840, STRIP_X0 = 240, STRIP_X1 = 1360;
const SX: number[] = SCORES.map((s) => STRIP_X0 + s.score * (STRIP_X1 - STRIP_X0));
const tMark = (r: number) => 46.5 + r * 0.8; // marker lands

const tPres = (r: number) => (r === 0 ? 57.2 : 57.8);
const tRec = (r: number) => (r === 1 ? 58.6 : 59.4);
const SHIVER: Record<number, [number, number, number, number]> = { 1: [59.6, 61.2, 61.2, 62.4], 2: [60.6, 62.6, 62.6, 64.4] };
const tSub = (g: number) => ({ 1: 63.0, 2: 63.4, 3: 65.0, 4: 65.7, 5: 66.4 } as Record<number, number>)[g];
const PHASE: number[] = Array.from({ length: N }, () => R() * 2 * PI);
const PHASE2: number[] = Array.from({ length: N }, () => R() * 2 * PI);

const tFinger = (g: number) => 78 + g * 0.25;
const tXG = (i: number) => 80 + i * 0.22;
const tCard = (i: number) => 89.2 + i * 0.3;
const JUMP0 = 94.0, JUMP1 = 94.8, GHOST0 = 95.4, GHOST1 = 96.4, TICK0 = 96.4, TICK1 = 97.0;

/* Reverse reachability from S3 (file 8): depth 1 = S4, W1; depth 2 = S5, W3, W2; then S3→S5 closes the cycle. */
const LIT: Record<number, number> = { 8: 119.7, 9: 121.3, 19: 121.3, 10: 122.5, 21: 122.5, 20: 122.5 };
const LIT_KEYS = [8, 9, 19, 10, 21, 20];
const GLOW: { e: number; t0: number }[] = [];
{
  const find = (s: number, t: number) => EDGES.findIndex((e) => e.s === s && e.t === t);
  GLOW.push(
    { e: find(9, 8), t0: 120.6 }, { e: find(19, 8), t0: 120.6 },
    { e: find(10, 9), t0: 121.8 }, { e: find(21, 19), t0: 121.8 }, { e: find(20, 19), t0: 121.8 },
    { e: find(8, 10), t0: 123.0 },
  );
}
const CYCLE_T = 123.7;
const BOX_LIT: Record<number, number> = { 7: 121.6, 11: 121.6, 1: 121.9, 3: 121.9 }; // box index → lit time
const litFade = (t: number) => 1 - seg(t, 130, 131.5);

/* ───────────────────── per-chapter role functions ───────────────────── */

type Pose = { x: number; y: number; r: number; sq: number; c: RGB; a: number; ring: number; arc: number; sx: number; sy: number };
const pose = (x: number, y: number): Pose => ({ x, y, r: 13, sq: 0, c: INK, a: 1, ring: 0, arc: 0, sx: 1, sy: 1 });
const breathe = (p: Pose, k: number, t: number) => {
  p.x += 1.5 * Math.sin((2 * PI * t) / 4 + PHASE[k]);
  p.y += 1.2 * Math.cos((2 * PI * t) / 4 + PHASE2[k]);
  return p;
};

/* 0. Parse: a square flashes in its folder, sprouts an AST that is discarded, flies into the cloud. */
function parseP(k: number, t: number): Pose {
  const d = tDep(k), l = tLand(k), A = L0[k], B = LC0[k];
  if (t < d) {
    const p = pose(A.x, A.y);
    p.sq = 1;
    p.r = 14 * (1 + 0.12 * bump(t, tp(k), tp(k) + 0.3));
    p.x -= 7 * Math.sin(PI * seg(t, d - 0.25, d)); // anticipation
    return p;
  }
  if (t < l) {
    const q = ease(seg(t, d, l));
    const p = pose(lerp(A.x, B.x, q), lerp(A.y, B.y, q) - Math.sin(PI * q) * 120);
    p.sq = 1 - q;
    p.r = lerp(14, 13, q);
    p.sx = 1 + 0.12 * Math.sin(PI * q);
    p.sy = 1 / p.sx;
    return p;
  }
  const p = pose(B.x, B.y);
  p.r = 13 * (1 + 0.14 * bump(t, l, l + 0.3));
  return breathe(p, k, t);
}

/* 1. Weigh: the cloud sits centred; a node pops as the wave passes it. */
function weighP(k: number, t: number): Pose {
  const p = pose(LC1[k].x, LC1[k].y);
  const tw = TW.reduce((m, tw, i) => (EDGES[i].s === k || EDGES[i].t === k ? Math.min(m, tw) : m), WAVE1);
  p.r = 13 * (1 + 0.1 * bump(t, tw - 0.1, tw + 0.3));
  return breathe(p, k, t);
}

/* 2–3. Regions and Score: files sit in their package hull. */
function regionP(k: number, t: number): Pose {
  return breathe(pose(L2[k].x, L2[k].y), k, t);
}

/* 4. Decide: files of a reconstructed region shiver on seeded offsets, then settle into communities. */
function decideP(k: number, t: number): Pose {
  const win = SHIVER[REG[k]];
  if (!win) return regionP(k, t);
  const [s0, s1, m0, m1] = win;
  if (t < m0) {
    const amp = 7 * bump(t, s0, s1);
    const p = pose(L2[k].x + amp * Math.sin(7.3 * t + PHASE[k]), L2[k].y + amp * Math.cos(5.9 * t + PHASE2[k]));
    return breathe(p, k, t);
  }
  const q = settle(seg(t, m0 + (k % 3) * 0.08, m1));
  const A = L2[k], B = L4[k];
  const p = pose(lerp(A.x, B.x, q), lerp(A.y, B.y, q) - Math.sin(PI * clamp01(q)) * 36);
  return breathe(p, k, t);
}

/* 5–6. Assemble and Record: files along the bottom row; leaf edges become arcs beneath them. */
function treeP(k: number, t: number): Pose {
  const p = pose(TX[k], TY_FILE);
  p.arc = 1;
  return breathe(p, k, t);
}

/* 7. Zoom: files fold into their group, then one group's files unfold under the expanded card. */
function zoomP(k: number, t: number): Pose {
  const f0 = 100.8 + k * 0.03, q = ease(seg(t, f0, f0 + 1.0));
  const g = GRP[k], r = REG[k];
  if (q < 1) {
    const p = pose(lerp(TX[k], GX[g], q), lerp(TY_FILE, TY_GROUP, q) + Math.sin(PI * q) * 40);
    p.r = lerp(13, 6, q);
    p.a = 1 - q;
    p.arc = 1 - q;
    return breathe(p, k, t);
  }
  const zf = ZF[k];
  if (zf) {
    const u0 = 108.4 + (k - 5) * 0.15, u = easeOutBack(clamp01(seg(t, u0, u0 + 0.8)));
    const from = ZG[1];
    if (t >= u0) {
      const p = pose(lerp(from.x, zf.x, u), lerp(from.y, zf.y, u));
      p.r = lerp(6, 14, clamp01(u));
      p.a = clamp01(seg(t, u0, u0 + 0.3));
      return breathe(p, k, t);
    }
  }
  const p = pose(CARD_X[r], ZCARD.y);
  p.r = 6;
  p.a = 0;
  return p;
}

/* 8. Blast: the tree again; impacted files light by BFS depth. */
function blastP(k: number, t: number): Pose {
  const p = treeP(k, t);
  const lt = LIT[k];
  if (lt !== undefined) {
    const l = seg(t, lt, lt + 0.3) * litFade(t);
    p.c = mix(INK, ACCENT, l);
    p.r = 13 * (1 + 0.18 * bump(t, lt, lt + 0.35));
    p.ring = bump(t, lt, lt + 0.7);
    if (k === 8) p.r *= 1 - 0.1 * bump(t, 119.35, 119.7);
  }
  return p;
}

/* ── boxes: region hulls (0–4), level-2 groups (5–12), the repository root (13) ── */
type Box = { x: number; y: number; w: number; h: number; r: number; col: RGB; a: number; sw: number; fill: number; draw: number; dash: number; ring: number };
const box = (x: number, y: number, w: number, h: number, r: number, col: RGB): Box => ({ x, y, w, h, r, col, a: 1, sw: 0, fill: 0, draw: 1, dash: 0, ring: 0 });
const NB = 14;
const isHull = (i: number) => i < 5, isGroup = (i: number) => i >= 5 && i < 13;

function hullGeom(r: number): Box {
  const h = HULL[r];
  const b = box(h.x, h.y, h.w, h.h, 26, r === 4 ? GREY : INK);
  b.sw = 2.5;
  if (r === 4) b.dash = 10;
  return b;
}
function groupGeomDecide(g: number): Box {
  const s = SUB[g];
  if (s) {
    const b = box(s.x, s.y, s.w, s.h, 22, ACCENT);
    b.sw = 3;
    return b;
  }
  return hullGeom(GROUP_REG[g]);
}
function boxParse(i: number): Box {
  const b = isHull(i) ? hullGeom(i) : isGroup(i) ? groupGeomDecide(i - 5) : box(ROOT.x, ROOT.y, 0, 0, 0, INK);
  b.a = 0;
  b.draw = 0;
  return b;
}
function boxRegion(i: number, t: number): Box {
  if (isHull(i)) {
    const b = hullGeom(i);
    b.draw = easeOut(seg(t, tHull(i), tHull(i) + 0.9));
    const s = SCORES[i];
    if (!s.degenerate && !s.preserve) b.col = mix(INK, ACCENT, seg(t, tMark(i) + 0.6, tMark(i) + 1.2));
    return b;
  }
  return boxParse(i);
}
function boxDecide(i: number, t: number): Box {
  if (isHull(i)) {
    const b = hullGeom(i), s = SCORES[i];
    if (s.degenerate) {
      b.ring = bump(t, 60, 60.8);
      return b;
    }
    if (s.preserve) {
      const q = easeOut(seg(t, tPres(i), tPres(i) + 0.5));
      b.sw = lerp(2.5, 5, q);
      b.fill = 0.1 * q;
      const pop = 1 + 0.03 * bump(t, tPres(i), tPres(i) + 0.4);
      b.w *= pop;
      b.h *= pop;
      return b;
    }
    const q = seg(t, tRec(i), tRec(i) + 0.9);
    b.col = ACCENT;
    b.dash = q > 0 ? 18 : 0;
    b.a = 1 - ease(q);
    return b;
  }
  if (isGroup(i)) {
    const g = i - 5, b = groupGeomDecide(g);
    if (SUB[g]) {
      b.draw = easeOut(seg(t, tSub(g), tSub(g) + 0.8));
      const pop = 1 + 0.04 * bump(t, tSub(g) + 0.7, tSub(g) + 1.1);
      b.w *= pop;
      b.h *= pop;
    } else b.a = 0;
    return b;
  }
  return boxParse(i);
}
function boxTree(i: number, t: number): Box {
  let b: Box;
  if (isHull(i)) {
    b = box(PX[i], TY_PILL, i === 4 ? 70 : 110, 44, 22, decisionCol(i));
    if (SCORES[i].degenerate) b.sw = 3;
    else b.fill = 1;
  } else if (isGroup(i)) {
    const g = i - 5, r = GROUP_REG[g];
    b = box(GX[g], TY_GROUP, 44, 44, 22, decisionCol(r));
    if (SCORES[r].degenerate) b.sw = 3;
    else b.fill = 1;
  } else {
    b = box(ROOT.x, ROOT.y, 52, 52, 26, INK);
    b.fill = 1;
    b.a = t < 100 ? seg(t, 74.9, 75.1) : 1;
    const pop = 1 + 0.2 * bump(t, 75, 75.4);
    b.w *= pop;
    b.h *= pop;
  }
  const lt = BOX_LIT[i];
  if (lt !== undefined && t >= 116) {
    const l = seg(t, lt, lt + 0.3) * litFade(t);
    b.col = mix(b.col, ACCENT, l);
    b.ring = l;
    const pop = 1 + 0.12 * bump(t, lt, lt + 0.4);
    b.w *= pop;
    b.h *= pop;
  }
  return b;
}
function boxZoom(i: number, t: number): Box {
  if (isGroup(i)) {
    const g = i - 5, r = GROUP_REG[g], f0 = 102.0 + g * 0.08, q = ease(seg(t, f0, f0 + 0.9));
    const zg = ZG[g];
    if (zg && t >= 106 + (g - 1) * 0.2) {
      const u0 = 106 + (g - 1) * 0.2, u = easeOutBack(clamp01(seg(t, u0, u0 + 0.9)));
      const b = box(lerp(CARD_X[1], zg.x, u), lerp(ZCARD.y + 30, zg.y, u), lerp(20, 50, u), lerp(20, 50, u), 12, ACCENT);
      b.fill = 1;
      b.a = seg(t, u0, u0 + 0.3);
      return b;
    }
    const b = boxTree(i, t);
    b.x = lerp(b.x, PX[r], q);
    b.y = lerp(b.y, TY_PILL, q) - Math.sin(PI * q) * 20;
    b.a = 1 - q;
    if (q >= 1) {
      b.x = CARD_X[r];
      b.y = ZCARD.y;
    }
    return b;
  }
  if (isHull(i)) {
    const q = ease(seg(t, 103.0 + i * 0.1, 104.1 + i * 0.1));
    const b = boxTree(i, t);
    b.x = lerp(b.x, CARD_X[i], q);
    b.y = lerp(b.y, ZCARD.y, q);
    b.w = lerp(b.w, ZCARD.w, q);
    b.h = lerp(b.h, ZCARD.h, q);
    b.r = lerp(22, 18, q);
    if (SCORES[i].degenerate) {
      b.fill = q;
      b.sw = lerp(3, 0, q);
    }
    return b;
  }
  const b = boxTree(i, t), q = ease(seg(t, 103.0, 104.1));
  b.y = lerp(ROOT.y, ZROOT.y, q);
  return b;
}
function boxFade(i: number, t: number): Box {
  const b = boxTree(i, t);
  b.a = 0;
  b.w *= 0.6;
  b.h *= 0.6;
  return b;
}

/* ───────────────────────────── transition helpers ───────────────────────────── */

type Scene<T> = { t: number; fn: (k: number, t: number) => T; dur?: number; stag?: number };
const lerpPose = (A: Pose, B: Pose, p: number, lift: number): Pose => ({
  x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * lift, r: lerp(A.r, B.r, p), sq: lerp(A.sq, B.sq, p),
  c: mix(A.c, B.c, p), a: lerp(A.a, B.a, p), ring: lerp(A.ring, B.ring, p), arc: lerp(A.arc, B.arc, p),
  sx: 1 + 0.1 * Math.sin(PI * p), sy: 1 / (1 + 0.1 * Math.sin(PI * p)),
});
const lerpBox = (A: Box, B: Box, p: number, lift: number): Box => ({
  x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * lift, w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
  col: mix(A.col, B.col, p), a: lerp(A.a, B.a, p), sw: lerp(A.sw, B.sw, p), fill: lerp(A.fill, B.fill, p), draw: lerp(A.draw, B.draw, p),
  dash: p < 0.5 ? A.dash : B.dash, ring: lerp(A.ring, B.ring, p),
});

const FSCENES: Scene<Pose>[] = [
  { t: 0, fn: parseP },
  { t: 14, fn: weighP, dur: 1.2, stag: 0.04 },
  { t: 26, fn: regionP, dur: 1.1, stag: 0.04 },
  { t: 56, fn: decideP, dur: 0.5 },
  { t: 72, fn: treeP, dur: 1.1, stag: 0.045 },
  { t: 100, fn: zoomP, dur: 0.6 },
  { t: 116, fn: blastP, dur: 1.2, stag: 0.04 },
  { t: 132, fn: (k) => parseP(k, 0), dur: 1.3, stag: 0.05 },
];
const BSCENES: Scene<Box>[] = [
  { t: 0, fn: boxParse },
  { t: 26, fn: boxRegion, dur: 0.5 },
  { t: 56, fn: boxDecide, dur: 0.5 },
  { t: 72, fn: boxTree, dur: 1.0, stag: 0.05 },
  { t: 100, fn: boxZoom, dur: 0.5 },
  { t: 116, fn: boxTree, dur: 1.1, stag: 0.05 },
  { t: 132, fn: boxFade, dur: 1.2, stag: 0.04 },
];

function sceneState<T>(scenes: Scene<T>[], k: number, t: number, mixFn: (A: T, B: T, p: number, lift: number) => T, dist: (A: T, B: T) => number): T {
  let i = scenes.length - 1;
  while (scenes[i].t > t) i--;
  const sc = scenes[i];
  if (!sc.dur || i === 0) return sc.fn(k, t);
  const st = (sc.stag ?? 0) * k, start = sc.t + st, end = start + sc.dur;
  if (t >= end) return sc.fn(k, t);
  const A = scenes[i - 1].fn(k, sc.t), B = sc.fn(k, end);
  const p = ease(seg(t, start, end));
  return mixFn(A, B, p, Math.min(90, 0.22 * dist(A, B)));
}
const poseAt = (k: number, t: number) => sceneState(FSCENES, k, t, lerpPose, (A, B) => Math.hypot(A.x - B.x, A.y - B.y));
const boxAt = (i: number, t: number) => sceneState(BSCENES, i, t, lerpBox, (A, B) => Math.hypot(A.x - B.x, A.y - B.y));

/* ───────────────────── furniture, cast and fx painters ───────────────────── */

const POSES: Pose[] = new Array(N);
const BOXES: Box[] = new Array(NB);

/** Point on a quadratic bezier. */
function qpt(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, u: number): [number, number] {
  const v = 1 - u;
  return [v * v * ax + 2 * v * u * cx + u * u * bx, v * v * ay + 2 * v * u * cy + u * u * by];
}
/** Stroke a (possibly partial) quadratic curve by sampling. */
function qstroke(p: Painter, ax: number, ay: number, cx: number, cy: number, bx: number, by: number, u0: number, u1: number, col: RGB, w: number, a: number) {
  if (a <= 0.005 || u1 <= u0) return;
  const c = p.ctx;
  c.strokeStyle = css(col, a);
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = qpt(ax, ay, cx, cy, bx, by, lerp(u0, u1, i / steps));
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
}
function tick(p: Painter, x: number, y: number, s: number, q: number, col: RGB, a = 1) {
  if (q <= 0 || a <= 0) return;
  const P = [[x - 0.3 * s, y + 0.02 * s], [x - 0.08 * s, y + 0.24 * s], [x + 0.32 * s, y - 0.22 * s]];
  const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const d = q * (l1 + l2), c = p.ctx;
  c.strokeStyle = css(col, a);
  c.lineWidth = s * 0.13;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  c.moveTo(P[0][0], P[0][1]);
  if (d <= l1) c.lineTo(lerp(P[0][0], P[1][0], d / l1), lerp(P[0][1], P[1][1], d / l1));
  else {
    c.lineTo(P[1][0], P[1][1]);
    const f = (d - l1) / l2;
    c.lineTo(lerp(P[1][0], P[2][0], f), lerp(P[1][1], P[2][1], f));
  }
  c.stroke();
}
/** A rounded rect that draws itself (draw 0..1 of its perimeter), with optional dash and fill. */
function drawBox(p: Painter, b: Box) {
  if (b.a <= 0.005 || b.w <= 0.5 || b.h <= 0.5) return;
  const c = p.ctx, x0 = b.x - b.w / 2, y0 = b.y - b.h / 2, r = Math.min(b.r, b.w / 2, b.h / 2);
  if (b.fill > 0) p.rrect(x0, y0, b.w, b.h, r, b.col, b.a * b.fill);
  if (b.sw > 0 && b.draw > 0.002) {
    const per = 2 * (b.w + b.h) - 8 * r + 2 * PI * r;
    if (b.draw < 0.999) c.setLineDash([per * b.draw, per]);
    else if (b.dash > 0) c.setLineDash([b.dash, b.dash * 0.8]);
    p.rstroke(x0, y0, b.w, b.h, r, b.col, b.sw, b.a);
    c.setLineDash([]);
  }
  if (b.ring > 0.005) {
    const g = 8 + 20 * b.ring;
    p.rstroke(x0 - g, y0 - g, b.w + 2 * g, b.h + 2 * g, r + g, ACCENT, 3, b.a * (1 - b.ring) * 0.9);
  }
}
function drawFile(p: Painter, k: number, it: Pose) {
  if (it.a <= 0.005 || it.r <= 0.3) return;
  const c = p.ctx;
  c.save();
  c.translate(it.x, it.y);
  c.scale(it.sx, it.sy);
  const s = it.r, rr = lerp(s, s * 0.32, it.sq);
  p.rrect(-s, -s, 2 * s, 2 * s, rr, it.c, it.a);
  if (it.ring > 0.005) p.arc(0, 0, s + 6 + 22 * it.ring, 0, 2 * PI, ACCENT, 3, it.a * (1 - it.ring));
  c.restore();
  void k;
}

/* ── chapter 0: panel, sprouts, cloud container, external reference ── */
function panelAlpha(t: number) {
  return t < 20 ? 1 - seg(t, 14, 15) : seg(t, 134, 135.5);
}
function drawPanel(p: Painter, t: number) {
  const a = panelAlpha(t);
  if (a <= 0) return;
  p.rstroke(PANEL.x, PANEL.y, PANEL.w, PANEL.h, 24, LOCK, 3, a);
  for (let r = 0; r < NR; r++) {
    const y = FOLDER_Y[r];
    // folder tab: a small pill plus a hairline across the panel
    p.rrect(252, y - 6, 26, 12, 5, r === 4 ? GREY : LOCK, a);
    p.line(290, y, 510, y, EDGE, 2, a);
  }
}
function drawSprouts(p: Painter, t: number) {
  if (t > 11 || t < 0.5) return;
  for (let k = 0; k < N; k++) {
    const t0 = tp(k);
    if (t < t0 || t > t0 + 0.5) continue;
    const g = easeOut(seg(t, t0, t0 + 0.2)) * (1 - ease(seg(t, t0 + 0.25, t0 + 0.45)));
    if (g <= 0) continue;
    const it = POSES[k], x = it.x, y = it.y - 14;
    for (const [dx, dy] of [[-16, -24], [0, -30], [16, -24]]) p.line(x, y, x + dx * g, y + dy * g, LOCK, 2, 1);
    for (const dy of [-6, 6]) p.disc(lerp(it.x, it.x + 22, g), it.y + dy * g, 3.5, INK, g);
  }
}
/* The graph.json artifact: an empty dashed frame at rest, solidifying as files land in it; a short
   rail joins the source panel to it (parse reads the tree, writes one file). */
function drawCloudFrame(p: Painter, t: number) {
  const a = panelAlpha(t);
  if (a <= 0) return;
  const c = p.ctx, solid = t < 20 ? seg(t, tLand(0), tLand(0) + 0.6) : 0;
  if (solid < 1) c.setLineDash([14, 12]);
  p.rstroke(CLOUD0.x - 320, CLOUD0.y - 320, 640, 640, 40, mix(EDGE, LOCK, solid), 2.5, a);
  c.setLineDash([]);
  p.line(PANEL.x + PANEL.w + 18, 500, CLOUD0.x - 338, 500, EDGE, 2.5, a);
  p.line(CLOUD0.x - 352, 490, CLOUD0.x - 340, 500, EDGE, 2.5, a);
  p.line(CLOUD0.x - 352, 510, CLOUD0.x - 340, 500, EDGE, 2.5, a);
}
function drawExternal(p: Painter, t: number) {
  const a = t < 20 ? 1 - seg(t, 13.5, 14) : seg(t, 134, 135.5);
  if (a <= 0) return;
  p.arc(EXT.x, EXT.y, 18 + 1.5 * Math.sin((2 * PI * t) / 4), 0, 2 * PI, GREY, 3, a);
  const g = easeOut(seg(t, EXT_T, EXT_T + 0.45)), f = seg(t, EXT_T + 0.45, EXT_T + 1.0);
  if (g > 0 && f < 1) {
    const it = POSES[EXT_K], c = p.ctx;
    if (f > 0) c.setLineDash([6, 8]);
    const ex = lerp(it.x, EXT.x - 22, g), ey = lerp(it.y, EXT.y, g);
    qstroke(p, it.x, it.y, (it.x + EXT.x) / 2, Math.min(it.y, EXT.y) - 80, ex, ey, 0, 1, mix(ACCENT, GREY, f), 2, (1 - f) * a);
    c.setLineDash([]);
  }
}

/* ── chapter 1: the wave and the signal pips ── */
function drawWave(p: Painter, t: number) {
  if (t < WAVE0 - 0.3 || t > WAVE1 + 0.3) return;
  const a = seg(t, WAVE0 - 0.3, WAVE0) * (1 - seg(t, WAVE1, WAVE1 + 0.3)), x = waveX(t);
  p.line(x, 170, x, 850, ACCENT, 4, 0.75 * a);
  p.line(x - 14, 170, x - 14, 850, ACCENT, 2, 0.25 * a);
  for (let i = 0; i < NE; i++) {
    const e = EDGES[i], tw = TW[i];
    if (t < tw || t > tw + 0.75) continue;
    const A = POSES[e.s], B = POSES[e.t], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    const d = Math.hypot(B.x - A.x, B.y - A.y) || 1, ux = (B.x - A.x) / d, uy = (B.y - A.y) / d;
    const col = seg(t, tw + 0.4, tw + 0.7);
    for (let j = 0; j < e.w; j++) {
      const ap = seg(t, tw + j * 0.05, tw + 0.15 + j * 0.05) * (1 - col);
      if (ap <= 0) continue;
      const off = (j - (e.w - 1) / 2) * 12 * (1 - col);
      p.disc(mx + ux * off - uy * 12 * (1 - col), my + uy * off + ux * 12 * (1 - col), 4 * (1 + 0.25 * bump(t, tw + j * 0.05, tw + 0.3 + j * 0.05)), ACCENT, ap);
    }
  }
}

/* ── leaf edges ── */
function edgeStyle(i: number, t: number): { w: number; col: RGB; a: number; grow: number } {
  const e = EDGES[i], te = TE[i];
  if (t < 14) {
    if (t < te) return { w: 0, col: INK, a: 0, grow: 0 };
    const f = seg(t, te + 0.45, te + 0.9);
    return { w: lerp(2.2, 1.5, f), col: mix(ACCENT, INK, f), a: 1, grow: easeOut(seg(t, te, te + 0.45)) };
  }
  if (t < 26) return { w: lerp(1.5, WF(e), easeOut(seg(t, TW[i] + 0.35, TW[i] + 0.75))), col: INK, a: 0.95, grow: 1 };
  const crossR = CI[i] >= 0 ? seg(t, TC(i), TC(i) + 0.4) : GRP[e.s] !== GRP[e.t] ? seg(t, 63.3, 63.8) : 0;
  const col = mix(INK, ACCENT, crossR);
  if (t < 72) return { w: WF(e), col, a: 0.95, grow: 1 };
  const thin = seg(t, 74, 75.5);
  const base = { w: lerp(WF(e), 1.5, thin), col, grow: 1 };
  if (t < 100) return { ...base, a: lerp(0.95, 0.5, thin) };
  if (t < 116) return { ...base, a: 0.5 * (1 - seg(t, 100.6, 101.6)) };
  if (t < 132) return { ...base, a: 0.5 * seg(t, 117, 118.2) };
  return { ...base, a: 0.5 * (1 - seg(t, 132, 133)) };
}
function edgeCtl(A: Pose, B: Pose): [number, number] {
  const arc = (A.arc + B.arc) / 2;
  const d = Math.hypot(B.x - A.x, B.y - A.y);
  return [(A.x + B.x) / 2, (A.y + B.y) / 2 + arc * Math.min(100, 0.3 * d)];
}
function drawEdges(p: Painter, t: number) {
  // While the cast travels between layouts the edges thin and dim, so the flight reads, not the tangle.
  const travel = Math.max(bump(t, 25.8, 28.6), bump(t, 71.8, 74.6));
  for (let i = 0; i < NE; i++) {
    const st = edgeStyle(i, t);
    if (st.a <= 0.005 || st.grow <= 0) continue;
    const e = EDGES[i], A = POSES[e.s], B = POSES[e.t];
    const a = st.a * Math.min(A.a, B.a) * lerp(1, 0.45, travel);
    if (a <= 0.005) continue;
    const [cx, cy] = edgeCtl(A, B);
    qstroke(p, A.x, A.y, cx, cy, B.x, B.y, 0, st.grow, st.col, lerp(st.w, 1.8, travel), a);
  }
}
/* chapter 2: a pulse runs along each crossing edge as it turns accent */
function drawCrossPulses(p: Painter, t: number) {
  if (t < 33 || t > 36.5) return;
  for (let i = 0; i < NE; i++) {
    if (CI[i] < 0) continue;
    const q = seg(t, TC(i), TC(i) + 0.45);
    if (q <= 0 || q >= 1) continue;
    const e = EDGES[i], A = POSES[e.s], B = POSES[e.t], [cx, cy] = edgeCtl(A, B);
    const [x, y] = qpt(A.x, A.y, cx, cy, B.x, B.y, q);
    p.disc(x, y, 6, ACCENT, 1 - q * 0.5);
  }
}

/* ── chapter 3: gauges, the boundary strip, markers and confidence brackets ── */
function stripAlpha(t: number) {
  if (t < 44.6 || t > 73) return 0;
  return seg(t, 44.6, 45.2) * lerp(1, 0.35, seg(t, 56, 57)) * (1 - seg(t, 72, 73));
}
function gaugeY(r: number) {
  return HULL[r].y + HULL[r].h / 2 + 28;
}
function drawGauges(p: Painter, t: number) {
  if (t < 40.5 || t > 57) return;
  for (let r = 0; r < NR; r++) {
    const sx = easeOut(seg(t, tGauge(r), tGauge(r) + 0.4)) * (1 - ease(seg(t, 56.2, 56.8)));
    if (sx <= 0.01) continue;
    const c = p.ctx, gx = HULL[r].x, gy = gaugeY(r), s = SCORES[r];
    c.save();
    c.translate(gx, gy);
    c.scale(sx, 1);
    p.rrect(-60, -5, 120, 10, 5, LOCK, 0.9);
    p.rrect(-60, 11, 120, 10, 5, LOCK, 0.9);
    if (s.degenerate) {
      c.setLineDash([5, 6]);
      p.line(-60, 8, 60, 8, GREY, 2, 0.9);
      c.setLineDash([]);
    } else {
      const cw = 120 * s.cohN * easeOut(seg(t, 41.8, 43.2)), kw = 120 * s.coupling * easeOut(seg(t, 43.4, 44.8));
      if (cw > 1) p.rrect(-60, -5, cw, 10, 5, INK);
      if (kw > 1) p.rrect(-60, 11, kw, 10, 5, ACCENT);
    }
    c.restore();
  }
}
function drawStrip(p: Painter, t: number) {
  const a = stripAlpha(t);
  if (a <= 0) return;
  const th = 40 * easeOut(seg(t, 44.6, 45.1)), ext = easeOut(seg(t, 45.0, 45.8));
  if (ext > 0) {
    p.line(800 - (800 - STRIP_X0) * ext, STRIP_Y, 800 + (STRIP_X1 - 800) * ext, STRIP_Y, EDGE, 4, a);
    if (ext > 0.98) {
      p.line(STRIP_X0, STRIP_Y - 9, STRIP_X0, STRIP_Y + 9, IDLE, 2.5, a);
      p.line(STRIP_X1, STRIP_Y - 9, STRIP_X1, STRIP_Y + 9, IDLE, 2.5, a);
    }
  }
  p.line(800, STRIP_Y - th / 2, 800, STRIP_Y + th / 2, INK, 5, a);
  for (let r = 0; r < NR; r++) {
    const tm = tMark(r), td = tm - 0.9, s = SCORES[r];
    const ap = seg(t, td, td + 0.2) * a;
    if (ap <= 0) continue;
    const gx = HULL[r].x, gy = gaugeY(r) + 36, q = easeOut(seg(t, td, tm));
    const [mx, my] = qpt(gx, gy, (gx + SX[r]) / 2, STRIP_Y - 150, SX[r], STRIP_Y, q);
    if (q < 1) qstroke(p, gx, gy, (gx + SX[r]) / 2, STRIP_Y - 150, SX[r], STRIP_Y, 0, q, LOCK, 1.5, ap * 0.8);
    else {
      const fa = 1 - seg(t, tm, tm + 0.4);
      if (fa > 0) qstroke(p, gx, gy, (gx + SX[r]) / 2, STRIP_Y - 150, SX[r], STRIP_Y, 0, 1, LOCK, 1.5, ap * 0.8 * fa);
    }
    const landed = seg(t, tm, tm + 0.25), size = 24 * (1 + 0.2 * bump(t, tm, tm + 0.3));
    const col = mix(LOCK, decisionCol(r), landed);
    if (s.degenerate && landed >= 1) p.rstroke(mx - size / 2, my - size / 2, size, size, 7, GREY, 3, ap);
    else p.rrect(mx - size / 2, my - size / 2, size, size, 7, col, ap);
    // confidence bracket: |score − boundary|
    if (!s.degenerate) {
      const bq = easeOut(seg(t, tm + 0.5, tm + 1.0));
      if (bq > 0) {
        const by = STRIP_Y + 26, bx = lerp(SX[r], 800, bq);
        p.line(SX[r], by, bx, by, decisionCol(r), 3, 0.6 * ap);
        p.line(SX[r], by - 5, SX[r], by + 5, decisionCol(r), 2.5, 0.6 * ap);
      }
    }
  }
}

/* ── chapter 4: the seed dial on each reconstructed hull ── */
function drawSeedDials(p: Painter, t: number) {
  if (t < 58 || t > 61.5) return;
  for (const r of [1, 2]) {
    const t0 = tRec(r), a = seg(t, t0 - 0.2, t0) * (1 - seg(t, t0 + 1.3, t0 + 1.8));
    if (a <= 0) continue;
    const h = HULL[r], x = h.x + h.w / 2 - 12, y = h.y - h.h / 2 + 12;
    const s = 1 + 0.15 * bump(t, t0 + 0.8, t0 + 1.05), ang = -PI / 2 + 3 * PI * easeOut(seg(t, t0, t0 + 0.8));
    p.arc(x, y, 14 * s, 0, 2 * PI, ACCENT, 2.5, a);
    p.line(x, y, x + Math.cos(ang) * 11 * s, y + Math.sin(ang) * 11 * s, ACCENT, 2.5, a);
  }
}

/* ── chapters 5–8: lanes, tree links, fingerprints, cross-group arcs ── */
function laneAlpha(t: number) {
  if (t < 72 || t > 133) return 0;
  if (t < 100) return seg(t, 73.5, 74.5);
  if (t < 116) return 1 - seg(t, 100.2, 101.2);
  if (t < 132) return seg(t, 117, 118);
  return 1 - seg(t, 132, 133);
}
function drawLanes(p: Painter, t: number) {
  const a = laneAlpha(t) * 0.6;
  if (a > 0) for (const y of [ROOT.y, TY_PILL, TY_GROUP, TY_FILE]) p.line(170, y, 1430, y, EDGE, 1.5, a);
  // the viewer's level lanes: one level at a time
  const z = seg(t, 103.4, 104.4) * (1 - seg(t, 115.2, 116.2)) * 0.6;
  if (z > 0) for (const y of [ZROOT.y, ZCARD.y, ZG[1].y, ZF[5].y]) p.line(170, y, 1430, y, EDGE, 1.5, z);
}
function linkFactor(t: number) {
  if (t < 72 || t > 133) return 0;
  if (t < 100 || t < 116) return 1;
  if (t < 132) return seg(t, 117, 118.5);
  return 1 - seg(t, 132, 133);
}
function partialLine(p: Painter, x1: number, y1: number, x2: number, y2: number, q: number, col: RGB, w: number, a: number) {
  if (q <= 0 || a <= 0.005) return;
  p.line(x1, y1, lerp(x1, x2, q), lerp(y1, y2, q), col, w, a);
}
function drawLinks(p: Painter, t: number) {
  const lf = linkFactor(t);
  if (lf <= 0) return;
  const root = BOXES[13];
  const grow = t < 100;
  for (let r = 0; r < NR; r++) {
    const b = BOXES[r], q = grow ? easeOut(seg(t, 74.4 + r * 0.1, 75.0 + r * 0.1)) : 1;
    partialLine(p, b.x, b.y - b.h / 2, root.x, root.y + root.h / 2, q, LOCK, 2, lf * Math.min(b.a, root.a) * 0.9);
  }
  for (let g = 0; g < NG; g++) {
    const b = BOXES[5 + g], pr = BOXES[GROUP_REG[g]], q = grow ? easeOut(seg(t, 75.4 + g * 0.1, 76.0 + g * 0.1)) : 1;
    partialLine(p, b.x, b.y - b.h / 2, pr.x, pr.y + pr.h / 2, q, LOCK, 2, lf * Math.min(b.a, pr.a) * 0.9);
  }
  for (let k = 0; k < N; k++) {
    const it = POSES[k], gb = BOXES[5 + GRP[k]], idx = TREE_ORDER.indexOf(k);
    const q = grow ? easeOut(seg(t, 76.4 + idx * 0.05, 76.9 + idx * 0.05)) : 1;
    partialLine(p, it.x, it.y - it.r, gb.x, gb.y + gb.h / 2, q, LOCK, 1.5, lf * Math.min(it.a, gb.a) * 0.8);
  }
}
function fingerAlpha(t: number) {
  if (t < 78 || t > 133) return 0;
  if (t < 100) return 1;
  if (t < 116) return 1 - seg(t, 101.5, 102.2);
  if (t < 132) return seg(t, 117.5, 118.5);
  return 1 - seg(t, 132, 133);
}
function drawFingerprints(p: Painter, t: number) {
  const fa = fingerAlpha(t);
  if (fa <= 0) return;
  for (let g = 0; g < NG; g++) {
    const b = BOXES[5 + g], a = fa * b.a * (t < 100 ? seg(t, tFinger(g), tFinger(g) + 0.3) : 1);
    if (a <= 0.005) continue;
    const pop = 1 + 0.3 * bump(t, tFinger(g), tFinger(g) + 0.4);
    for (let i = 0; i < 4; i++) {
      const x = b.x + (i % 2 ? 7 : -7), y = b.y + 34 + (i < 2 ? -7 : 7);
      if (FINGER[g][i]) p.disc(x, y, 3.5 * pop, INK, a);
      else p.arc(x, y, 3 * pop, 0, 2 * PI, INK, 1.5, a);
    }
  }
}
function xgAlpha(t: number) {
  if (t < 80 || t > 133) return 0;
  if (t < 100) return 1;
  if (t < 116) return 1 - seg(t, 100.6, 101.6);
  if (t < 132) return seg(t, 117, 118.5);
  return 1 - seg(t, 132, 133);
}
function drawCrossGroup(p: Painter, t: number) {
  const xa = xgAlpha(t);
  if (xa <= 0) return;
  XGS.forEach((x, i) => {
    const A = BOXES[5 + x.a], B = BOXES[5 + x.b];
    const a = xa * Math.min(A.a, B.a) * 0.85;
    if (a <= 0.005) return;
    const g = t < 100 ? easeOut(seg(t, tXG(i), tXG(i) + 0.6)) : 1;
    if (g <= 0) return;
    const d = Math.abs(B.x - A.x), cy = Math.min(A.y, B.y) - Math.min(180, 0.35 * d) - 24;
    qstroke(p, A.x, A.y - 22, (A.x + B.x) / 2, cy, B.x, B.y - 22, 0, g, ACCENT, (1.5 + 1.2 * x.w) * (1 + 0.15 * bump(t, tXG(i) + 0.5, tXG(i) + 0.9)), a);
  });
}

/* ── chapter 6: the five index cards ── */
function cardPos(i: number, t: number): { x: number; y: number; s: number; a: number } {
  const t0 = tCard(i);
  if (t < t0) return { x: ROOT.x, y: ROOT.y, s: 0, a: 0 };
  const grow = easeOut(seg(t, t0, t0 + 0.3));
  if (t < t0 + 0.3) return { x: ROOT.x, y: ROOT.y + 20 * grow, s: grow, a: grow };
  const f = settle(seg(t, t0 + 0.3, t0 + 1.1));
  const [fx, fy] = qpt(ROOT.x, ROOT.y + 20, (ROOT.x + stageX(i)) / 2 - 120, (ROOT.y + CARD_Y) / 2 - 60, stageX(i), CARD_Y, clamp01(f));
  if (t < JUMP0 - 0.3) return { x: fx, y: fy, s: 1, a: 1 };
  const ant = Math.sin(PI * seg(t, JUMP0 - 0.3, JUMP0)) * 8;
  const j0 = JUMP0 + i * 0.02, j = easeOut(seg(t, j0, JUMP1 + i * 0.02));
  const [jx, jy] = qpt(stageX(i), CARD_Y, (stageX(i) + indexX(i)) / 2, CARD_Y - 130, indexX(i), CARD_Y, j);
  const sq = 1 + 0.1 * bump(t, JUMP1 + i * 0.02, JUMP1 + 0.3 + i * 0.02);
  return { x: jx - ant, y: jy, s: sq, a: 1 };
}
function drawCardFace(p: Painter, i: number, x: number, y: number, s: number, a: number, col: RGB) {
  const c = p.ctx;
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  p.rrect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10, col, a);
  const G = GROUND;
  switch (i) {
    case 0: // repository: one node with a ring
      p.disc(0, 0, 6, G, a);
      p.arc(0, 0, 14, 0, 2 * PI, G, 2, a);
      break;
    case 1: // hierarchy: a tiny tree
      p.line(0, -16, -14, 6, G, 2, a);
      p.line(0, -16, 14, 6, G, 2, a);
      p.disc(0, -16, 4, G, a);
      p.disc(-14, 6, 4, G, a);
      p.disc(14, 6, 4, G, a);
      p.disc(0, 18, 3, G, a);
      break;
    case 2: // nodes: a dot grid
      for (let r = -1; r <= 1; r++) for (let q = -1; q <= 1; q++) p.disc(q * 12, r * 12, 3.2, G, a);
      break;
    case 3: // edges: two arcs
      qstroke(p, -20, 14, 0, -30, 20, 14, 0, 1, G, 2.5, a);
      qstroke(p, -14, 24, 0, -2, 14, 24, 0, 1, G, 2.5, a);
      break;
    default: { // metadata: the recorded decisions on a miniature strip
      p.line(-24, 6, 24, 6, G, 1.5, a * 0.7);
      p.line(0, -2, 0, 14, G, 2.5, a);
      for (let r = 0; r < NR; r++) {
        const sx = -24 + SCORES[r].score * 48;
        const mc = SCORES[r].degenerate ? GREY : SCORES[r].preserve ? G : ACCENT;
        p.rrect(sx - 3.5, 6 - 3.5 - 14 + (r % 2) * 0, 7, 7, 2, mc, a);
      }
      p.line(-24, 24, 24, 24, G, 1.5, a * 0.5);
    }
  }
  c.restore();
}
function drawRecord(p: Painter, t: number) {
  if (t < 88 || t > 101.5) return;
  const fold = 1 - seg(t, 100.0, 101.0);
  const c = p.ctx;
  // staging folder (dashed) and the index folder (solid)
  const d0 = easeOut(seg(t, 88.3, 89.0)), d1 = easeOut(seg(t, 88.6, 89.3));
  if (d0 > 0) {
    c.setLineDash([12, 10]);
    drawBox(p, { ...box(STAGE.x + STAGE.w / 2, STAGE.y + STAGE.h / 2, STAGE.w, STAGE.h, 20, LOCK), sw: 2.5, draw: d0, a: fold });
    c.setLineDash([]);
  }
  if (d1 > 0) drawBox(p, { ...box(INDEX.x + INDEX.w / 2, INDEX.y + INDEX.h / 2, INDEX.w, INDEX.h, 20, LOCK), sw: 3, draw: d1, a: fold });
  // cards
  for (let i = 0; i < 5; i++) {
    const cp = cardPos(i, t);
    if (cp.a <= 0.005 || cp.s <= 0.01) continue;
    let x = cp.x, y = cp.y, s = cp.s, a = cp.a;
    if (fold < 1) {
      const q = ease(1 - fold);
      x = lerp(x, ROOT.x, q);
      y = lerp(y, ROOT.y, q) - Math.sin(PI * q) * 60;
      s *= 1 - q;
      a *= 1 - q * 0.6;
    }
    drawCardFace(p, i, x, y, s, a, INK);
  }
  // ghost replay: the same five files produced again, coinciding with the first run
  const g = seg(t, GHOST0, GHOST1);
  if (g > 0 && g < 1.2 && fold >= 1) {
    for (let i = 0; i < 5; i++) {
      const q = easeOut(clamp01(seg(t, GHOST0 + i * 0.05, GHOST1 - 0.2 + i * 0.05)));
      const [x, y] = qpt(stageX(i), CARD_Y, (stageX(i) + indexX(i)) / 2, CARD_Y - 130, indexX(i), CARD_Y, q);
      const flash = 0.5 + 0.5 * bump(t, GHOST1 - 0.2 + i * 0.05, GHOST1 + 0.3 + i * 0.05);
      p.rstroke(x - CARD_W / 2 - 4, y - CARD_H / 2 - 4, CARD_W + 8, CARD_H + 8, 13, ACCENT, 2.5, flash * (1 - seg(t, GHOST1 + 0.6, GHOST1 + 1.4)));
    }
  }
  tick(p, INDEX.x + INDEX.w - 30, INDEX.y + 2, 46, easeOut(seg(t, TICK0, TICK1)), ACCENT, fold);
}

/* ── chapter 7: card faces carry the decision encoding ── */
function drawCardScores(p: Painter, t: number) {
  if (t < 103.5 || t > 118) return;
  for (let r = 0; r < NR; r++) {
    const b = BOXES[r];
    const a = seg(t, 103.6 + r * 0.1, 104.3 + r * 0.1) * (t < 116 ? 1 : 1 - seg(t, 116, 117)) * b.a;
    if (a <= 0.005 || b.h < 80) continue;
    const y = b.y + b.h / 2 - 22, x0 = b.x - b.w / 2 + 18, x1 = b.x + b.w / 2 - 18;
    p.line(x0, y, x1, y, GROUND, 2, 0.5 * a);
    p.line(lerp(x0, x1, 0.5), y - 8, lerp(x0, x1, 0.5), y + 8, GROUND, 2.5, a);
    const s = SCORES[r];
    if (!s.degenerate) p.line(x0, y, lerp(x0, x1, s.score), y, GROUND, 5, a);
    else {
      p.ctx.setLineDash([4, 5]);
      p.line(x0, y, x1, y, INK, 2, 0.6 * a);
      p.ctx.setLineDash([]);
    }
    // a level mark: one, two or three short bars for the hierarchy level this card sits at
    p.rrect(b.x - 10, b.y - b.h / 2 + 12, 20, 5, 2.5, GROUND, 0.8 * a);
  }
}
function camScale(t: number) {
  return 1 + 0.2 * easeSine(seg(t, 104.5, 107)) * (1 - easeSine(seg(t, 112.5, 115)));
}

/* ── chapter 8: blast glow, the cycle stop ── */
function drawBlast(p: Painter, t: number) {
  if (t < 119 || t > 131.5) return;
  const fade = litFade(t);
  for (const g of GLOW) {
    const q = seg(t, g.t0, g.t0 + 0.7);
    if (q <= 0 || q >= 1.3) continue;
    const e = EDGES[g.e], A = POSES[e.s], B = POSES[e.t], [cx, cy] = edgeCtl(A, B);
    // travel from the dependency (target) back to the dependent (source)
    const u1 = 1 - clamp01(q), u0 = Math.min(1, u1 + 0.22);
    qstroke(p, A.x, A.y, cx, cy, B.x, B.y, u1, u0, ACCENT, 5, 0.9 * fade);
    if (q < 1) qstroke(p, A.x, A.y, cx, cy, B.x, B.y, u1, 1, ACCENT, 3, 0.5 * fade);
    else qstroke(p, A.x, A.y, cx, cy, B.x, B.y, 0, 1, ACCENT, 3, 0.5 * fade);
  }
  for (const g of GLOW) {
    if (t < g.t0 + 0.7) continue;
    const e = EDGES[g.e], A = POSES[e.s], B = POSES[e.t], [cx, cy] = edgeCtl(A, B);
    qstroke(p, A.x, A.y, cx, cy, B.x, B.y, 0, 1, ACCENT, 3, 0.6 * fade);
  }
  // the cycle: the wave reaches S3 a second time and stops (visited)
  const cq = seg(t, CYCLE_T, CYCLE_T + 0.6);
  if (cq > 0 && cq < 1) {
    const it = POSES[8], r = lerp(44, 15, easeOut(cq));
    p.arc(it.x, it.y, r, 0, 2 * PI, ACCENT, 3, 1 - cq * 0.6);
    p.arc(it.x, it.y, r + 10, 0, 2 * PI, ACCENT, 2, 0.6 * (1 - cq));
  }
}

/* ── echoes and ripples ── */
type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; col: RGB; ripple: boolean };
const ECHOES: Echo[] = [
  { t: tLand(N - 1) + 0.15, x: CLOUD0.x, y: CLOUD0.y, w: 120, h: 120, r: 60, col: INK, ripple: true },
  ...[0, 1, 2, 3, 4].map((r) => ({ t: tHull(r) + 0.9, x: HULL[r].x, y: HULL[r].y, w: HULL[r].w, h: HULL[r].h, r: 26, col: r === 4 ? GREY : INK, ripple: false })),
  ...[0, 1, 2, 3].map((r) => ({ t: tMark(r), x: SX[r], y: STRIP_Y, w: 24, h: 24, r: 7, col: decisionCol(r), ripple: r === 1 })),
  { t: tPres(0), x: HULL[0].x, y: HULL[0].y, w: HULL[0].w, h: HULL[0].h, r: 26, col: INK, ripple: false },
  { t: tPres(3), x: HULL[3].x, y: HULL[3].y, w: HULL[3].w, h: HULL[3].h, r: 26, col: INK, ripple: false },
  ...[1, 2, 3, 4, 5].map((g) => ({ t: tSub(g) + 0.8, x: SUB[g].x, y: SUB[g].y, w: SUB[g].w, h: SUB[g].h, r: 22, col: ACCENT, ripple: g === 5 })),
  { t: 75, x: ROOT.x, y: ROOT.y, w: 52, h: 52, r: 26, col: INK, ripple: true },
  { t: JUMP1 + 0.05, x: INDEX.x + INDEX.w / 2, y: INDEX.y + INDEX.h / 2, w: INDEX.w, h: INDEX.h, r: 20, col: ACCENT, ripple: true },
  { t: TICK1, x: INDEX.x + INDEX.w - 30, y: INDEX.y + 2, w: 40, h: 40, r: 20, col: ACCENT, ripple: false },
  { t: 119.7, x: TX[8], y: TY_FILE, w: 26, h: 26, r: 13, col: ACCENT, ripple: true },
];
function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 34 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, e.col, 3, 0.8 * (1 - q));
}
function dotLight(t: number, x: number, y: number) {
  let s = 0;
  for (const e of ECHOES) if (e.ripple) s += ripple(t, e.t, e.x, e.y, x, y);
  if (t >= WAVE0 && t <= WAVE1) {
    const d = Math.abs(x - waveX(t));
    if (d < 110) s += 0.16 * (1 - d / 110);
  }
  if (t >= 121 && t <= 131.5) {
    const f = litFade(t);
    for (const k of LIT_KEYS) {
      const lt = LIT[k];
      if (t < lt) continue;
      const d = Math.hypot(x - TX[k], y - TY_FILE);
      if (d < 140) s += 0.09 * (1 - d / 140) * f * seg(t, lt, lt + 0.4);
    }
  }
  return s;
}

/* ───────────────────────────────────── draw ───────────────────────────────────── */

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => dotLight(t, x, y), ACCENT);
  for (let k = 0; k < N; k++) POSES[k] = poseAt(k, t);
  for (let i = 0; i < NB; i++) BOXES[i] = boxAt(i, t);

  const c = p.ctx, s = camScale(t);
  c.save();
  if (s !== 1) {
    c.translate(CAM.x, CAM.y);
    c.scale(s, s);
    c.translate(-CAM.x, -CAM.y);
  }

  drawPanel(p, t);
  drawCloudFrame(p, t);
  drawExternal(p, t);
  drawLanes(p, t);
  drawStrip(p, t);
  drawGauges(p, t);
  drawRecord(p, t);
  drawLinks(p, t);
  drawEdges(p, t);
  drawCrossGroup(p, t);
  for (let i = 0; i < NB; i++) drawBox(p, BOXES[i]);
  drawCardScores(p, t);
  drawFingerprints(p, t);
  for (let k = 0; k < N; k++) drawFile(p, k, POSES[k]);
  drawSprouts(p, t);
  drawWave(p, t);
  drawCrossPulses(p, t);
  drawSeedDials(p, t);
  drawBlast(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);

  c.restore();
}

export const repohive: FilmDef = {
  ground: "#b7a6f2",
  loop: LOOP,
  still: 52,
  chapters: [
    { label: "Parse", range: [0, 14] },
    { label: "Weigh", range: [14, 26] },
    { label: "Regions", range: [26, 40] },
    { label: "Score", range: [40, 56] },
    { label: "Decide", range: [56, 72] },
    { label: "Assemble", range: [72, 88] },
    { label: "Record", range: [88, 100] },
    { label: "Zoom", range: [100, 116] },
    { label: "Blast", range: [116, 132] },
  ],
  draw,
};
