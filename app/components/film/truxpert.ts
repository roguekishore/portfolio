// TruXpert: one vendor's fleet through the permit pipeline.
// Vendor → brands → trucks. Each truck files an application with five documents; an admin routes it
// to a reviewer (IN_REVIEW), the reviewer approves or rejects, approved trucks get an inspector
// (IN_PROGRESS → PASS / FAIL), passed trucks open their menus and serve, and the fleet ends up on the
// super-admin status board before everything folds back into the vendor.
// Colour = state: grey SUBMITTED · ink IN_REVIEW / IN_PROGRESS · accent APPROVED / PASS · warn REJECTED / FAIL.
// Shape = role: square ADMIN · ring REVIEWER · diamond INSPECTOR · big disc = the vendor.
import {
  CX, PI, Painter, bump, clamp01, css, easeCubic, easeOutCubic, easeSine, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────────── palette and tones ───────────────────────────── */
const GROUND = hex("#f05a28");
const INK = hex("#2b0d02");
const ACCENT = hex("#fff1e2");
const WARN = hex("#0f4f63");
const { edge: EDGE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const LIT = mix(INK, ACCENT, 0.75);
const C_SUB = GREY, C_PROG = INK, C_OK = ACCENT, C_BAD = WARN;
/** Chips sit on a card whose fill is the status colour, so they pick whichever ink contrasts. */
const chipCol = (fill: RGB): RGB => (0.2126 * fill[0] + 0.7152 * fill[1] + 0.0722 * fill[2] > 150 ? INK : mix(fill, ACCENT, 0.8));

/* ───────────────────────────── timeline ───────────────────────────── */
const LOOP = 78.6;
const T_APPLY = 10, T_ASSIGN = 21, T_REVIEW = 31, T_INSPECT = 42, T_SERVE = 54, T_BOARD = 66, T_END = 77;

/* ───────────────────────────── precomputed data ───────────────────────────── */
const N = 6;
const APPROVED = [0, 1, 3, 4]; // lot bay order
const PASSED = [0, 1, 4]; // road order
const ASSIGNED = [0, 1, 2, 3, 4];
const REJ = 2, FAILED = 3, QUEUED = 5;
const bayOf = (k: number) => APPROVED.indexOf(k);
const roadOf = (k: number) => PASSED.indexOf(k);
const MENU_N = [4, 3, 5]; // the seeder gives a passed truck 3–5 items
const HEADS = [2, 3, 3]; // admins, reviewers, inspectors in USERS_DATA

// truck proportions
const CAB = 0.6, CAB_H = 0.72, WHEEL = 0.21, GAP = 5;

// fleet (chapter 0)
const V0 = { x: 420, y: 520, r: 54 }; // vendor at t = 0
const V1 = { x: 210, y: 300, r: 34 }; // vendor during the pipeline
const BX = 720, BY = [340, 700], BR = 32;
const TREE_X = 1040, TREE_DY = 120;
const brandOf = (k: number) => (k < 3 ? 0 : 1);
const treeY = (k: number) => BY[brandOf(k)] + ((k % 3) - 1) * TREE_DY;
const TREE_W = 124, TREE_H = 70;
const treeLeft = TREE_X - (TREE_W + GAP + TREE_H * CAB) / 2;

// queue (chapters 1–3)
const QX = (k: number) => 440 + k * 180;
const DOCK_Y = 820, DOCK_W = 84, DOCK_H = 48;
const CARD_W = 150, CARD_H = 240, CARD_GAP = 60;
const LANE_Y = 430;
const DOCK_LINE = DOCK_Y + DOCK_H / 2 + DOCK_H * WHEEL + 3;

// staff rail
const RAIL_Y = 150, ROLE_X = [700, 800, 900];

// lot (chapter 4)
const LX = (i: number) => 420 + i * 280;
const LOT_Y = 600, LOT_W = 136, LOT_H = 76, LOT_LANE = 440;
const LOT_LINE = LOT_Y + LOT_H / 2 + LOT_H * WHEEL + 3;
const SIDE = [{ x: 1380, y: 330 }, { x: 1380, y: 430 }]; // T2 (rejected), T5 (still queued)

// road (chapter 5)
const ROAD_Y = 790;
const RX = (s: number) => 360 + s * 400;
const ROAD_TRUCK_Y = ROAD_Y - LOT_H / 2 - LOT_H * WHEEL - 3;

// board (chapter 6)
const COL_X = [560, 760, 960, 1160];
const COL_C = [C_SUB, C_PROG, C_OK, C_BAD];
const COL_BASE = 740, ROW_DY = 50, PILL_W = 136, PILL_H = 40;
const BOARD_TOP = 300, BOARD_BASE = COL_BASE + PILL_H / 2 + 12;
const ARC = [{ x: 1370, y: 430 }, { x: 1370, y: 630 }];
const ARC_R = 54;
const RATE = [4 / 5, 3 / 4]; // approval rate, pass rate on this fleet

// events
const tEmerge = (k: number) => 2.0 + k * 0.38;
const tPulse = (k: number) => 6.3 + k * 0.12;
const tCard = (k: number) => 11.9 + k * 0.12;
const tChip = (k: number, j: number) => 13.0 + k * 0.45 + j * 0.14;
const CHIP_FLY = 0.5;
const tAdminStop = (k: number) => 22.5 + k * 1.5;
const tBadgeR = (k: number) => tAdminStop(k) + 0.1;
const BADGE_FLY = 0.6;
const tRing = (k: number) => tBadgeR(k) + BADGE_FLY;
const tRevStop = (k: number) => 32.5 + k * 1.7;
const tScan = (k: number) => tRevStop(k) + 0.1;
const tDecide = (k: number) => tScan(k) + 0.8;
const tAdminBay = (i: number) => 44.4 + i * 0.8;
const tBadgeD = (i: number) => tAdminBay(i) + 0.1;
const tDia = (i: number) => tBadgeD(i) + BADGE_FLY;
const tVisit = (i: number) => 48.4 + i * 1.25;
const tMark = (i: number) => tVisit(i) + 0.6;
const tMenu = (s: number) => 56.8 + s * 0.35;
const ORDER_FLY = 0.45;
const T_ARC_RING = 67.6, T_ARC_SWEEP = 68.6, T_ARC_DONE = 70.4;
const T_HEADS = 68.2, T_HEADS_BACK = 76.2;

type Order = { s: number; j: number; t0: number };
const ORDERS: Order[] = [];
for (let s = 0; s < 3; s++) for (let m = 0; m < 6; m++) ORDERS.push({ s, j: (m * 2 + s) % MENU_N[s], t0: 58.6 + s * 0.37 + m * 1.05 });

type Pulse = { k: number; t0: number; col: RGB };
const PULSES: Pulse[] = [
  ...ASSIGNED.map((k) => ({ k, t0: tRing(k) + 0.2, col: C_PROG })),
  ...ASSIGNED.map((k) => ({ k, t0: tDecide(k) + 0.15, col: k === REJ ? C_BAD : C_OK })),
];
const PULSE_FLY = 0.3;

// menu pill widths, seeded so every frame agrees
const seeded = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const rnd = seeded(7);
const PILL_WIDTHS = MENU_N.map((n) => [...Array(n).keys()].map(() => 56 + Math.floor(rnd() * 48)));

/* ───────────────────────────── easing and paths ───────────────────────────── */
/** Damped overshoot: fast rise, +8 % at 0.3, settled by 1. */
const boing = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) * Math.exp(-5 * x) * Math.cos(7 * x));
/** Slow-in travel with one decaying overshoot near arrival. */
const easeSettle = (x: number) => {
  const u = seg(x, 0.55, 1);
  return easeCubic(x) + 0.18 * Math.sin(PI * u) * (1 - u);
};
const EASES = [easeCubic, easeSettle, easeSine];

