// True North: nine tokens carry one day of reflection through the app.
// Journal → track → analyse the month → habit streak → the compass settles north.
import {
  CX, PI, Painter, bump, clamp01, easeOutQuad as easeOut, easeSine as ease, hex, lerp, mix, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#14e05a");
const INK = hex("#062b14");
const ACCENT = hex("#f2ffe9");
const PAGE = mix(GROUND, INK, 0.1);
const { edge: EDGE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Tok = { x: number; y: number; w: number; h: number; r: number; c: RGB; a: number; rot?: number };

const N = 9;

/* 1. JOURNAL */
const LX = 560;
const LEN = [470, 420, 480, 390, 450, 330, 470, 410, 210];
const ly = (k: number) => 380 + k * 48;
const TYPE_SPEED = 1100;
const tdur = LEN.map((L) => L / TYPE_SPEED);
const tj: number[] = [];
for (let k = 0, s = 0.5; k < N; k++) {
  tj.push(s);
  s += tdur[k] + 0.07;
}

function journalS(k: number, t: number): Tok {
  const p = seg(t, tj[k], tj[k] + tdur[k]);
  const w = Math.max(14, LEN[k] * p);
  return {
    x: LX + w / 2, y: ly(k), w, h: 14, r: 7,
    c: mix(INK, GREY, seg(t, tj[k] + tdur[k], tj[k] + tdur[k] + 0.5)),
    a: seg(t, tj[k] - 0.05, tj[k] + 0.1),
  };
}

/* 2. TRACK */
const X0 = 605, TW = 480;
const V = [0.7, 0.6, 0.3, 0.4, 0.5, 0.8, 0.7, 0.9, 0.6];
const LABEL_W = [52, 74, 96, 80, 86, 64, 82, 120, 104];
const ry = (k: number) => 280 + k * 62;
const tk = (k: number) => 6.3 + k * 0.28;
const setT = (k: number) => tk(k) + 1.0;

function trackS(k: number, t: number): Tok {
  const g = ease(seg(t, tk(k), setT(k)));
  const s = 1 + 0.12 * bump(t, setT(k) - 0.1, setT(k) + 0.4);
  return { x: X0 + TW * V[k] * g, y: ry(k), w: 30 * s, h: 30 * s, r: 15 * s, c: mix(GREY, ACCENT, seg(t, setT(k) - 0.15, setT(k) + 0.2)), a: 1 };
}

/* 3. ANALYZE */
const CB = 760, CL = 380, CR = 1220;
const trend = (u: number) => 0.34 + 0.36 * u + 0.055 * Math.sin(u * 22 + 0.4) + 0.03 * Math.sin(u * 53 + 1.3);
const px = (u: number) => 400 + 800 * u;
const py = (u: number) => CB - trend(u) * 420;
const SAMPLES = 30;
const TI = [1, 4, 8, 11, 15, 18, 21, 25, 28];
const lineQ = (t: number) => ease(seg(t, 11.3, 13.9));

function analyzeS(k: number, t: number): Tok {
  const u = TI[k] / (SAMPLES - 1);
  const d = lineQ(t) - u;
  const s = 1 + 0.22 * Math.sin(PI * clamp01(d * 6));
  return { x: px(u), y: py(u), w: 22 * s, h: 22 * s, r: 11 * s, c: mix(INK, ACCENT, clamp01(d * 10)), a: 1 };
}

/* 4. HABITS */
const DAYS = 35, CELL = 54, PITCH = 68, GX = CX - (7 * CELL + 6 * (PITCH - CELL)) / 2, GY = 330;
const MISS = new Set([2, 7, 11]);
const TOK0 = DAYS - N;
const cellC = (d: number) => ({ x: GX + (d % 7) * PITCH + CELL / 2, y: GY + Math.floor(d / 7) * PITCH + CELL / 2 });
const tf = (d: number) => 16.0 + d * 0.1;
const streak = (t: number) => {
  let n = 0;
  for (let d = 0; d < DAYS && t >= tf(d); d++) n = MISS.has(d) ? 0 : n + 1;
  return n;
};

function habitsS(k: number, t: number): Tok {
  const d = TOK0 + k, C = cellC(d);
  const p = easeOut(seg(t, tf(d), tf(d) + 0.4));
  const w = lerp(14, CELL, p);
  return { x: C.x, y: C.y, w, h: w, r: lerp(7, 12, p), c: mix(GREY, ACCENT, seg(t, tf(d), tf(d) + 0.25)), a: 1 };
}

/* 5. TRUE NORTH */
const COMP = { x: CX, y: 540 }, R = 230;
const SW0 = 21.0, TS = SW0 + 2.6;
const HUB = N - 1;
const needleAngle = (t: number) => {
  const u = Math.max(0, t - SW0);
  return 2.0 * Math.exp(-1.4 * u) * Math.cos(2.5 * u) * (1 - ease(seg(u, 1.4, 2.6)));
};

function northS(k: number, t: number): Tok {
  if (k === HUB) return { x: COMP.x, y: COMP.y, w: 30, h: 30, r: 15, c: INK, a: 1 };
  const ang = (k * PI) / 4;
  const len = k % 2 === 0 ? 40 : 24;
  const rc = R - 14 - len / 2;
  return {
    x: COMP.x + rc * Math.sin(ang), y: COMP.y - rc * Math.cos(ang), w: 10, h: len, r: 5,
    rot: ((ang + PI / 2) % PI) - PI / 2,
    c: k === 0 ? mix(INK, ACCENT, seg(t, TS, TS + 0.5)) : INK, a: 1,
  };
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Tok; dur?: number; stag?: (k: number) => number };
const SCENES: Scene[] = [
  { t: 0, fn: journalS },
  { t: 5.0, fn: trackS, dur: 1.0, stag: (k) => k * 0.06 },
  { t: 10.0, fn: analyzeS, dur: 1.1, stag: (k) => k * 0.07 },
  { t: 15.0, fn: habitsS, dur: 1.1, stag: (k) => k * 0.06 },
  { t: 20.0, fn: northS, dur: 1.2, stag: (k) => (k === HUB ? 0 : k * 0.06) },
  { t: 25.0, fn: (k) => journalS(k, 0), dur: 1.0, stag: (k) => k * 0.04 },
];
const LOOP = 26.4;

function tokenState(k: number, t: number): Tok {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (!sc.dur || !sc.stag) return sc.fn(k, t);
  const st = sc.stag(k);
  const p = ease(seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(k, t);
  const A = SCENES[i - 1].fn(k, sc.t), B = sc.fn(k, sc.t + st + sc.dur);
  return {
    x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * 20,
    w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
    rot: lerp(A.rot || 0, B.rot || 0, p), c: mix(A.c, B.c, p), a: lerp(A.a ?? 1, B.a ?? 1, p),
  };
}

type Echo = { t: number; x: number; y: number; d: number; g?: number };
const ECHOES: Echo[] = [
  ...V.map((v, k) => ({ t: setT(k), x: X0 + TW * v, y: ry(k), d: 30 })),
  { t: tf(DAYS - 1) + 0.15, x: cellC(DAYS - 1).x, y: cellC(DAYS - 1).y, d: CELL },
  { t: TS, x: COMP.x, y: COMP.y, d: 2 * R, g: 44 },
];

function drawToken(p: Painter, s: Tok) {
  if ((s.a ?? 1) <= 0.01) return;
  const c = p.ctx;
  c.save();
  c.globalAlpha = s.a ?? 1;
  c.translate(s.x, s.y);
  if (s.rot) c.rotate(s.rot);
  p.rrect(-s.w / 2, -s.h / 2, s.w, s.h, s.r, s.c);
  c.restore();
}

function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 1.1);
  if (q <= 0 || q >= 1) return;
  p.arc(e.x, e.y, e.d / 2 + 6 + (e.g || 26) * easeOut(q), 0, PI * 2, ACCENT, 3, 0.7 * (1 - q));
}

function drawJournal(p: Painter, t: number) {
  const pa = t < 5 ? 1 : Math.max(1 - seg(t, 5.0, 5.6), seg(t, 25.4, 26.2));
  if (pa > 0) {
    p.rrect(500, 250, 600, 580, 26, PAGE, pa);
    p.rrect(LX, 296, 150, 12, 6, LOCK, pa);
    p.disc(1034, 302, 7, ACCENT, pa);
    p.line(LX, 336, 1040, 336, EDGE, 2, pa);
  }
  const ca = seg(t, 0.15, 0.45) * (1 - seg(t, 4.9, 5.2));
  if (ca <= 0) return;
  let cur = 0;
  for (let k = 0; k < N; k++) if (t >= tj[k]) cur = k;
  const q = seg(t, tj[cur], tj[cur] + tdur[cur]);
  const typing = q > 0 && q < 1;
  const x = t < tj[0] ? LX - 14 : LX + LEN[cur] * q + 14;
  const blink = typing ? 1 : 0.2 + 0.8 * (0.5 + 0.5 * Math.cos((t * 2 * PI) / 1.1));
  p.rrect(x - 2, ly(cur) - 15, 4, 30, 2, ACCENT, ca * blink);
}

function drawTrack(p: Painter, t: number) {
  const a = seg(t, 5.3, 5.9) * (1 - seg(t, 10.0, 10.5));
  if (a <= 0) return;
  for (let k = 0; k < N; k++) {
    const y = ry(k);
    const done = seg(t, setT(k) - 0.15, setT(k) + 0.2);
    // Each tracker's name becomes a short label bar.
    p.rrect(565 - LABEL_W[k], y - 6, LABEL_W[k], 12, 6, mix(LOCK, INK, done), a);
    p.line(X0, y, X0 + TW, y, EDGE, 6, a);
    const g = ease(seg(t, tk(k), setT(k)));
    if (g > 0) p.line(X0, y, X0 + TW * V[k] * g, y, mix(LOCK, ACCENT, done), 6, a);
  }
}

function trendPath(p: Painter, q: number) {
  const c = p.ctx;
  const n = Math.max(2, Math.round(160 * q));
  c.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = (q * i) / n;
    if (i === 0) c.moveTo(px(u), py(u));
    else c.lineTo(px(u), py(u));
  }
}

