// QUANT: eight deals carry the analytics pipeline's five pillars in one seamless loop.
// Collect (a read-only copy; writes are refused) → reconstruct round turns from deals →
// quintile-binned calendar → one session's cumulative walk → equity against its running peak.
import {
  PI, Painter, bump, css, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#0b3048");
const INK = hex("#e8f1f7");
const GAIN = hex("#5cf2a5");
const LOSS = hex("#ff6b6b");
const FLAT = hex("#9aa8ff");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Item = { x: number; y: number; w: number; h: number; r: number; c: RGB; z?: number; hollow?: boolean; a?: number };

const N = 8;
const outcome = (v: number): RGB => (v > 0 ? GAIN : v < 0 ? LOSS : FLAT);

function morph(A: Item, B: Item, p: number, lift: number): Item {
  return {
    x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * lift,
    w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p), c: mix(A.c, B.c, p),
    a: lerp(A.a ?? 1, B.a ?? 1, p), hollow: B.hollow, z: 1,
  };
}

/* The deal tape, in broker time order: a deposit, then eight positions' opens and closes,
   interleaved. Position 2 is closed in two partial exits. */
type Deal = { pos: number; kind: "in" | "out" | "bal" };
const DEALS: Deal[] = "B I0 I1 O0 I2 O1 I3 O2 I4 O3 O2 I5 O4 I6 O5 I7 O6 O7"
  .split(" ")
  .map((s) => (s === "B" ? { pos: -1, kind: "bal" } : { pos: +s.slice(1), kind: s[0] === "I" ? "in" : "out" }));
const ND = DEALS.length;
const IN_IDX = Array.from({ length: N }, (_, k) => DEALS.findIndex((d) => d.kind === "in" && d.pos === k));
const OUTS = Array.from({ length: N }, (_, k) => DEALS.flatMap((d, i) => (d.kind === "out" && d.pos === k ? [i] : [])));
const LAST_OUT = OUTS.map((o) => o[o.length - 1]);
// Each position's net once rebuilt (and, in chapter 3, the day it closed on).
const NET = [120, -60, 260, 0, 180, -210, 70, -35];

/* 1. COLLECT: deals are copied from the broker through a one-way gate into the archive */
const BROKER_X = 300, ARCH_X = 1200, GATE = { x: 720, y: 500 };
const slotY = (i: number) => 266 + i * 26;
const dep = (i: number) => 0.45 + i * 0.17;
const atGate = (i: number) => dep(i) + 0.35;
const filed = (i: number) => atGate(i) + 0.45;
const FILED = filed(ND - 1);
const PROBE0 = 4.25, HIT = 4.55;

function collectD(i: number, t: number): Item {
  const d = DEALS[i];
  const c = d.kind === "out" ? GREY : INK, hollow = d.kind === "bal";
  const t0 = dep(i), t1 = atGate(i), t2 = filed(i);
  if (t < t0) return { x: BROKER_X, y: slotY(i), w: 140, h: 14, r: 7, c, hollow };
  if (t < t1) {
    const p = ease(seg(t, t0, t1));
    return { x: lerp(BROKER_X, GATE.x, p), y: lerp(slotY(i), GATE.y, p), w: lerp(140, 46, p), h: lerp(14, 16, p), r: 8, c, hollow, z: 2 };
  }
  if (t < t2) {
    const p = ease(seg(t, t1, t2));
    return { x: lerp(GATE.x, ARCH_X, p), y: lerp(GATE.y, slotY(i), p), w: lerp(46, 300, p), h: 16, r: 8, c, hollow, z: 2 };
  }
  return { x: ARCH_X, y: slotY(i), w: 300 * (1 + 0.05 * bump(t, t2, t2 + 0.3)), h: 16, r: 8, c: mix(c, GAIN, bump(t, t2, t2 + 0.4)), hollow };
}
const collectS = (k: number, t: number) => collectD(IN_IDX[k], t);

/* 2. RECONSTRUCT: balance ops drop out first; deals group by position into round-turn trades */
const M2 = 5.0;
const laneY = (k: number) => 250 + k * 66;
const seqX = (i: number) => 330 + i * 55;
const CASH_Y = 840, SQ = 30;
const mk = (k: number) => 6.8 + k * 0.3;