type P = { x: number; y: number };
/** Quadratic bézier from A to B whose control point sits `bow` px off the chord's midpoint. */
function arcPos(ax: number, ay: number, bx: number, by: number, p: number, bow: number): P {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
  const cx = (ax + bx) / 2 - (dy / d) * bow, cy = (ay + by) / 2 + (dx / d) * bow;
  const q = 1 - p;
  return { x: q * q * ax + 2 * q * p * cx + p * p * bx, y: q * q * ay + 2 * q * p * cy + p * p * by };
}
const qpt = (ax: number, ay: number, cx: number, cy: number, bx: number, by: number, s: number): P => {
  const q = 1 - s;
  return { x: q * q * ax + 2 * q * s * cx + s * s * bx, y: q * q * ay + 2 * q * s * cy + s * s * by };
};
function qcurve(p: Painter, ax: number, ay: number, cx: number, cy: number, bx: number, by: number, from: number, to: number, col: RGB, w: number, a: number) {
  if (a <= 0 || to <= from) return;
  const c = p.ctx;
  c.strokeStyle = css(col, a);
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  for (let i = 0; i <= 18; i++) {
    const s = from + ((to - from) * i) / 18, q = 1 - s;
    const x = q * q * ax + 2 * q * s * cx + s * s * bx, y = q * q * ay + 2 * q * s * cy + s * s * by;
    if (i) c.lineTo(x, y);
    else c.moveTo(x, y);
  }
  c.stroke();
}
const breathe = (t: number, phase: number, amp = 1.5) => amp * Math.sin((2 * PI * 40 * t) / LOOP + phase);

/* ───────────────────────────── token state ───────────────────────────── */
type S = {
  x: number; y: number; w: number; h: number; r: number; a: number;
  body: RGB; tk: number; pop: number; rot: number;
  card: number; cardC: RGB; cpop: number; docs: number; scan: number; sink: number;
  ring: number; ringC: RGB; dia: number; diaC: RGB;
  barA: number; bar: number; barC: RGB; mark: number; markKind: number;
  menu: number; menuN: number;
};
const BASE: S = {
  x: 0, y: 0, w: 0, h: 0, r: 0, a: 1, body: C_SUB, tk: 1, pop: 1, rot: 0,
  card: 0, cardC: C_SUB, cpop: 1, docs: 0, scan: 0, sink: 0,
  ring: 0, ringC: C_PROG, dia: 0, diaC: C_PROG, barA: 0, bar: 0, barC: C_PROG, mark: 0, markKind: 1, menu: 0, menuN: 0,
};
const S0 = (o: Partial<S>): S => ({ ...BASE, ...o });

/* ───────────────────────────── per-chapter role functions ───────────────────────────── */
/** 0 Fleet: trucks unfold at the tips of the brand edges, then the registration pulse pops each one. */
function roleFleet(k: number, t: number): S {
  const te = tEmerge(k);
  const grow = boing(seg(t, te, te + 0.55));
  const pop = 1 + 0.14 * bump(t, tPulse(k), tPulse(k) + 0.35);
  return S0({ x: TREE_X, y: treeY(k), w: TREE_W * grow, h: TREE_H * grow, r: 10, a: seg(t, te, te + 0.12), body: C_SUB, pop });
}
/** 1 Apply: docked under the queue; the card extrudes from the roof and five chips seat into it. */
function roleApply(k: number, t: number): S {
  const tc = tCard(k);
  const card = easeOutCubic(seg(t, tc, tc + 0.7));
  let docs = 0;
  for (let j = 0; j < 5; j++) docs += seg(t, tChip(k, j) + CHIP_FLY, tChip(k, j) + CHIP_FLY + 0.3);
  const pop = 1 + 0.08 * bump(t, tc - 0.2, tc + 0.15);
  return S0({ x: QX(k), y: DOCK_Y, w: DOCK_W, h: DOCK_H, r: 10, body: C_SUB, card, cardC: C_SUB, docs, pop });
}
/** 2 Assign: a reviewer badge lands, the card turns IN_REVIEW, the pulse mirrors it onto the truck. */
function roleAssign(k: number, t: number): S {
  const s = roleApply(k, t);
  if (!ASSIGNED.includes(k)) return s;
  const tr = tRing(k);
  const ring = seg(t, tr, tr + 0.35);
  const cardC = mix(C_SUB, C_PROG, seg(t, tr, tr + 0.2));
  const ta = tr + 0.2 + PULSE_FLY;
  const body = mix(C_SUB, C_PROG, seg(t, ta, ta + 0.15));
  return { ...s, ring, ringC: C_PROG, cardC, body, cpop: 1 + 0.06 * bump(t, tr, tr + 0.3), pop: s.pop * (1 + 0.1 * bump(t, ta, ta + 0.3)) };
}
/** 3 Review: a scan reads the chips, the decision snaps the card and the badge, the pulse mirrors it. */
function roleReview(k: number, t: number): S {
  const s = roleAssign(k, t);
  if (!ASSIGNED.includes(k)) return s;
  const ts = tScan(k), td = tDecide(k), res = k === REJ ? C_BAD : C_OK;
  const dec = seg(t, td, td + 0.15);
  const ta = td + 0.15 + PULSE_FLY;
  const sink = k === REJ ? easeOutCubic(seg(t, td, td + 0.6)) : 0;
  return {
    ...s,
    scan: seg(t, ts, ts + 0.6),
    cardC: mix(s.cardC, res, dec), ringC: mix(s.ringC, res, dec),
    body: mix(s.body, res, seg(t, ta, ta + 0.15)),
    cpop: 1 + 0.12 * bump(t, td, td + 0.3), pop: 1 + 0.1 * bump(t, ta, ta + 0.3),
    sink, a: lerp(1, 0.72, sink),
  };
}
/** 4 Inspect: approved trucks line the lot; a diamond badge lands, the checklist fills, a tick or a cross draws. */
function roleInspect(k: number, t: number): S {
  if (k === REJ || k === QUEUED) {
    const p = SIDE[k === REJ ? 0 : 1];
    return S0({ x: p.x, y: p.y, w: 70, h: 40, r: 9, body: k === REJ ? C_BAD : C_SUB, a: k === REJ ? 0.85 : 1, ring: k === REJ ? 1 : 0, ringC: C_BAD });
  }
  const i = bayOf(k), td = tDia(i), tv = tVisit(i), tm = tMark(i);
  const res = k === FAILED ? C_BAD : C_OK;
  const got = seg(t, tm, tm + 0.15);
  return S0({
    x: LX(i), y: LOT_Y, w: LOT_W, h: LOT_H, r: 12, body: C_OK, ring: 1, ringC: C_OK,
    dia: seg(t, td, td + 0.35), diaC: mix(C_PROG, res, got),
    barA: seg(t, td + 0.1, td + 0.4), bar: easeOutCubic(seg(t, tv, tv + 0.5)), barC: mix(C_PROG, res, got),
    mark: seg(t, tm, tm + 0.35), markKind: k === FAILED ? -1 : 1,
    pop: 1 + 0.1 * bump(t, tm, tm + 0.35),
  });
}
/** 5 Serve: passed trucks sit on the road, menus extrude, orders drop into the window. */
function roleServe(k: number, t: number): S {
  const s = roleInspect(k, t);
  const r = roadOf(k);
  if (r < 0) return s;
  const menu = easeOutCubic(seg(t, tMenu(r), tMenu(r) + 0.8));
  let pop = 1;
  for (let i = 0; i < ORDERS.length; i++) {
    const o = ORDERS[i];
    if (o.s === r) pop *= 1 + 0.07 * bump(t, o.t0 + ORDER_FLY, o.t0 + ORDER_FLY + 0.25);
  }
  return { ...s, x: RX(r), y: ROAD_TRUCK_Y, menu, menuN: MENU_N[r], pop, rot: 26 };
}
/** 6 Dashboard: every truck becomes a pill in its application-status column, badges on its ends. */
function roleBoard(k: number): S {
  const col = k === QUEUED ? 0 : k === REJ ? 3 : 2;
  const row = col === 2 ? bayOf(k) : 0;
  const body = COL_C[col];
  return S0({
    x: COL_X[col], y: COL_BASE - row * ROW_DY, w: PILL_W, h: PILL_H, r: 20, body, tk: 0, rot: 26,
    ring: k === QUEUED ? 0 : 1, ringC: body, dia: col === 2 ? 1 : 0, diaC: k === FAILED ? C_BAD : C_OK,
  });
}
/** Loop end: pills fly into the vendor and vanish, which is the t = 0 frame. */
const roleEnd = (): S => S0({ x: V0.x, y: V0.y, w: 0, h: 0, r: 0, a: 0, body: C_SUB, tk: 0 });