function drawChart(p: Painter, t: number) {
  const a = seg(t, 10.3, 10.9) * (1 - seg(t, 15.0, 15.5));
  if (a <= 0) return;
  const c = p.ctx;
  for (const v of [0.25, 0.5, 0.75]) p.line(CL, CB - 420 * v, CR, CB - 420 * v, EDGE, 2, a);
  p.line(CL, CB, CR, CB, LOCK, 3, a);
  const q = lineQ(t);
  if (q > 0.002) {
    trendPath(p, q);
    c.lineTo(px(q), CB);
    c.lineTo(px(0), CB);
    c.closePath();
    c.fillStyle = `rgba(${ACCENT.join(",")},${0.18 * a})`;
    c.fill();
    trendPath(p, q);
    c.strokeStyle = `rgba(${ACCENT.join(",")},${a})`;
    c.lineWidth = 5;
    c.lineJoin = "round";
    c.lineCap = "round";
    c.stroke();
  }
  for (let i = 0; i < SAMPLES; i++) {
    if (TI.includes(i)) continue;
    const u = i / (SAMPLES - 1), on = clamp01((q - u) * 14);
    if (on > 0) p.disc(px(u), py(u), 5, GREY, a * on);
  }
}

function drawHabits(p: Painter, t: number) {
  const a = seg(t, 15.2, 15.8) * (1 - seg(t, 20.0, 20.5));
  if (a <= 0) return;
  for (let i = 0; i < 7; i++) p.disc(GX + i * PITCH + CELL / 2, 300, 4, LOCK, a);
  for (let d = 0; d < DAYS; d++) {
    const C = cellC(d);
    const ga = a * seg(t, 15.2 + d * 0.012, 15.6 + d * 0.012);
    p.rrect(C.x - CELL / 2, C.y - CELL / 2, CELL, CELL, 12, EDGE, ga);
    if (d >= TOK0 || t < tf(d)) continue;
    if (MISS.has(d)) {
      p.disc(C.x, C.y, 5, LOCK, ga);
      continue;
    }
    const q = easeOut(seg(t, tf(d), tf(d) + 0.4)), w = lerp(0.6, 1, q) * CELL;
    p.rrect(C.x - w / 2, C.y - w / 2, w, w, 12, ACCENT, ga * seg(t, tf(d), tf(d) + 0.25));
  }
  // Streak meter grows with the run instead of a counter.
  const n = streak(t);
  const W = 7 * CELL + 6 * (PITCH - CELL);
  p.rrect(GX, 722, W, 12, 6, EDGE, a);
  if (n > 0) p.rrect(GX, 722, Math.max(12, (W * n) / 24), 12, 6, n >= 7 ? ACCENT : INK, a);
}

