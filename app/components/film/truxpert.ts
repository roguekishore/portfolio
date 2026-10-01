// TruXpert: six food trucks move through one vendor's path on the platform.
// Register a fleet → apply with documents → review → on-site inspection → serve.
import {
  CX, PI, Painter, bump, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#f05a28");
const INK = hex("#2b0d02");
const ACCENT = hex("#fff1e2");
const { edge: EDGE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Tok = {
  x: number; y: number; w: number; h: number; r: number; c: RGB; a: number;
  truck?: number; slots?: number; docs?: number[]; scan?: number; check?: number; checkA?: number; rot?: number; menu?: number[];
};

const N = 6;
const REJ = 2;
const PASS = [0, 1, 3, 4, 5];
const CAB = 0.6, CAB_H = 0.72, WHEEL = 0.21, GAP = 5;

/* 1. REGISTER */
const VEN = { x: 360, y: 520 }, BR_X = 780, BR_Y = [400, 640], TRUCK_X = 1200;
const TW = 84, TH = 48;
const brandOf = (k: number) => (k < 3 ? 0 : 1);
const treeY = (k: number) => BR_Y[brandOf(k)] + ((k % 3) - 1) * 80;
const ts = (k: number) => 1.9 + k * 0.22;
const bodyLeft = (x: number, w: number, h: number) => x - (GAP + h * CAB) / 2 - w / 2;

function registerS(k: number, t: number): Tok {
  const pop = easeOut(seg(t, ts(k), ts(k) + 0.35));
  const s = lerp(0.5, 1, pop);
  return { x: TRUCK_X, y: treeY(k), w: TW * s, h: TH * s, r: 10 * s, c: GREY, a: pop, truck: 1 };
}

/* 2. APPLY */
const CW = 150, CH = 240, CARD_Y = 500;
const cardX = (k: number) => CX + (k - 2.5) * 200;
const slotY = (j: number) => CARD_Y + (j - 1) * CH * 0.275;
const tchip = (k: number, j: number) => 5.9 + k * 0.3 + (2 - j) * 0.13;
const tland = (k: number, j: number) => tchip(k, j) + 0.45;

function applyS(k: number, t: number): Tok {
  return {
    x: cardX(k), y: CARD_Y, w: CW, h: CH, r: 16, c: GREY, a: 1, truck: 0, slots: 1,
    docs: [0, 1, 2].map((j) => easeOut(seg(t, tland(k, j), tland(k, j) + 0.12))),
  };
}

/* 3. REVIEW */
const tr = (k: number) => 9.9 + k * 0.75;
const tv = (k: number) => tr(k) + 0.55;

function reviewS(k: number, t: number): Tok {
  const S = applyS(k, t);
  if (t < tr(k)) return S;
  if (t < tv(k)) return { ...S, c: mix(GREY, INK, seg(t, tr(k), tr(k) + 0.15)), scan: seg(t, tr(k), tr(k) + 0.5) };
  const v = seg(t, tv(k), tv(k) + 0.15), d = ease(seg(t, tv(k), tv(k) + 0.4));
  if (k === REJ) return { ...S, y: CARD_Y + 20 * d, c: mix(INK, LOCK, v), a: lerp(1, 0.5, d) };
  const s = 1 + 0.05 * bump(t, tv(k), tv(k) + 0.3);
  return { ...S, w: CW * s, h: CH * s, c: mix(INK, ACCENT, v) };
}

/* 4. INSPECT */
const IW = 110, IH = 64, PARK_Y = 520;
const parkX = (i: number) => CX + (i - 2) * 250;
const ti = (i: number) => 15.9 + i * 0.8;
const tp = (i: number) => ti(i) + 0.6;

function inspectS(k: number, t: number): Tok {
  if (k === REJ) return { ...reviewS(k, 14.9), a: 0 };
  const i = PASS.indexOf(k);
  let c = GREY;
  if (t >= tp(i)) c = mix(INK, ACCENT, seg(t, tp(i), tp(i) + 0.15));
  else if (t >= ti(i)) c = mix(GREY, INK, seg(t, ti(i), ti(i) + 0.15));
  const s = 1 + 0.08 * bump(t, tp(i), tp(i) + 0.3);
  return { x: parkX(i), y: PARK_Y, w: IW * s, h: IH * s, r: 12, c, a: 1, truck: 1, check: seg(t, ti(i), ti(i) + 0.55), checkA: 1 };
}

/* 5. SERVE */
const ROAD_Y = 720, SERVE_Y = ROAD_Y - IH / 2 - IH * WHEEL - 2;
const SPEED = 560, TAU = 0.5;
const tdep = (i: number) => 21.5 + (4 - i) * 0.15;
const drive = (u: number) => SPEED * (u - TAU * (1 - Math.exp(-u / TAU)));

function serveS(k: number, t: number): Tok {
  if (k === REJ) return inspectS(k, t);
  const i = PASS.indexOf(k);
  const u = Math.max(0, t - tdep(i)), dist = drive(u), x = parkX(i) + dist;
  return {
    x, y: SERVE_Y, w: IW, h: IH, r: 12, c: ACCENT, a: 1 - seg(x, 1380, 1560), truck: 1,
    rot: dist / 40, menu: [0, 1, 2].map((j) => easeOut(seg(u, 0.3 + j * 0.2, 0.5 + j * 0.2))),
  };
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Tok; dur?: number; stag?: (k: number) => number };
const SCENES: Scene[] = [
  { t: 0, fn: registerS },
  { t: 4.8, fn: applyS, dur: 0.8, stag: (k) => k * 0.07 },
  { t: 9.4, fn: reviewS },
  { t: 15.0, fn: inspectS, dur: 0.8, stag: (k) => k * 0.07 },
  { t: 20.6, fn: serveS, dur: 0.6, stag: (k) => (k === REJ ? 0 : PASS.indexOf(k) * 0.08) },
];
const LOOP = 25.4;

function tokenState(k: number, t: number): Tok {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (!sc.dur || !sc.stag) return sc.fn(k, t);
  const st = sc.stag(k);
  const p = ease(seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(k, t);
  const A = SCENES[i - 1].fn(k, sc.t), B = sc.fn(k, sc.t + st + sc.dur);
  // Card slots and checklists leave in the first half of a morph, so they never ride on a half-built truck.
  const L = (key: "x" | "y" | "w" | "h" | "r" | "a" | "truck" | "slots" | "check" | "checkA" | "rot", d = 0) => {
    const va = A[key] ?? d, vb = B[key] ?? d;
    return (key === "slots" || key === "checkA") && !vb ? va * (1 - seg(p, 0, 0.5)) : lerp(va, vb, p);
  };
  const L3 = (key: "docs" | "menu") => [0, 1, 2].map((j) => lerp(A[key] ? A[key]![j] : 0, B[key] ? B[key]![j] : 0, p));
  return {
    x: L("x"), y: L("y") - Math.sin(PI * p) * 30, w: L("w"), h: L("h"), r: L("r"),
    c: mix(A.c, B.c, p), a: L("a", 1), truck: L("truck"), slots: L("slots"),
    check: L("check"), checkA: L("checkA"), rot: L("rot"), docs: L3("docs"), menu: L3("menu"),
  };
}

/* The reviewer (circle) and the inspector (diamond) glide between stops. */
function glide(t: number, stops: number[], times: number[]) {
  let x = stops[0];
  for (let k = 1; k < stops.length; k++) x = lerp(x, stops[k], ease(seg(t, times[k] - 0.4, times[k] - 0.05)));
  return x;
}
const REV_STOPS = [...Array(N).keys()].map(cardX), REV_T = [...Array(N).keys()].map(tr);
const INS_STOPS = PASS.map((_, i) => parkX(i)), INS_T = PASS.map((_, i) => ti(i));
const reviewerX = (t: number) => glide(t, REV_STOPS, REV_T);
const inspectorX = (t: number) => glide(t, INS_STOPS, INS_T);
const reviewerA = (t: number) => seg(t, 9.5, 9.9) * (1 - seg(t, 14.3, 14.7));
const inspectorA = (t: number) => seg(t, 15.5, 15.9) * (1 - seg(t, 19.9, 20.3));

function focus(t: number) {
  let sx = CX * 0.2, sy = 520 * 0.2, sw = 0.2;
  const add = (x: number, y: number, w: number) => {
    if (w > 0) {
      sx += x * w;
      sy += y * w;
      sw += w;
    }
  };
  add(VEN.x, VEN.y, bump(t, 0.1, 1.4));
  BR_Y.forEach((y) => add(BR_X, y, 0.5 * bump(t, 0.9, 2.1)));
  for (let k = 0; k < N; k++) {
    add(TRUCK_X, treeY(k), bump(t, ts(k) - 0.3, ts(k) + 0.5));
    add(cardX(k), CARD_Y, bump(t, tchip(k, 2), tland(k, 0) + 0.2));
  }
  add(reviewerX(t), CARD_Y, 1.2 * reviewerA(t));
  add(inspectorX(t), PARK_Y, 1.2 * inspectorA(t));
  if (t > 21.2) for (const k of PASS) {
    const s = tokenState(k, t);
    add(s.x, s.y, 0.4 * s.a);
  }
  return { x: sx / sw, y: sy / sw };
}

const TRUCK_BOX = { w: IW + GAP + IH * CAB, h: IH + IH * WHEEL, dy: (IH * WHEEL) / 2 };
type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; ripple: boolean };
const ECHOES: Echo[] = [
  ...[...Array(N).keys()].filter((k) => k !== REJ).map((k) => ({ t: tv(k), x: cardX(k), y: CARD_Y, w: CW, h: CH, r: 16, ripple: k === N - 1 })),
  ...PASS.map((_, i) => ({ t: tp(i), x: parkX(i), y: PARK_Y + TRUCK_BOX.dy, w: TRUCK_BOX.w, h: TRUCK_BOX.h, r: 16, ripple: i === PASS.length - 1 })),
];

function drawToken(p: Painter, s: Tok) {
  const c = p.ctx;
  const tk = s.truck || 0;
  const cabW = s.h * CAB * tk, gap = GAP * tk, R = s.h * WHEEL * tk;
  if ((s.a ?? 1) > 0.01) {
    c.save();
    c.globalAlpha = s.a ?? 1;
    const bx = s.x - (gap + cabW) / 2, top = s.y - s.h / 2, bot = s.y + s.h / 2;
    p.rrect(bx - s.w / 2, top, s.w, s.h, s.r, s.c);
    if (tk > 0.01) {
      const cx0 = bx + s.w / 2 + gap, ch = s.h * CAB_H * tk;
      p.rrect(cx0, bot - ch, cabW, ch, 9 * tk, s.c);
      p.rrect(cx0 + cabW * 0.38, bot - ch + ch * 0.16, cabW * 0.44, ch * 0.34, 3, GROUND);
      for (const wx of [bx - s.w * 0.26, cx0 + cabW * 0.5]) {
        p.disc(wx, bot, R + 3.5, GROUND);
        p.disc(wx, bot, R, s.c);
        const rot = s.rot || 0;
        for (const q of [0, PI / 2]) {
          const dx = Math.cos(rot + q) * R * 0.72, dy = Math.sin(rot + q) * R * 0.72;
          p.line(wx - dx, bot - dy, wx + dx, bot + dy, GROUND, 2.5);
        }
      }
    }
    if (s.slots && s.slots > 0.01) {
      for (let j = 0; j < 3; j++) {
        const sy = s.y + (j - 1) * s.h * 0.275;
        p.rrect(bx - s.w * 0.365, sy - s.h * 0.0835, s.w * 0.73, s.h * 0.167, 7, GROUND, 0.4 * s.slots);
        const d = s.docs ? s.docs[j] : 0;
        if (d > 0.01) {
          const cw = s.w * 0.64 * lerp(0.8, 1, d), chh = s.h * 0.117 * lerp(0.8, 1, d);
          p.rrect(bx - cw / 2, sy - chh / 2, cw, chh, 6, INK, d * s.slots);
        }
      }
    }
    if (s.scan && s.scan > 0 && s.scan < 1) {
      const y = top + 12 + (s.h - 24) * s.scan;
      p.line(s.x - s.w / 2 + 10, y, s.x + s.w / 2 - 10, y, ACCENT, 4);
    }
    if (s.menu) {
      for (let j = 0; j < 3; j++) {
        const m = s.menu[j];
        if (m > 0.01) p.disc(bx + (j - 1) * 28, top - 14 - 12 * m, 7 * m, INK);
      }
    }
    c.restore();
  }
  if (s.checkA && s.checkA > 0.01) {
    const by = s.y + s.h / 2 + R + 26, bw = 120;
    p.rrect(s.x - bw / 2, by - 4, bw, 8, 4, EDGE, s.checkA);
    if (s.check && s.check > 0) p.rrect(s.x - bw / 2, by - 4, Math.max(8, bw * s.check), 8, 4, s.check >= 1 ? ACCENT : INK, s.checkA);
  }
}

function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 6 + 28 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, ACCENT, 3, 0.8 * (1 - q));
}

