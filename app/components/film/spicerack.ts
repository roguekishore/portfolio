// SpiceRack: eight ingredients make one grocery-to-table cycle.
// Shop → pantry levels → recipe → weekly plan → restock checkout.
import {
  CX, PI, Painter, bump, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#f1ece4");
const INK = hex("#2a1d14");
const ACCENT = INK;
const { edge: EDGE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const COL: RGB[] = [hex("#e4572e"), hex("#f0a92c"), hex("#4f9a4b"), hex("#8a6fd6")];

type Tok = { x: number; y: number; w: number; h: number; r: number; c: RGB; a: number };

const N = 8;
const col = (k: number) => COL[k % 4];
const TOK = 60, CT = 42;
const circ = (x: number, y: number, w: number, k: number, a = 1): Tok => ({ x, y, w, h: w, r: w / 2, c: col(k), a });
const morph = (A: Tok, B: Tok, p: number): Tok => ({
  x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p), w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p),
  r: lerp(A.r, B.r, p), c: mix(A.c, B.c, p), a: lerp(A.a ?? 1, B.a ?? 1, p),
});
const blink = (t: number) => 0.55 + 0.45 * Math.cos(t * 18);

/* The cart */
const CART0 = { x: 1290, y: 560 };
function cartGeo(t: number) {
  if (t < 7.6) {
    const p = ease(seg(t, 5.0, 5.6));
    return { x: lerp(CART0.x, CX, p), y: lerp(CART0.y, 330, p), s: lerp(1, 0.8, p), a: 1 - seg(t, 7.1, 7.6) };
  }
  if (t < 19.7) return { x: -400, y: 590, s: 1, a: 0 };
  if (t < 24.0) {
    const pin = easeOut(seg(t, 19.8, 20.6)), pout = Math.pow(seg(t, 22.9, 23.7), 2);
    return { x: lerp(-300, CX, pin) + (1950 - CX) * pout, y: 590, s: 1, a: 1 };
  }
  const a = ease(seg(t, 24.9, 25.3));
  return { x: CART0.x, y: CART0.y - 24 * (1 - a), s: 1, a };
}
type Geo = ReturnType<typeof cartGeo>;
const slotPos = (i: number, g: Geo) => ({ x: g.x + g.s * (-75 + (i % 4) * 50), y: g.y + g.s * (-25 + Math.floor(i / 4) * 50) });

/* 1. SHOP */
const SHELF_Y = [440, 640];
const shelfPos = (k: number) => ({ x: 250 + (k % 4) * 200, y: SHELF_Y[Math.floor(k / 4)] - 34 });
const hopT = (k: number) => 1.0 + k * 0.38;
const CART_FULL = hopT(N - 1) + 0.6;

function shopS(k: number, t: number): Tok {
  const h0 = hopT(k), p = ease(seg(t, h0, h0 + 0.6));
  const A = shelfPos(k), B = slotPos(k, cartGeo(t));
  const w = lerp(TOK, CT, p);
  return { x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * 110, w, h: w, r: w / 2, c: col(k), a: 1 };
}

/* 2. PANTRY */
const LOW = 5;
const L0 = [0.88, 0.8, 0.86, 0.76, 0.82, 0.9, 0.74, 0.84];
const DRAIN = [0.3, 0.42, 0.18, 0.34, 0.22, 0.72, 0.28, 0.12];
const D0 = 7.9, D1 = 9.5, LOW_LEVEL = 0.3;
const LOW_T = D0 + ((D1 - D0) * (L0[LOW] - LOW_LEVEL)) / DRAIN[LOW];
const pourT = (k: number) => 5.8 + k * 0.16;
const level = (k: number, t: number) => L0[k] - DRAIN[k] * seg(t, D0, D1);

