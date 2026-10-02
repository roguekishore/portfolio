// Vantage: one learner's loop through the platform, told by twelve persistent tokens.
// Watch a real quicksort → trace binary search through a block tree → get a sandboxed verdict →
// be matched by rating → win a timed 1v1 → see the Elo formula move both ratings → climb the XP
// board → have a LeetCode accept synced by the extension → conquer the next stage of the map.
import {
  CX, PI, Painter, bump, clamp01, easeCubic, easeOutCubic, easeSine, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────── palette and tones ───────────────────────── */
const GROUND = hex("#1d3b2a");
const INK = hex("#eef3e2");
const ACCENT = hex("#d8ff5a");
const WARN = hex("#ff8a5b");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

/* ───────────────────────── small helpers (own file only) ───────────────────────── */
const easeOutBack = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
/** Damped settle 0 → 1 with a small overshoot. */
const settle = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-5.2 * x) * Math.cos(5.5 * x));
const E = easeCubic, EO = easeOutCubic, ES = easeSine;
/** Deterministic hash in [0,1) for seeded variety. */
const h01 = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

type Item = { x: number; y: number; w: number; h: number; r: number; c: RGB; a: number; rot: number; z: number; oc?: RGB; ow?: number };
const it = (x: number, y: number, w: number, h: number, r: number, c: RGB, a = 1, z = 1): Item => ({ x, y, w, h, r, c, a, rot: 0, z });

/* ───────────────────────── chapters ───────────────────────── */
const CH: [number, number][] = [
  [0, 12], [12, 25], [25, 37], [37, 48], [48, 62], [62, 72], [72, 83], [83, 95], [95, 108],
];
const RETURN0 = 108, LOOP = 112;

/* Tokens: 0 YOU, 1 RIVAL, 2 CORE, 3..11 cells (value = k - 2, 1..9). */
const YOU = 0, RIVAL = 1, CORE = 2, NCELL = 9, NTOK = 3 + NCELL;
const cellOf = (k: number) => k - 3; // 0..8
const valOf = (k: number) => k - 2; // 1..9

/* ───────────────────────── precomputed: quicksort (chapter 0) ───────────────────────── */
const INIT = [6, 3, 8, 1, 9, 2, 7, 4, 5];
type QS = { arr: number[]; low: number; high: number; pi: number; i: number; j: number; ph: string; sorted: number[]; line: number; t0: number; t1: number };
const QSTEPS: QS[] = [];
{
  const arr = INIT.slice();
  const sorted: number[] = [];
  const snap = (ph: string, line: number, low: number, high: number, pi: number, i: number, j: number) =>
    QSTEPS.push({ arr: arr.slice(), low, high, pi, i, j, ph, sorted: sorted.slice(), line, t0: 0, t1: 0 });
  snap("start", 1, -1, -1, -1, -1, -1);
  const partition = (low: number, high: number) => {
    const pivot = arr[high];
    let i = low - 1;
    snap("info", 9, low, high, high, i, low);
    for (let j = low; j < high; j++) {
      snap("try", 12, low, high, high, i, j);
      if (arr[j] <= pivot) {
        i++;
        if (i !== j) {
          [arr[i], arr[j]] = [arr[j], arr[i]];
          snap("place", 12, low, high, high, i, j);
        }
      }
    }
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    snap("success", 14, low, high, i + 1, i, high);
    return i + 1;
  };
  const qs = (low: number, high: number) => {
    if (low < high) {
      snap("info", 3, low, high, -1, -1, -1);
      const p = partition(low, high);
      sorted.push(p);
      qs(low, p - 1);
      qs(p + 1, high);
    } else if (low === high) sorted.push(low);
  };
  qs(0, NCELL - 1);
  snap("done", 16, -1, -1, -1, -1, -1);
  QSTEPS[QSTEPS.length - 1].sorted = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const W: Record<string, number> = { start: 0.5, info: 0.55, try: 0.5, place: 0.9, success: 1.0, done: 0.4 };
  const total = QSTEPS.reduce((s, q) => s + W[q.ph], 0);
  const T0 = 0.9, T1 = 10.4;
  let tt = T0;
  for (const q of QSTEPS) {
    q.t0 = tt;
    tt += ((T1 - T0) * W[q.ph]) / total;
    q.t1 = tt;
  }
}
const QS_LAST = QSTEPS[QSTEPS.length - 1];
function qsAt(t: number): QS {
  if (t < QSTEPS[0].t0) return QSTEPS[0];
  for (let s = QSTEPS.length - 1; s >= 0; s--) if (t >= QSTEPS[s].t0) return QSTEPS[s];
  return QS_LAST;
}
/** Slot of value v at time t, animating swaps along the first 70% of a step. */
function qsSlot(v: number, t: number): { s: number; lift: number; moving: boolean } {
  const q = qsAt(t);
  const idx = QSTEPS.indexOf(q);
  const slot = q.arr.indexOf(v);
  if (idx > 0) {
    const prev = QSTEPS[idx - 1].arr.indexOf(v);
    if (prev !== slot) {
      const p = E(seg(t, q.t0, q.t0 + 0.7 * (q.t1 - q.t0)));
      return { s: lerp(prev, slot, p), lift: Math.sin(PI * p) * (prev < slot ? -70 : 70), moving: p < 1 };
    }
  }
  return { s: slot, lift: 0, moving: false };
}

/* ───────────────────────── precomputed: binary search trace (chapter 1) ───────────────────────── */
type Blk = { x: number; y: number; w: number; h: number; d: number };
const BLK: Record<string, Blk> = {
  prog: { x: 160, y: 150, w: 700, h: 610, d: 0 },
  fn: { x: 190, y: 185, w: 640, h: 545, d: 1 },
  lo: { x: 220, y: 220, w: 580, h: 44, d: 2 },
  hi: { x: 220, y: 274, w: 580, h: 44, d: 2 },
  wh: { x: 220, y: 328, w: 580, h: 300, d: 2 },
  mid: { x: 250, y: 362, w: 520, h: 44, d: 3 },
  if: { x: 250, y: 416, w: 520, h: 200, d: 3 },
  eq: { x: 280, y: 450, w: 460, h: 44, d: 4 },
  lt: { x: 280, y: 504, w: 460, h: 44, d: 4 },
  gt: { x: 280, y: 558, w: 460, h: 44, d: 4 },
  ret: { x: 220, y: 660, w: 580, h: 44, d: 2 },
};
const BLK_KEYS = Object.keys(BLK);
type TS = { b: string; lo: number; hi: number; mid: number; found: boolean; t0: number };
const TSTEPS: TS[] = [];
{
  const SORTED = [1, 2, 3, 4, 5, 6, 7, 8, 9], target = 8;
  let lo = 0, hi = 8, mid = -1;
  const push = (b: string, found = false) => TSTEPS.push({ b, lo, hi, mid, found, t0: 0 });
  push("fn");
  push("lo");
  push("hi");
  while (lo <= hi) {
    push("wh");
    mid = (lo + hi) >> 1;
    push("mid");
    push("if");
    if (SORTED[mid] === target) { push("eq", true); break; }
    if (SORTED[mid] < target) { lo = mid + 1; push("lt"); } else { hi = mid - 1; push("gt"); }
  }
  const T0 = 13.6, D = 0.52;
  TSTEPS.forEach((s, i) => (s.t0 = T0 + i * D));
}
const TS_DUR = 0.52;
const TS_END = TSTEPS[TSTEPS.length - 1].t0; // the found step
function tsAt(t: number): { i: number; s: TS } {
  let i = -1;
  for (let k = 0; k < TSTEPS.length; k++) if (t >= TSTEPS[k].t0) i = k;
  return { i, s: TSTEPS[Math.max(0, i)] };
}

/* ───────────────────────── precomputed: Elo curve (chapter 5) ───────────────────────── */
const expected = (d: number) => 1 / (1 + Math.pow(10, d / 400));
const EX0 = 360, EX1 = 1240, EY0 = 620, EY1 = 300; // d −400..400 → x, E 0..1 → y
const eloX = (d: number) => lerp(EX0, EX1, (d + 400) / 800);
const eloY = (e: number) => lerp(EY0, EY1, e);
const CURVE: [number, number][] = [];
for (let i = 0; i <= 64; i++) {
  const d = -400 + (800 * i) / 64;
  CURVE.push([eloX(d), eloY(expected(d))]);
}
const RAIL_X = (rating: number) => 300 + (rating - 800) * 1.25; // shared by Match and Rate
const R_YOU = 1200, R_RIVAL = 1460, GAP = R_RIVAL - R_YOU;
const E_YOU = expected(GAP);
const R_YOU_AFTER = Math.round(R_YOU + 40 * (1 - E_YOU)); // K 40 (<10 battles)
const R_RIVAL_AFTER = Math.round(R_RIVAL + 20 * (0 - (1 - E_YOU))); // K 20 (10–29 battles)

/* ───────────────────────── motion helpers ───────────────────────── */
/** Point on a quadratic arc from A to B; `side` bends it left/right of the straight line. */
function arcPt(ax: number, ay: number, bx: number, by: number, p: number, side = 0.2): [number, number] {
  const dx = bx - ax, dy = by - ay;
  const cx = (ax + bx) / 2 - dy * side, cy = (ay + by) / 2 + dx * side;
  const q = 1 - p;
  return [q * q * ax + 2 * q * p * cx + p * p * bx, q * q * ay + 2 * q * p * cy + p * p * by];
}
/** Eased move between two x positions that starts at `t0`. */
const glide = (from: number, to: number, t: number, t0: number, dur = 0.3) => lerp(from, to, E(seg(t, t0, t0 + dur)));