function drawTree(p: Painter, t: number) {
  const fa = 1 - seg(t, 4.8, 5.2);
  if (fa <= 0) return;
  const pv = ease(seg(t, 0.8, 1.3));
  for (const y of BR_Y) if (pv > 0) p.line(VEN.x, VEN.y, lerp(VEN.x, BR_X, pv), lerp(VEN.y, y, pv), LOCK, 3, fa);
  for (let k = 0; k < N; k++) {
    const q = ease(seg(t, ts(k) - 0.45, ts(k) - 0.05));
    if (q <= 0) continue;
    const by = BR_Y[brandOf(k)], ex = bodyLeft(TRUCK_X, TW, TH) - 6;
    p.line(BR_X, by, lerp(BR_X, ex, q), lerp(by, treeY(k), q), LOCK, 3, fa);
  }
  p.disc(VEN.x, VEN.y, 44 * easeOut(seg(t, 0.3, 0.65)), INK, fa);
  BR_Y.forEach((y, b) => p.disc(BR_X, y, 30 * easeOut(seg(t, 1.25 + b * 0.1, 1.6 + b * 0.1)), GREY, fa));
}

function drawChips(p: Painter, t: number) {
  for (let k = 0; k < N; k++) {
    for (let j = 0; j < 3; j++) {
      if (t < tchip(k, j) || t >= tland(k, j)) continue;
      const q = ease(seg(t, tchip(k, j), tland(k, j)));
      const w = lerp(56, CW * 0.64, q), h = lerp(20, CH * 0.117, q);
      const y = lerp(285, slotY(j), q);
      p.rrect(cardX(k) - w / 2, y - h / 2, w, h, 6, INK, seg(t, tchip(k, j), tchip(k, j) + 0.1));
    }
  }
}