function laneD(i: number, t: number): Item {
  const d = DEALS[i];
  if (d.kind === "bal") return { x: seqX(i), y: CASH_Y, w: SQ, h: SQ, r: 8, c: mix(INK, LOCK, seg(t, 6.0, 6.5)), hollow: true };
  const m = mk(d.pos);
  return { x: seqX(i), y: laneY(d.pos), w: SQ, h: SQ, r: 8, c: GREY, a: 1 - seg(t, m + 0.45, m + 0.65) };
}

function reconstructS(k: number, t: number): Item {
  const xi = seqX(IN_IDX[k]), xo = seqX(LAST_OUT[k]), m = mk(k);
  const g = ease(seg(t, m + 0.25, m + 0.65));
  const left = xi - SQ / 2, right = lerp(xi + SQ / 2, xo + SQ / 2, g);
  const pop = 1 + 0.16 * bump(t, m + 0.65, m + 0.95);
  return { x: (left + right) / 2, y: laneY(k), w: right - left, h: SQ * pop, r: 8, c: mix(INK, outcome(NET[k]), seg(t, m + 0.5, m + 0.7)) };
}

// Closing deals and the deposit are scenery, not cast: they ride along, then are absorbed or set aside.
function furnD(i: number, t: number): Item | null {
  if (t < M2) return collectD(i, t);
  if (t < 10.0) {
    const s = M2 + i * 0.05, p = ease(seg(t, s, s + 0.8));
    if (p < 1) return morph(collectD(i, M2), laneD(i, s + 0.8), p, 30);
    const it = laneD(i, t);
    if (DEALS[i].kind === "bal") it.a = 1 - seg(t, 9.5, 9.9);
    return it;
  }
  if (t < 24.5) return null;
  return { ...collectD(i, 0), a: seg(t, 24.9, 25.5) };
}