function jarGeo(k: number, t: number) {
  const p = ease(seg(t, 10.2, 10.9));
  return {
    x: lerp(CX + (k - 3.5) * 150, CX + (k - 3.5) * 112, p), bot: lerp(740, 400, p),
    w: lerp(96, 64, p), h: lerp(210, 130, p), r: lerp(14, 10, p),
  };
}
const flyT = (i: number) => 20.7 + i * 0.32;
const lowBlink = (t: number) =>
  seg(t, LOW_T, LOW_T + 0.15) * (1 - seg(t, 10.2, 10.5)) + seg(t, 19.8, 20.0) * (1 - seg(t, flyT(0), flyT(0) + 0.2));
const lowOutline = (t: number) => seg(t, LOW_T, LOW_T + 0.15) * (1 - seg(t, flyT(0) + 0.2, flyT(0) + 0.5));

function fillState(k: number, t: number): Tok {
  const g = jarGeo(k, t), L = level(k, t);
  const fw = g.w - 16, fh = Math.max(8, L * (g.h - 16));
  return { x: g.x, y: g.bot - 8 - fh / 2, w: fw, h: fh, r: Math.min(6, fh / 2), c: col(k), a: k === LOW ? lerp(1, blink(t), lowBlink(t)) : 1 };
}

function pantryS(k: number, t: number): Tok {
  const t0 = pourT(k);
  if (t < t0) {
    const g = cartGeo(t), S = slotPos(k, g);
    return circ(S.x, S.y, CT * g.s, k);
  }
  const g0 = cartGeo(t0), S0 = slotPos(k, g0), j = jarGeo(k, t);
  const M = { x: j.x, y: j.bot - j.h - 26 };
  if (t < t0 + 0.5) {
    const p = ease(seg(t, t0, t0 + 0.5));
    return circ(lerp(S0.x, M.x, p), lerp(S0.y, M.y, p) - Math.sin(PI * p) * 80, lerp(CT * g0.s, 36, p), k);
  }
  const p2 = ease(seg(t, t0 + 0.5, t0 + 0.9));
  const F = fillState(k, t);
  return { x: F.x, y: lerp(M.y, F.y, p2), w: lerp(36, F.w, p2), h: lerp(36, F.h, p2), r: lerp(18, F.r, p2), c: col(k), a: F.a };
}

/* 3. RECIPES */
const RC = [0, 2, 7];
const emitT = (i: number) => 11.0 + i * 0.4;
const BOWL = { x: CX, y: 640, r: 150 };
const CARD_W = 132, CARD_H = 104;
const tilt = (k: number, t: number) => {
  const i = RC.indexOf(k);
  if (i < 0) return 0;
  return (jarGeo(k, 11).x < CX ? 1 : -1) * 0.35 * bump(t, emitT(i), emitT(i) + 0.9);
};
function mouth(k: number, i: number) {
  const tm = emitT(i) + 0.35, g = jarGeo(k, tm), phi = tilt(k, tm), L = g.h + 24;
  return { x: g.x + L * Math.sin(phi), y: g.bot - L * Math.cos(phi) };
}
const swirl = (i: number, t: number) => {
  const th = (i * 2 * PI) / 3 + t * 2.2;
  return { x: BOWL.x + 70 * Math.cos(th), y: 712 + 22 * Math.sin(th) };
};

const dayX = (d: number) => CX + (d - 3) * 180;
const CARD_Y = 575;
function cardGeo(t: number) {
  if (t < 12.9) return { x: CX, y: 700, s: 0.2, a: 0 };
  const p = ease(seg(t, 12.9, 13.5));
  let x = CX, y = lerp(700, 510, p);
  const q = ease(seg(t, 15.4, 16.0));
  x = lerp(x, dayX(0), q);
  y = lerp(y, CARD_Y, q) - Math.sin(PI * q) * 60;
  const last = flyT(RC.length) + 0.1;
  return { x, y, s: lerp(0.2, 1, p), a: seg(t, 12.9, 13.1) * (1 - seg(t, last, last + 0.3)) };
}
type Card = ReturnType<typeof cardGeo>;
const stripe = (i: number, g: Card, k: number): Tok => ({ x: g.x, y: g.y + (i - 1) * 28 * g.s, w: 96 * g.s, h: 16 * g.s, r: 8 * g.s, c: col(k), a: 1 });