type Chapter = { t: number; role: (k: number, t: number) => S; dur: number; stag: (k: number) => number };
const CHAPTERS: Chapter[] = [
  { t: 0, role: roleFleet, dur: 0, stag: () => 0 },
  { t: T_APPLY, role: roleApply, dur: 1.3, stag: (k) => k * 0.07 },
  { t: T_ASSIGN, role: roleAssign, dur: 0, stag: () => 0 },
  { t: T_REVIEW, role: roleReview, dur: 0, stag: () => 0 },
  { t: T_INSPECT, role: roleInspect, dur: 1.4, stag: (k) => k * 0.06 },
  { t: T_SERVE, role: roleServe, dur: 1.5, stag: (k) => Math.max(0, roadOf(k)) * 0.25 },
  { t: T_BOARD, role: roleBoard, dur: 1.4, stag: (k) => k * 0.06 },
  { t: T_END, role: roleEnd, dur: 1.0, stag: (k) => k * 0.05 },
];

/* ───────────────────────────── transition helpers ───────────────────────────── */
/** Morph A → B: anticipation, a curved path, squash along the travel, attachments leave first and arrive last. */
function blend(A: S, B: S, u: number, k: number): S {
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
  const moving = d > 1;
  const ant = moving ? Math.sin(PI * seg(u, 0, 0.14)) * 7 : 0;
  const e = EASES[k % 3](seg(u, 0.1, 1));
  const pc = clamp01(e);
  const bow = moving ? Math.max(24, Math.min(140, d * 0.22)) * (k % 2 ? -1 : 1) : 0;
  const pos = moving ? arcPos(A.x, A.y, B.x, B.y, e, bow) : { x: A.x, y: A.y };
  const ux = moving ? dx / d : 0, uy = moving ? dy / d : 0;
  const v = d > 40 ? 0.1 * Math.sin(PI * pc) : 0;
  const ax = Math.abs(ux), ay = Math.abs(uy);
  const att = (a: number, b: number) => (b < a ? b + (a - b) * (1 - seg(pc, 0, 0.5)) : a + (b - a) * seg(pc, 0.5, 1));
  return {
    x: pos.x - ux * ant, y: pos.y - uy * ant,
    w: lerp(A.w, B.w, pc) * (1 + v * (ax - ay)), h: lerp(A.h, B.h, pc) * (1 + v * (ay - ax)),
    r: lerp(A.r, B.r, pc), a: lerp(A.a, B.a, pc),
    body: mix(A.body, B.body, pc), tk: lerp(A.tk, B.tk, pc), pop: lerp(A.pop, B.pop, pc), rot: lerp(A.rot, B.rot, pc),
    card: att(A.card, B.card), cardC: mix(A.cardC, B.cardC, pc), cpop: 1, docs: att(A.docs, B.docs), scan: 0,
    sink: lerp(A.sink, B.sink, pc),
    ring: lerp(A.ring, B.ring, pc), ringC: mix(A.ringC, B.ringC, pc), dia: lerp(A.dia, B.dia, pc), diaC: mix(A.diaC, B.diaC, pc),
    barA: att(A.barA, B.barA), bar: att(A.bar, B.bar), barC: mix(A.barC, B.barC, pc),
    mark: att(A.mark, B.mark), markKind: A.mark > 0 ? A.markKind : B.markKind,
    menu: att(A.menu, B.menu), menuN: A.menu > 0 ? A.menuN : B.menuN,
  };
}

function stateOf(k: number, t: number): S {
  let i = CHAPTERS.length - 1;
  while (i > 0 && CHAPTERS[i].t > t) i--;
  const c = CHAPTERS[i];
  if (i === 0 || c.dur === 0) return c.role(k, t);
  const t0 = c.t + c.stag(k), t1 = t0 + c.dur;
  if (t >= t1) return c.role(k, t);
  return blend(CHAPTERS[i - 1].role(k, c.t), c.role(k, t1), seg(t, t0, t1), k);
}