/* 3. CALENDAR: |net| quintile bins (the flat day sits out), then each day lands in its cell */
const BASE3 = 720, FLAT_X = 196, BAR3 = 44, H3 = 1.5;
const barX = (r: number) => 270 + r * 64;
const MAG_K = [...Array(N).keys()].filter((k) => NET[k] !== 0).sort((a, b) => Math.abs(NET[a]) - Math.abs(NET[b]));
const RANK: number[] = [];
MAG_K.forEach((k, r) => (RANK[k] = r));
const MAGS = MAG_K.map((k) => Math.abs(NET[k]));
const quantile = (p: number) => {
  const idx = (MAGS.length - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
  return MAGS[lo] * (1 - (idx - lo)) + MAGS[hi] * (idx - lo);
};
const TH = [0.2, 0.4, 0.6, 0.8].map(quantile);
const binOf = (v: number) => {
  for (let i = 0; i < TH.length; i++) if (v <= TH[i]) return i;
  return 4;
};
const ramp = (net: number) => {
  const base = outcome(net);
  return mix(mix(GROUND, base, 0.42), base, binOf(Math.abs(net)) / 4);
};
const thY = (v: number) => BASE3 - v * H3;
const lineT = (j: number) => 11.3 + j * 0.16;
const binT = (r: number) => 11.95 + r * 0.1;
const flyT = (k: number) => (NET[k] === 0 ? 12.6 : 12.75 + RANK[k] * 0.12);
const FILLED = Math.max(...NET.map((_, k) => flyT(k))) + 0.6;
const CAL_X = 820, CAL_Y = 300, PITCH = 84, CELL = 72;
const cellX = (c: number) => CAL_X + c * PITCH + CELL / 2;
const cellY = (r: number) => CAL_Y + r * PITCH + CELL / 2;
const DAY: [number, number][] = [[0, 3], [0, 4], [1, 1], [1, 3], [2, 0], [2, 2], [3, 1], [3, 4]];
const isVoid = (r: number, c: number) => (r === 0 && c < 2) || (r === 4 && c > 2);
const BEST = NET.indexOf(Math.max(...NET));

function binS(k: number, t: number): Item {
  const net = NET[k];
  let rest: Item;
  if (net === 0) rest = { x: FLAT_X, y: BASE3 - 6, w: BAR3, h: 12, r: 6, c: FLAT };
  else {
    const h = Math.abs(net) * H3, bt = binT(RANK[k]);
    const s = 1 + 0.2 * bump(t, bt, bt + 0.3);
    rest = { x: barX(RANK[k]), y: BASE3 - h / 2, w: BAR3 * s, h, r: 10, c: mix(outcome(net), ramp(net), seg(t, bt, bt + 0.2)) };
  }
  const ft = flyT(k), q = ease(seg(t, ft, ft + 0.6));
  if (q <= 0) return rest;
  const [r, c] = DAY[k];
  const pop = 1 + 0.1 * bump(t, ft + 0.6, ft + 0.9);
  const cell: Item = { x: cellX(c), y: cellY(r), w: CELL * pop, h: CELL * pop, r: 14, c: rest.c };
  if (q >= 1) return cell;
  return { ...morph(rest, cell, q, 40), z: 2 };
}

/* 4. SESSION: one day's trades in close order, walking the cumulative net as a step line */
const S_NET = [-50, -40, 70, 60, 0, -45, 90, 55];
const CUM = S_NET.map((_, k) => S_NET.slice(0, k + 1).reduce((s, v) => s + v, 0));
const SX = [380, 480, 560, 700, 770, 900, 1060, 1200];
const S_L = 300, S_R = 1260, ZERO_Y = 560, AXIS_Y = 800, H4 = 1.7;
const yOf = (v: number) => ZERO_Y - v * H4;
const PH0 = 16.1, PH1 = 19.1;
const PH = (t: number) => lerp(S_L, S_R, seg(t, PH0, PH1));
const reach = (k: number) => PH0 + ((SX[k] - S_L) / (S_R - S_L)) * (PH1 - PH0);
const lift4 = (k: number, t: number) => easeOut(seg(t, reach(k), reach(k) + 0.4));

function sessionS(k: number, t: number): Item {
  const q = lift4(k, t), rk = reach(k);
  const rad = lerp(9, 15, q) * (1 + 0.22 * bump(t, rk + 0.4, rk + 0.7));
  return { x: SX[k], y: lerp(AXIS_Y, yOf(CUM[k]), q), w: 2 * rad, h: 2 * rad, r: rad, c: mix(IDLE, outcome(S_NET[k]), seg(t, rk, rk + 0.2)) };
}

function sessionPath(t: number): [number, number][] {
  const px = PH(t);
  const pts: [number, number][] = [[S_L, ZERO_Y]];
  let y = ZERO_Y;
  for (let k = 0; k < N; k++) {
    if (px < SX[k]) break;
    pts.push([SX[k], y]);
    y = lerp(y, yOf(CUM[k]), lift4(k, t));
    pts.push([SX[k], y]);
  }
  pts.push([px, y]);
  return pts;
}

/* 5. DRAWDOWN: equity bars against the running peak; the gap below the peak hangs underwater */
const EQ = [100, 140, 120, 175, 150, 110, 165, 210];
const PEAK = EQ.map((_, k) => Math.max(...EQ.slice(0, k + 1)));
const DD = EQ.map((v, k) => PEAK[k] - v);
const MAXDD = DD.indexOf(Math.max(...DD));
const BX = (k: number) => 345 + k * 130;
const BW5 = 84, BASE5 = 620, UW_Y = 676, H5 = 1.45, HD = 2.2;
const gt = (k: number) => 20.85 + k * 0.3;

function equityS(k: number, t: number): Item {
  const g = ease(seg(t, gt(k), gt(k) + 0.45));
  const h = lerp(12, EQ[k] * H5, g);
  const high = DD[k] === 0;
  const s = high ? 1 + 0.1 * bump(t, gt(k) + 0.45, gt(k) + 0.75) : 1;
  return { x: BX(k), y: BASE5 - h / 2, w: BW5 * s, h, r: lerp(6, 10, g), c: mix(IDLE, high ? GAIN : INK, seg(t, gt(k) + 0.2, gt(k) + 0.45)) };
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Item; dur?: number; stag?: (k: number) => number };
const STAG = (k: number) => k * 0.06;
const SCENES: Scene[] = [
  { t: 0, fn: collectS },
  { t: M2, fn: reconstructS, dur: 0.8, stag: (k) => IN_IDX[k] * 0.05 },
  { t: 10.0, fn: binS, dur: 0.8, stag: STAG },
  { t: 15.0, fn: sessionS, dur: 0.8, stag: STAG },
  { t: 20.0, fn: equityS, dur: 0.8, stag: STAG },
  { t: 24.5, fn: (k) => collectS(k, 0), dur: 0.8, stag: (k) => k * 0.05 },
];
const LOOP = 25.8;

function itemState(k: number, t: number): Item {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (!sc.dur || !sc.stag) return sc.fn(k, t);
  const st = sc.stag(k);
  const p = ease(seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(k, t);
  return morph(SCENES[i - 1].fn(k, sc.t), sc.fn(k, sc.t + st + sc.dur), p, 32);
}

/* echoes and ripples */
type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; c: RGB; ripple: boolean };
const ECHOES: Echo[] = [
  { t: FILED + 0.05, x: ARCH_X, y: 487, w: 0, h: 0, r: 0, c: GAIN, ripple: true },
  { t: HIT, x: GATE.x, y: GATE.y, w: 48, h: 200, r: 24, c: LOSS, ripple: false },
  { t: mk(N - 1) + 0.7, x: 800, y: 480, w: 0, h: 0, r: 0, c: GAIN, ripple: true },
  { t: FILLED + 0.05, x: cellX(3), y: cellY(2), w: 0, h: 0, r: 0, c: GAIN, ripple: true },
  { t: FILLED + 0.45, x: cellX(DAY[BEST][1]), y: cellY(DAY[BEST][0]), w: CELL, h: CELL, r: 14, c: GAIN, ripple: false },
  { t: reach(N - 1) + 0.45, x: SX[N - 1], y: yOf(CUM[N - 1]), w: 30, h: 30, r: 15, c: GAIN, ripple: true },
  { t: gt(MAXDD) + 0.85, x: BX(MAXDD), y: UW_Y + 8 + (DD[MAXDD] * HD) / 2, w: BW5, h: DD[MAXDD] * HD, r: 8, c: LOSS, ripple: false },
  { t: gt(N - 1) + 0.5, x: BX(N - 1), y: BASE5 - (EQ[N - 1] * H5) / 2, w: BW5, h: EQ[N - 1] * H5, r: 10, c: GAIN, ripple: true },
];

function drawItem(p: Painter, it: Item) {
  const a = it.a ?? 1;
  if (a <= 0) return;
  if (it.hollow) p.rstroke(it.x - it.w / 2 + 1.5, it.y - it.h / 2 + 1.5, it.w - 3, it.h - 3, it.r, it.c, 3, a);
  else p.rrect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, it.r, it.c, a);
}