function recipeS(k: number, t: number): Tok {
  const i = RC.indexOf(k);
  if (i < 0) return fillState(k, t);
  const te = emitT(i);
  if (t < te) return fillState(k, t);
  const M = mouth(k, i);
  if (t < te + 0.35) return morph(fillState(k, te), circ(M.x, M.y, 36, k), ease(seg(t, te, te + 0.35)));
  const sw = swirl(i, t), p2 = ease(seg(t, te + 0.35, te + 1.0));
  let s = circ(lerp(M.x, sw.x, p2), lerp(M.y, sw.y, p2) - Math.sin(PI * p2) * 60, 36, k);
  const tc = 12.9 + i * 0.12, p3 = ease(seg(t, tc, tc + 0.6));
  if (p3 > 0) s = morph(s, stripe(i, cardGeo(t), k), p3);
  return s;
}

/* 4. PLAN */
const dropT = (d: number) => 15.4 + d * 0.42;
const landT = (d: number) => (d === 0 ? 16.0 : dropT(d) + 0.5);
const MEALS: (number[] | null)[] = [null, [1, 2, 0], [3, 0, 2], [2, 1, 3], [0, 3, 1], [1, 0, 2], [3, 2, 1]];
const NUT = [
  [0.14, 0.1, 0.09], [0.1, 0.12, 0.1], [0.13, 0.09, 0.08], [0.12, 0.11, 0.09],
  [0.11, 0.1, 0.1], [0.13, 0.1, 0.08], [0.11, 0.1, 0.09],
];
const nutVal = (j: number, t: number) => NUT.reduce((s, n, d) => s + n[j] * ease(seg(t, landT(d), landT(d) + 0.4)), 0);

function planS(k: number, t: number): Tok {
  const i = RC.indexOf(k);
  return i < 0 ? fillState(k, t) : stripe(i, cardGeo(t), k);
}

/* 5. ORDER */
const ORD = [LOW, ...RC];
const CO_T = 22.5;

function orderS(k: number, t: number): Tok {
  const i = ORD.indexOf(k);
  if (i < 0) return fillState(k, t);
  const prev = (tt: number) => (k === LOW ? fillState(k, tt) : stripe(RC.indexOf(k), cardGeo(tt), k));
  const tf = flyT(i);
  if (t < tf) return prev(t);
  const S = slotPos(i, cartGeo(t)), p = ease(seg(t, tf, tf + 0.6));
  const s = morph(prev(tf), circ(S.x, S.y, CT, k), p);
  s.y -= Math.sin(PI * p) * 120;
  return s;
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Tok; dur?: number; stag?: (k: number) => number };
const SCENES: Scene[] = [
  { t: 0, fn: shopS },
  { t: 5.0, fn: pantryS },
  { t: 10.2, fn: recipeS },
  { t: 14.8, fn: planS },
  { t: 19.6, fn: orderS },
  { t: 23.8, fn: (k) => shopS(k, 0), dur: 1.0, stag: (k) => k * 0.06 },
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
  const s = morph(SCENES[i - 1].fn(k, sc.t), sc.fn(k, sc.t + st + sc.dur), p);
  s.y -= Math.sin(PI * p) * 30;
  return s;
}

type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; ripple?: boolean };
const ECHOES: Echo[] = [
  { t: CART_FULL, x: CART0.x, y: CART0.y, w: 240, h: 140, r: 18 },
  { t: LOW_T, x: CX + 1.5 * 150, y: 740 - 105, w: 96, h: 210, r: 14 },
  { t: 13.5, x: CX, y: 510, w: CARD_W, h: CARD_H, r: 14 },
  ...[0, 1, 2, 3, 4, 5, 6].map((d) => ({ t: landT(d), x: dayX(d), y: CARD_Y, w: CARD_W, h: CARD_H, r: 14 })),
  { t: CO_T, x: CX, y: 815, w: 280, h: 60, r: 30, ripple: true },
];

function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 6 + 26 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, ACCENT, 3, 0.6 * (1 - q));
}