/* staff trips: descend from the rail, glide between stops, return */
type Trip = { d0: number; d1: number; lane: number; stops: { x: number; t: number }[]; u0: number; u1: number };
const TRIPS: Trip[][] = [
  [
    { d0: 21.3, d1: 22.3, lane: LANE_Y, stops: ASSIGNED.map((k) => ({ x: QX(k), t: tAdminStop(k) })), u0: 29.6, u1: 30.6 },
    { d0: 43.6, d1: 44.4, lane: LOT_LANE, stops: APPROVED.map((_, i) => ({ x: LX(i), t: tAdminBay(i) })), u0: 47.6, u1: 48.4 },
  ],
  [{ d0: 31.3, d1: 32.3, lane: LANE_Y, stops: ASSIGNED.map((k) => ({ x: QX(k), t: tRevStop(k) })), u0: 40.9, u1: 41.8 }],
  [{ d0: 47.4, d1: 48.2, lane: LOT_LANE, stops: APPROVED.map((_, i) => ({ x: LX(i), t: tVisit(i) - 0.1 })), u0: 53.0, u1: 53.8 }],
];
type RolePos = { x: number; y: number; act: number };
function tripPos(hx: number, trip: Trip, t: number): RolePos {
  const first = trip.stops[0], last = trip.stops[trip.stops.length - 1];
  if (t < trip.d1) {
    const u = seg(t, trip.d0, trip.d1);
    const lift = Math.sin(PI * seg(u, 0, 0.18)) * 9;
    const e = easeSettle(seg(u, 0.12, 1));
    const q = arcPos(hx, RAIL_Y, first.x, trip.lane, e, 90);
    return { x: q.x, y: q.y - lift, act: clamp01(e) };
  }
  if (t < trip.u0) {
    let x = first.x;
    for (let i = 1; i < trip.stops.length; i++) x = lerp(x, trip.stops[i].x, easeSettle(seg(t, trip.stops[i].t - 0.6, trip.stops[i].t)));
    return { x, y: trip.lane, act: 1 };
  }
  const e = easeCubic(seg(t, trip.u0, trip.u1));
  const q = arcPos(last.x, trip.lane, hx, RAIL_Y, e, -90);
  return { x: q.x, y: q.y, act: 1 - e };
}
function roleAt(which: number, t: number): RolePos {
  const trips = TRIPS[which];
  for (let i = 0; i < trips.length; i++) if (t >= trips[i].d0 && t < trips[i].u1) return tripPos(ROLE_X[which], trips[i], t);
  return { x: ROLE_X[which], y: RAIL_Y, act: 0 };
}

/* the vendor and its brands */
function vendorAt(t: number): { x: number; y: number; r: number } {
  const p2 = easeCubic(seg(t, T_END, T_END + 0.8));
  let pos: P, r: number;
  if (p2 > 0) {
    pos = arcPos(V1.x, V1.y, V0.x, V0.y, p2, 120);
    r = lerp(V1.r, V0.r, p2);
  } else {
    const p1 = easeCubic(seg(t, T_APPLY, T_APPLY + 1.2));
    pos = arcPos(V0.x, V0.y, V1.x, V1.y, p1, -120);
    r = lerp(V0.r, V1.r, p1);
  }
  let pop = 1 + 0.12 * bump(t, 0.25, 0.7) + 0.1 * bump(t, 5.25, 5.6);
  for (let k = 0; k < N; k++) {
    const ta = T_END + k * 0.05 + 1.0;
    pop += 0.05 * bump(t, ta, ta + 0.25);
  }
  return { x: pos.x, y: pos.y + breathe(t, 0.4, 1.2), r: r * pop };
}
function brandAt(b: number, t: number, v: { x: number; y: number }): { x: number; y: number; r: number; a: number } {
  const t0 = 0.8 + b * 0.12;
  const out = boing(seg(t, t0, t0 + 0.7));
  const back = easeCubic(seg(t, T_APPLY + 0.1 + b * 0.1, T_APPLY + 0.9 + b * 0.1));
  if (back > 0) {
    const q = arcPos(BX, BY[b], v.x, v.y, back, b ? 60 : -60);
    return { x: q.x, y: q.y, r: BR * (1 - back), a: 1 - seg(back, 0.7, 1) };
  }
  const q = arcPos(V0.x, V0.y, BX, BY[b], Math.min(1, out), b ? -70 : 70);
  return { x: q.x, y: q.y + breathe(t, 1 + b, 1), r: BR * out, a: seg(t, t0, t0 + 0.15) };
}

/* ───────────────────────────── geometry ───────────────────────────── */
type G = {
  w: number; h: number; bx: number; top: number; bot: number; F: number; cabX: number; cabW: number; cabH: number; R: number;
  cardX: number; cardY0: number; cardY1: number; cardW: number; cardH: number;
  ringX: number; ringY: number; diaX: number; diaY: number; winX: number; winY: number;
};
function geom(s: S): G {
  const w = s.w * s.pop, h = s.h * s.pop;
  const cabW = h * CAB * s.tk, gap = GAP * s.tk, R = h * WHEEL * s.tk;
  const F = w + gap + cabW;
  const bx = s.x - F / 2, top = s.y - h / 2, bot = s.y + h / 2;
  const cabX = bx + w + gap, cabH = h * CAB_H * s.tk;
  const cardH = CARD_H * s.card * s.cpop, cardW = CARD_W * s.cpop;
  const cardY1 = top - CARD_GAP * s.card + s.sink * 22, cardY0 = cardY1 - cardH;
  const cardX = s.x - cardW / 2;
  // ring badge: card corner while the card is out, else the body's left end (truck: top-left sticker; pill: left end)
  const trx = lerp(bx + 20, bx + 10, s.tk), tryy = lerp(s.y, top, s.tk);
  const ringX = lerp(trx, cardX + cardW - 26, s.card), ringY = lerp(tryy, cardY0 + 30, s.card);
  const diaX = lerp(bx + w - 20, cabX + cabW / 2, s.tk), diaY = lerp(s.y, top - 22, s.tk);
  return {
    w, h, bx, top, bot, F, cabX, cabW, cabH, R, cardX, cardY0, cardY1, cardW, cardH, ringX, ringY, diaX, diaY,
    winX: cabX + cabW * 0.6, winY: bot - cabH * 0.66,
  };
}
const menuH = (n: number) => 30 + n * 24;
function pillPos(s: S, g: G, j: number): P {
  const H = menuH(s.menuN) * s.menu;
  const bottom = g.top - 14, topY = bottom - H;
  return { x: s.x, y: topY + 16 + (j + 0.5) * 24 * s.menu };
}
const slotY = (g: G, j: number) => g.cardY0 + (62 + j * 32) * (g.cardH / CARD_H);

