// True North: nine marks a day become a direction.
// Journal → palette → year grid → habits → trends → sync → the compass settles north.
// Colour = state: ink = structure and written content · accent = 10 / a done tick / north ·
// warn = 0 (inverted for anxiety, stress and screen hours, as paletteHighRed does) · tones = furniture,
// a null day drawn as a ring.
import {
  CX, PI, Painter, clamp01, css, easeCubic, easeOutCubic, easeSine, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────────── palette and tones ───────────────────────────── */
const GROUND = hex("#14e05a");
const INK = hex("#062b14");
const ACCENT = hex("#f2ffe9");
const WARN = hex("#ff6a3d");
const PAGE = mix(GROUND, INK, 0.1);
const DEEP = mix(GROUND, INK, 0.17);
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const LIT = mix(INK, ACCENT, 0.6);
const RUST = mix(WARN, INK, 0.45);
const valCol = (v: number, inv: boolean): RGB => mix(WARN, ACCENT, inv ? 1 - v / 10 : v / 10);

/* ───────────────────────────── timeline ───────────────────────────── */
const LOOP = 80.4;
const T1 = 10, T2 = 20, T3 = 31, T4 = 42, T5 = 54, T6 = 67, T_END = 78;
const N = 9;
const BREATH = (2 * PI * 17) / LOOP;

/* ───────────────────────────── helpers ───────────────────────────── */
const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
type P = { x: number; y: number };
/** Quadratic bézier from A to B whose control point sits `bow` px off the chord's midpoint. */
function arcPos(ax: number, ay: number, bx: number, by: number, p: number, bow: number): P {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
  const mx = (ax + bx) / 2 - (dy / d) * bow, my = (ay + by) / 2 + (dx / d) * bow;
  const q = 1 - p;
  return { x: q * q * ax + 2 * q * p * mx + p * p * bx, y: q * q * ay + 2 * q * p * my + p * p * by };
}
/** Slow-in travel with one decaying overshoot near arrival. */
const easeSettle = (x: number) => {
  const u = seg(x, 0.55, 1);
  return easeCubic(x) + 0.12 * Math.sin(PI * u) * (1 - u);
};
const EASES = [easeCubic, easeSettle, easeSine];
const easeOutBack = (x: number) => {
  const u = clamp01(x), c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};
const pop = (t: number, t0: number, a = 0.18, d = 0.3) => 1 + a * Math.sin(PI * seg(t, t0, t0 + d));
const rad = (deg: number) => (deg * PI) / 180;
const bumpS = (t: number, a: number, b: number) => Math.sin(PI * seg(t, a, b));

type Tok = { x: number; y: number; w: number; h: number; r: number; rot: number; c: RGB; a: number };
const tok = (x: number, y: number, w: number, h: number, r: number, c: RGB, a = 1, rot = 0): Tok => ({ x, y, w, h, r, rot, c, a });
function blend(A: Tok, B: Tok, p: number, bow: number): Tok {
  const pos = arcPos(A.x, A.y, B.x, B.y, p, bow);
  return {
    x: pos.x, y: pos.y, w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
    rot: lerp(A.rot, B.rot, p), c: mix(A.c, B.c, p), a: lerp(A.a, B.a, p),
  };
}

/* ───────────────────────────── precomputed data ───────────────────────────── */
const TODAY = 18, CUR_M = 8;
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const INV = [false, false, true, true, true, false, false, false, false]; // anxiety, stress, screen hours
// -3 no such day · -2 future (outline) · -1 null (ring) · 0..10 value
function genYear(seed: number, lo: number, hi: number): number[][] {
  const r = seeded(seed);
  const Y: number[][] = [];
  for (let m = 0; m < 12; m++) {
    const row: number[] = [];
    for (let d = 0; d < 31; d++) {
      if (d >= DAYS_IN[m]) row.push(-3);
      else if (m > CUR_M || (m === CUR_M && d >= TODAY)) row.push(-2);
      else if (r() < 0.1) row.push(-1);
      else {
        const u = (m * 31 + d) / (CUR_M * 31 + TODAY);
        row.push(Math.max(0, Math.min(10, Math.round(lo + (hi - lo) * u + (r() - 0.5) * 4))));
      }
    }
    Y.push(row);
  }
  return Y;
}
const Y_DAY = genYear(11, 4, 8), Y_ANX = genYear(23, 6, 3), Y_MOOD = genYear(37, 4, 8);
Y_ANX[5][12] = 2; // the cell the pen clicks holds the selected value, so the click clears it

const H_ROWS = 6, H_EN0 = 5;
const HAB: boolean[][] = [];
{
  const r = seeded(5);
  for (let i = 0; i < H_ROWS; i++) {
    const row: boolean[] = [];
    for (let d = 0; d < 31; d++) row.push(i < H_EN0 && d < TODAY && r() < 0.72);
    HAB.push(row);
  }
}
const COUNT: number[] = [];
for (let d = 0; d < TODAY; d++) {
  let n = 0;
  for (let i = 0; i < H_EN0; i++) if (HAB[i][d]) n++;
  COUNT.push(n);
}
const TICK_T = [35.2, 35.7, 36.2, 36.7, 37.2, 39.5];
const T_SIXTH = 37.8;

function genMonth(seed: number, lo: number, hi: number, nulls: number[]): number[] {
  const r = seeded(seed);
  const out: number[] = [];
  for (let d = 0; d < 31; d++) {
    if (nulls.includes(d)) out.push(-1);
    else out.push(Math.max(0, Math.min(10, Math.round(lo + (hi - lo) * (d / 30) + (r() - 0.5) * 3.5))));
  }
  return out;
}
const TR_MOOD = genMonth(41, 4, 8, [7, 15]);
const TR_SLEEP = genMonth(43, 5, 8, []);
const TR_ANX = genMonth(47, 7, 3, []);
const TR_STRESS = genMonth(53, 6, 3, []);
let AVG = 0, MAXD = 0, MIND = 0, FILLED = 0;
{
  let sum = 0;
  for (let d = 0; d < 31; d++) {
    const v = TR_MOOD[d];
    if (v < 0) continue;
    sum += v;
    FILLED++;
    if (v > TR_MOOD[MAXD] || TR_MOOD[MAXD] < 0) MAXD = d;
    if (v < TR_MOOD[MIND] || TR_MOOD[MIND] < 0) MIND = d;
  }
  AVG = sum / FILLED;
}

const TODAYV = [8, 7, 2, 3, 5, 7, 6, 8, 4];
const T_TAP = 56.7;
const moodNow = (t: number) => lerp(7, 9, easeOutCubic(seg(t, T_TAP, T_TAP + 0.25)));

/* ───────────────────────────── layout ───────────────────────────── */
// chapter 0
const PG = { x: 300, y: 200, w: 710, h: 620 };
const LX = 360;
const LEN = [520, 470, 540, 430, 500, 380, 520, 460, 240];
const ly = (k: number) => 300 + k * 48;
const TYPE_SPEED = 1150;
const tdur = LEN.map((L) => L / TYPE_SPEED);
const tj: number[] = [];
for (let k = 0, s = 0.8; k < N; k++) {
  tj.push(s);
  s += tdur[k] + 0.08;
}
const SAVE = { x: 840, y: 770, w: 160, h: 44 };
const T_SAVE = 6.6, T_COMP = 6.9, T_FLY = 7.9;
const ENTRY = { x: 655, y: 492, w: 240, h: 100 };
const RAIL_X = 1100, RAIL_W = 360, RAIL_H = 110;
const railY = (j: number) => 260 + j * 140;
const MONTH_COUNT = [2, 5, 9, 3];
const TOP_CARD = { x: 1280, y: 315 };
const prevPos = (k: number): P => ({ x: 1170 + (k % 3) * 110, y: 300 + Math.floor(k / 3) * 14 });

// chapters 1–2
const PILL_Y = 250, PILL_W = 96, PILL_H = 40;
const pillX = (k: number) => 360 + k * 110;
const SW_Y = 384, SW = 64;
const swX = (i: number) => 800 + (i - 5) * 80;
const CARD1 = { x: 220, y: 495, w: 1160, h: 150 };
const CARD2 = { x: 220, y: 232, w: 1160, h: 476 };
const cellX = (d: number) => 275 + d * 36;
const rowY = (m: number) => 283 + m * 36;
const RAIL2_Y = 180;
const rail2X = (k: number) => 380 + k * 105;
const T_LOAD1 = 13.3, T_PAINT1 = 14.1, T_FLIP = 15.6, T_LOAD2 = 17.9, T_PAINT2 = 18.7;
const T_CLICK1 = 23.1, T_CLICK2 = 24.4, T_MOODTAP = 26.1, T_WIPE = 26.4;
const wipeAt = (m: number, d: number) => T_WIPE + ((m / 11 + d / 30) / 2) * 1.4;

// chapter 3
const SLOT_Y = (i: number) => 290 + i * 42;
const SLOT_BOX_X = 190, NAME_X = 215, NAME_W = 90;
const boxX = (d: number) => 351 + d * 30;
const CH3 = { base: 800, top: 640, left: 351, right: 1251, ruler: 1300 };
const colIn = (d: number) => 33.6 + d * 0.06;

// chapter 4
const px4 = (d: number) => 300 + d * (1000 / 30);
const py4 = (v: number) => 760 - v * 46;
const LINE_T = [43.6, 48.3, 48.6, 48.9];
const LINE_DUR = [2.6, 1.7, 1.7, 1.7];
const LINE_SRC = [TR_MOOD, TR_SLEEP, TR_ANX, TR_STRESS];
const LINE_C = [INK, LIT, WARN, RUST];
const LINE_W = [4, 3, 3, 3];
const XDAY = 24;
const T_CROSS = 50.3;

// chapter 5
const DEV_A = { x: 240, y: 280, w: 300, h: 520 }, DEV_B = { x: 1060, y: 280, w: 300, h: 520 };
const A_C = { x: 390, y: 440 }, B_C = { x: 1210, y: 440 };
const CELL5 = 68, PITCH5 = 84;
const cellPos = (c: P, k: number): P => ({ x: c.x + ((k % 3) - 1) * PITCH5, y: c.y + (Math.floor(k / 3) - 1) * PITCH5 });
const boxY5 = (j: number) => 614 + j * 48;
const CLOCK_A = { x: 390, y: 320 }, CLOCK_B = { x: 1210, y: 320 }, CLOCK_DOC = { x: 800, y: 350 };
const T_LOGIN = 59.0, T_GAP = 60.4, T_BJUMP = 65.6, B_LIGHT = 64.6;
const streamStart = (j: number) => 60.6 + j * 0.9;

// chapter 6
const C6 = { x: CX, y: 520 }, R6 = 250;

// the Firestore chip
const CHIP = { x: 1380, y: 160 };

/* ───────────────────────────── events ───────────────────────────── */
// every write lands on the Firestore clock; twelve writes make exactly one turn per loop
const WRITES = [9.3, 14.7, 19.3, 23.7, 25.0, 35.8, 36.3, 36.8, 37.3, 37.8, 40.1, 57.3];
const clockAngle = (t: number) => {
  let a = 0;
  for (let i = 0; i < WRITES.length; i++) a += easeOutCubic(seg(t, WRITES[i], WRITES[i] + 0.4));
  return a * (PI / 6);
};

type Pk = { t0: number; dur: number; x0: number; y0: number; x1: number; y1: number; c: RGB; bow: number };
const PK: Pk[] = [];
const pk = (land: number, dur: number, x0: number, y0: number, x1: number, y1: number, c: RGB = ACCENT, bow = 40) =>
  PK.push({ t0: land - dur, dur, x0, y0, x1, y1, c, bow });
pk(9.3, 0.45, TOP_CARD.x, TOP_CARD.y, CHIP.x, CHIP.y);
pk(14.7, 0.6, cellX(TODAY), rowY(CUR_M), CHIP.x, CHIP.y);
pk(19.3, 0.6, cellX(TODAY), rowY(CUR_M), CHIP.x, CHIP.y);
pk(23.7, 0.6, cellX(12), rowY(5), CHIP.x, CHIP.y);
pk(25.0, 0.6, cellX(12), rowY(5), CHIP.x, CHIP.y);
for (let i = 0; i < 5; i++) pk(TICK_T[i] + 0.6, 0.6, boxX(TODAY), SLOT_Y(i), CHIP.x, CHIP.y);
pk(40.1, 0.6, boxX(TODAY), SLOT_Y(5), CHIP.x, CHIP.y);
pk(LINE_T[1], 0.5, CHIP.x, CHIP.y, px4(0), py4(TR_SLEEP[0]), LIT, -40);
pk(LINE_T[2], 0.5, CHIP.x, CHIP.y, px4(0), py4(TR_ANX[0]), WARN, -40);
pk(LINE_T[3], 0.5, CHIP.x, CHIP.y, px4(0), py4(TR_STRESS[0]), RUST, -40);
pk(57.3, 0.5, cellPos(A_C, 5).x, cellPos(A_C, 5).y, 690, 620, ACCENT, 50);
pk(59.7, 0.5, CLOCK_B.x, CLOCK_B.y, CLOCK_DOC.x, CLOCK_DOC.y, LOCK, -60);
pk(T_GAP, 0.5, CLOCK_DOC.x, CLOCK_DOC.y, CLOCK_B.x, CLOCK_B.y, WARN, -60);
for (let j = 0; j < 4; j++) for (let m = 0; m < 5; m++) pk(streamStart(j) + 0.8 + m * 0.12, 0.8, 910, 440 + j * 60, 1090, boxY5(j), ACCENT, 60);

type Ec = { t: number; x: number; y: number; r0: number; g: number; c: RGB };
const EC: Ec[] = [
  { t: T_SAVE, x: SAVE.x, y: SAVE.y, r0: 26, g: 36, c: ACCENT },
  { t: T_PAINT1, x: cellX(TODAY), y: rowY(CUR_M), r0: 18, g: 30, c: ACCENT },
  { t: T_PAINT2, x: cellX(TODAY), y: rowY(CUR_M), r0: 18, g: 30, c: ACCENT },
  { t: T_CLICK1, x: cellX(12), y: rowY(5), r0: 18, g: 30, c: IDLE },
  { t: T_CLICK2, x: cellX(12), y: rowY(5), r0: 18, g: 30, c: ACCENT },
  ...TICK_T.map((tt, i) => ({ t: tt, x: boxX(TODAY), y: SLOT_Y(i), r0: 14, g: 28, c: ACCENT })),
  { t: T_SIXTH, x: SLOT_BOX_X, y: SLOT_Y(5), r0: 12, g: 30, c: INK },
  { t: T_TAP, x: cellPos(A_C, 5).x, y: cellPos(A_C, 5).y, r0: 36, g: 34, c: ACCENT },
  { t: T_BJUMP, x: CLOCK_B.x, y: CLOCK_B.y, r0: 18, g: 34, c: ACCENT },
  { t: 73.4, x: C6.x, y: C6.y - (R6 - 50), r0: 20, g: 36, c: ACCENT },
];

const RIP = [
  { t: 9.3, x: TOP_CARD.x, y: TOP_CARD.y },
  { t: T_WIPE, x: rail2X(5), y: RAIL2_Y },
  { t: T_SIXTH, x: SLOT_BOX_X, y: SLOT_Y(5) },
  { t: 57.3, x: CLOCK_DOC.x, y: CLOCK_DOC.y },
  { t: T_BJUMP, x: CLOCK_B.x, y: CLOCK_B.y },
  { t: 73.6, x: C6.x, y: C6.y },
];

/* ───────────────────────────── tracks (pen and doc) ───────────────────────────── */
type Key = Tok & { t: number; d: number; s: number };
const key = (t: number, d: number, x: number, y: number, w: number, h: number, r: number, c: RGB, a = 1, s = 0, rot = 0): Key =>
  ({ t, d, x, y, w, h, r, rot, c, a, s });
function trackAt(keys: Key[], t: number): Key {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  const A = keys[i], B = keys[i + 1];
  if (!B || t <= B.t - B.d) return { ...A };
  const e = B.d <= 0.6 ? easeOutCubic : easeSettle;
  const p = e(seg(t, B.t - B.d, B.t));
  const dist = Math.hypot(B.x - A.x, B.y - A.y);
  const bl = blend(A, B, p, (i % 2 ? -0.22 : 0.22) * dist);
  return { ...bl, t: 0, d: 0, s: lerp(A.s, B.s, p) };
}

const CARET = { w: 4, h: 30, r: 2 }, PTR = { w: 20, h: 20, r: 10 }, BRUSH = { w: 26, h: 26, r: 13 };
const PEN: Key[] = [
  key(0, 0, LX + 14, ly(0), CARET.w, CARET.h, CARET.r, ACCENT, 0),
  key(0.6, 0.3, LX + 14, ly(0), CARET.w, CARET.h, CARET.r, ACCENT, 1),
  key(5.3, 0, LX + LEN[8] + 14, ly(8), CARET.w, CARET.h, CARET.r, ACCENT, 1),
  key(6.5, 1.0, SAVE.x, SAVE.y, PTR.w, PTR.h, PTR.r, ACCENT),
  key(11.6, 1.0, 800, 440, BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(13.2, 0.6, swX(2), SW_Y, BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(14.0, 0.6, cellX(TODAY), rowY(CUR_M), BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(15.5, 0.7, pillX(2), PILL_Y, BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(17.8, 0.6, swX(8), SW_Y, BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(18.6, 0.6, cellX(TODAY), rowY(CUR_M), BRUSH.w, BRUSH.h, BRUSH.r, INK),
  key(21.8, 0.9, 1200, 780, PTR.w, PTR.h, PTR.r, ACCENT),
  key(23.0, 0.6, cellX(12), rowY(5), PTR.w, PTR.h, PTR.r, ACCENT),
  key(26.0, 0.7, rail2X(5), RAIL2_Y, PTR.w, PTR.h, PTR.r, ACCENT),
  key(29.0, 0.8, 1200, 780, PTR.w, PTR.h, PTR.r, ACCENT),
  key(33.0, 1.0, 1380, 560, PTR.w, PTR.h, PTR.r, ACCENT),
  key(35.1, 0.6, boxX(TODAY), SLOT_Y(0), PTR.w, PTR.h, PTR.r, ACCENT),
  key(35.6, 0.3, boxX(TODAY), SLOT_Y(1), PTR.w, PTR.h, PTR.r, ACCENT),
  key(36.1, 0.3, boxX(TODAY), SLOT_Y(2), PTR.w, PTR.h, PTR.r, ACCENT),
  key(36.6, 0.3, boxX(TODAY), SLOT_Y(3), PTR.w, PTR.h, PTR.r, ACCENT),
  key(37.1, 0.3, boxX(TODAY), SLOT_Y(4), PTR.w, PTR.h, PTR.r, ACCENT),
  key(37.7, 0.5, SLOT_BOX_X, SLOT_Y(5), PTR.w, PTR.h, PTR.r, ACCENT),
  key(39.4, 0.6, boxX(TODAY), SLOT_Y(5), PTR.w, PTR.h, PTR.r, ACCENT),
  key(41.0, 0.8, 1380, 560, PTR.w, PTR.h, PTR.r, ACCENT),
  key(44.0, 1.0, 1380, 820, PTR.w, PTR.h, PTR.r, ACCENT),
  key(T_CROSS, 0.6, px4(XDAY), 800, PTR.w, PTR.h, PTR.r, ACCENT),
  key(55.6, 1.0, 600, 840, PTR.w, PTR.h, PTR.r, ACCENT),
  key(56.6, 0.5, cellPos(A_C, 5).x, cellPos(A_C, 5).y, PTR.w, PTR.h, PTR.r, ACCENT),
  key(58.4, 0.8, 600, 840, PTR.w, PTR.h, PTR.r, ACCENT),
  key(68.2, 1.2, C6.x, C6.y, 26, 400, 13, ACCENT, 1, 1),
  key(80.1, 1.2, LX + 14, ly(0), CARET.w, CARET.h, CARET.r, ACCENT, 0, 0),
];
const PEN_POPS = [T_SAVE, T_LOAD1, T_PAINT1, T_FLIP, T_LOAD2, T_PAINT2, T_CLICK1, T_CLICK2, T_MOODTAP, ...TICK_T, T_SIXTH, T_TAP];

function penAt(t: number): Key {
  const s = trackAt(PEN, t);
  if (t > 0.6 && t < 5.3) {
    let cur = 0;
    for (let k = 0; k < N; k++) if (t >= tj[k]) cur = k;
    s.x = LX + LEN[cur] * seg(t, tj[cur], tj[cur] + tdur[cur]) + 14;
    s.y = ly(cur);
  }
  return s;
}

const DOC: Key[] = [
  key(0, 0, CHIP.x, CHIP.y, 52, 52, 26, PAGE),
  key(55.8, 1.0, 800, 500, 280, 400, 28, PAGE),
  key(68.0, 1.2, C6.x, C6.y, 40, 40, 20, INK),
  key(79.6, 1.4, CHIP.x, CHIP.y, 52, 52, 26, PAGE),
];

/* ───────────────────────────── roles: the nine marks ───────────────────────────── */
function roleJournal(k: number, t: number): Tok {
  const w = Math.max(14, LEN[k] * seg(t, tj[k], tj[k] + tdur[k]));
  const end = tj[k] + tdur[k];
  const line = tok(LX + w / 2, ly(k), w, 14, 7, mix(INK, GREY, seg(t, end, end + 0.5)), seg(t, tj[k] - 0.05, tj[k] + 0.1));
  if (t < T_COMP) return line;
  const stack = tok(ENTRY.x, ENTRY.y - 32 + k * 8, 200, 6, 3, INK, 1);
  if (t < T_FLY) return blend(line, stack, easeCubic(seg(t, T_COMP + k * 0.03, T_COMP + 0.7 + k * 0.03)), 0);
  const pv = prevPos(k);
  const land = tok(pv.x, pv.y, 100, 6, 3, INK, 1);
  return blend(stack, land, EASES[k % 3](seg(t, T_FLY + k * 0.03, T_FLY + 1.0 + k * 0.03)), -110);
}

const activeOf = (k: number, t: number) =>
  k === 0 ? 1 - seg(t, T_FLIP, T_FLIP + 0.3)
    : k === 2 ? seg(t, T_FLIP, T_FLIP + 0.3) - seg(t, T_MOODTAP, T_MOODTAP + 0.3)
      : k === 5 ? seg(t, T_MOODTAP, T_MOODTAP + 0.3) : 0;
const tapScale = (k: number, t: number) => (k === 2 ? pop(t, T_FLIP, 0.14) : k === 5 ? pop(t, T_MOODTAP, 0.14) : 1);

function rolePalette(k: number, t: number): Tok {
  const s = tapScale(k, t);
  return tok(pillX(k), PILL_Y, PILL_W * s, PILL_H * s, PILL_H / 2, mix(LOCK, INK, activeOf(k, t)));
}
function roleYear(k: number, t: number): Tok {
  const s = tapScale(k, t);
  return tok(rail2X(k), RAIL2_Y, 80 * s, 30 * s, 15, mix(LOCK, INK, activeOf(k, t)));
}

const hMax = (t: number) => 5 + easeCubic(seg(t, 38.2, 38.9));
function countAt(d: number, t: number): number {
  if (d < TODAY) return COUNT[d] * easeOutCubic(seg(t, colIn(d), colIn(d) + 0.4));
  let n = 0;
  for (let i = 0; i < H_ROWS; i++) n += easeOutBack(seg(t, TICK_T[i], TICK_T[i] + 0.45));
  return n;
}
const h3y = (c: number, t: number) => CH3.base - (c / hMax(t)) * (CH3.base - CH3.top);
function roleHabits(k: number, t: number): Tok {
  const d = 10 + k, c = countAt(d, t);
  return tok(boxX(d), h3y(c, t), 16, 16, 8, mix(INK, ACCENT, c / hMax(t)));
}

const reach = (j: number, t: number) => 30 * easeSine(seg(t, LINE_T[j], LINE_T[j] + LINE_DUR[j]));
function roleTrends(k: number, t: number): Tok {
  const d = 22 + k, v = TR_MOOD[d];
  const tPass = LINE_T[0] + (d / 30) * LINE_DUR[0];
  const s = pop(t, tPass, 0.3, 0.4);
  return tok(px4(d), py4(v), 18 * s, 18 * s, 9 * s, valCol(v, false));
}

function roleSync(k: number, t: number): Tok {
  const c = cellPos(A_C, k);
  const v = k === 5 ? moodNow(t) : TODAYV[k];
  const s = k === 5 ? pop(t, T_TAP, 0.16) : 1;
  return tok(c.x, c.y, CELL5 * s, CELL5 * s, 16, valCol(v, INV[k]));
}

function roleNorth(k: number, t: number): Tok {
  const ang = rad(k * 40), rr = R6 - 50;
  const lit = k === 0 ? easeOutCubic(seg(t, 73.4, 73.8)) : 0;
  return tok(C6.x + rr * Math.sin(ang), C6.y - rr * Math.cos(ang), 12, 36, 6, mix(INK, ACCENT, lit), 1, ang);
}

type Scene = { t: number; fn: (k: number, t: number) => Tok; dur: number; stag: number; bow: number };
const SCENES: Scene[] = [
  { t: 0, fn: roleJournal, dur: 0, stag: 0, bow: 0 },
  { t: T1, fn: rolePalette, dur: 1.1, stag: 0.06, bow: -90 },
  { t: T2, fn: roleYear, dur: 1.0, stag: 0.05, bow: 40 },
  { t: T3, fn: roleHabits, dur: 1.2, stag: 0.07, bow: 120 },
  { t: T4, fn: roleTrends, dur: 1.1, stag: 0.06, bow: -80 },
  { t: T5 + 0.8, fn: roleSync, dur: 1.2, stag: 0.07, bow: -100 },
  { t: T6, fn: roleNorth, dur: 1.3, stag: 0.08, bow: 110 },
  { t: T_END, fn: (k, t) => roleJournal(k, t - LOOP), dur: 1.4, stag: 0.05, bow: -60 },
];
function tokenState(k: number, t: number): Tok {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (i === 0) return sc.fn(k, t);
  const st = sc.stag * k;
  const p = EASES[k % 3](seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(k, t);
  const A = SCENES[i - 1].fn(k, sc.t), B = sc.fn(k, sc.t + st + sc.dur);
  return blend(A, B, p, sc.bow * (k % 2 ? 1 : 0.7));
}

/* ───────────────────────────── camera ───────────────────────────── */
function cam(t: number) {
  const push = (a: number, b: number, c: number, d: number, S: number) => (S - 1) * (easeSine(seg(t, a, b)) - easeSine(seg(t, c, d)));
  let s = 1, x = CX, y = 500;
  const p1 = push(15.4, 16.6, 19.0, 19.9, 1.08);
  const p2 = push(60.0, 61.5, 65.6, 66.6, 1.06);
  const p3 = push(72.4, 73.6, 76.6, 77.6, 1.1);
  if (p1 > 0) { s += p1; x = 800; y = 440; }
  if (p2 > 0) { s += p2; x = 1000; y = 520; }
  if (p3 > 0) { s += p3; x = C6.x; y = C6.y; }
  return { x, y, s };
}

/* ───────────────────────────── furniture painters ───────────────────────────── */
function typedFrac(t: number) {
  let a = 0, b = 0;
  for (let k = 0; k < N; k++) {
    a += LEN[k] * seg(t, tj[k], tj[k] + tdur[k]);
    b += LEN[k];
  }
  return (a / b) * (1 - seg(t, T_COMP, T_COMP + 0.3));
}

function drawJournal(p: Painter, t0: number) {
  const a = t0 < T1 ? 1 - seg(t0, T1, T1 + 0.7) : seg(t0, 79.0, 80.0);
  if (a <= 0.005) return;
  // after the compass, the page comes back in its t = 0 state (empty, rail folded)
  const t = t0 < T1 + 1 ? t0 : t0 - LOOP;
  p.rrect(PG.x, PG.y, PG.w, PG.h, 26, PAGE, a);
  p.rrect(LX, 236, 160, 12, 6, LOCK, a);
  p.rrect(PG.x + PG.w - 150, 232, 90, 20, 10, DEEP, a);
  p.disc(PG.x + PG.w - 72, 242, 6, ACCENT, a);
  p.line(LX, 270, PG.x + PG.w - 60, 270, EDGE, 2, a);
  // character counter: a bar that grows with the typing and resets on save
  p.rrect(LX, 766, 300, 8, 4, EDGE, a);
  const tf = typedFrac(t);
  if (tf > 0) p.rrect(LX, 766, 300 * tf, 8, 4, LOCK, a);
  // save button
  const pressed = seg(t, T_SAVE, T_SAVE + 0.3);
  const s = pop(t, T_SAVE, 0.12);
  p.rrect(SAVE.x - (SAVE.w * s) / 2, SAVE.y - (SAVE.h * s) / 2, SAVE.w * s, SAVE.h * s, 22, mix(LOCK, ACCENT, pressed), a);
  p.rrect(SAVE.x - 40, SAVE.y - 4, 80, 8, 4, mix(ACCENT, INK, pressed), a);
  // entries rail: past months, newest first, each with its count bar; it breathes while idle
  const ra = a;
  if (ra > 0) {
    for (let j = 0; j < 4; j++) {
      const ex = 1 - 0.04 * bumpS(t, 7.6 + j * 0.06, 8.4 + j * 0.06);
      if (ex <= 0) continue;
      const x = lerp(PG.x + PG.w - 40, RAIL_X, ex), w = Math.max(40, RAIL_W * ex), y = railY(j);
      p.rrect(x, y, w, RAIL_H, 18, PAGE, ra * ex);
      p.rrect(x + 20, y + 20, 120 * ex, 10, 5, LOCK, ra * ex);
      p.rrect(x + 20, y + 88, 320 * ex, 10, 5, EDGE, ra * ex);
      const cnt = MONTH_COUNT[j] + (j === 0 ? easeOutCubic(seg(t, 8.9, 9.3)) : 0);
      p.rrect(x + 20, y + 88, 320 * ex * (cnt / 10), 10, 5, INK, ra * ex);
    }
  }
  // the entry card: grows around the compressing lines, then flies to the top month card
  if (t >= T_COMP && t < T_FLY + 1.4) {
    const grow = easeOutCubic(seg(t, T_COMP, T_COMP + 0.6));
    const fly = easeSettle(seg(t, T_FLY, T_FLY + 1.0));
    const pos = arcPos(ENTRY.x, ENTRY.y, TOP_CARD.x, TOP_CARD.y, fly, -110);
    const w = lerp(ENTRY.w * grow, RAIL_W - 20, fly), h = lerp(ENTRY.h * grow, RAIL_H - 20, fly);
    const ca = a * (1 - seg(t, T_FLY + 1.0, T_FLY + 1.4));
    if (w > 2) {
      p.rrect(pos.x - w / 2, pos.y - h / 2, w, h, 16, DEEP, ca);
      p.rstroke(pos.x - w / 2, pos.y - h / 2, w, h, 16, LOCK, 2, ca);
    }
  }
}

const ABSENT = { v: -3, c: EDGE, s: 1 };
function cellState(m: number, d: number, t: number): { v: number; c: RGB; s: number } {
  if (d >= DAYS_IN[m]) return ABSENT;
  const tw = wipeAt(m, d);
  const w = seg(t, tw, tw + 0.3);
  let s = 1 + 0.15 * Math.sin(PI * w);
  if (m === CUR_M && d === TODAY) s *= pop(t, T_PAINT1, 0.2) * pop(t, T_PAINT2, 0.2);
  if (m === 5 && d === 12) s *= pop(t, T_CLICK1, 0.15) * pop(t, T_CLICK2, 0.15);
  if (w >= 0.5) {
    const v = Y_MOOD[m][d];
    return { v, c: v >= 0 ? valCol(v, false) : EDGE, s };
  }
  const f = seg(t, T_FLIP, T_FLIP + 0.5);
  let vd = Y_DAY[m][d], va = Y_ANX[m][d];
  if (m === CUR_M && d === TODAY) {
    vd = t >= T_PAINT1 ? 8 : -2;
    va = t >= T_PAINT2 ? 2 : -2;
  }
  if (m === 5 && d === 12 && t >= T_CLICK1 && t < T_CLICK2) va = -1;
  if (f <= 0) return { v: vd, c: vd >= 0 ? valCol(vd, false) : EDGE, s };
  if (f >= 1) return { v: va, c: va >= 0 ? valCol(va, true) : EDGE, s };
  if (vd >= 0 && va >= 0) return { v: va, c: mix(valCol(vd, false), valCol(va, true), f), s };
  return f < 0.5 ? { v: vd, c: vd >= 0 ? valCol(vd, false) : EDGE, s } : { v: va, c: va >= 0 ? valCol(va, true) : EDGE, s };
}
function drawCell(p: Painter, x: number, y: number, v: number, c: RGB, size: number, a: number) {
  if (a <= 0.005 || v === -3 || size < 1) return;
  const h = size / 2;
  if (v >= 0) p.rrect(x - h, y - h, size, size, size * 0.27, c, a);
  else if (v === -1) p.rstroke(x - h + 2, y - h + 2, size - 4, size - 4, h, IDLE, 2.5, a);
  else p.rstroke(x - h, y - h, size, size, size * 0.27, EDGE, 1.5, a);
}

function drawSwatches(p: Painter, t: number) {
  const a = seg(t, 11.3, 11.6);
  if (a <= 0 || t > T2 + 1.3) return;
  const p0 = { x: pillX(0), y: PILL_Y }, p2 = { x: pillX(2), y: PILL_Y };
  // the selected option, by slot: palette[0] on open and after every tracker switch
  const slot = t < T_LOAD1 ? 0 : t < T_FLIP ? 2 : t < T_LOAD2 ? 0 : 8;
  const slotPrev = t < T_LOAD1 ? 0 : t < T_FLIP ? 0 : t < T_LOAD2 ? 2 : 0;
  const tSw = t < T_LOAD1 ? -1 : t < T_FLIP ? T_LOAD1 : t < T_LOAD2 ? T_FLIP : T_LOAD2;
  for (let i = 0; i <= 10; i++) {
    const u = easeOutCubic(seg(t, 11.4 + i * 0.04, 12.0 + i * 0.04));
    if (u <= 0) continue;
    let pos = arcPos(p0.x, p0.y, swX(i), SW_Y, u, -40);
    const f = EASES[i % 3](seg(t, 16.0 + i * 0.03, 16.9 + i * 0.03));
    if (f > 0) pos = arcPos(swX(i), SW_Y, swX(10 - i), SW_Y, f, ((i < 5 ? -1 : 1) * 70 * Math.abs(i - 5)) / 5);
    const col = easeCubic(seg(t, T2 + i * 0.03, T2 + 0.8 + i * 0.03));
    if (col > 0) pos = arcPos(pos.x, pos.y, p2.x, p2.y, col, 40);
    const s = lerp(0.3, 1, u) * (1 - 0.7 * col);
    const al = a * u * (1 - col);
    p.rrect(pos.x - (SW * s) / 2, pos.y - (SW * s) / 2, SW * s, SW * s, 14 * s, valCol(10 - i, false), al);
  }
  const ra = a * seg(t, 12.0, 12.4) * (1 - seg(t, T2, T2 + 0.3));
  if (ra > 0) {
    const q = tSw < 0 ? 1 : easeCubic(seg(t, tSw, tSw + 0.25));
    const x = lerp(swX(slotPrev), swX(slot), q);
    const s = tSw < 0 ? 1 : pop(t, tSw, 0.1);
    p.rstroke(x - 40 * s, SW_Y - 40 * s, 80 * s, 80 * s, 22, INK, 3, ra);
  }
}

function drawUnderline(p: Painter, t: number) {
  const a = seg(t, 11.4, 11.8) * (1 - seg(t, T3, T3 + 0.8));
  if (a <= 0) return;
  const cur = t < T_FLIP ? 0 : t < T_MOODTAP ? 2 : 5;
  const prev = cur === 5 ? 2 : 0;
  const tSw = cur === 2 ? T_FLIP : cur === 5 ? T_MOODTAP : -1;
  const A = tokenState(prev, t), B = tokenState(cur, t);
  const q = tSw < 0 ? 1 : easeCubic(seg(t, tSw, tSw + 0.4));
  const x = lerp(A.x, B.x, q), y = lerp(A.y, B.y, q), w = lerp(A.w, B.w, q) * 0.7, h = lerp(A.h, B.h, q);
  p.rrect(x - w / 2, y + h / 2 + 6, w, 4, 2, ACCENT, a);
}

function drawGrid(p: Painter, t: number) {
  const a = seg(t, 11.8, 12.4) * (1 - seg(t, T3 + 0.2, T3 + 1.0));
  if (a <= 0) return;
  const g = easeCubic(seg(t, 20.4, 21.4));
  const cy = lerp(CARD1.y, CARD2.y, g), ch = lerp(CARD1.h, CARD2.h, g);
  p.rrect(CARD1.x, cy, CARD1.w, ch, 26, PAGE, a);
  for (let d = 0; d < 31; d++) p.disc(cellX(d), cy + 20, 2.5, d === TODAY ? ACCENT : LOCK, a);
  const col = seg(t, T3, T3 + 1.0);
  for (let m = 0; m < 12; m++) {
    const dm = Math.abs(m - CUR_M);
    const rin = m === CUR_M ? 1 : easeOutCubic(seg(t, 21.4 + dm * 0.12, 21.9 + dm * 0.12));
    if (rin <= 0) continue;
    const yRow = lerp(rowY(CUR_M), rowY(m), rin);
    p.rrect(236, yRow - 6, 12, 12, 3, m === CUR_M ? INK : LOCK, a * rin * (1 - col));
    for (let d = 0; d < 31; d++) {
      const st = cellState(m, d, t);
      if (st.v === -3) continue;
      let ca = a * (m === CUR_M ? seg(t, 12.2 + d * 0.02, 12.5 + d * 0.02) : rin);
      let x = cellX(d), y = yRow, size = 30 * st.s;
      if (col > 0) {
        const cq = easeCubic(seg(t, T3 + (m / 11) * 0.3 + (d / 30) * 0.2, T3 + 0.6 + (m / 11) * 0.3 + (d / 30) * 0.2));
        const tgt = roleYear(Math.floor((d * 9) / 31), T3);
        const pos = arcPos(x, y, tgt.x, tgt.y, cq, 30);
        x = pos.x;
        y = pos.y;
        ca *= 1 - cq;
        size *= 1 - 0.5 * cq;
      }
      drawCell(p, x, y, st.v, st.c, size, ca);
    }
  }
}

function drawTick(p: Painter, x: number, y: number, q: number, c: RGB, a: number) {
  if (q <= 0) return;
  const q1 = clamp01(q / 0.4), q2 = clamp01((q - 0.4) / 0.6);
  p.line(x - 6, y, lerp(x - 6, x - 2, q1), lerp(y, y + 4, q1), c, 3, a);
  if (q2 > 0) p.line(x - 2, y + 4, lerp(x - 2, x + 7, q2), lerp(y + 4, y - 5, q2), c, 3, a);
}

function drawHabits(p: Painter, t: number) {
  const a = seg(t, 32.0, 32.6) * (1 - seg(t, T4 + 0.9, T4 + 1.1));
  if (a <= 0) return;
  const col = easeCubic(seg(t, T4, T4 + 1.0));
  const fa = a * (1 - col);
  // settings column: ten slots, five enabled
  for (let i = 0; i < 10; i++) {
    const u = easeOutCubic(seg(t, 32.2 + i * 0.05, 32.8 + i * 0.05));
    if (u <= 0) continue;
    const enF = i < H_EN0 ? 1 : i === 5 ? easeOutCubic(seg(t, T_SIXTH, T_SIXTH + 0.3)) : 0;
    const y = lerp(SLOT_Y(i), CH3.base, col), x0 = lerp(80, 0, u);
    const sa = fa * u;
    const bs = i === 5 ? pop(t, T_SIXTH, 0.25) : 1;
    p.rstroke(SLOT_BOX_X - 8 * bs - x0, y - 8 * bs, 16 * bs, 16 * bs, 4, LOCK, 2, sa);
    if (enF > 0) p.rrect(SLOT_BOX_X - 5 * enF - x0, y - 5 * enF, 10 * enF, 10 * enF, 3, INK, sa);
    p.rrect(NAME_X - x0, y - 5, NAME_W, 10, 5, mix(EDGE, INK, enF), sa);
  }
  // boxes: 31 per enabled row, ticks draw themselves
  for (let i = 0; i < H_ROWS; i++) {
    const tRow = i < H_EN0 ? 32.8 + i * 0.08 : T_SIXTH + 0.1;
    if (t < tRow) continue;
    const by = lerp(SLOT_Y(i), CH3.base, col);
    for (let d = 0; d < 31; d++) {
      const bq = easeOutCubic(seg(t, tRow + d * 0.015, tRow + 0.4 + d * 0.015));
      if (bq <= 0) break;
      const x = lerp(NAME_X + NAME_W, boxX(d), bq);
      const ba = fa * bq;
      const fut = d > TODAY;
      p.rstroke(x - 11, by - 11, 22, 22, 5, fut ? EDGE : LOCK, 2, ba);
      const done = d < TODAY ? HAB[i][d] : d === TODAY;
      if (!done) continue;
      const tt = d < TODAY ? colIn(d) + i * 0.03 : TICK_T[i];
      if (t >= tt) drawTick(p, x, by, easeOutCubic(seg(t, tt, tt + 0.3)), ACCENT, ba);
    }
  }
  // completion chart under the table, aligned to the day columns
  const ca = a * seg(t, 32.6, 33.2) * (1 - seg(t, T4, T4 + 0.6));
  if (ca <= 0) return;
  const m = hMax(t);
  for (let lvl = 0; lvl <= 6; lvl++) {
    const la = ca * (lvl === 6 ? seg(t, 38.2, 38.9) : 1);
    const y = h3y(lvl, t);
    p.line(CH3.left - 12, y, CH3.right + 12, y, lvl === 0 ? LOCK : EDGE, lvl === 0 ? 3 : 1.5, la);
    p.line(CH3.ruler, y, CH3.ruler + 14, y, LOCK, 2, la);
  }
  p.line(CH3.ruler, h3y(0, t), CH3.ruler, h3y(m, t), LOCK, 2, ca);
  for (let d = 0; d < TODAY; d++) {
    const q = easeOutCubic(seg(t, colIn(d + 1), colIn(d + 1) + 0.4));
    if (q <= 0) break;
    const x0 = boxX(d), y0 = h3y(countAt(d, t), t);
    const x1 = lerp(x0, boxX(d + 1), q), y1 = lerp(y0, h3y(countAt(d + 1, t), t), q);
    p.line(x0, y0, x1, y1, INK, 4, ca);
  }
  for (let d = 0; d < 10; d++) {
    const q = seg(t, colIn(d), colIn(d) + 0.3);
    if (q > 0) p.disc(boxX(d), h3y(countAt(d, t), t), 5 * q, INK, ca);
  }
}

/** One tracker line over the month, with the thin bridging spans of `spanGaps`. */
function drawLine(p: Painter, src: number[], c: RGB, w: number, rc: number, lo: number, a: number) {
  if (a <= 0 || rc <= 0) return;
  let i = -1;
  for (let d = 0; d < 31; d++) {
    if (src[d] < 0) continue;
    if (i >= 0) {
      if (d >= lo && i <= rc) {
        const x0 = px4(i), y0 = py4(src[i]), x1 = px4(d), y1 = py4(src[d]);
        const q = clamp01((rc - i) / (d - i));
        const gap = d - i > 1;
        p.line(x0, y0, lerp(x0, x1, q), lerp(y0, y1, q), gap ? LIT : c, gap ? 2 : w, a);
      }
    }
    i = d;
  }
}

function drawTrends(p: Painter, t: number) {
  const a = seg(t, 42.6, 43.2) * (1 - seg(t, T5 + 0.4, T5 + 1.0));
  if (a <= 0) return;
  const out = 1 - seg(t, T5, T5 + 0.6);
  for (let lvl = 0; lvl <= 10; lvl++) {
    const la = a * seg(t, 42.8 + lvl * 0.04, 43.1 + lvl * 0.04) * out;
    p.line(290, py4(lvl), 1310, py4(lvl), lvl === 0 ? LOCK : EDGE, lvl === 0 ? 3 : 1.5, la);
  }
  const lo = 22 * easeCubic(seg(t, T5, T5 + 0.8));
  for (let j = 3; j >= 0; j--) {
    const la = a * (j === 0 ? 1 : 1 - seg(t, T5, T5 + 0.5));
    drawLine(p, LINE_SRC[j], LINE_C[j], LINE_W[j], reach(j, t), lo, la);
  }
  const r0 = reach(0, t);
  // null days: rings on the bridging span; filled days before the hero points: small ink discs
  for (let d = 0; d < 22; d++) {
    if (d < lo || r0 < d) continue;
    const v = TR_MOOD[d];
    const q = seg(r0, d, d + 0.6);
    if (v < 0) {
      const y = (py4(TR_MOOD[d - 1]) + py4(TR_MOOD[d + 1])) / 2;
      p.arc(px4(d), y, 7, 0, 2 * PI, IDLE, 2.5, a * q);
    } else p.disc(px4(d), py4(v), 5 * q, INK, a);
  }
  // stats
  for (let j = 0; j < 4; j++) {
    const ta = a * seg(t, 46.4 + j * 0.3, 46.8 + j * 0.3) * out;
    if (ta <= 0) continue;
    const x = 300 + j * 260;
    const s = pop(t, 46.4 + j * 0.3, 0.08, 0.4);
    p.rrect(x + 110 - 110 * s, 846 - 30 * s, 220 * s, 60 * s, 14, PAGE, ta);
    if (j === 0) {
      p.rrect(x + 20, 843, 180, 6, 3, EDGE, ta);
      p.rrect(x + 20, 843, 180 * (AVG / 10), 6, 3, INK, ta);
      const y = py4(AVG);
      for (let xx = 300; xx < 1300; xx += 24) p.line(xx, y, xx + 12, y, LOCK, 2, ta);
    } else if (j === 1) {
      p.disc(x + 110, 836, 8, ACCENT, ta);
      p.rrect(x + 70, 858, 80, 4, 2, EDGE, ta);
      p.arc(px4(MAXD), py4(TR_MOOD[MAXD]), 15, 0, 2 * PI, ACCENT, 3, ta);
    } else if (j === 2) {
      p.rrect(x + 70, 824, 80, 4, 2, EDGE, ta);
      p.disc(x + 110, 856, 8, WARN, ta);
      p.arc(px4(MIND), py4(TR_MOOD[MIND]), 15, 0, 2 * PI, WARN, 3, ta);
    } else {
      p.rrect(x + 20, 843, 180, 6, 3, EDGE, ta);
      p.rrect(x + 20, 843, 180 * (FILLED / 31), 6, 3, INK, ta);
      for (let d = 0; d < 31; d++) p.disc(x + 23 + d * 5.8, 860, 1.5, TR_MOOD[d] < 0 ? WARN : LOCK, ta);
    }
  }
  // crosshair reading one day across every line
  const ha = a * seg(t, T_CROSS, T_CROSS + 0.3) * (1 - seg(t, T5, T5 + 0.4));
  if (ha > 0) {
    const y1 = lerp(800, py4(10), easeOutCubic(seg(t, T_CROSS, T_CROSS + 0.5)));
    p.line(px4(XDAY), 800, px4(XDAY), y1, LOCK, 2, ha);
    for (let j = 0; j < 4; j++) {
      const q = easeOutBack(seg(t, T_CROSS + 0.3 + j * 0.08, T_CROSS + 0.6 + j * 0.08));
      if (q <= 0) continue;
      const y = py4(LINE_SRC[j][XDAY]);
      p.disc(px4(XDAY), y, 9 * q, INK, ha);
      p.disc(px4(XDAY), y, 6 * q, LINE_C[j], ha);
    }
  }
}

function drawClock(p: Painter, x: number, y: number, r: number, ang: number, a: number, gapTo = -1, ga = 0) {
  if (a <= 0 || r < 3) return;
  p.arc(x, y, r, 0, 2 * PI, LOCK, 3, a);
  const hx = x + (r - 5) * Math.sin(ang), hy = y - (r - 5) * Math.cos(ang);
  p.line(x, y, hx, hy, INK, 3, a);
  p.disc(hx, hy, 3.5, ACCENT, a);
  if (ga > 0 && gapTo > ang) p.arc(x, y, r + 7, ang - PI / 2, gapTo - ang, WARN, 3, a * ga);
}

function drawDevice(p: Painter, dev: { x: number; y: number; w: number; h: number }, outline: RGB, col: number, a: number) {
  const cx = dev.x + dev.w / 2, cy = dev.y + dev.h / 2;
  const s = 1 - 0.8 * col;
  const x = lerp(cx, C6.x, col) - (dev.w * s) / 2, y = lerp(cy, C6.y, col) - (dev.h * s) / 2;
  p.rrect(x, y, dev.w * s, dev.h * s, 28 * s, PAGE, a);
  p.rstroke(x, y, dev.w * s, dev.h * s, 28 * s, outline, 2, a);
  p.rrect(x + (dev.w * s) / 2 - 30 * s, y + 14 * s, 60 * s, 6 * s, 3, LOCK, a);
}

function drawSync(p: Painter, t: number) {
  const a = seg(t, 54.8, 55.6) * (1 - seg(t, T6 + 0.3, T6 + 1.0));
  if (a <= 0) return;
  const col = easeCubic(seg(t, T6, T6 + 1.0));
  const grow = easeOutBack(seg(t, 54.8, 55.6));
  const ia = a * (1 - col);
  // device A: already synced; its nine cells are the hero marks
  drawDevice(p, DEV_A, LOCK, col, a * grow);
  if (ia > 0) {
    drawClock(p, CLOCK_A.x, CLOCK_A.y, 16, clockAngle(t), ia);
    for (let j = 0; j < 4; j++) {
      const fill = j === 3 ? (t < 57.4 ? 1 : t < 58.2 ? 1 - easeCubic(seg(t, 57.4, 57.9)) : easeOutCubic(seg(t, 58.2, 58.8))) : 1;
      p.rrect(270, boxY5(j) - 14, 240, 28, 8, DEEP, ia);
      if (fill > 0) p.rrect(282, boxY5(j) - 5, 192 * fill, 10, 5, INK, ia);
    }
  }
  // device B: logs in, finds the clock ahead, receives the four streams
  const login = seg(t, T_LOGIN, T_LOGIN + 0.4);
  drawDevice(p, DEV_B, mix(LOCK, INK, login), col, a * grow * (0.75 + 0.25 * login));
  if (ia > 0) {
    const bAng = clockAngle(57.0);
    const jump = easeOutBack(seg(t, T_BJUMP, T_BJUMP + 0.4));
    const ga = seg(t, T_GAP, T_GAP + 0.3) * (1 - seg(t, T_BJUMP, T_BJUMP + 0.3));
    drawClock(p, CLOCK_B.x, CLOCK_B.y, 16, lerp(bAng, clockAngle(t), jump), ia, clockAngle(t), ga);
    for (let j = 0; j < 4; j++) {
      const land = streamStart(j) + 0.8;
      const fill = easeOutCubic(seg(t, land, land + 0.6));
      p.rrect(1090, boxY5(j) - 14, 240, 28, 8, DEEP, ia);
      if (fill > 0) p.rrect(1102, boxY5(j) - 5, 192 * fill, 10, 5, INK, ia);
    }
    for (let k = 0; k < N; k++) {
      const c = cellPos(B_C, k);
      const lit = easeOutBack(seg(t, B_LIGHT + k * 0.08, B_LIGHT + 0.4 + k * 0.08));
      const h = CELL5 / 2;
      if (lit < 1) p.rstroke(c.x - h, c.y - h, CELL5, CELL5, 16, EDGE, 1.5, ia * (1 - lit));
      if (lit > 0) {
        const v = k === 5 ? 9 : TODAYV[k];
        const s = lerp(0.6, 1, lit) * h;
        p.rrect(c.x - s, c.y - s, 2 * s, 2 * s, 16, valCol(v, INV[k]), ia * clamp01(lit));
      }
    }
  }
}

function drawNorth(p: Painter, t: number) {
  const a = seg(t, 67.8, 68.4) * (1 - seg(t, 78.4, 79.4));
  if (a <= 0) return;
  const { x, y } = C6;
  p.arc(x, y, R6, -PI / 2, 2 * PI * easeSine(seg(t, 68.0, 69.2)), LOCK, 3, a);
  const ia = a * seg(t, 69.0, 69.6);
  p.arc(x, y, 60, 0, 2 * PI, EDGE, 1.5, ia);
  for (let i = 0; i < 36; i++) {
    const ta = a * seg(t, 68.4 + i * 0.04, 68.7 + i * 0.04);
    if (ta <= 0) break;
    const th = rad(i * 10), s = Math.sin(th), co = Math.cos(th);
    const major = i % 9 === 0, mid = i % 3 === 0;
    const len = (major ? 28 : mid ? 18 : 10) * ta, r1 = R6 - 14;
    p.line(x + r1 * s, y - r1 * co, x + (r1 - len) * s, y - (r1 - len) * co, major ? INK : LOCK, major ? 3 : 2, ta);
  }
  for (let i = 0; i < 4; i++) {
    const th = rad(i * 45), s = Math.sin(th), co = Math.cos(th), L = R6 - 70;
    if (i % 2 === 0) p.line(x - L * s, y + L * co, x + L * s, y - L * co, EDGE, 1.5, ia);
    else for (let d = -L; d < L; d += 14) p.line(x + d * s, y - d * co, x + (d + 6) * s, y - (d + 6) * co, EDGE, 1.5, ia);
  }
  for (let i = 0; i < 4; i++) {
    const th = rad(i * 90);
    p.disc(x + (R6 + 30) * Math.sin(th), y - (R6 + 30) * Math.cos(th), i === 0 ? 7 : 5, i === 0 ? mix(INK, ACCENT, seg(t, 73.4, 73.8)) : GREY, ia);
  }
  for (const t0 of [73.8, 76.0]) {
    const q = seg(t, t0, t0 + 1.8);
    if (q > 0 && q < 1) p.arc(x, y, R6 * (1 + 0.8 * easeOutCubic(q)), 0, 2 * PI, ACCENT, 3, a * 0.6 * (1 - q));
  }
}

/* ───────────────────────────── cast and fx painters ───────────────────────────── */
function drawDoc(p: Painter, t: number) {
  const d = trackAt(DOC, t);
  const c = p.ctx;
  const by = 1.2 * Math.sin(t * BREATH + 2.1);
  c.save();
  c.translate(d.x, d.y + by);
  p.rrect(-d.w / 2, -d.h / 2, d.w, d.h, d.r, d.c, d.a);
  const chipness = clamp01((d.h - 40) / 12);
  if (d.h < 60) p.rstroke(-d.w / 2, -d.h / 2, d.w, d.h, d.r, LOCK, 2, chipness);
  if (chipness < 1) p.disc(0, 0, 6 * (1 - chipness), ACCENT, 1);
  const cy = -Math.max(0, d.h / 2 - 50);
  const r = Math.min(20, d.w * 0.4) * (0.6 + 0.4 * chipness);
  drawClock(p, 0, cy, r * (d.h > 60 ? 1.2 : 1), clockAngle(t), chipness);
  // four section bars: journal, habits, moments, trackers
  const ba = seg(t, 55.4, 56.0) * (1 - seg(t, T6, T6 + 0.6)) * clamp01((d.h - 300) / 100);
  if (ba > 0) {
    for (let j = 0; j < 4; j++) {
      const y = -60 + j * 60;
      const s = pop(t, streamStart(j), 0.1) * (j === 3 ? pop(t, 57.3, 0.12) : 1);
      p.rrect(-110 * s, y - 16 * s, 220 * s, 32 * s, 10, DEEP, ba * seg(t, 55.4 + j * 0.1, 55.8 + j * 0.1));
      p.rrect(-98, y - 5, 150, 10, 5, INK, ba * seg(t, 55.4 + j * 0.1, 55.8 + j * 0.1));
    }
  }
  c.restore();
}

function drawTok(p: Painter, s: Tok, k: number, t: number) {
  if (s.a <= 0.01 || s.w <= 0.2 || s.h <= 0.2) return;
  const c = p.ctx;
  c.save();
  c.globalAlpha = s.a;
  c.translate(s.x, s.y + 1.5 * Math.sin(t * BREATH + k * 0.7));
  if (s.rot) c.rotate(s.rot);
  p.rrect(-s.w / 2, -s.h / 2, s.w, s.h, s.r, s.c);
  c.restore();
}

function needleAngle(t: number): number {
  if (t < 70.2) return -50;
  const K: [number, number][] = [[70.2, -50], [71.76, 16], [72.17, -6], [72.6, 0]];
  for (let i = 0; i + 1 < K.length; i++) if (t < K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], easeSine(seg(t, K[i][0], K[i + 1][0])));
  const u = t - 72.6;
  return 2.5 * Math.exp(-3 * u) * Math.cos(9 * u) * (1 - seg(u, 0.6, 1.0));
}

const brushLoad = (t: number): { c: RGB; a: number } | null => {
  if (t < T_LOAD1 || t > 21.8) return null;
  const c = t < T_LOAD2 ? valCol(8, false) : valCol(8, false);
  const a = (t < T_LOAD2 ? seg(t, T_LOAD1, T_LOAD1 + 0.2) * (1 - seg(t, T_FLIP, T_FLIP + 0.2)) : seg(t, T_LOAD2, T_LOAD2 + 0.2)) * (1 - seg(t, 21.0, 21.8));
  return a > 0 ? { c, a } : null;
};

function drawPen(p: Painter, t: number, s: Key) {
  if (s.a <= 0.005) return;
  const c = p.ctx;
  let sc = 1;
  for (let i = 0; i < PEN_POPS.length; i++) sc *= pop(t, PEN_POPS[i], 0.22);
  let blink = 1;
  if (t > 0.6 && t < 5.3) {
    let cur = 0;
    for (let k = 0; k < N; k++) if (t >= tj[k]) cur = k;
    const q = seg(t, tj[cur], tj[cur] + tdur[cur]);
    if (q <= 0 || q >= 1) blink = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos((t * 2 * PI) / 1.1));
  }
  c.save();
  c.translate(s.x, s.y);
  if (s.s < 1) {
    const w = s.w * sc, h = s.h / sc;
    const al = s.a * (1 - s.s) * blink;
    p.rrect(-w / 2, -h / 2, w, h, s.r, s.c, al);
    const bl = brushLoad(t);
    if (bl) p.rstroke(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, s.r + 6, bl.c, 4, al * bl.a);
  }
  if (s.s > 0) {
    const L = s.h / 2, B = s.w / 2;
    c.rotate(rad(needleAngle(t)));
    c.globalAlpha = s.a * s.s;
    c.fillStyle = css(ACCENT);
    c.beginPath();
    c.moveTo(-B, 0);
    c.lineTo(0, -L);
    c.lineTo(B, 0);
    c.closePath();
    c.fill();
    c.fillStyle = css(LOCK);
    c.beginPath();
    c.moveTo(-B, 0);
    c.lineTo(0, L * 0.8);
    c.lineTo(B, 0);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawPackets(p: Painter, t: number) {
  for (let i = 0; i < PK.length; i++) {
    const k = PK[i];
    const q = seg(t, k.t0, k.t0 + k.dur);
    if (q <= 0 || q >= 1) continue;
    const e = easeSine(q);
    for (let j = 0; j < 3; j++) {
      const qq = e - j * 0.05;
      if (qq <= 0) continue;
      const pos = arcPos(k.x0, k.y0, k.x1, k.y1, qq, k.bow);
      p.disc(pos.x, pos.y, 6 - j * 1.6, k.c, 1 - j * 0.3);
    }
  }
}

function drawEchoes(p: Painter, t: number) {
  for (let i = 0; i < EC.length; i++) {
    const e = EC[i];
    const q = seg(t, e.t, e.t + 0.8);
    if (q <= 0 || q >= 1) continue;
    p.arc(e.x, e.y, e.r0 + e.g * easeOutCubic(q), 0, 2 * PI, e.c, 3, 0.8 * (1 - q));
  }
}

/* ───────────────────────────── draw ───────────────────────────── */
function draw(p: Painter, t: number, view: View) {
  const c = p.ctx;
  const K = cam(t);
  const pen = penAt(t);
  const fx = K.x + (pen.x - K.x) * K.s, fy = K.y + (pen.y - K.y) * K.s;
  const spot = pen.a;
  p.dots(
    view, INK, 0.08,
    (x, y) => {
      let s = 0;
      if (spot > 0) {
        const d = Math.hypot(x - fx, y - fy);
        if (d < 260) s += 0.09 * spot * (1 - d / 260) * (1 - d / 260);
      }
      for (let i = 0; i < RIP.length; i++) {
        const r = RIP[i], dt = t - r.t;
        if (dt >= 0 && dt <= 1.4) s += ripple(t, r.t, K.x + (r.x - K.x) * K.s, K.y + (r.y - K.y) * K.s, x, y);
      }
      return s;
    },
    LIT,
  );

  c.save();
  c.translate(K.x, K.y);
  c.scale(K.s, K.s);
  c.translate(-K.x, -K.y);

  drawJournal(p, t);
  drawGrid(p, t);
  drawSwatches(p, t);
  drawUnderline(p, t);
  drawHabits(p, t);
  drawTrends(p, t);
  drawSync(p, t);
  drawNorth(p, t);
  const docLate = t >= T6 && t < T_END + 1.5;
  if (!docLate) drawDoc(p, t);
  for (let k = 0; k < N; k++) drawTok(p, tokenState(k, t), k, t);
  drawPackets(p, t);
  drawPen(p, t, pen);
  if (docLate) drawDoc(p, t);
  drawEchoes(p, t);

  c.restore();
}

export const truenorth: FilmDef = {
  ground: "#14e05a",
  loop: LOOP,
  still: 75.0,
  chapters: [
    { label: "Journal", range: [0, T1] },
    { label: "Palette", range: [T1, T2] },
    { label: "Year", range: [T2, T3] },
    { label: "Habits", range: [T3, T4] },
    { label: "Trends", range: [T4, T5] },
    { label: "Sync", range: [T5, T6] },
    { label: "North", range: [T6, T_END] },
  ],
  draw,
};