function drawEcho(p: Painter, e: Echo, t: number) {
  if (e.w <= 0) return;
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 34 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, e.c, 3, 0.75 * (1 - q));
}

/* chapter furniture */
function drawCollect(p: Painter, t: number) {
  const a = Math.max(1 - seg(t, 5.0, 5.5), seg(t, 24.7, 25.4));
  if (a <= 0) return;
  p.rstroke(205, 236, 190, 500, 22, LOCK, 4, a);
  p.rstroke(1035, 236, 330, 500, 22, LOCK, 4, a);
  // Broker terminal and archive marks in place of names.
  p.arc(BROKER_X, 186, 20, 0, PI * 2, LOCK, 4, a);
  p.disc(BROKER_X, 186, 8, GREY, a);
  for (let j = 0; j < 3; j++) p.rrect(ARCH_X - 26, 170 + j * 13, 52, 9, 4.5, LOCK, a);
  p.line(395, GATE.y, GATE.x - 24, GATE.y, EDGE, 5, a);
  p.line(GATE.x + 24, GATE.y, 1035, GATE.y, EDGE, 5, a);
  // The broker keeps its history: what leaves is a copy.
  for (let i = 0; i < ND; i++) p.rrect(BROKER_X - 70, slotY(i) - 7, 140, 14, 7, IDLE, a);
  let pass = 0;
  for (let i = 0; i < ND; i++) pass = Math.max(pass, bump(t, atGate(i) - 0.05, atGate(i) + 0.25));
  const refuse = bump(t, HIT, HIT + 0.45);
  p.rrect(GATE.x - 24, GATE.y - 100, 48, 200, 24, mix(mix(LOCK, GAIN, pass), LOSS, refuse), a);
  p.line(GATE.x - 7, GATE.y - 14, GATE.x + 7, GATE.y, GROUND, 5, a);
  p.line(GATE.x + 7, GATE.y, GATE.x - 7, GATE.y + 14, GROUND, 5, a);
}