/* ───────────────────────────── fx lists ───────────────────────────── */
type Echo = { t: number; k: number; shape: 0 | 1 }; // 0 around the card, 1 around the body
const ECHOES: Echo[] = [
  ...ASSIGNED.filter((k) => k !== REJ).map((k) => ({ t: tDecide(k), k, shape: 0 as const })),
  ...APPROVED.filter((k) => k !== FAILED).map((k) => ({ t: tMark(bayOf(k)), k, shape: 1 as const })),
  ...[...Array(N).keys()].map((k) => ({ t: T_BOARD + k * 0.06 + 1.4, k, shape: 1 as const })),
];
type Rip = { t: number; x: number; y: number };
const RIPPLES: Rip[] = [
  { t: tDecide(0), x: QX(0), y: 620 },
  { t: tDecide(REJ), x: QX(REJ), y: 620 },
  { t: tMark(0), x: LX(0), y: LOT_Y },
  { t: tMark(bayOf(FAILED)), x: LX(bayOf(FAILED)), y: LOT_Y },
  { t: tMenu(0) + 0.4, x: RX(0), y: ROAD_TRUCK_Y - 90 },
  { t: T_ARC_DONE, x: ARC[1].x, y: ARC[1].y },
];

/* ───────────────────────────── camera and focus ───────────────────────────── */
type Cam = { s: number; x: number; y: number };
function cam(t: number): Cam {
  const z1 = easeSine(seg(t, 0.4, 5.0)) * (1 - easeSine(seg(t, 6.8, 9.6)));
  if (z1 > 0) return { s: 1 + 0.06 * z1, x: 760, y: 520 };
  const z2 = easeSine(seg(t, 31.6, 33.6)) * (1 - easeSine(seg(t, 39.6, 41.7)));
  if (z2 > 0) return { s: 1 + 0.08 * z2, x: roleAt(1, t).x, y: 580 };
  return { s: 1, x: CX, y: 500 };
}
function focus(t: number): P {
  let sx = 800 * 0.15, sy = 520 * 0.15, sw = 0.15;
  const add = (x: number, y: number, w: number) => {
    if (w > 0) {
      sx += x * w;
      sy += y * w;
      sw += w;
    }
  };
  add(V0.x, V0.y, bump(t, 0, 1.6) + bump(t, 5.0, 5.8));
  for (let k = 0; k < N; k++) {
    add(TREE_X, treeY(k), bump(t, tEmerge(k) - 0.3, tEmerge(k) + 0.6) + 0.6 * bump(t, tPulse(k) - 0.2, tPulse(k) + 0.4));
    add(QX(k), 640, bump(t, tChip(k, 0) - 0.2, tChip(k, 4) + 0.8));
  }
  for (let r = 0; r < 3; r++) {
    const q = roleAt(r, t);
    add(q.x, q.y + 120, 1.3 * q.act);
  }
  for (let i = 0; i < ORDERS.length; i++) add(RX(ORDERS[i].s), ROAD_TRUCK_Y - 60, bump(t, ORDERS[i].t0 - 0.1, ORDERS[i].t0 + 0.6));
  add(860, 540, seg(t, T_BOARD + 0.5, T_BOARD + 1.5) * (1 - seg(t, T_END, T_END + 0.6)));
  add(ARC[1].x, ARC[1].y, bump(t, T_ARC_SWEEP, T_ARC_DONE + 0.6));
  return { x: sx / sw, y: sy / sw };
}

/* ───────────────────────────── painters: furniture ───────────────────────────── */
function diamond(p: Painter, x: number, y: number, d: number, col: RGB, a = 1) {
  if (a <= 0 || d <= 0) return;
  const c = p.ctx;
  c.fillStyle = css(col, a);
  c.beginPath();
  c.moveTo(x, y - d);
  c.lineTo(x + d, y);
  c.lineTo(x, y + d);
  c.lineTo(x - d, y);
  c.closePath();
  c.fill();
}
function ringMark(p: Painter, x: number, y: number, r: number, col: RGB, w: number, a = 1) {
  p.arc(x, y, r, 0, 2 * PI, col, w, a);
}

function drawTree(p: Painter, t: number, v: { x: number; y: number }, brands: { x: number; y: number; a: number }[]) {
  const fade = 1 - seg(t, T_APPLY, T_APPLY + 0.7);
  if (fade <= 0) return;
  for (let b = 0; b < 2; b++) {
    const grow = easeOutCubic(seg(t, 0.85 + b * 0.12, 1.45 + b * 0.12));
    const B = brands[b];
    qcurve(p, v.x, v.y, v.x + (BX - v.x) * 0.55, BY[b], BX, BY[b], 0, grow, LOCK, 3, fade);
    // registration pulse V → brand
    const pu = seg(t, 5.4 + b * 0.05, 5.9 + b * 0.05);
    if (pu > 0 && pu < 1) {
      const q = qpt(v.x, v.y, v.x + (BX - v.x) * 0.55, BY[b], BX, BY[b], easeCubic(pu));
      p.disc(q.x, q.y, 7, INK, fade);
    }
    void B;
  }
  for (let k = 0; k < N; k++) {
    const b = brandOf(k), y = treeY(k), ex = treeLeft - 8;
    const grow = easeOutCubic(seg(t, tEmerge(k) - 0.45, tEmerge(k) - 0.05));
    if (grow <= 0) continue;
    qcurve(p, BX, BY[b], BX + (ex - BX) * 0.55, y, ex, y, 0, grow, LOCK, 3, fade);
    const pu = seg(t, 5.95, tPulse(k));
    if (pu > 0 && pu < 1) {
      const q = qpt(BX, BY[b], BX + (ex - BX) * 0.55, y, ex, y, easeCubic(pu));
      p.disc(q.x, q.y, 6, INK, fade);
    }
  }
}

function drawRail(p: Painter, t: number) {
  p.line(ROLE_X[0] - 100, RAIL_Y, ROLE_X[2] + 100, RAIL_Y, LOCK, 2, 0.9);
  // headcount dots under the staff in the dashboard chapter
  for (let r = 0; r < 3; r++) {
    const n = HEADS[r];
    for (let j = 0; j < n; j++) {
      const t0 = T_HEADS + r * 0.1 + j * 0.08, t1 = T_HEADS_BACK + r * 0.05 + j * 0.06;
      const out = boing(seg(t, t0, t0 + 0.5)), back = easeCubic(seg(t, t1, t1 + 0.4));
      const k = Math.max(0, out - back);
      if (k <= 0) continue;
      const x = ROLE_X[r] + (j - (n - 1) / 2) * 16, y = RAIL_Y + 44 * k;
      p.disc(x, y, 5 * Math.min(1, k), INK, Math.min(1, k * 2));
    }
  }
}

function drawQueueFurniture(p: Painter, t: number) {
  const a = seg(t, T_APPLY + 0.6, T_APPLY + 1.4) * (1 - seg(t, T_INSPECT, T_INSPECT + 0.8));
  if (a <= 0) return;
  const grow = easeOutCubic(seg(t, T_APPLY + 0.6, T_APPLY + 1.6));
  const x0 = QX(0) - 70, x1 = QX(5) + 70, m = (x0 + x1) / 2;
  p.line(lerp(m, x0, grow), DOCK_LINE, lerp(m, x1, grow), DOCK_LINE, LOCK, 2, a);
  for (let k = 0; k < N; k++) p.line(QX(k) - 50, DOCK_LINE, QX(k) + 50, DOCK_LINE, LOCK, 5, a * 0.5 * grow);
}