function drawShelves(p: Painter, t: number) {
  const a = t < 12 ? 1 - seg(t, 4.8, 5.4) : seg(t, 24.2, 24.7);
  if (a <= 0) return;
  for (const y of SHELF_Y) p.line(170, y, 930, y, LOCK, 6, a);
}

function drawCart(p: Painter, t: number) {
  const g = cartGeo(t);
  if (g.a <= 0.01) return;
  const c = p.ctx;
  const { x, y, s } = g;
  c.save();
  c.globalAlpha = g.a;
  c.lineJoin = "round";
  p.rstroke(x - 120 * s, y - 70 * s, 240 * s, 140 * s, 18 * s, GREY, 5 * s);
  p.line(x - 120 * s, y - 62 * s, x - 150 * s, y - 122 * s, GREY, 5 * s);
  p.line(x - 150 * s, y - 122 * s, x - 188 * s, y - 122 * s, GREY, 5 * s);
  const roll = x / 14;
  for (const dx of [-80, 80]) {
    const wx = x + dx * s, wy = y + 94 * s;
    p.disc(wx, wy, 14 * s, GREY);
    p.disc(wx + 7 * s * Math.cos(roll), wy + 7 * s * Math.sin(roll), 3.5 * s, GROUND);
  }
  c.restore();
}

function drawJars(p: Painter, t: number) {
  const out = 1 - seg(t, 23.8, 24.3);
  if (t < 5.2 || out <= 0) return;
  const c = p.ctx;
  const q = ease(seg(t, 10.2, 10.9)), lw = lerp(4, 3, q);
  const g0 = jarGeo(0, t), g7 = jarGeo(7, t);
  p.line(g0.x - g0.w * 0.8, g0.bot + 10, g7.x + g7.w * 0.8, g0.bot + 10, LOCK, 6, seg(t, 5.2, 5.7) * out);
  for (let k = 0; k < N; k++) {
    const a = ease(seg(t, 5.2 + k * 0.05, 5.6 + k * 0.05)) * out;
    if (a <= 0) continue;
    const g = jarGeo(k, t), hw = g.w / 2;
    const cl = k === LOW ? mix(LOCK, INK, lowOutline(t)) : LOCK;
    c.save();
    c.translate(g.x, g.bot);
    c.rotate(tilt(k, t));
    c.strokeStyle = `rgba(${cl.map((v) => v | 0).join(",")},${a})`;
    c.lineWidth = lw;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-hw - 8, -g.h);
    c.lineTo(-hw, -g.h);
    c.lineTo(-hw, -g.r);
    c.arcTo(-hw, 0, 0, 0, g.r);
    c.arcTo(hw, 0, hw, -g.r, g.r);
    c.lineTo(hw, -g.h);
    c.lineTo(hw + 8, -g.h);
    c.stroke();
    c.restore();
  }
}

function drawBowl(p: Painter, t: number) {
  const a = seg(t, 10.6, 11.1) * (1 - seg(t, 14.8, 15.2));
  if (a <= 0) return;
  const g = easeOut(seg(t, 10.6, 11.1));
  p.line(BOWL.x - BOWL.r * g, BOWL.y, BOWL.x + BOWL.r * g, BOWL.y, GREY, 5, a);
  p.arc(BOWL.x, BOWL.y, BOWL.r * g, 0, PI, GREY, 5, a);
  p.line(BOWL.x - 50 * g, BOWL.y + BOWL.r + 14, BOWL.x + 50 * g, BOWL.y + BOWL.r + 14, LOCK, 6, a);
}

function drawCardChrome(p: Painter, x: number, y: number, s: number, a: number, stripes: number[] | null) {
  const w = CARD_W * s, h = CARD_H * s;
  p.rrect(x - w / 2, y - h / 2, w, h, 14 * s, EDGE, a);
  p.rstroke(x - w / 2, y - h / 2, w, h, 14 * s, LOCK, 3 * s, a);
  if (stripes) stripes.forEach((ci, i) => p.rrect(x - 48 * s, y + ((i - 1) * 28 - 8) * s, 96 * s, 16 * s, 8 * s, COL[ci], a));
}