// A write heads back toward the broker and is refused at the gate.
function drawProbe(p: Painter, t: number) {
  if (t < PROBE0 || t > HIT + 0.4) return;
  if (t < HIT) {
    const x = lerp(1035, GATE.x + 40, ease(seg(t, PROBE0, HIT)));
    p.line(x + 14, GATE.y, x + 36, GATE.y, LOSS, 4, 0.5);
    p.rrect(x - 9, GATE.y - 9, 18, 18, 5, LOSS);
    return;
  }
  const q = seg(t, HIT, HIT + 0.4);
  const x = GATE.x + 40 + easeOut(q) * 40, s = 18 * (1 - q);
  p.rrect(x - s / 2, GATE.y - s / 2, s, s, 5, LOSS, 1 - q);
}

function drawLanes(p: Painter, t: number) {
  const a = seg(t, 5.6, 6.1) * (1 - seg(t, 9.6, 10.0));
  if (a <= 0) return;
  for (let k = 0; k < N; k++) p.line(300, laneY(k), 1300, laneY(k), EDGE, 3, a);
  const c = p.ctx;
  c.setLineDash([10, 12]);
  p.line(300, 782, 1300, 782, EDGE, 3, a);
  c.setLineDash([]);
  p.line(300, CASH_Y, 1300, CASH_Y, EDGE, 3, a);
  for (let k = 0; k < N; k++) {
    const g = ease(seg(t, mk(k), mk(k) + 0.25));
    if (g <= 0) continue;
    const xi = seqX(IN_IDX[k]);
    for (const o of OUTS[k]) p.line(xi, laneY(k), lerp(xi, seqX(o), g), laneY(k), LOCK, 5, a);
  }
}

function drawCalendar(p: Painter, t: number) {
  const a = seg(t, 10.9, 11.4) * (1 - seg(t, 14.9, 15.3));
  if (a <= 0) return;
  const c = p.ctx;
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < 7; col++) {
      const d = (r * 7 + col) * 0.012;
      const ca = a * seg(t, 10.9 + d, 11.2 + d);
      if (ca <= 0) continue;
      const x = CAL_X + col * PITCH, y = CAL_Y + r * PITCH;
      if (isVoid(r, col)) {
        // Outside the account's history: hatched, no chrome.
        c.save();
        p.rrPath(x, y, CELL, CELL, 14);
        c.clip();
        for (let o = -CELL; o < CELL; o += 16) p.line(x + o, y + CELL, x + o + CELL, y, EDGE, 3, ca);
        c.restore();
      } else {
        p.rrect(x, y, CELL, CELL, 14, EDGE, 0.6 * ca);
        p.disc(x + CELL / 2, y + CELL / 2, 3, LOCK, ca);
      }
    }
  }
  p.line(170, BASE3 + 14, 700, BASE3 + 14, EDGE, 4, a);
  for (let j = 0; j < TH.length; j++) {
    const g = ease(seg(t, lineT(j), lineT(j) + 0.3));
    if (g > 0) p.line(240, thY(TH[j]), lerp(240, 700, g), thY(TH[j]), LOCK, 3, a);
  }
}