function drawLotFurniture(p: Painter, t: number) {
  const inA = seg(t, T_INSPECT + 0.4, T_INSPECT + 1.2);
  const full = inA * (1 - seg(t, T_SERVE + 0.2, T_SERVE + 1.0));
  const stub = inA * (1 - seg(t, T_BOARD, T_BOARD + 0.8));
  if (stub <= 0) return;
  const grow = easeOutCubic(seg(t, T_INSPECT + 0.4, T_INSPECT + 1.3));
  if (full > 0) {
    p.line(lerp(840, 300, grow), LOT_LINE, lerp(840, 1420, grow), LOT_LINE, LOCK, 2, full);
    for (let i = 0; i <= 4; i++) p.line(LX(i) - 140, LOT_LINE - 10, LX(i) - 140, LOT_LINE + 10, LOCK, 2, full * 0.8 * grow);
  }
  // bay 2 keeps its stub while the failed truck stays parked
  const i = bayOf(FAILED);
  p.line(LX(i) - 120, LOT_LINE, LX(i) + 120, LOT_LINE, LOCK, 2, stub);
  p.line(LX(i) - 140, LOT_LINE - 10, LX(i) - 140, LOT_LINE + 10, LOCK, 2, stub * 0.8);
  p.line(LX(i) + 140, LOT_LINE - 10, LX(i) + 140, LOT_LINE + 10, LOCK, 2, stub * 0.8);
  // sidelot shelf
  const sh = seg(t, T_INSPECT + 0.6, T_INSPECT + 1.4) * (1 - seg(t, T_BOARD, T_BOARD + 0.8));
  for (let s = 0; s < 2; s++) p.line(SIDE[s].x - 56, SIDE[s].y + 30, SIDE[s].x + 56, SIDE[s].y + 30, LOCK, 2, sh);
}

function drawRoad(p: Painter, t: number) {
  const out = easeOutCubic(seg(t, T_SERVE + 0.2, T_SERVE + 1.2));
  const back = easeCubic(seg(t, T_BOARD, T_BOARD + 0.9));
  const a = seg(t, T_SERVE + 0.2, T_SERVE + 0.5) * (1 - seg(back, 0.85, 1));
  if (a <= 0) return;
  const l = lerp(lerp(760, 120, out), 760, back), r = lerp(lerp(760, 1480, out), 760, back);
  p.line(l, ROAD_Y, r, ROAD_Y, LOCK, 3, a);
  // lane dashes
  const c = p.ctx;
  c.save();
  c.globalAlpha = a * 0.55;
  for (let x = 160; x < 1480; x += 80) {
    if (x < l || x + 36 > r) continue;
    p.line(x, ROAD_Y + 14, x + 36, ROAD_Y + 14, LOCK, 2);
  }
  c.restore();
}

function drawBoardFurniture(p: Painter, t: number) {
  const a = seg(t, T_BOARD + 0.4, T_BOARD + 1.0) * (1 - seg(t, T_END, T_END + 0.7));
  if (a <= 0) return;
  const grow = easeOutCubic(seg(t, T_BOARD + 0.5, T_BOARD + 1.4));
  const x0 = COL_X[0] - 100, x1 = COL_X[3] + 100, m = (x0 + x1) / 2;
  p.line(lerp(m, x0, grow), BOARD_BASE, lerp(m, x1, grow), BOARD_BASE, LOCK, 2, a);
  for (let c = 0; c < 4; c++) {
    const g = easeOutCubic(seg(t, T_BOARD + 0.6 + c * 0.08, T_BOARD + 1.3 + c * 0.08));
    const pop = boing(seg(t, T_BOARD + 0.9 + c * 0.1, T_BOARD + 1.4 + c * 0.1));
    p.line(COL_X[c], BOARD_BASE, COL_X[c], lerp(BOARD_BASE, BOARD_TOP + 30, g), EDGE, 2, a);
    p.disc(COL_X[c], BOARD_TOP, 14 * pop, COL_C[c], a);
  }
  // the empty IN_REVIEW slot
  const ctx = p.ctx;
  ctx.save();
  ctx.setLineDash([8, 8]);
  p.rstroke(COL_X[1] - PILL_W / 2, COL_BASE - PILL_H / 2, PILL_W, PILL_H, 20, LOCK, 2, a * grow);
  ctx.restore();
  // rate arcs: approval (ring glyph) and pass (diamond glyph)
  for (let i = 0; i < 2; i++) {
    const ringG = easeOutCubic(seg(t, T_ARC_RING + i * 0.15, T_ARC_RING + 0.8 + i * 0.15));
    const sweep = easeOutCubic(seg(t, T_ARC_SWEEP + i * 0.2, T_ARC_DONE + i * 0.2)) * RATE[i];
    p.arc(ARC[i].x, ARC[i].y, ARC_R, -PI / 2, 2 * PI * ringG, LOCK, 6, a);
    p.arc(ARC[i].x, ARC[i].y, ARC_R, -PI / 2, 2 * PI * sweep, ACCENT, 8, a);
    const pop = 1 + 0.2 * bump(t, T_ARC_DONE + i * 0.2 - 0.1, T_ARC_DONE + i * 0.2 + 0.3);
    if (i === 0) ringMark(p, ARC[i].x, ARC[i].y, 14 * pop * ringG, INK, 5, a);
    else diamond(p, ARC[i].x, ARC[i].y, 15 * pop * ringG, INK, a);
  }
}

/* ───────────────────────────── painters: cast ───────────────────────────── */
function drawCard(p: Painter, s: S, g: G) {
  if (s.card <= 0.01) return;
  const c = p.ctx;
  // wire from the roof to the card
  p.line(s.x, g.top - 2, s.x, g.cardY1 + 2, LOCK, 2, 0.9);
  p.rrect(g.cardX, g.cardY0, g.cardW, g.cardH, 16 * s.cpop, s.cardC);
  const inner = seg(s.card, 0.35, 0.75);
  if (inner <= 0) return;
  c.save();
  c.globalAlpha = inner;
  const ch = chipCol(s.cardC);
  for (let j = 0; j < 5; j++) {
    const y = slotY(g, j);
    p.rrect(s.x - 55, y - 9, 110, 18, 7, GROUND, 0.35);
    const f = clamp01(s.docs - j);
    if (f > 0) {
      const sc = boing(f), w = 96 * sc, h = 12 * sc;
      p.rrect(s.x - w / 2, y - h / 2, w, h, 6, ch);
    }
  }
  if (s.scan > 0 && s.scan < 1) {
    const y = g.cardY0 + 20 + (g.cardH - 40) * s.scan;
    p.line(g.cardX + 12, y, g.cardX + g.cardW - 12, y, ACCENT, 4, 0.95);
  }
  c.restore();
}