function drawMarkers(p: Painter, t: number) {
  const ra = reviewerA(t);
  if (ra > 0) p.disc(reviewerX(t), 338, 15, INK, ra);
  const ia = inspectorA(t);
  if (ia > 0) {
    const c = p.ctx;
    const x = inspectorX(t), y = 436, d = 16;
    c.save();
    c.globalAlpha = ia;
    c.fillStyle = `rgb(${INK.join(",")})`;
    c.beginPath();
    c.moveTo(x, y - d);
    c.lineTo(x + d, y);
    c.lineTo(x, y + d);
    c.lineTo(x - d, y);
    c.closePath();
    c.fill();
    c.restore();
  }
}

function drawRoad(p: Painter, t: number) {
  if (t < 20.6) return;
  const a = 1 - seg(t, 24.6, 25.1), q = ease(seg(t, 20.6, 21.3));
  if (a > 0) p.line(80, ROAD_Y, lerp(80, 1520, q), ROAD_Y, LOCK, 4, a);
}

function draw(p: Painter, t: number, view: View) {
  const F = focus(t);
  p.dots(
    view, INK, 0.07,
    (x, y) => {
      const f = Math.max(0, 1 - Math.hypot(x - F.x, y - F.y) / 340);
      let s = 0.1 * f * f;
      for (const e of ECHOES) if (e.ripple) s += ripple(t, e.t, e.x, e.y, x, y);
      return s;
    },
    mix(INK, ACCENT, 0.75),
  );
  drawTree(p, t);
  drawRoad(p, t);
  for (let k = 0; k < N; k++) drawToken(p, tokenState(k, t));
  drawChips(p, t);
  drawMarkers(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const truxpert: FilmDef = {
  ground: "#f05a28",
  loop: LOOP,
  still: 12.4,
  chapters: [
    { label: "Register", range: [0, 4.8] },
    { label: "Apply", range: [4.8, 9.4] },
    { label: "Review", range: [9.4, 15.0] },
    { label: "Inspect", range: [15.0, 20.6] },
    { label: "Serve", range: [20.6, 25.0] },
  ],
  draw,
};