function drawRecipeCard(p: Painter, t: number) {
  const g = cardGeo(t);
  if (g.a > 0.01) drawCardChrome(p, g.x, g.y, g.s, g.a, null);
}

function drawPlan(p: Painter, t: number) {
  if (t < 14.9 || t > 20.1) return;
  const out = 1 - seg(t, 19.6, 20.1);
  for (let d = 0; d < 7; d++) {
    const g = ease(seg(t, 14.9 + d * 0.06, 15.4 + d * 0.06)), a = g * out;
    if (a <= 0) continue;
    const x = dayX(d);
    p.rstroke(x - 80, 445 + (1 - g) * 20, 160, 210, 16, EDGE, 3, a);
    p.disc(x, 478 + (1 - g) * 20, 6, t >= landT(d) ? INK : LOCK, a);
    if (d === 0) continue;
    const q = seg(t, dropT(d), dropT(d) + 0.5);
    if (q <= 0) continue;
    drawCardChrome(p, x, CARD_Y - 32 * (1 - easeOut(q)), 1, seg(t, dropT(d), dropT(d) + 0.25) * out, MEALS[d]);
  }
  const ba = seg(t, 15.0, 15.5) * out;
  if (ba <= 0) return;
  for (let j = 0; j < 3; j++) {
    const y = 722 + j * 48, v = nutVal(j, t);
    p.disc(540, y, 7, COL[j], ba);
    p.rrect(570, y - 7, 500, 14, 7, EDGE, ba);
    if (v > 0.002) p.rrect(570, y - 7, Math.max(14, 500 * v), 14, 7, INK, ba * 0.9);
  }
}

function drawCheckout(p: Painter, t: number) {
  const a = seg(t, 20.4, 20.8) * (1 - seg(t, 23.4, 23.8));
  if (a <= 0) return;
  const on = seg(t, CO_T, CO_T + 0.15), w = 280, h = 60, y = 815;
  p.rrect(CX - w / 2, y - h / 2, w, h, h / 2, mix(GROUND, INK, on), a);
  p.rstroke(CX - w / 2, y - h / 2, w, h, h / 2, mix(LOCK, INK, on), 3, a);
  // A check mark draws itself as the order goes through.
  const ck = easeOut(seg(t, CO_T, CO_T + 0.35));
  const c = p.ctx;
  c.save();
  c.strokeStyle = `rgba(${mix(GREY, GROUND, on).map((v) => v | 0).join(",")},${a})`;
  c.lineWidth = 5;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  if (ck <= 0) {
    c.moveTo(CX - 18, y);
    c.lineTo(CX + 18, y);
  } else {
    const p1 = Math.min(1, ck * 2), p2 = Math.max(0, ck * 2 - 1);
    c.moveTo(CX - 16, y);
    c.lineTo(lerp(CX - 16, CX - 4, p1), lerp(y, y + 12, p1));
    if (p2 > 0) c.lineTo(lerp(CX - 4, CX + 18, p2), lerp(y + 12, y - 12, p2));
  }
  c.stroke();
  c.restore();
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => ECHOES.reduce((s, e) => (e.ripple ? s + ripple(t, e.t, e.x, e.y, x, y) : s), 0), INK);
  drawShelves(p, t);
  drawJars(p, t);
  drawBowl(p, t);
  drawPlan(p, t);
  drawRecipeCard(p, t);
  drawCheckout(p, t);
  drawCart(p, t);
  for (let k = 0; k < N; k++) {
    const s = tokenState(k, t);
    if ((s.a ?? 1) > 0.01) p.rrect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, s.r, s.c, s.a ?? 1);
  }
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const spicerack: FilmDef = {
  ground: "#f1ece4",
  loop: LOOP,
  still: 9.425,
  chapters: [
    { label: "Shop", range: [0, 5.0] },
    { label: "Pantry", range: [5.0, 10.2] },
    { label: "Recipes", range: [10.2, 14.8] },
    { label: "Plan", range: [14.8, 19.6] },
    { label: "Order", range: [19.6, 24.2] },
  ],
  draw,
};