function drawNorth(p: Painter, t: number) {
  const a = seg(t, 20.3, 20.9) * (1 - seg(t, 25.0, 25.6));
  if (a <= 0) return;
  const c = p.ctx;
  const { x, y } = COMP;
  p.arc(x, y, R, -PI / 2, 2 * PI * ease(seg(t, 20.2, 21.3)), LOCK, 3, a);
  for (let j = 0; j < 24; j++) {
    if (j % 3 === 0) continue;
    const th = (j * PI) / 12, ma = a * seg(t, 20.6 + j * 0.03, 21.0 + j * 0.03);
    const s = Math.sin(th), co = Math.cos(th);
    p.line(x + (R - 26) * s, y - (R - 26) * co, x + (R - 14) * s, y - (R - 14) * co, LOCK, 3, ma);
  }
  // Cardinal marks: a lit chevron for north, dots for the rest.
  const la = a * seg(t, 20.9, 21.5);
  const nc = mix(INK, ACCENT, seg(t, TS, TS + 0.5));
  c.save();
  c.globalAlpha = la;
  c.fillStyle = `rgb(${nc.map((v) => v | 0).join(",")})`;
  c.beginPath();
  c.moveTo(x - 14, y - R - 26);
  c.lineTo(x, y - R - 50);
  c.lineTo(x + 14, y - R - 26);
  c.closePath();
  c.fill();
  c.restore();
  p.disc(x + R + 36, y, 6, GREY, la);
  p.disc(x, y + R + 36, 6, GREY, la);
  p.disc(x - R - 36, y, 6, GREY, la);
  const g = easeOut(seg(t, 20.8, 21.5));
  if (g <= 0) return;
  const L = 150 * g, B = 13;
  c.save();
  c.translate(x, y);
  c.rotate(needleAngle(t));
  c.globalAlpha = a;
  c.fillStyle = `rgb(${ACCENT.join(",")})`;
  c.beginPath();
  c.moveTo(-B, 0);
  c.lineTo(0, -L);
  c.lineTo(B, 0);
  c.closePath();
  c.fill();
  c.fillStyle = `rgb(${LOCK.map((v) => v | 0).join(",")})`;
  c.beginPath();
  c.moveTo(-B, 0);
  c.lineTo(0, L);
  c.lineTo(B, 0);
  c.closePath();
  c.fill();
  c.restore();
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.08);
  drawJournal(p, t);
  drawTrack(p, t);
  drawChart(p, t);
  drawHabits(p, t);
  drawNorth(p, t);
  for (let k = 0; k < N; k++) drawToken(p, tokenState(k, t));
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const truenorth: FilmDef = {
  ground: "#14e05a",
  loop: LOOP,
  still: 24.6,
  chapters: [
    { label: "Journal", range: [0, 5.0] },
    { label: "Track", range: [5.0, 10.0] },
    { label: "Analyze", range: [10.0, 15.0] },
    { label: "Habits", range: [15.0, 20.0] },
    { label: "True north", range: [20.0, 25.0] },
  ],
  draw,
};