function drawMenu(p: Painter, s: S, g: G, r: number) {
  if (s.menu <= 0.01) return;
  const H = menuH(s.menuN) * s.menu, w = 150 * lerp(0.6, 1, s.menu);
  const bottom = g.top - 14, topY = bottom - H;
  p.line(s.x, g.top, s.x, bottom + 2, LOCK, 3);
  p.rrect(s.x - w / 2, topY, w, H, 12, INK);
  for (let j = 0; j < s.menuN; j++) {
    const f = seg(s.menu, (j + 0.5) / (s.menuN + 1), (j + 1.8) / (s.menuN + 1));
    if (f <= 0) continue;
    const sc = boing(f), pw = PILL_WIDTHS[r][j] * sc, q = pillPos(s, g, j);
    p.rrect(s.x - w / 2 + 16, q.y - 5 * sc, pw, 10 * sc, 5, ACCENT, 0.95);
    p.disc(s.x + w / 2 - 20, q.y, 4.5 * sc, GROUND);
  }
}

function drawToken(p: Painter, s: S, k: number, t: number) {
  if (s.a <= 0.01 || s.w <= 0.5 || s.h <= 0.5) return;
  const g = geom(s);
  const c = p.ctx;
  c.save();
  c.globalAlpha = s.a;
  drawCard(p, s, g);
  // body
  p.rrect(g.bx, g.top, g.w, g.h, Math.min(s.r, g.h / 2), s.body);
  if (s.tk > 0.01) {
    p.rrect(g.cabX, g.bot - g.cabH, g.cabW, g.cabH, 9 * s.tk, s.body);
    p.rrect(g.cabX + g.cabW * 0.36, g.bot - g.cabH + g.cabH * 0.16, g.cabW * 0.46, g.cabH * 0.36, 3, GROUND);
    for (let i = 0; i < 2; i++) {
      const wx = i ? g.cabX + g.cabW * 0.5 : g.bx + g.w * 0.26;
      p.disc(wx, g.bot, g.R + 3.5, GROUND);
      p.disc(wx, g.bot, g.R, s.body);
      for (let q = 0; q < 2; q++) {
        const ang = s.rot + (q * PI) / 2, dx = Math.cos(ang) * g.R * 0.72, dy = Math.sin(ang) * g.R * 0.72;
        p.line(wx - dx, g.bot - dy, wx + dx, g.bot + dy, GROUND, 2.5);
      }
    }
  }
  // tick or cross on the body
  if (s.mark > 0.01) {
    const cx = g.bx + g.w / 2, cy = s.y, u = g.h * 0.2;
    if (s.markKind > 0) {
      const p1 = seg(s.mark, 0, 0.4), p2 = seg(s.mark, 0.4, 1);
      const ax = cx - 1.1 * u, ay = cy - 0.1 * u, bx = cx - 0.3 * u, by = cy + 0.7 * u, ex = cx + 1.2 * u, ey = cy - 0.9 * u;
      if (p1 > 0) p.line(ax, ay, lerp(ax, bx, p1), lerp(ay, by, p1), INK, 6);
      if (p2 > 0) p.line(bx, by, lerp(bx, ex, p2), lerp(by, ey, p2), INK, 6);
    } else {
      const p1 = seg(s.mark, 0, 0.5), p2 = seg(s.mark, 0.5, 1);
      if (p1 > 0) p.line(cx - u, cy - u, lerp(cx - u, cx + u, p1), lerp(cy - u, cy + u, p1), WARN, 6);
      if (p2 > 0) p.line(cx + u, cy - u, lerp(cx + u, cx - u, p2), lerp(cy - u, cy + u, p2), WARN, 6);
    }
  }
  // checklist bar
  if (s.barA > 0.01) {
    const by = g.bot + g.R + 20, bw = 124;
    p.rrect(s.x - bw / 2, by - 4, bw, 8, 4, LOCK, s.barA);
    if (s.bar > 0) p.rrect(s.x - bw / 2, by - 4, Math.max(8, bw * s.bar), 8, 4, s.barC, s.barA);
  }
  // badges: ring = the Review row, diamond = the Inspection row
  if (s.ring > 0.01) {
    const rr = 11 * boing(s.ring);
    p.disc(g.ringX, g.ringY, rr + 4.5, GROUND);
    ringMark(p, g.ringX, g.ringY, rr, s.ringC, 4.5);
  }
  if (s.dia > 0.01) {
    const d = 13 * boing(s.dia);
    diamond(p, g.diaX, g.diaY, d + 4, GROUND);
    diamond(p, g.diaX, g.diaY, d, s.diaC);
  }
  drawMenu(p, s, g, Math.max(0, roadOf(k)));
  c.restore();
  void t;
}

function drawRole(p: Painter, which: number, q: RolePos, t: number) {
  let pop = 1;
  if (which === 0) {
    for (let i = 0; i < ASSIGNED.length; i++) pop += 0.1 * bump(t, tAdminStop(ASSIGNED[i]), tAdminStop(ASSIGNED[i]) + 0.3);
    for (let i = 0; i < APPROVED.length; i++) pop += 0.1 * bump(t, tAdminBay(i), tAdminBay(i) + 0.3);
  } else if (which === 1) {
    for (let i = 0; i < ASSIGNED.length; i++) pop += 0.14 * bump(t, tBadgeR(ASSIGNED[i]), tBadgeR(ASSIGNED[i]) + 0.3) + 0.1 * bump(t, tDecide(ASSIGNED[i]), tDecide(ASSIGNED[i]) + 0.3);
  } else {
    for (let i = 0; i < APPROVED.length; i++) pop += 0.14 * bump(t, tBadgeD(i), tBadgeD(i) + 0.3) + 0.1 * bump(t, tMark(i), tMark(i) + 0.3);
  }
  const x = q.x, y = q.y + breathe(t, 2 + which, 1.2);
  if (which === 0) p.rrect(x - 17 * pop, y - 17 * pop, 34 * pop, 34 * pop, 8, INK);
  else if (which === 1) ringMark(p, x, y, 14 * pop, INK, 5);
  else diamond(p, x, y, 19 * pop, INK);
  // a beam from the staff token down to whatever it is acting on
  if (q.act > 0.02 && q.y > RAIL_Y + 60) {
    const targetY = q.y === LANE_Y || q.y > LANE_Y - 1 && q.y < LANE_Y + 1 ? DOCK_Y - DOCK_H / 2 - CARD_GAP - CARD_H - 10 : LOT_Y - LOT_H / 2 - 44;
    p.line(x, y + 22, x, Math.max(y + 30, targetY), LOCK, 2, 0.8 * q.act);
  }
}