/* ───────────────────────── chapter 0 · Watch (quicksort) ───────────────────────── */
const SX0 = (i: number) => 960 + (i - 4) * 112, BASE0 = 720, UNIT = 50, BW0 = 76;
const PX0 = (i: number) => (i < 0 ? SX0(0) - 60 : SX0(i));
function role0(k: number, t: number): Item {
  const q = qsAt(t), idx = QSTEPS.indexOf(q), prev = QSTEPS[Math.max(0, idx - 1)];
  if (k === CORE) {
    const prog = clamp01((idx + seg(t, q.t0, q.t1)) / (QSTEPS.length - 1));
    const swap = q.ph === "place" || q.ph === "success" ? bump(t, q.t0, q.t0 + 0.5) : 0;
    const s = 44 * (1 + 0.12 * swap);
    return it(lerp(520, 1400, prog), 830, s, s, s / 2, mix(LOCK, ACCENT, swap), 1, 3);
  }
  if (k === YOU) {
    const x = glide(PX0(prev.j), PX0(q.j), t, q.t0, 0.25);
    return it(x, BASE0 + 42, 22, 22, 6, ACCENT, 1, 3);
  }
  if (k === RIVAL) {
    const x = glide(PX0(prev.i), PX0(q.i), t, q.t0, 0.3);
    return it(x, BASE0 + 76, 18, 18, 5, INK, 1, 3);
  }
  const v = valOf(k);
  const { s, lift, moving } = qsSlot(v, t);
  const slot = q.arr.indexOf(v);
  const done = t >= QS_LAST.t0;
  let c: RGB = IDLE;
  let oc: RGB | undefined;
  if (done || q.sorted.includes(slot)) c = ACCENT;
  else if (moving) c = INK;
  else if (slot === q.pi && q.ph !== "success") { c = IDLE; oc = INK; }
  else if (slot === q.j && q.ph === "try") c = INK;
  else if (q.low >= 0 && slot >= q.low && slot <= q.high) c = LOCK;
  const pop = 1 + 0.08 * (done ? bump(t, QS_LAST.t0 + slot * 0.05, QS_LAST.t0 + slot * 0.05 + 0.3) : 0);
  const h = v * UNIT * pop;
  const item = it(SX0(s), BASE0 - h / 2 + lift, BW0, h, 12, c, 1, moving ? 2 : 1);
  if (oc) { item.oc = oc; item.ow = 4; }
  return item;
}