function drawSession(p: Painter, t: number) {
  const a = seg(t, 15.5, 15.9) * (1 - seg(t, 19.6, 20.0));
  if (a <= 0) return;
  const c = p.ctx;
  p.line(S_L, AXIS_Y, S_R, AXIS_Y, EDGE, 4, a);
  c.setLineDash([10, 12]);
  p.line(S_L, ZERO_Y, S_R, ZERO_Y, LOCK, 3, a);
  c.setLineDash([]);
  if (t > PH0) {
    const pts = sessionPath(t);
    const last = pts[pts.length - 1];
    const trace = () => {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts) c.lineTo(x, y);
    };
    // Sign-split water: above zero in gain, below in loss.
    for (const [y0, y1, col] of [[0, ZERO_Y, GAIN], [ZERO_Y, 1000, LOSS]] as const) {
      c.save();
      c.beginPath();
      c.rect(S_L - 10, y0, S_R - S_L + 20, y1 - y0);
      c.clip();
      trace();
      c.lineTo(last[0], ZERO_Y);
      c.closePath();
      c.fillStyle = css(col, 0.16 * a);
      c.fill();
      c.restore();
    }
    trace();
    c.strokeStyle = css(CUM[N - 1] >= 0 ? GAIN : LOSS, a);
    c.lineWidth = 5;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
  }
  const ph = seg(t, PH0 - 0.2, PH0) * (1 - seg(t, PH1, PH1 + 0.3));
  if (ph > 0) {
    const px = PH(t);
    p.line(px, 260, px, AXIS_Y, INK, 2, 0.35 * ph * a);
    p.disc(px, AXIS_Y, 8, INK, ph * a);
  }
}

function drawEquity(p: Painter, t: number) {
  const a = seg(t, 20.5, 20.9) * (1 - seg(t, 24.1, 24.5));
  if (a <= 0) return;
  p.line(270, UW_Y, 1330, UW_Y, EDGE, 4, a);
  for (let k = 0; k < N; k++) {
    const x0 = BX(k) - 65, x1 = BX(k) + 65, y = BASE5 - PEAK[k] * H5;
    const pg = ease(seg(t, gt(k) + 0.3, gt(k) + 0.6));
    if (pg > 0) {
      if (k > 0 && PEAK[k] > PEAK[k - 1]) p.line(x0, BASE5 - PEAK[k - 1] * H5, x0, y, GREY, 4, a);
      p.line(x0, y, lerp(x0, x1, pg), y, GREY, 4, a);
    }
    if (DD[k] > 0) {
      const ga = seg(t, gt(k) + 0.45, gt(k) + 0.75);
      const top = BASE5 - EQ[k] * H5;
      p.rrect(BX(k) - BW5 / 2, y, BW5, top - y, 6, LOSS, 0.22 * ga * a);
      const hh = DD[k] * HD * easeOut(seg(t, gt(k) + 0.45, gt(k) + 0.85));
      p.rrect(BX(k) - BW5 / 2, UW_Y + 8, BW5, hh, 8, LOSS, a);
    } else {
      p.disc(BX(k), UW_Y, 7 * easeOut(seg(t, gt(k) + 0.45, gt(k) + 0.7)), GAIN, a);
    }
  }
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => ECHOES.reduce((s, e) => (e.ripple ? s + ripple(t, e.t, e.x, e.y, x, y) : s), 0), GAIN);
  drawCollect(p, t);
  drawLanes(p, t);
  drawCalendar(p, t);
  drawSession(p, t);
  drawEquity(p, t);
  const items: Item[] = [];
  for (let i = 0; i < ND; i++) {
    if (DEALS[i].kind === "in") continue;
    const it = furnD(i, t);
    if (it) items.push(it);
  }
  for (let k = 0; k < N; k++) items.push(itemState(k, t));
  items.sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const it of items) drawItem(p, it);
  drawProbe(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const quant: FilmDef = {
  ground: "#0b3048",
  loop: LOOP,
  still: 19.5,
  chapters: [
    { label: "Collect", range: [0, 5.0] },
    { label: "Reconstruct", range: [5.0, 10.0] },
    { label: "Calendar", range: [10.0, 15.0] },
    { label: "Session", range: [15.0, 20.0] },
    { label: "Drawdown", range: [20.0, 24.5] },
  ],
  draw,
};