/* ───────────────────────────── painters: fx ───────────────────────────── */
function drawChipsInFlight(p: Painter, t: number) {
  if (t < tChip(0, 0) || t > tChip(5, 4) + CHIP_FLY) return;
  for (let k = 0; k < N; k++) {
    const s = stateOf(k, t), g = geom(s), ch = chipCol(s.cardC);
    for (let j = 0; j < 5; j++) {
      const t0 = tChip(k, j), u = seg(t, t0, t0 + CHIP_FLY);
      if (u <= 0 || u >= 1) continue;
      const e = easeCubic(u);
      const q = arcPos(s.x, g.top - 6, s.x, slotY(g, j), e, j % 2 ? 34 : -34);
      const w = lerp(26, 96, e), h = lerp(8, 12, e);
      p.rrect(q.x - w / 2, q.y - h / 2, w, h, 6, ch, seg(u, 0, 0.15));
    }
  }
}

function drawBadgesInFlight(p: Painter, t: number) {
  // reviewer rings
  for (let i = 0; i < ASSIGNED.length; i++) {
    const k = ASSIGNED[i], t0 = tBadgeR(k), u = seg(t, t0, t0 + BADGE_FLY);
    if (u <= 0 || u >= 1) continue;
    const from = roleAt(1, t), s = stateOf(k, t), g = geom(s);
    const e = easeCubic(u), q = arcPos(from.x, from.y, g.ringX, g.ringY, e, 110);
    const rr = lerp(5, 11, e);
    p.disc(q.x, q.y, rr + 4.5, GROUND, seg(u, 0, 0.2));
    ringMark(p, q.x, q.y, rr, INK, 4.5, seg(u, 0, 0.2));
  }
  // inspector diamonds
  for (let i = 0; i < APPROVED.length; i++) {
    const k = APPROVED[i], t0 = tBadgeD(i), u = seg(t, t0, t0 + BADGE_FLY);
    if (u <= 0 || u >= 1) continue;
    const from = roleAt(2, t), s = stateOf(k, t), g = geom(s);
    const e = easeCubic(u), q = arcPos(from.x, from.y, g.diaX, g.diaY, e, -110);
    const d = lerp(6, 13, e);
    diamond(p, q.x, q.y, d + 4, GROUND, seg(u, 0, 0.2));
    diamond(p, q.x, q.y, d, INK, seg(u, 0, 0.2));
  }
}

function drawPulses(p: Painter, t: number) {
  for (let i = 0; i < PULSES.length; i++) {
    const e = PULSES[i], u = seg(t, e.t0, e.t0 + PULSE_FLY);
    if (u <= 0 || u >= 1) continue;
    const s = stateOf(e.k, t), g = geom(s);
    const y = lerp(g.cardY1, g.top, easeCubic(u));
    p.disc(s.x, y, 6, e.col);
    p.disc(s.x, y, 10, e.col, 0.35 * (1 - u));
  }
}

function drawOrders(p: Painter, t: number) {
  for (let i = 0; i < ORDERS.length; i++) {
    const o = ORDERS[i], u = seg(t, o.t0, o.t0 + ORDER_FLY);
    if (u <= 0 || u >= 1) continue;
    const k = PASSED[o.s], s = stateOf(k, t), g = geom(s);
    if (s.menu < 0.9) continue;
    const from = pillPos(s, g, o.j);
    const e = easeCubic(u), q = arcPos(from.x - 20, from.y, g.winX, g.winY, e, o.j % 2 ? -40 : 40);
    p.disc(q.x, q.y, 6 * lerp(0.6, 1, seg(u, 0, 0.3)), INK, seg(u, 0, 0.2));
  }
}

function drawEchoes(p: Painter, t: number) {
  for (let i = 0; i < ECHOES.length; i++) {
    const e = ECHOES[i], q = seg(t, e.t, e.t + 0.8);
    if (q <= 0 || q >= 1) continue;
    const s = stateOf(e.k, t), g = geom(s);
    const grow = 6 + 30 * easeOutCubic(q), a = 0.8 * (1 - q);
    if (e.shape === 0) p.rstroke(g.cardX - grow, g.cardY0 - grow, g.cardW + 2 * grow, g.cardH + 2 * grow, 16 + grow, ACCENT, 3, a);
    else p.rstroke(g.bx - grow, g.top - grow, g.F + 2 * grow, g.h + g.R + 2 * grow, 14 + grow, ACCENT, 3, a);
  }
}

/* ───────────────────────────── draw ───────────────────────────── */
function draw(p: Painter, t: number, view: View) {
  const c = p.ctx;
  const K = cam(t);
  const F = focus(t);
  const fx = K.x + (F.x - K.x) * K.s, fy = K.y + (F.y - K.y) * K.s;
  p.dots(
    view, INK, 0.07,
    (x, y) => {
      const d = Math.hypot(x - fx, y - fy);
      let s = d < 340 ? 0.1 * (1 - d / 340) * (1 - d / 340) : 0;
      for (let i = 0; i < RIPPLES.length; i++) {
        const r = RIPPLES[i], dt = t - r.t;
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

  const v = vendorAt(t);
  const brands = [brandAt(0, t, v), brandAt(1, t, v)];
  drawTree(p, t, v, brands);
  drawRail(p, t);
  drawQueueFurniture(p, t);
  drawLotFurniture(p, t);
  drawRoad(p, t);
  drawBoardFurniture(p, t);

  // vendor and brands
  p.disc(v.x, v.y, v.r, INK);
  p.disc(v.x, v.y, v.r * 0.42, GROUND);
  p.disc(v.x, v.y, v.r * 0.2, INK);
  for (let b = 0; b < 2; b++) {
    const B = brands[b];
    if (B.a > 0 && B.r > 0.5) {
      p.disc(B.x, B.y, B.r, GREY, B.a);
      p.disc(B.x, B.y, B.r * 0.4, GROUND, B.a);
    }
  }

  // the fleet, with a breath each
  for (let k = 0; k < N; k++) {
    const s = stateOf(k, t);
    s.y += breathe(t, k * 1.3, 1.5) * s.a;
    drawToken(p, s, k, t);
  }
  drawChipsInFlight(p, t);
  drawPulses(p, t);
  drawOrders(p, t);
  for (let r = 0; r < 3; r++) drawRole(p, r, roleAt(r, t), t);
  drawBadgesInFlight(p, t);
  drawEchoes(p, t);

  c.restore();
}

export const truxpert: FilmDef = {
  ground: "#f05a28",
  loop: LOOP,
  still: 53.2,
  chapters: [
    { label: "Fleet", range: [0, T_APPLY] },
    { label: "Apply", range: [T_APPLY, T_ASSIGN] },
    { label: "Assign", range: [T_ASSIGN, T_REVIEW] },
    { label: "Review", range: [T_REVIEW, T_INSPECT] },
    { label: "Inspect", range: [T_INSPECT, T_SERVE] },
    { label: "Serve", range: [T_SERVE, T_BOARD] },
    { label: "Dashboard", range: [T_BOARD, T_END] },
  ],
  draw,
};