/* ───────────────────────── chapter 1 · Trace (binary search through the block tree) ───────────────────────── */
const ROW1_X = (c: number) => 980 + c * 52, ROW1_Y = 300;
const blkPt = (b: string): [number, number] => {
  const B = BLK[b];
  return [B.x + 16, B.h > 60 ? B.y + 22 : B.y + B.h / 2];
};
function role1(k: number, t: number): Item {
  const { i, s } = tsAt(t);
  const started = i >= 0;
  if (k === CORE) {
    const pulse = started ? bump(t, s.t0, s.t0 + 0.3) : 0;
    const sz = 72 * (1 + 0.1 * pulse);
    return it(1190, 560, sz, sz, 18, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const [bx, by] = started ? blkPt(s.b) : [174, 168];
    const [ax, ay] = i > 0 ? blkPt(TSTEPS[i - 1].b) : [174, 168];
    const p = started ? E(seg(t, s.t0, s.t0 + 0.3)) : 1;
    const [x, y] = arcPt(ax, ay, bx, by, p, -0.15);
    return it(x, y, 20, 20, 6, ACCENT, 1, 3);
  }
  if (k === RIVAL) {
    const mid = started && s.mid >= 0 ? s.mid : -1;
    const tx = mid >= 0 ? ROW1_X(mid) : ROW1_X(0) - 48;
    let px = ROW1_X(0) - 48;
    for (let j = i - 1; j >= 0; j--) if (TSTEPS[j].mid !== s.mid) { px = TSTEPS[j].mid >= 0 ? ROW1_X(TSTEPS[j].mid) : px; break; }
    const x = s.b === "mid" ? glide(px, tx, t, s.t0, 0.35) : tx;
    return it(x, ROW1_Y + 52, 16, 16, 5, INK, 1, 3);
  }
  const c = cellOf(k);
  let col: RGB = IDLE;
  if (started) {
    if (c >= s.lo && c <= s.hi) col = LOCK;
    if (c === s.mid && s.b !== "wh" && s.b !== "lo" && s.b !== "hi") col = INK;
    if (s.found && c === s.mid) col = ACCENT;
  }
  const pop = s.found && c === s.mid ? 1 + 0.18 * bump(t, TS_END, TS_END + 0.4) : 1;
  return it(ROW1_X(c), ROW1_Y, 44 * pop, 44 * pop, 10, col, 1, 1);
}

/* ───────────────────────── chapter 2 · Judge (sandboxed verdicts) ───────────────────────── */
const CASE_X = 700, CASE_Y = (c: number) => 250 + c * 54;
const WORK = (col: number, row: number): [number, number] => [1100 + col * 200, 300 + row * 120];
const J = { go1: 26.3, go2: 26.5, spark1: 27.1, run1: 27.6, fail: 5, warn: 29.6, back: 30.4, go3: 31.2, spark2: 31.9, reset: 31.0, run2: 32.3, accept: 34.3 };
const CASE_D = 0.2;
function caseState(c: number, t: number): { col: RGB; pop: number } {
  const t1 = J.run1 + c * CASE_D, t2 = J.run2 + c * CASE_D, tr = J.reset + c * 0.04;
  if (t >= t2) return { col: ACCENT, pop: bump(t, t2, t2 + 0.3) };
  if (t >= t2 - 0.15) return { col: INK, pop: 0 };
  if (t >= tr) return { col: IDLE, pop: 0 };
  if (t >= t1) return { col: c === J.fail ? WARN : ACCENT, pop: bump(t, t1, t1 + 0.3) };
  if (t >= t1 - 0.15) return { col: INK, pop: 0 };
  return { col: IDLE, pop: 0 };
}
function cardTravel(ax: number, ay: number, bx: number, by: number, t: number, t0: number, dur: number, side: number): [number, number, number] {
  const p = E(seg(t, t0, t0 + dur));
  const [x, y] = arcPt(ax, ay, bx, by, p, side);
  return [x, y, p];
}
function role2(k: number, t: number): Item {
  if (k === CORE) {
    const pulse = Math.max(bump(t, J.spark1, J.spark1 + 0.4), bump(t, J.spark2, J.spark2 + 0.4));
    const sz = 64 * (1 + 0.1 * pulse);
    return it(1200, 190, sz, sz, 14, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const [wx, wy] = WORK(0, 1);
    let x = 330, y = 330, p = 0;
    if (t < J.back) [x, y, p] = cardTravel(330, 330, wx, wy, t, J.go1, 0.7, -0.18);
    else if (t < J.go3) [x, y, p] = cardTravel(wx, wy, 330, 330, t, J.back, 0.6, -0.18), p = 1 - p;
    else [x, y, p] = cardTravel(330, 330, wx, wy, t, J.go3, 0.6, -0.18);
    const shake = t > J.back + 0.6 && t < J.go3 ? Math.sin((t - J.back) * 40) * 4 * (1 - seg(t, J.back + 0.6, J.go3)) : 0;
    const item = it(x + shake, y, lerp(150, 110, p), lerp(90, 64, p), 14, ACCENT, 1, 4);
    if (t >= J.warn && t < J.back) { item.oc = WARN; item.ow = 5; }
    if (t >= J.accept) { item.oc = ACCENT; item.ow = 0; }
    return item;
  }
  if (k === RIVAL) {
    const [wx, wy] = WORK(1, 0);
    const [x, y, p] = cardTravel(330, 560, wx, wy, t, J.go2, 0.7, 0.18);
    const item = it(x, y, lerp(150, 110, p), lerp(90, 64, p), 14, INK, 1, 4);
    if (t >= 30.0) { item.oc = INK; item.ow = 4; }
    return item;
  }
  const c = cellOf(k);
  const { col, pop } = caseState(c, t);
  const w = 180 * (1 + 0.06 * pop), h = 44 * (1 + 0.1 * pop);
  return it(CASE_X, CASE_Y(c), w, h, 12, col, 1, 1);
}

/* ───────────────────────── chapter 3 · Match (rating-window matchmaking) ───────────────────────── */
// processMatchmaking groups the queue by mode + difficulty, so entries only ever pair inside a lane.
// Lane 1 is YOU's group. Ratings are chosen so the only legal pairs are the ones shown:
// lane 1: 860–940 pair at once; YOU 1200 ↔ RIVAL 1460 needs ±200 to widen twice (+50 per 30 s).
// lane 0: 1010–1130 pair; 1380 waits. lane 2: 1500–1580 pair; 1050 and 1290 keep waiting.
const LANE_Y = (l: number) => 420 + l * 130, RAIL_Y = LANE_Y(1), LOBBY_Y = 300;
const QR = [860, 940, 1010, 1050, 1130, 1290, 1380, 1500, 1580];
const LANE = [1, 1, 0, 2, 0, 2, 0, 2, 2];
const PAIRS: { a: number; b: number; t: number }[] = [{ a: 0, b: 1, t: 39.0 }, { a: 2, b: 4, t: 40.0 }, { a: 7, b: 8, t: 44.0 }];
const M = { bracket: 38.2, widen1: 40.4, widen2: 41.6, match: 42.0, lift: 42.5, ready1: 45.6, ready2: 46.2 };
const TICK0 = 38.0, DIAL: [number, number] = [800, 180];
function liftP(t: number, t0: number) { return settle(seg(t, t0, t0 + 1.0)); }
function role3(k: number, t: number): Item {
  if (k === CORE) {
    const n = Math.floor((t - TICK0) / 1.0);
    const pulse = t >= TICK0 ? bump(t, TICK0 + n, TICK0 + n + 0.25) : 0;
    const sz = 64 * (1 + 0.08 * pulse);
    return it(DIAL[0], DIAL[1], sz, sz, sz / 2, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU || k === RIVAL) {
    const p = liftP(t, M.lift);
    const x0 = RAIL_X(k === YOU ? R_YOU : R_RIVAL), x1 = k === YOU ? 740 : 860;
    const pop = 1 + 0.15 * bump(t, M.match, M.match + 0.35);
    const breathe = 1.5 * Math.sin(t * 2.1 + k);
    const item = it(lerp(x0, x1, p), lerp(RAIL_Y, LOBBY_Y, p) - Math.sin(PI * p) * 40 + breathe, 44 * pop, 44 * pop, 22 * pop, k === YOU ? ACCENT : INK, 1, 4);
    const rt = k === YOU ? M.ready1 : M.ready2;
    if (t >= rt) { item.oc = k === YOU ? ACCENT : INK; item.ow = 4 * E(seg(t, rt, rt + 0.3)); }
    return item;
  }
  const c = cellOf(k), ly = LANE_Y(LANE[c]);
  let x = RAIL_X(QR[c]), y = ly + 1.2 * Math.sin(t * 1.7 + c * 1.3), pop = 1, paired = 0;
  for (const pr of PAIRS) {
    if (c === pr.a || c === pr.b) {
      const p = liftP(t, pr.t + 0.4);
      const mx = (RAIL_X(QR[pr.a]) + RAIL_X(QR[pr.b])) / 2;
      x = lerp(x, mx + (c === pr.a ? -30 : 30), p);
      y = lerp(ly, ly - 62, p) - Math.sin(PI * p) * 24;
      pop = 1 + 0.15 * bump(t, pr.t, pr.t + 0.35);
      paired = p;
    }
  }
  const col = mix(LANE[c] === 1 ? LOCK : IDLE, GREY, 0.35 * paired);
  return it(x, y, 40 * pop, 40 * pop, 20 * pop, col, 1, 1);
}

/* ───────────────────────── chapter 4 · Battle (timed 1v1 over STOMP) ───────────────────────── */
const HUB: [number, number] = [800, 300], PL_Y = 300, P_YOU_X = 330, P_RIV_X = 1270;
const CARD_Y = (j: number) => 470 + j * 100;
type Sub = { who: number; slot: number; t: number; dur: number; ok: boolean };
const SUBS: Sub[] = [
  { who: 0, slot: 0, t: 50.4, dur: 0.8, ok: true },
  { who: 1, slot: 0, t: 51.6, dur: 0.8, ok: true },
  { who: 0, slot: 1, t: 52.6, dur: 0.8, ok: false },
  { who: 0, slot: 1, t: 54.6, dur: 0.8, ok: true },
  { who: 1, slot: 1, t: 55.0, dur: 0.8, ok: true },
  { who: 0, slot: 2, t: 57.0, dur: 0.9, ok: true },
  { who: 1, slot: 2, t: 58.6, dur: 0.8, ok: false },
];
const B = { start: 50.0, end: 60.0, win: 60.2 };
function slotState(who: number, slot: number, t: number): { col: RGB; pop: number } {
  let col: RGB = IDLE, pop = 0;
  for (const s of SUBS) {
    if (s.who !== who || s.slot !== slot || t < s.t) continue;
    if (t < s.t + s.dur) { col = INK; pop = 0; }
    else { col = s.ok ? ACCENT : WARN; pop = bump(t, s.t + s.dur, s.t + s.dur + 0.3); }
  }
  return { col, pop };
}
const solvedBy = (who: number, j: number, t: number) => SUBS.some((s) => s.who === who && s.slot === j && s.ok && t >= s.t + s.dur);
function role4(k: number, t: number): Item {
  if (k === CORE) {
    let pulse = bump(t, B.end, B.end + 0.5);
    for (const s of SUBS) pulse = Math.max(pulse, 0.7 * bump(t, s.t + 0.35, s.t + 0.75));
    const sz = 72 * (1 + 0.1 * pulse);
    return it(HUB[0], HUB[1], sz, sz, 18, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const pop = 1 + 0.15 * bump(t, B.win, B.win + 0.5);
    const item = it(P_YOU_X, PL_Y, 88 * pop, 88 * pop, 44 * pop, ACCENT, 1, 4);
    if (t >= B.win) { item.oc = ACCENT; item.ow = 5 * E(seg(t, B.win, B.win + 0.4)); }
    return item;
  }
  if (k === RIVAL) {
    const lose = seg(t, B.win, B.win + 0.6);
    return it(P_RIV_X, PL_Y, 88, 88, 44, mix(INK, LOCK, lose), 1, 4);
  }
  const c = cellOf(k);
  if (c < 3) return it(HUB[0], CARD_Y(c), 200, 70, 14, IDLE, 1, 1);
  const who = c < 6 ? 0 : 1, slot = c < 6 ? c - 3 : c - 6;
  const { col, pop } = slotState(who, slot, t);
  return it(who === 0 ? P_YOU_X : P_RIV_X, CARD_Y(slot), 150 * (1 + 0.06 * pop), 56 * (1 + 0.1 * pop), 12, col, 1, 1);
}

/** Hop through waypoints: each entry is [x, y, tStart, dur]; hops follow quadratic arcs. */
type Hop = [number, number, number, number];
function hopSeq(hops: Hop[], t: number, side = 0.2): [number, number, number] {
  let x = hops[0][0], y = hops[0][1], moving = 0;
  for (let i = 1; i < hops.length; i++) {
    const [bx, by, t0, dur] = hops[i];
    if (t < t0) break;
    const p = E(seg(t, t0, t0 + dur));
    [x, y] = arcPt(x, y, bx, by, p, side * (i % 2 ? 1 : -1));
    moving = Math.sin(PI * p);
  }
  return [x, y, moving];
}

/* ───────────────────────── chapter 5 · Rate (Elo) ───────────────────────── */
const RATE_RAIL_Y = 760;
const RT = { curve: 63.2, drop: 65.0, read: 65.6, kdots: 66.4, slide: 67.4, reward: 69.0 };
function role5(k: number, t: number): Item {
  if (k === CORE) {
    const pulse = Math.max(bump(t, RT.drop, RT.drop + 0.4), bump(t, RT.slide, RT.slide + 0.5));
    const sz = 64 * (1 + 0.1 * pulse);
    return it(800, 180, sz, sz, 14, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU || k === RIVAL) {
    const p = settle(seg(t, RT.slide, RT.slide + 1.2));
    const r0 = k === YOU ? R_YOU : R_RIVAL, r1 = k === YOU ? R_YOU_AFTER : R_RIVAL_AFTER;
    const x = lerp(RAIL_X(r0), RAIL_X(r1), p);
    const squash = 1 + 0.1 * Math.sin(PI * clamp01(seg(t, RT.slide, RT.slide + 0.6)));
    return it(x, RATE_RAIL_Y, 44 * squash, 44 / squash, 22, k === YOU ? ACCENT : INK, 1, 4);
  }
  const c = cellOf(k);
  const d = -400 + c * 100;
  const near = Math.abs(d - GAP) <= 60 ? bump(t, RT.drop, RT.drop + 0.5) : 0;
  const sz = 18 * (1 + 0.3 * near);
  return it(eloX(d), eloY(expected(d)), sz, sz, sz / 2, mix(LOCK, ACCENT, near), 1, 1);
}

/* ───────────────────────── chapter 6 · Rank (weekly XP board, streak, levels) ───────────────────────── */
const ROW_Y = (r: number) => 230 + r * 50, ROW_W = (r: number) => 700 - r * 44, ROW_X0 = 300;
const CELL_RANK = [0, 1, 3, 4, 5, 6, 7, 8, 10];
const RIVAL_RANK = 2, YOU_RANK0 = 9;
const RK = { climb0: 74.0, climb1: 79.5, levelup: 80.0 };
function yourRank(t: number) {
  const u = seg(t, RK.climb0, RK.climb1) * (YOU_RANK0 - 1);
  const k = Math.floor(u);
  return YOU_RANK0 - Math.min(YOU_RANK0 - 1, k + E(u - k));
}
function role6(k: number, t: number): Item {
  const yr = yourRank(t);
  if (k === CORE) {
    const pulse = bump(t, RK.levelup, RK.levelup + 0.5);
    return it(ROW_X0 + 280, 170, 560, 36 * (1 + 0.15 * pulse), 10, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const w = ROW_W(yr) + 12;
    const pop = 1 + 0.12 * bump(t, RK.climb1, RK.climb1 + 0.35);
    return it(ROW_X0 + w / 2, ROW_Y(yr), w, 36 * pop, 10, ACCENT, 1, 4);
  }
  const r0 = k === RIVAL ? RIVAL_RANK : CELL_RANK[cellOf(k)];
  const shift = r0 < YOU_RANK0 ? clamp01(r0 + 1 - yr) : 0;
  const w = ROW_W(r0);
  const col = k === RIVAL ? INK : mix(IDLE, LOCK, 1 - r0 / 10);
  return it(ROW_X0 + w / 2, ROW_Y(r0 + shift), w, 36, 10, mix(col, GREY, 0.5 * Math.sin(PI * shift)), 1, 1);
}

/* ───────────────────────── chapter 7 · Sync (extension → Spring → SSE) ───────────────────────── */
const TAB = { x: 170, y: 170, w: 590, h: 610 };
const SROW_X = 430, SROW_Y = (c: number) => 260 + c * 54;
const BADGE: [number, number] = [720, 195], STATUS: [number, number] = [700, 755];
const SV = { attempt: 84.6, aBadge: 85.0, aSend: 85.6, aLand: 87.0, accept: 88.0, cBadge: 88.4, cSend: 89.0, cLand: 91.4, sse: 92.4 };
const SERVER: [number, number] = [1150, 480];
const RIVAL_HOPS: Hop[] = [
  [STATUS[0], STATUS[1], 0, 0],
  [SROW_X + 200, SROW_Y(4), SV.attempt, 0.4], [BADGE[0], BADGE[1] + 30, SV.aBadge, 0.4],
  [STATUS[0], STATUS[1], SV.aSend + 0.4, 0.6],
  [SROW_X + 200, SROW_Y(6), SV.accept, 0.4], [BADGE[0], BADGE[1] + 30, SV.cBadge, 0.4],
  [STATUS[0], STATUS[1], SV.cSend + 0.4, 0.6],
];
function role7(k: number, t: number): Item {
  if (k === CORE) {
    const pulse = Math.max(0.5 * bump(t, SV.aLand, SV.aLand + 0.4), bump(t, SV.cLand, SV.cLand + 0.6));
    const sz = 70 * (1 + 0.1 * pulse);
    return it(SERVER[0], SERVER[1], sz, sz, 18, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const pop = 1 + 0.2 * Math.max(bump(t, SV.aBadge + 0.4, SV.aBadge + 0.7), bump(t, SV.cBadge + 0.4, SV.cBadge + 0.7));
    return it(BADGE[0], BADGE[1], 36 * pop, 36 * pop, 9, ACCENT, 1, 4);
  }
  if (k === RIVAL) {
    const [x, y] = hopSeq(RIVAL_HOPS, t, 0.25);
    return it(x, y, 28, 18, 9, INK, 1, 4);
  }
  const c = cellOf(k);
  let col: RGB = IDLE, oc: RGB | undefined, pop = 0;
  if (c === 0 || c === 2) col = ACCENT;
  if (c === 4 && t >= SV.aLand) oc = LOCK;
  if (c === 6 && t >= SV.accept + 0.4) { col = ACCENT; pop = bump(t, SV.accept + 0.4, SV.accept + 0.8); }
  const item = it(SROW_X, SROW_Y(c), 420 * (1 + 0.03 * pop), 36 * (1 + 0.12 * pop), 8, col, 1, 1);
  if (oc) { item.oc = oc; item.ow = 3 * E(seg(t, SV.aLand, SV.aLand + 0.3)); }
  return item;
}

/* ───────────────────────── chapter 8 · Conquer (stage map with hybrid unlocking) ───────────────────────── */
const NODE = (c: number): [number, number] => [480 + Math.floor(c / 3) * 320, 300 + (c % 3) * 180];
const SOLVE = [97.2, 98.8, 100.6, 102.4, 103.6, -1, 106.0, 1e9, 1e9];
const UNLOCK = [-1, SOLVE[0] + 0.3, SOLVE[1] + 0.3, -1, 97.5, -1, -1, SOLVE[6] + 0.3, 1e9];
const STAGE_DONE = [SOLVE[2] + 0.2, SOLVE[4] + 0.2];
const YOU_HOPS: Hop[] = [
  [...NODE(0), 0, 0], [...NODE(1), 97.6, 0.6], [...NODE(2), 99.4, 0.6], [...NODE(3), 101.2, 0.7],
  [...NODE(4), 103.0, 0.5], [...NODE(6), 104.3, 0.7],
];
const RIVAL_HOPS8: Hop[] = [
  [...NODE(2), 0, 0], [...NODE(3), 98.6, 0.7], [...NODE(4), 101.0, 0.6], [...NODE(6), 103.2, 0.7], [...NODE(7), 104.6, 0.6],
];
function role8(k: number, t: number): Item {
  if (k === CORE) {
    let pulse = 0;
    for (const s of SOLVE) if (s > 0 && s < 1e8) pulse = Math.max(pulse, bump(t, s, s + 0.4));
    const sz = 56 * (1 + 0.1 * pulse);
    return it(190, 190, sz, sz, 14, mix(LOCK, ACCENT, pulse), 1, 3);
  }
  if (k === YOU) {
    const [x, y, mv] = hopSeq(YOU_HOPS, t, 0.22);
    const item = it(x, y - 50 - 10 * mv, 32, 32, 16, ACCENT, 1, 5);
    item.oc = ACCENT; item.ow = 2 + 1.5 * Math.sin(t * 4);
    return item;
  }
  if (k === RIVAL) {
    const [x, y, mv] = hopSeq(RIVAL_HOPS8, t, -0.22);
    return it(x + 36, y - 44 - 8 * mv, 24, 24, 12, INK, 1, 5);
  }
  const c = cellOf(k);
  const [x, y] = NODE(c);
  const solved = t >= SOLVE[c], unlocked = t >= UNLOCK[c];
  const pop = 1 + 0.16 * (SOLVE[c] > 0 ? bump(t, SOLVE[c], SOLVE[c] + 0.4) : 0);
  const item = it(x, y, 70 * pop, 70 * pop, 20, solved ? ACCENT : IDLE, solved || unlocked ? 1 : 0.55, 1);
  if (!solved) { item.oc = unlocked ? LOCK : EDGE; item.ow = unlocked ? 3 + 1.5 * E(seg(t, UNLOCK[c], UNLOCK[c] + 0.4)) : 2; }
  return item;
}

/* ───────────────────────── transitions between chapters ───────────────────────── */
const ROLES = [role0, role1, role2, role3, role4, role5, role6, role7, role8];
/** Arrival morph length and per-token stagger at the start of chapter c. */
const T_DUR = 1.1;
const stagger = (k: number, c: number) => (k === CORE ? 0 : k < 3 ? 0.05 : 0.08 + 0.06 * ((cellOf(k) * 5 + c * 3) % 9));
function chapterAt(t: number) {
  if (t >= RETURN0) return 9;
  let c = 0;
  while (c + 1 < CH.length && t >= CH[c + 1][0]) c++;
  return c;
}
function blend(A: Item, Bi: Item, p: number, k: number): Item {
  const q = easeOutBack(p) * 0.3 + E(p) * 0.7; // related but different easings per token
  const pp = k === CORE ? E(p) : k < 3 ? EO(p) : q;
  const side = (k % 2 ? 1 : -1) * 0.16;
  const [x, y] = arcPt(A.x, A.y, Bi.x, Bi.y, pp, side);
  const anticipate = -8 * Math.sin(PI * clamp01(p / 0.18)) * (p < 0.18 ? 1 : 0);
  const out: Item = {
    x, y: y + anticipate,
    w: lerp(A.w, Bi.w, pp), h: lerp(A.h, Bi.h, pp), r: lerp(A.r, Bi.r, pp),
    c: mix(A.c, Bi.c, ES(p)), a: lerp(A.a, Bi.a, p), rot: 0, z: 6,
  };
  if (Bi.oc && p > 0.7) { out.oc = Bi.oc; out.ow = (Bi.ow ?? 3) * seg(p, 0.7, 1); }
  return out;
}
function tokenState(k: number, t: number): Item {
  const c = chapterAt(t);
  if (c === 9) {
    const st = stagger(k, 0);
    const p = seg(t, RETURN0 + 0.2 + st, RETURN0 + 0.2 + st + 2.4);
    const A = role8(k, RETURN0), Bi = role0(k, 0);
    return p >= 1 ? Bi : p <= 0 ? A : blend(A, Bi, p, k);
  }
  const cur = ROLES[c](k, t);
  if (c === 0) return cur;
  const t0 = CH[c][0] + stagger(k, c);
  const p = seg(t, t0, t0 + T_DUR);
  if (p >= 1) return cur;
  const A = ROLES[c - 1](k, CH[c][0]);
  return p <= 0 ? A : blend(A, cur, p, k);
}

/* ───────────────────────── furniture, cast and fx painters ───────────────────────── */
/** Furniture alpha for chapter c: full inside, draws in over 0.9 s, fades over the last 0.5 s. */
function env(t: number, c: number) {
  const [a, b] = CH[c];
  if (c === 0) return t < 12 ? 1 - seg(t, 11.5, 12) : seg(t, 110.0, 111.6);
  return seg(t, a, a + 0.9) * (1 - seg(t, b - 0.5, b));
}
/** Growth of furniture lines at the start of chapter c (0 → 1 over 0.8 s, staggered by `d`). */
const grow = (t: number, c: number, d = 0) => (c === 0 ? 1 : E(seg(t, CH[c][0] + 0.15 + d, CH[c][0] + 0.95 + d)));

function drawItem(p: Painter, I: Item) {
  if (I.a <= 0) return;
  const c = p.ctx;
  c.save();
  c.translate(I.x, I.y);
  if (I.rot) c.rotate(I.rot);
  p.rrect(-I.w / 2, -I.h / 2, I.w, I.h, I.r, I.c, I.a);
  if (I.oc && I.ow && I.ow > 0) p.rstroke(-I.w / 2 - 4, -I.h / 2 - 4, I.w + 8, I.h + 8, I.r + 4, I.oc, I.ow, I.a);
  c.restore();
}
/** A tick that draws itself: `q` 0..1. */
function tick(p: Painter, x: number, y: number, s: number, col: RGB, w: number, q: number, a = 1) {
  if (q <= 0) return;
  const ax = x - s * 0.5, ay = y, bx = x - s * 0.12, by = y + s * 0.38, cx = x + s * 0.5, cy = y - s * 0.42;
  const q1 = clamp01(q / 0.45), q2 = seg(q, 0.45, 1);
  p.line(ax, ay, lerp(ax, bx, q1), lerp(ay, by, q1), col, w, a);
  if (q2 > 0) p.line(bx, by, lerp(bx, cx, q2), lerp(by, cy, q2), col, w, a);
}
function cross(p: Painter, x: number, y: number, s: number, col: RGB, w: number, q: number, a = 1) {
  if (q <= 0) return;
  const q1 = clamp01(q / 0.5), q2 = seg(q, 0.5, 1);
  p.line(x - s / 2, y - s / 2, lerp(x - s / 2, x + s / 2, q1), lerp(y - s / 2, y + s / 2, q1), col, w, a);
  if (q2 > 0) p.line(x + s / 2, y - s / 2, lerp(x + s / 2, x - s / 2, q2), lerp(y - s / 2, y + s / 2, q2), col, w, a);
}
function echo(p: Painter, t: number, t0: number, x: number, y: number, w: number, h: number, r: number, col: RGB) {
  const q = seg(t, t0, t0 + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 36 * EO(q);
  p.rstroke(x - w / 2 - g, y - h / 2 - g, w + 2 * g, h + 2 * g, r + g, col, 3, 0.75 * (1 - q));
}
/** Small square packet flying along an arc with a 3-copy trail. */
function packet(p: Painter, ax: number, ay: number, bx: number, by: number, t: number, t0: number, dur: number, col: RGB, size = 14, side = 0.2, a = 1) {
  for (let tr = 0; tr < 3; tr++) {
    const q = seg(t - tr * 0.03, t0, t0 + dur);
    if (q <= 0 || q >= 1) continue;
    const [x, y] = arcPt(ax, ay, bx, by, E(q), side);
    const s = size - tr * 3;
    p.rrect(x - s / 2, y - s / 2, s, s, 4, col, a * (1 - tr * 0.28));
  }
}
/** Code hairlines inside a box, seeded by `seed`. */
function codeLines(p: Painter, x: number, y: number, w: number, n: number, pitch: number, seed: number, a: number, hot = -1) {
  for (let l = 0; l < n; l++) {
    const ind = (l % 5 === 0 ? 0 : l % 3 === 0 ? 2 : 1) * 18;
    const len = w * (0.35 + 0.5 * h01(seed + l));
    const yy = y + l * pitch;
    p.line(x + ind, yy, x + ind + len, yy, l === hot ? ACCENT : INK, 3, a * (l === hot ? 0.95 : 0.22));
    if (l === hot) p.rrect(x - 14, yy - 7, 6, 14, 3, ACCENT, a);
  }
}

/* ── chapter 0 · Watch ── */
const ECHO0 = QSTEPS.filter((q) => q.ph === "success").map((q) => ({ t: q.t0 + 0.1, slot: q.pi, v: q.arr[q.pi] }));
const QS_LINE = (q: QS) => Math.max(0, Math.min(15, q.line - 1));
function fx0(p: Painter, t: number) {
  const a = env(t, 0);
  if (a <= 0) return;
  const q = qsAt(t), idx = QSTEPS.indexOf(q);
  // Baseline, transport bar and its progress fill up to the playhead.
  p.line(SX0(0) - 70, BASE0 + 8, SX0(8) + 70, BASE0 + 8, EDGE, 2, a);
  p.line(520, 830, 1400, 830, EDGE, 4, a);
  const core = role0(CORE, t);
  p.line(520, 830, core.x, 830, ACCENT, 4, a * 0.8);
  // Code panel with the active line, like the visualizer's CodePanel.
  p.rstroke(150, 170, 320, 300, 14, EDGE, 2, a);
  codeLines(p, 190, 196, 240, 16, 17.5, 3, a, t > 0.6 ? QS_LINE(q) : -1);
  // Legend: default, in range, comparing, pivot, sorted.
  const leg: [RGB, RGB | null][] = [[IDLE, null], [LOCK, null], [INK, null], [IDLE, INK], [ACCENT, null]];
  leg.forEach(([c, o], n) => {
    p.rrect(170 + n * 46, 510, 20, 20, 5, c, a);
    if (o) p.rstroke(170 + n * 46, 510, 20, 20, 5, o, 2.5, a);
  });
  // Stat blocks: comparisons, swaps, steps — bars that grow with the trace.
  let cmp = 0, sw = 0;
  for (let s = 0; s <= idx; s++) { if (QSTEPS[s].ph === "try") cmp++; if (QSTEPS[s].ph === "place" || QSTEPS[s].ph === "success") sw++; }
  const totals = [QSTEPS.filter((s) => s.ph === "try").length, QSTEPS.filter((s) => s.ph === "place" || s.ph === "success").length, QSTEPS.length - 1];
  [cmp, sw, idx].forEach((n, i) => {
    const y = 585 + i * 44;
    p.rstroke(150, y, 320, 30, 8, EDGE, 2, a);
    p.rrect(158, y + 8, 304 * clamp01(n / totals[i]), 14, 5, i === 2 ? ACCENT : LOCK, a * 0.9);
  });
  // Range bracket under the active partition.
  if (q.low >= 0 && q.ph !== "done") {
    const x0 = SX0(q.low) - BW0 / 2, x1 = SX0(q.high) + BW0 / 2;
    p.line(x0, BASE0 + 24, x1, BASE0 + 24, LOCK, 3, a * 0.8);
  }
  for (const e of ECHO0) echo(p, t, e.t, SX0(e.slot), BASE0 - (e.v * UNIT) / 2, BW0, e.v * UNIT, 14, ACCENT);
  // Final sweep tick under the array once sorted.
  tick(p, 960, 880, 40, ACCENT, 5, seg(t, QS_LAST.t0 + 0.2, QS_LAST.t0 + 0.8), a);
}

/* ── chapter 1 · Trace ── */
function fx1(p: Painter, t: number) {
  const a = env(t, 1);
  if (a <= 0) return;
  const { i, s } = tsAt(t);
  // Block tree draws in by depth; leaves carry a code hairline.
  for (const key of BLK_KEYS) {
    const Bk = BLK[key];
    const g = grow(t, 1, Bk.d * 0.12);
    if (g <= 0) continue;
    p.rstroke(Bk.x, Bk.y, Bk.w, Bk.h * g, 12, EDGE, 2, a * (0.55 + 0.1 * Bk.d));
    if (Bk.h <= 60 && g >= 1) p.line(Bk.x + 44, Bk.y + Bk.h / 2, Bk.x + 44 + Bk.w * (0.3 + 0.35 * h01(Bk.x + Bk.y)), Bk.y + Bk.h / 2, INK, 3, a * 0.22);
  }
  // Lit blocks: the current one bright, earlier ones fading.
  for (let j = 0; j <= i; j++) {
    const st = TSTEPS[j], Bk = BLK[st.b];
    const q = seg(t, st.t0, st.t0 + 1.2);
    if (q >= 1 && j !== i) continue;
    const al = j === i ? 0.9 : 0.9 * (1 - q);
    p.rstroke(Bk.x, Bk.y, Bk.w, Bk.h, 12, st.found ? ACCENT : INK, 3, a * al);
    // Event pip from the engine to the block.
    packet(p, 1190, 560, Bk.x + Bk.w, Bk.y + (Bk.h > 60 ? 22 : Bk.h / 2), t, st.t0, 0.3, st.found ? ACCENT : INK, 10, 0.25, a);
  }
  // Array row rail and the variable rails (lo, hi, mid as scalar render-kinds).
  const rx0 = ROW1_X(0) - 26, rx1 = ROW1_X(8) + 26;
  p.line(rx0, ROW1_Y + 30, rx1, ROW1_Y + 30, EDGE, 2, a);
  const vars: [number, RGB][] = [[s.lo, LOCK], [s.hi, LOCK], [s.mid, INK]];
  vars.forEach(([v, col], n) => {
    const y = 440 + n * 50;
    p.line(rx0, y, rx1, y, EDGE, 2, a * grow(t, 1, 0.3));
    if (i >= 0 && v >= 0) {
      const prev = i > 0 ? [TSTEPS[i - 1].lo, TSTEPS[i - 1].hi, TSTEPS[i - 1].mid][n] : v;
      const x = glide(ROW1_X(prev < 0 ? v : prev), ROW1_X(v), t, s.t0, 0.35);
      p.disc(x, y, 9, col, a);
    }
  });
  // Step bar growing toward the cap tick.
  const bx0 = 960, bw = 440, by = 700;
  p.rstroke(bx0, by, bw, 16, 6, EDGE, 2, a * grow(t, 1, 0.4));
  const n = i + 1 + (i >= 0 ? seg(t, s.t0, s.t0 + 0.2) : 0);
  p.rrect(bx0 + 3, by + 3, (bw - 6) * clamp01(n / 22), 10, 4, ACCENT, a * 0.9);
  p.line(bx0 + bw, by - 8, bx0 + bw, by + 24, LOCK, 3, a);
  // Found: echo around the matching cell.
  echo(p, t, TS_END, ROW1_X(7), ROW1_Y, 44, 44, 12, ACCENT);
}

/* ── chapter 2 · Judge ── */
function fx2(p: Painter, t: number) {
  const a = env(t, 2);
  if (a <= 0) return;
  // Two editors on the left.
  [[270, 330, 2], [270, 560, 7]].forEach(([x, y, sd]) => {
    const g = grow(t, 2, 0.1);
    p.rstroke(x - 110, y - 90, 300, 180 * g, 16, EDGE, 2, a);
    if (g >= 1) codeLines(p, x - 70, y - 60, 180, 7, 19, sd, a * 0.8);
  });
  // Worker pool: manager hairlines to two column heads, 3 + 3 worker boxes.
  const g2 = grow(t, 2, 0.2);
  p.line(1200, 222, lerp(1200, 1100, g2), lerp(222, 258, g2), EDGE, 2, a);
  p.line(1200, 222, lerp(1200, 1300, g2), lerp(222, 258, g2), EDGE, 2, a);
  for (let col = 0; col < 2; col++) for (let row = 0; row < 3; row++) {
    const [wx, wy] = WORK(col, row);
    const g = grow(t, 2, 0.25 + row * 0.08);
    const busy = (col === 0 && row === 1 && t >= J.go1 + 0.6 && (t < J.back || t >= J.go3 + 0.5)) || (col === 1 && row === 0 && t >= J.go2 + 0.6);
    if (busy) p.rrect(wx - 70, wy - 45, 140, 90, 14, LOCK, a * 0.3);
    p.rstroke(wx - 70, wy - 45, 140, 90 * g, 14, EDGE, 2, a);
  }
  // Compile sparks and the compiling pulse on the C++ worker.
  const [wx, wy] = WORK(0, 1);
  for (const ts of [J.spark1, J.spark2]) {
    packet(p, 1200, 190, wx, wy - 45, t, ts, 0.4, INK, 10, 0.2, a);
    const q = bump(t, ts + 0.3, ts + 0.9);
    if (q > 0) p.rstroke(wx - 74, wy - 49, 148, 98, 16, INK, 3, a * q * 0.8);
  }
  packet(p, 1200, 190, WORK(1, 0)[0], WORK(1, 0)[1] - 45, t, J.spark1 + 0.4, 0.4, INK, 10, -0.2, a);
  // Case rail with a run head, and the per-case marks.
  const rx = CASE_X - 118;
  p.line(rx, CASE_Y(0) - 22, rx, CASE_Y(0) - 22 + (CASE_Y(8) + 44 - CASE_Y(0)) * grow(t, 2, 0.3), EDGE, 2, a);
  for (const [run, _] of [[J.run1, 0], [J.run2, 1]]) {
    const u = (t - run + 0.15) / CASE_D;
    if (u >= 0 && u < NCELL) p.rrect(rx - 7, CASE_Y(Math.min(8, u)) - 7, 14, 14, 4, INK, a);
  }
  for (let c = 0; c < NCELL; c++) {
    const t1 = J.run1 + c * CASE_D, t2 = J.run2 + c * CASE_D;
    const y = CASE_Y(c), x = CASE_X + 60;
    if (t >= t2) tick(p, x, y, 18, GROUND, 3.5, seg(t, t2, t2 + 0.25), a);
    else if (t >= t1 && t < J.reset + c * 0.04) {
      if (c === J.fail) cross(p, x, y, 14, GROUND, 3.5, seg(t, t1, t1 + 0.25), a);
      else tick(p, x, y, 18, GROUND, 3.5, seg(t, t1, t1 + 0.25), a);
    }
  }
  // Verdicts: warn echo, then the accept tick drawing itself inside the worker.
  echo(p, t, J.warn, wx, wy, 140, 90, 16, WARN);
  echo(p, t, J.accept, wx, wy, 140, 90, 16, ACCENT);
  tick(p, wx + 44, wy + 22, 30, ACCENT, 6, seg(t, J.accept, J.accept + 0.6), a);
}

/* ── chapter 3 · Match ── */
function bracketHalf(t: number) {
  const base = 200 * 1.25 * easeOutBack(seg(t, M.bracket, M.bracket + 0.6));
  const w1 = 50 * 1.25 * settle(seg(t, M.widen1, M.widen1 + 0.5));
  const w2 = 50 * 1.25 * settle(seg(t, M.widen2, M.widen2 + 0.5));
  return base + w1 + w2;
}
function linkArc(p: Painter, A: Item, Bi: Item, t: number, t0: number, col: RGB, a: number) {
  const q = E(seg(t, t0, t0 + 0.4));
  if (q <= 0) return;
  const c = p.ctx;
  c.strokeStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a * 0.9})`;
  c.lineWidth = 3;
  c.lineCap = "round";
  c.beginPath();
  const steps = 16;
  for (let s = 0; s <= steps; s++) {
    const u = (s / steps) * q;
    const [x, y] = arcPt(A.x, A.y, Bi.x, Bi.y, u, 0.22);
    if (s === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.stroke();
}
function fx3(p: Painter, t: number) {
  const a = env(t, 3);
  if (a <= 0) return;
  // Three queue lanes (one per mode + difficulty group); a dot key on the left, YOU's lane brighter.
  for (let l = 0; l < 3; l++) {
    const y = LANE_Y(l), g = grow(t, 3, l * 0.08), mine = l === 1;
    const xe = lerp(300, 1300, g);
    p.line(300, y, xe, y, mine ? LOCK : EDGE, mine ? 4 : 2.5, a);
    for (let n = 0; n <= 8; n++) {
      const x = RAIL_X(800 + n * 100);
      if (x > xe) break;
      p.line(x, y + 14, x, y + 24, n === 4 ? LOCK : EDGE, 2.5, a);
    }
    p.rstroke(170, y - 20, 90, 40, 20, mine ? LOCK : EDGE, 2, a * g);
    for (let d = 0; d < 3; d++) p.disc(193 + d * 22, y, 5, d <= l ? (mine ? ACCENT : LOCK) : EDGE, a * g);
  }
  // Window bracket out of YOU (±200, widening 50 per 30 s of waiting).
  const hw = bracketHalf(t);
  const fade = 1 - seg(t, M.lift, M.lift + 0.8);
  if (hw > 0) {
    const x0 = RAIL_X(R_YOU) - hw;
    p.rrect(x0, RAIL_Y - 40, 2 * hw, 80, 20, ACCENT, a * 0.08 * fade);
    p.rstroke(x0, RAIL_Y - 40, 2 * hw, 80, 20, ACCENT, 2, a * 0.6 * fade);
  }
  // YOU's wait arc: sweeps once per 30 s step and restarts when the window widens.
  if (fade > 0) {
    const w0 = t < M.widen1 ? M.bracket : t < M.widen2 ? M.widen1 : M.widen2;
    const w1 = t < M.widen1 ? M.widen1 : t < M.widen2 ? M.widen2 : M.widen2 + 1.2;
    const sw = PI * 2 * clamp01(seg(t, w0, w1));
    const Y = role3(YOU, t);
    if (sw > 0 && t < M.lift) p.arc(Y.x, Y.y, 34, -PI / 2, -PI / 2 + sw, ACCENT, 3, a * 0.8 * fade);
    // Widen steps as pips above the bracket.
    for (let n = 0; n < 2; n++) {
      const on = t >= (n === 0 ? M.widen1 : M.widen2);
      p.disc(RAIL_X(R_YOU) - 12 + n * 24, RAIL_Y - 58, 5, on ? ACCENT : EDGE, a * fade * seg(t, M.bracket, M.bracket + 0.4));
    }
  }
  // The matchmaking job: a dial whose hand sweeps once per 5 s tick, dropping a scan line on every lane.
  p.arc(DIAL[0], DIAL[1], 46, 0, PI * 2, EDGE, 2, a);
  const ang = ((t - TICK0) % 1.0) * PI * 2 - PI / 2;
  p.line(DIAL[0], DIAL[1], DIAL[0] + Math.cos(ang) * 40, DIAL[1] + Math.sin(ang) * 40, ACCENT, 3, a * 0.8);
  for (let n = 0; n < 4; n++) p.disc(DIAL[0] + Math.cos(n * PI / 2) * 46, DIAL[1] + Math.sin(n * PI / 2) * 46, 4, LOCK, a);
  if (t >= TICK0) {
    const u = ((t - TICK0) % 1.0) / 0.6;
    if (u < 1) {
      const sx = lerp(300, 1300, ES(u));
      p.line(sx, LANE_Y(0) - 34, sx, LANE_Y(2) + 34, INK, 1.5, a * 0.22 * Math.sin(PI * u));
    }
  }
  p.line(DIAL[0], DIAL[1] + 50, DIAL[0], lerp(DIAL[1] + 50, LOBBY_Y - 40, grow(t, 3, 0.2)), EDGE, 2, a * 0.6);
  // Links inside each lane's pair, and the YOU ↔ RIVAL link.
  for (const pr of PAIRS) linkArc(p, role3(pr.a + 3, t), role3(pr.b + 3, t), t, pr.t, LOCK, a);
  linkArc(p, role3(YOU, t), role3(RIVAL, t), t, M.match, ACCENT, a);
  // Lobby pad under the lifted pair, then ready-up ticks.
  const lq = E(seg(t, M.lift + 0.3, M.lift + 1.1));
  if (lq > 0) p.rstroke(800 - 130 * lq, LOBBY_Y - 46, 260 * lq, 92, 46, ACCENT, 2, a * 0.6);
  const Y = role3(YOU, t), R = role3(RIVAL, t);
  tick(p, Y.x, Y.y - 50, 22, ACCENT, 4, seg(t, M.ready1, M.ready1 + 0.4), a);
  tick(p, R.x, R.y - 50, 22, INK, 4, seg(t, M.ready2, M.ready2 + 0.4), a);
  echo(p, t, M.match, (Y.x + R.x) / 2, RAIL_Y, Math.abs(R.x - Y.x) + 60, 60, 30, ACCENT);
}

/* ── chapter 4 · Battle ── */
function fx4(p: Painter, t: number) {
  const a = env(t, 4);
  if (a <= 0) return;
  const g = grow(t, 4);
  // Spine from the hub to the problem cards, and lanes from each slot to its card edge.
  p.line(HUB[0], HUB[1] + 40, HUB[0], lerp(HUB[1] + 40, CARD_Y(2), g), EDGE, 2, a);
  for (let j = 0; j < 3; j++) {
    const y = CARD_Y(j);
    p.line(P_YOU_X + 75, y, lerp(P_YOU_X + 75, HUB[0] - 100, g), y, EDGE, 2, a);
    p.line(P_RIV_X - 75, y, lerp(P_RIV_X - 75, HUB[0] + 100, g), y, EDGE, 2, a);
    // Card halves light when a side has solved it.
    const c = p.ctx;
    const yS = solvedBy(0, j, t), rS = solvedBy(1, j, t);
    if (yS || rS) {
      c.save();
      p.rrPath(HUB[0] - 100, y - 35, 200, 70, 14);
      c.clip();
      if (yS) p.rrect(HUB[0] - 100, y - 35, 100, 70, 0, ACCENT, a * 0.9);
      if (rS) p.rrect(HUB[0], y - 35, 100, 70, 0, INK, a * 0.9);
      c.restore();
    }
  }
  // Duration arc around the hub.
  p.arc(HUB[0], HUB[1], 70, 0, PI * 2, EDGE, 4, a);
  const sweep = PI * 2 * seg(t, B.start, B.end);
  if (sweep > 0) p.arc(HUB[0], HUB[1], 70, -PI / 2, sweep, ACCENT, 6, a);
  // Packets: slot → hub, then the verdict back; a state pulse ring after each verdict.
  for (const s of SUBS) {
    const sx = s.who === 0 ? P_YOU_X : P_RIV_X, sy = CARD_Y(s.slot);
    packet(p, sx, sy, HUB[0], HUB[1], t, s.t, s.dur * 0.45, s.who === 0 ? ACCENT : INK, 14, s.who === 0 ? -0.2 : 0.2, a);
    packet(p, HUB[0], HUB[1], sx, sy, t, s.t + s.dur * 0.5, s.dur * 0.5, s.ok ? ACCENT : WARN, 14, s.who === 0 ? -0.2 : 0.2, a);
    const q = seg(t, s.t + s.dur, s.t + s.dur + 0.5);
    if (q > 0 && q < 1) p.arc(HUB[0], HUB[1], 70 + 50 * EO(q), 0, PI * 2, INK, 2, a * (1 - q) * 0.6);
    if (!s.ok) echo(p, t, s.t + s.dur, sx, sy, 150, 56, 14, WARN);
  }
  // Score pips under each player and the tiebreak ladder under the hub.
  for (let j = 0; j < 3; j++) {
    const yS = solvedBy(0, j, t), rS = solvedBy(1, j, t);
    p.disc(P_YOU_X - 30 + j * 30, PL_Y + 72, 7, yS ? ACCENT : EDGE, a);
    p.disc(P_RIV_X - 30 + j * 30, PL_Y + 72, 7, rS ? INK : EDGE, a);
    const lit = j === 0 && t >= B.win + 0.1;
    p.rrect(HUB[0] - 44 + j * 30, HUB[1] + 92, 16, 16, 4, lit ? ACCENT : EDGE, a);
  }
  echo(p, t, B.win, P_YOU_X, PL_Y, 88, 88, 44, ACCENT);
}

/* ── chapter 5 · Rate ── */
function fx5(p: Painter, t: number) {
  const a = env(t, 5);
  if (a <= 0) return;
  const g = grow(t, 5);
  // Axes with rating-difference ticks and the 0.5 guide.
  p.line(EX0, EY0, lerp(EX0, EX1, g), EY0, EDGE, 3, a);
  p.line(EX0, EY0, EX0, lerp(EY0, EY1, g), EDGE, 3, a);
  for (let n = 0; n <= 8; n++) p.line(eloX(-400 + n * 100), EY0 + 10, eloX(-400 + n * 100), EY0 + 20, EDGE, 2, a * g);
  p.line(EX0, eloY(0.5), EX1, eloY(0.5), EDGE, 1.5, a * 0.6 * g);
  p.line(EX0, eloY(1), EX1, eloY(1), EDGE, 1.5, a * 0.35 * g);
  // The expected-score curve draws itself.
  const cq = E(seg(t, RT.curve, RT.curve + 1.2));
  if (cq > 0) {
    const c = p.ctx;
    c.strokeStyle = `rgba(${INK[0]},${INK[1]},${INK[2]},${a * 0.6})`;
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    const n = Math.floor(cq * (CURVE.length - 1));
    for (let i = 0; i <= n; i++) { const [x, y] = CURVE[i]; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
  }
  // Drop line at the real gap, then the read-off to the y axis.
  const px = eloX(GAP), py = eloY(E_YOU);
  const dq = E(seg(t, RT.drop, RT.drop + 0.6));
  if (dq > 0) {
    p.line(px, EY0, px, lerp(EY0, py, dq), ACCENT, 3, a);
    p.disc(px, py, 9 * clamp01(dq * 2), ACCENT, a);
  }
  const rq = E(seg(t, RT.read, RT.read + 0.5));
  if (rq > 0) p.line(px, py, lerp(px, EX0, rq), py, ACCENT, 3, a * 0.9);
  // Rail with ticks; ghost outlines mark the pre-slide positions.
  p.line(300, RATE_RAIL_Y, lerp(300, 1300, g), RATE_RAIL_Y, EDGE, 4, a);
  for (let n = 0; n <= 8; n++) p.line(RAIL_X(800 + n * 100), RATE_RAIL_Y + 14, RAIL_X(800 + n * 100), RATE_RAIL_Y + 26, EDGE, 3, a * g);
  const sq = seg(t, RT.slide, RT.slide + 0.4);
  if (sq > 0) {
    p.arc(RAIL_X(R_YOU), RATE_RAIL_Y, 22, 0, PI * 2, ACCENT, 2, a * 0.45 * sq);
    p.arc(RAIL_X(R_RIVAL), RATE_RAIL_Y, 22, 0, PI * 2, INK, 2, a * 0.45 * sq);
  }
  // K-factor dots: three lit for < 10 battles, two for 10–29.
  for (let n = 0; n < 3; n++) {
    const q = seg(t, RT.kdots + n * 0.18, RT.kdots + n * 0.18 + 0.25);
    const Y = role5(YOU, t), R = role5(RIVAL, t);
    p.disc(Y.x - 20 + n * 20, RATE_RAIL_Y - 52, 6, q > 0 ? ACCENT : EDGE, a);
    p.disc(R.x - 20 + n * 20, RATE_RAIL_Y - 52, 6, n < 2 && q > 0 ? INK : EDGE, a);
  }
  // Rewards: coin pips from the calculator into YOU, and an XP bar under the marker.
  const Y = role5(YOU, t);
  for (let n = 0; n < 3; n++) packet(p, 800, 180, Y.x, Y.y, t, RT.reward + n * 0.15, 0.8, ACCENT, 12, 0.3, a);
  const xq = E(seg(t, RT.reward + 0.8, RT.reward + 1.6));
  if (xq > 0) p.rrect(Y.x - 40, RATE_RAIL_Y + 44, 80 * xq, 10, 4, ACCENT, a);
  echo(p, t, RT.slide + 1.0, Y.x, Y.y, 44, 44, 22, ACCENT);
}

/* ── chapter 6 · Rank ── */
const BAND_Y = (n: number) => 750 - n * 86; // bottom edge of band n
function fx6(p: Painter, t: number) {
  const a = env(t, 6);
  if (a <= 0) return;
  const g = grow(t, 6);
  const yr = yourRank(t);
  p.rstroke(280, 210, 740, 550 * g, 16, EDGE, 2, a);
  for (let r = 0; r <= 10; r++) {
    const mine = Math.abs(r - yr) < 0.5;
    p.disc(262, ROW_Y(r), mine ? 7 : 5, mine ? ACCENT : r < 3 ? LOCK : EDGE, a * g);
  }
  // XP pips from the header into YOU's row while it climbs.
  const Y = role6(YOU, t);
  for (let n = 0; n < 6; n++) packet(p, ROW_X0 + 280, 170, Y.x + Y.w / 2, Y.y, t, RK.climb0 + n * 0.9, 0.6, ACCENT, 12, 0.25, a);
  // Level ladder: six brackets; the marker rises in the first and jumps into the second.
  for (let n = 0; n < 6; n++) {
    const yb = BAND_Y(n);
    const gg = grow(t, 6, 0.1 + n * 0.06);
    const cur = n === 0 ? 1 - seg(t, RK.levelup, RK.levelup + 0.4) : n === 1 ? seg(t, RK.levelup, RK.levelup + 0.4) : 0;
    if (cur > 0) p.rrect(1180, yb - 76, 240, 76, 10, LOCK, a * 0.3 * cur);
    p.rstroke(1180, yb - 76, 240, 76 * gg, 10, EDGE, 2, a);
  }
  const u = seg(t, RK.climb0, RK.climb1);
  const my = t < RK.levelup ? BAND_Y(0) - 14 - 44 * E(u) : lerp(BAND_Y(0) - 58, BAND_Y(1) - 14, settle(seg(t, RK.levelup, RK.levelup + 0.8)));
  p.rrect(1300 - 30, my - 8, 60, 16, 8, ACCENT, a);
  echo(p, t, RK.levelup, 1300, BAND_Y(1) - 38, 240, 76, 12, ACCENT);
  // Streak dots and the multiplier bar (1.0 → 1.5 cap).
  for (let n = 0; n < 7; n++) {
    const lit = t >= RK.climb0 + n * 0.4;
    p.disc(300 + n * 34, 800, lit ? 8 : 6, lit ? ACCENT : EDGE, a);
  }
  p.line(560, 800, lerp(560, 960, g), 800, EDGE, 4, a);
  p.line(960, 788, 960, 812, LOCK, 3, a * g);
  let lit = 0;
  for (let n = 0; n < 7; n++) if (t >= RK.climb0 + n * 0.4) lit++;
  const mx = lerp(560, 960, Math.min(0.5, lit * 0.01) / 0.5);
  p.rrect(mx - 7, 790, 14, 20, 5, ACCENT, a);
  echo(p, t, RK.climb1, Y.x, Y.y, Y.w, 36, 12, ACCENT);
}

/* ── chapter 7 · Sync ── */
const STOPS = [820, 920, 1020];
function syncPacket(p: Painter, t: number, t0: number, dur: number, col: RGB, a: number, token: boolean) {
  const q = seg(t, t0, t0 + dur);
  if (q <= 0 || q >= 1) return;
  const draw = (qq: number, size: number, c: RGB, al: number) => {
    if (qq <= 0 || qq >= 1) return;
    let x: number, y: number;
    if (qq < 0.3) [x, y] = arcPt(BADGE[0], BADGE[1], 790, 480, E(qq / 0.3), -0.3);
    else { x = lerp(790, SERVER[0] - 36, (qq - 0.3) / 0.7); y = 480; }
    p.rrect(x - size / 2, y - size / 2, size, size, 4, c, al);
  };
  draw(q, 14, col, a);
  draw(q - 0.04, 10, col, a * 0.6);
  if (token) draw(q - 0.09, 8, INK, a * 0.9);
  // Stop rings flash as the packet passes.
  STOPS.forEach((sx) => {
    const sq = 0.3 + ((sx - 790) / (SERVER[0] - 36 - 790)) * 0.7;
    const f = bump(q, sq - 0.04, sq + 0.08);
    if (f > 0) p.arc(sx, 480, 16 + 8 * f, 0, PI * 2, col, 2.5, a * f);
  });
}
function fx7(p: Painter, t: number) {
  const a = env(t, 7);
  if (a <= 0) return;
  const g = grow(t, 7);
  // The LeetCode tab: frame, toolbar, status bar, row status discs.
  p.rstroke(TAB.x, TAB.y, TAB.w, TAB.h * g, 18, EDGE, 2, a);
  p.line(TAB.x, 220, TAB.x + TAB.w * g, 220, EDGE, 2, a);
  p.line(TAB.x, 735, TAB.x + TAB.w * g, 735, EDGE, 2, a);
  for (let n = 0; n < 3; n++) p.disc(200 + n * 24, 195, 6, EDGE, a);
  for (let c = 0; c < NCELL; c++) {
    const solved = c === 0 || c === 2 || (c === 6 && t >= SV.accept + 0.4);
    const att = c === 4 && t >= SV.aLand;
    p.disc(200, SROW_Y(c), 6, solved ? ACCENT : att ? LOCK : EDGE, a * g);
  }
  // Rail from the tab to the server with three stops (injected → content script → background).
  const rg = grow(t, 7, 0.2);
  p.line(790, 480, lerp(790, SERVER[0] - 36, rg), 480, EDGE, 3, a);
  STOPS.forEach((sx, n) => { if (rg > n / 3) p.arc(sx, 480, 16, 0, PI * 2, EDGE, 2.5, a); });
  // Response flashes on the rows, then the two packets (dim attempt, bright accept with a token pip).
  echo(p, t, SV.attempt + 0.4, SROW_X, SROW_Y(4), 420, 36, 10, LOCK);
  echo(p, t, SV.accept + 0.4, SROW_X, SROW_Y(6), 420, 36, 10, ACCENT);
  syncPacket(p, t, SV.aSend, SV.aLand - SV.aSend, LOCK, a, false);
  syncPacket(p, t, SV.cSend, SV.cLand - SV.cSend, ACCENT, a, true);
  echo(p, t, SV.cLand, SERVER[0], SERVER[1], 70, 70, 18, ACCENT);
  // SSE to the mini map: a line, a pulse, and the node that lights.
  p.line(SERVER[0] + 36, 480, lerp(SERVER[0] + 36, 1250, rg), 480, EDGE, 3, a);
  packet(p, SERVER[0] + 36, 480, 1330, 520, t, SV.sse - 0.4, 0.4, ACCENT, 12, 0.3, a);
  for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) {
    const x = 1270 + col * 60, y = 400 + row * 60;
    const hot = col === 1 && row === 2 && t >= SV.sse;
    if (hot) p.rrect(x - 13, y - 13, 26, 26, 8, ACCENT, a);
    p.rstroke(x - 13, y - 13, 26, 26, 8, hot ? ACCENT : EDGE, 2, a * rg);
    if (row > 0) p.line(x, y - 47, x, y - 13, EDGE, 2, a * rg);
  }
  echo(p, t, SV.sse, 1330, 520, 26, 26, 8, ACCENT);
}

/* ── chapter 8 · Conquer ── */
const RAILX8 = (n: number) => 300 + (n * 1000) / 26;
const RAIL_LIT = (n: number, t: number) => n < 4 || (n === 4 && t >= STAGE_DONE[0]) || (n === 5 && t >= STAGE_DONE[1]);
function fx8(p: Painter, t: number) {
  const a = env(t, 8) * (t >= RETURN0 ? 1 - seg(t, RETURN0, RETURN0 + 0.8) : 1);
  if (a <= 0) return;
  const g = grow(t, 8);
  // 27-stage rail: 24 discs and 3 bonus diamonds; completed stages lit.
  p.line(300, 190, lerp(300, 1300, g), 190, EDGE, 2, a);
  for (let n = 0; n < 27; n++) {
    if (RAILX8(n) > lerp(300, 1300, g) + 1) break;
    const lit = RAIL_LIT(n, t);
    const c = p.ctx;
    if (n >= 24) {
      c.save(); c.translate(RAILX8(n), 190); c.rotate(PI / 4);
      p.rrect(-6, -6, 12, 12, 2, lit ? ACCENT : LOCK, a);
      c.restore();
    } else p.disc(RAILX8(n), 190, lit ? 7 : 5, lit ? ACCENT : LOCK, a);
  }
  for (let s = 0; s < 2; s++) packet(p, 190, 190, RAILX8(4 + s), 190, t, STAGE_DONE[s] - 0.5, 0.5, ACCENT, 10, 0.2, a);
  // Column frames and paths; solved paths light.
  for (let col = 0; col < 3; col++) {
    const x = 480 + col * 320;
    const done = col < 2 && t >= STAGE_DONE[col];
    if (done) p.rrect(x - 75, 225, 150, 530, 30, ACCENT, a * 0.08);
    p.rstroke(x - 75, 225, 150, 530 * grow(t, 8, col * 0.1), 30, done ? ACCENT : EDGE, 2, a * (done ? 0.6 : 0.5));
    for (let row = 0; row < 2; row++) {
      const c = col * 3 + row;
      const [x0, y0] = NODE(c), [, y1] = NODE(c + 1);
      p.line(x0, y0 + 40, x0, y1 - 40, EDGE, 3, a);
      const q = SOLVE[c] > 0 && SOLVE[c] < 1e8 ? E(seg(t, SOLVE[c] + 0.2, SOLVE[c] + 0.7)) : 0;
      if (q > 0) p.line(x0, y0 + 40, x0, lerp(y0 + 40, y1 - 40, q), ACCENT, 3, a);
    }
    if (col < 2) {
      const [ax, ay] = NODE(col * 3 + 2), [bx, by] = NODE(col * 3 + 3);
      p.line(ax + 40, ay - 20, bx - 40, by + 20, EDGE, 2, a * 0.7);
      const q = E(seg(t, SOLVE[col * 3 + 2] + 0.2, SOLVE[col * 3 + 2] + 0.9));
      if (q > 0) p.line(ax + 40, ay - 20, lerp(ax + 40, bx - 40, q), lerp(ay - 20, by + 20, q), ACCENT, 2, a);
    }
  }
  // Ticks inside solved nodes, in ground colour; unlock cascade echo on the LC-synced stage.
  for (let c = 0; c < NCELL; c++) {
    if (SOLVE[c] > 1e8) continue;
    const [x, y] = NODE(c);
    tick(p, x, y, 26, GROUND, 4, SOLVE[c] < 0 ? 1 : seg(t, SOLVE[c] + 0.1, SOLVE[c] + 0.45), a);
  }
  echo(p, t, UNLOCK[4], NODE(4)[0], NODE(4)[1], 70, 70, 20, LOCK);
  echo(p, t, STAGE_DONE[0], 480, 490, 150, 530, 30, ACCENT);
  echo(p, t, STAGE_DONE[1], 800, 490, 150, 530, 30, ACCENT);
}

/* ───────────────────────── ripples (the eight biggest moments) ───────────────────────── */
const RIPPLES: [number, number, number][] = [
  [QS_LAST.t0, 960, 600], [TS_END, ROW1_X(7), ROW1_Y], [J.accept, 1100, 420], [M.match, 1012, RAIL_Y],
  [B.win, P_YOU_X, PL_Y], [RK.levelup, 1300, 660], [SV.sse, 1330, 520], [STAGE_DONE[1], 800, 480],
];

/* ───────────────────────── camera ───────────────────────── */
function cam(t: number): [number, number, number] {
  const push = (a: number, b: number, s: number, cx: number, cy: number): [number, number, number] | null => {
    const q = seg(t, a, a + 2) * (1 - seg(t, b - 2, b));
    return q > 0 ? [1 + (s - 1) * ES(q), cx, cy] : null;
  };
  return push(14, 23, 1.07, 600, 460) || push(50, 60, 1.05, 800, 480) || push(97, 106, 1.08, 800, 480) || [1, 800, 500];
}

/* ───────────────────────── draw ───────────────────────── */
const FX = [fx0, fx1, fx2, fx3, fx4, fx5, fx6, fx7, fx8];
function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => {
    let s = 0;
    for (const [t0, ex, ey] of RIPPLES) s += ripple(t, t0, ex, ey, x, y);
    return s;
  }, ACCENT);
  const [s, cx, cy] = cam(t);
  const c = p.ctx;
  c.save();
  if (s !== 1) { c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy); }
  const ch = chapterAt(t);
  // Furniture for the current chapter and its neighbours (their envelopes handle the rest).
  for (let i = Math.max(0, ch - 1); i <= Math.min(8, ch + 1); i++) FX[i](p, t);
  if (ch === 9) { fx8(p, t); fx0(p, t); }
  const items: Item[] = [];
  for (let k = 0; k < NTOK; k++) items.push(tokenState(k, t));
  items.sort((A, Bi) => A.z - Bi.z);
  for (const I of items) drawItem(p, I);
  c.restore();
}

export const vantage: FilmDef = {
  ground: "#1d3b2a",
  loop: LOOP,
  still: 58,
  chapters: [
    { label: "Watch", range: [0, 12] },
    { label: "Trace", range: [12, 25] },
    { label: "Judge", range: [25, 37] },
    { label: "Match", range: [37, 48] },
    { label: "Battle", range: [48, 62] },
    { label: "Rate", range: [62, 72] },
    { label: "Rank", range: [72, 83] },
    { label: "Sync", range: [83, 95] },
    { label: "Conquer", range: [95, 108] },
  ],
  draw,
};
