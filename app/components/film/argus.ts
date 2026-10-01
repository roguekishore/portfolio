// Argus: seven complaints follow one lifecycle under a watching eye.
// Report → classify → resolve against the SLA → escalate → citizen sign-off.
import {
  CX, PI, Painter, bump, clamp01, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#3b0d36");
const INK = hex("#f6e9f2");
const ACCENT = hex("#ff6ad5");
const WARM = hex("#ffa04d");
const IRIS_BG = hex("#2a0826");
const { edge: EDGE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Ring = { p: number; c: RGB; a: number } | null;
type Tok = { x: number; y: number; w: number; h: number; r: number; c: RGB; a: number; tail?: number; ring?: Ring };

const N = 7;
const PRI = [1, 0, 3, 2, 1, 0, 1];
const ESC = 3;
const WEB = (k: number) => k % 2 === 0;
const size = (k: number) => 36 + PRI[k] * 8;
const TOK = 40;
const EYE = { x: CX, y: 380 };
const LANE_Y = 650, TRAY_Y = 790, CIT_Y = 560;
const laneX = (k: number) => CX + (k - 3) * 150;

/* 1. REPORT */
const srcPos = (k: number) => (WEB(k) ? { x: 150, y: 300 + (k / 2) * 110 } : { x: 1450, y: 355 + ((k - 1) / 2) * 110 });
const ts = (k: number) => 0.3 + k * 0.3;
const td = (k: number) => ts(k) + 0.6;
const ta = (k: number) => td(k) + 1.1;
const orbitPos = (k: number, t: number) => {
  const th = -PI / 2 + (k * 2 * PI) / N + t * 0.35;
  return { x: EYE.x + 270 * Math.cos(th), y: EYE.y + 115 * Math.sin(th) };
};

function reportS(k: number, t: number): Tok {
  const s = srcPos(k);
  const pop = easeOut(seg(t, ts(k), ts(k) + 0.35));
  const p = ease(seg(t, td(k), ta(k)));
  const o = orbitPos(k, t);
  const w = TOK * lerp(0.5, 1, pop);
  return {
    x: lerp(s.x, o.x, p), y: lerp(s.y, o.y, p) - Math.sin(PI * p) * 40,
    w, h: w, r: WEB(k) ? lerp(8, w / 2, p) : w / 2, tail: WEB(k) ? 0 : 1 - p, c: GREY, a: pop,
  };
}

/* 2. CLASSIFY */
const ORDER = [...Array(N).keys()].sort((a, b) => PRI[b] - PRI[a] || a - b);
const tc = (k: number) => 5.3 + ORDER.indexOf(k) * 0.55;

function classifyS(k: number, t: number): Tok {
  const t0 = tc(k);
  if (t < t0) return reportS(k, t);
  const o = orbitPos(k, t0);
  const p1 = ease(seg(t, t0, t0 + 0.3));
  const p2 = ease(seg(t, t0 + 0.5, t0 + 1.0));
  if (p2 <= 0) {
    const w = lerp(TOK, 30, p1);
    return { x: lerp(o.x, EYE.x, p1), y: lerp(o.y, EYE.y, p1), w, h: w, r: w / 2, c: mix(GREY, INK, seg(t, t0 + 0.3, t0 + 0.45)), a: 1 };
  }
  const w = lerp(30, size(k), p2);
  return {
    x: lerp(EYE.x, laneX(k), p2), y: lerp(EYE.y, LANE_Y, p2) - Math.sin(PI * p2) * 30,
    w, h: w, r: w / 2, c: INK, a: 1, ring: { p: 1, c: INK, a: p2 },
  };
}

/* 3. RESOLVE */
const SLA0 = 9.8, BREACH = 13.1;
const TR: Record<number, number> = { 2: 10.4, 0: 10.9, 5: 11.4, 4: 11.9, 1: 12.4, 6: 12.9 };
const blink = (t: number) => 0.55 + 0.45 * Math.cos(t * 18);

function resolveS(k: number, t: number): Tok {
  const w0 = size(k);
  if (k === ESC) {
    const breached = t >= BREACH;
    const shake = Math.sin(t * 60) * 4 * bump(t, BREACH, BREACH + 0.45);
    return {
      x: laneX(k) + shake, y: LANE_Y, w: w0, h: w0, r: w0 / 2, a: 1,
      c: mix(INK, WARM, seg(t, BREACH, BREACH + 0.15)),
      ring: breached ? { p: 1, c: WARM, a: blink(t) } : { p: 1 - seg(t, SLA0, BREACH), c: INK, a: 1 },
    };
  }
  const tr = TR[k], D = (tr - SLA0) / 0.62;
  const s = 1 + 0.15 * bump(t, tr, tr + 0.3);
  return {
    x: laneX(k), y: LANE_Y, w: w0 * s, h: w0 * s, r: (w0 * s) / 2, a: 1,
    c: mix(INK, ACCENT, seg(t, tr, tr + 0.15)),
    ring: { p: 1 - clamp01((Math.min(t, tr) - SLA0) / D), c: INK, a: 1 - seg(t, tr, tr + 0.2) },
  };
}

/* 4. ESCALATE */
const PLAT = [700, 540, 380];
const J1 = [15.0, 15.5], J2 = [16.8, 17.3], L1_SLA = [15.6, 16.7], L2_SLA0 = 17.4, RES2 = 17.9;
const onPlat = (i: number) => PLAT[i] - 34;
const level = (t: number) => (t < (J1[0] + J1[1]) / 2 ? 0 : t < (J2[0] + J2[1]) / 2 ? 1 : 2);

function escalateS(k: number, t: number): Tok {
  if (k !== ESC) return { x: laneX(k), y: TRAY_Y, w: 22, h: 22, r: 11, c: ACCENT, a: 0.55 };
  const w0 = size(k);
  const p1 = ease(seg(t, J1[0], J1[1])), p2 = ease(seg(t, J2[0], J2[1]));
  const y = lerp(lerp(onPlat(0), onPlat(1), p1), onPlat(2), p2) - Math.sin(PI * p1) * 40 - Math.sin(PI * p2) * 40;
  const squash = 1 + 0.12 * (bump(t, J1[1], J1[1] + 0.2) + bump(t, J2[1], J2[1] + 0.2));
  const s = 1 + 0.18 * bump(t, RES2, RES2 + 0.3);
  let ring: Ring = null;
  if (t < J1[0]) ring = { p: 1, c: WARM, a: blink(t) };
  else if (t >= J1[1] && t < J2[0]) {
    ring = t < L1_SLA[1]
      ? { p: 1 - seg(t, L1_SLA[0], L1_SLA[1]), c: INK, a: seg(t, J1[1], J1[1] + 0.15) }
      : { p: 1, c: WARM, a: blink(t) };
  } else if (t >= J2[1]) {
    ring = { p: 1 - seg(Math.min(t, RES2), L2_SLA0, L2_SLA0 + 1.0), c: INK, a: seg(t, J2[1], J2[1] + 0.15) * (1 - seg(t, RES2, RES2 + 0.2)) };
  }
  const breachedAgain = seg(t, L1_SLA[1], L1_SLA[1] + 0.15) * (1 - seg(t, J2[1], J2[1] + 0.3));
  let c = t < J1[1] ? WARM : mix(mix(WARM, INK, seg(t, J1[1], J1[1] + 0.3)), WARM, breachedAgain);
  if (t >= J2[1]) c = mix(mix(WARM, INK, seg(t, J2[1], J2[1] + 0.3)), ACCENT, seg(t, RES2, RES2 + 0.15));
  return { x: CX, y, w: w0 * s * squash, h: (w0 * s) / squash, r: (w0 * s) / 2, c, a: 1, ring };
}

/* 5. VERIFY */
const tv = (k: number) => 19.3 + k * 0.35;
const citPos = (k: number) => ({ x: laneX(k), y: CIT_Y });
const closeT = (k: number) => tv(k) + 0.9;

function verifyS(k: number, t: number): Tok {
  const start = k === ESC ? { x: CX, y: onPlat(2), w: size(k), a: 1 } : { x: laneX(k), y: TRAY_Y, w: 22, a: 0.55 };
  const p = ease(seg(t, tv(k), tv(k) + 0.5));
  const C = citPos(k);
  const s = 1 + 0.16 * bump(t, closeT(k), closeT(k) + 0.3);
  const w = lerp(start.w, 30, p) * s;
  return { x: lerp(start.x, C.x, p), y: lerp(start.y, C.y, p) - Math.sin(PI * p) * 40, w, h: w, r: w / 2, c: ACCENT, a: lerp(start.a, 1, p) };
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Tok; dur?: number; stag?: (k: number) => number };
const SCENES: Scene[] = [
  { t: 0, fn: reportS },
  { t: 5.0, fn: classifyS },
  { t: 9.6, fn: resolveS },
  { t: 13.8, fn: escalateS, dur: 0.7, stag: (k) => (k === ESC ? 0 : 0.05 + k * 0.04) },
  { t: 18.6, fn: verifyS },
  { t: 23.6, fn: (k) => reportS(k, 0), dur: 1.0, stag: (k) => k * 0.08 },
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
  return {
    x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * 30,
    w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
    tail: lerp(A.tail || 0, B.tail || 0, p), c: mix(A.c, B.c, p),
    a: lerp(A.a ?? 1, B.a ?? 1, p), ring: p < 0.5 ? A.ring : B.ring,
  };
}

/* Where the eye is looking: a weighted average of whichever tokens are busy. */
function focus(t: number) {
  let sx = CX * 0.2, sy = 480 * 0.2, sw = 0.2;
  const add = (k: number, w: number) => {
    if (w <= 0) return;
    const s = tokenState(k, t);
    sx += s.x * w;
    sy += s.y * w;
    sw += w;
  };
  for (let k = 0; k < N; k++) {
    add(k, bump(t, td(k), ta(k)));
    add(k, bump(t, tc(k), tc(k) + 1.0));
    if (k !== ESC) add(k, bump(t, TR[k] - 0.4, TR[k] + 0.4));
    add(k, bump(t, tv(k), closeT(k)));
  }
  add(ESC, bump(t, 12.8, 13.9));
  add(ESC, 1.5 * seg(t, 14.2, 14.7) * (1 - seg(t, 18.0, 18.5)));
  return { x: sx / sw, y: sy / sw };
}

type Echo = { t: number; x: number; y: number; d: number; c: RGB; ripple?: boolean };
const ECHOES: Echo[] = [
  ...Object.keys(TR).map((k) => ({ t: TR[+k], x: laneX(+k), y: LANE_Y, d: size(+k), c: ACCENT })),
  { t: BREACH, x: laneX(ESC), y: LANE_Y, d: size(ESC), c: WARM },
  { t: L1_SLA[1], x: CX, y: onPlat(1), d: size(ESC), c: WARM },
  { t: RES2, x: CX, y: onPlat(2), d: size(ESC), c: ACCENT, ripple: true },
  ...[...Array(N).keys()].map((k) => ({ t: closeT(k), x: laneX(k), y: CIT_Y, d: 68, c: ACCENT, ripple: k === N - 1 })),
];

function drawToken(p: Painter, s: Tok) {
  if ((s.a ?? 1) <= 0.01) return;
  const c = p.ctx;
  c.save();
  c.globalAlpha = s.a ?? 1;
  if (s.ring) {
    const rr = s.w / 2 + 11;
    p.arc(s.x, s.y, rr, 0, PI * 2, EDGE, 4, s.ring.a);
    if (s.ring.p > 0) p.arc(s.x, s.y, rr, -PI / 2, PI * 2 * s.ring.p, s.ring.c, 4, s.ring.a);
  }
  p.rrect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, s.r, s.c);
  if (s.tail && s.tail > 0.01) {
    const k = s.tail;
    c.beginPath();
    c.moveTo(s.x - s.w * 0.34, s.y + s.h * 0.2);
    c.lineTo(s.x - s.w * (0.34 + 0.24 * k), s.y + s.h * (0.2 + 0.42 * k));
    c.lineTo(s.x - s.w * 0.06, s.y + s.h * 0.44);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  p.arc(e.x, e.y, e.d / 2 + 6 + 28 * easeOut(q), 0, PI * 2, e.c, 3, 0.75 * (1 - q));
}

function drawEye(p: Painter, t: number) {
  let open = ease(seg(t, 0.15, 0.8)) * (1 - ease(seg(t, 9.25, 9.7)));
  open *= 1 - 0.92 * bump(t, 3.0, 3.28);
  if (open <= 0.01) return;
  const c = p.ctx;
  const hw = 180, hh = 62 * open;
  c.save();
  c.beginPath();
  c.moveTo(EYE.x - hw, EYE.y);
  c.quadraticCurveTo(EYE.x, EYE.y - 2 * hh, EYE.x + hw, EYE.y);
  c.quadraticCurveTo(EYE.x, EYE.y + 2 * hh, EYE.x - hw, EYE.y);
  c.closePath();
  c.fillStyle = `rgb(${IRIS_BG.join(",")})`;
  c.fill();
  c.strokeStyle = `rgb(${LOCK.map((v) => v | 0).join(",")})`;
  c.lineWidth = 4;
  c.stroke();
  c.clip();
  const F = focus(t);
  const dx = F.x - EYE.x, dy = F.y - EYE.y, dl = Math.hypot(dx, dy) || 1;
  const look = Math.min(22, dl * 0.08);
  const ix = EYE.x + (dx / dl) * look, iy = EYE.y + (dy / dl) * look * 0.6;
  let scan = 0;
  for (let k = 0; k < N; k++) scan += bump(t, tc(k) + 0.2, tc(k) + 0.6);
  p.disc(ix, iy, 46, ACCENT);
  p.disc(ix, iy, 17 + 9 * scan, GROUND);
  c.restore();
}

/* Sources: a square port (web) and a bubble (chat) mark where complaints come from. */
function drawSources(p: Painter, t: number) {
  const a = seg(t, 0.2, 0.6) * (1 - seg(t, 4.3, 4.8));
  if (a <= 0) return;
  p.rstroke(150 - 22, 720 - 22, 44, 44, 8, LOCK, 3, a);
  p.arc(1450, 720, 22, 0, PI * 2, LOCK, 3, a);
}

function drawLanes(p: Painter, t: number) {
  const a = seg(t, 5.0, 5.6) * (1 - seg(t, 13.8, 14.3));
  if (a <= 0) return;
  for (let k = 0; k < N; k++) {
    p.line(laneX(k), 590, laneX(k), 712, EDGE, 3, a);
    p.disc(laneX(k), 748, 5, LOCK, a);
  }
  // Priority readout while a complaint is inside the eye: one bar per level.
  for (let k = 0; k < N; k++) {
    const ra = seg(t, tc(k) + 0.25, tc(k) + 0.35) * (1 - seg(t, tc(k) + 0.7, tc(k) + 0.8));
    if (ra <= 0) continue;
    for (let j = 0; j < 4; j++) {
      const on = j <= PRI[k];
      p.rrect(CX - 66 + j * 36, 534, 24, 12, 6, on ? (PRI[k] === 3 ? ACCENT : INK) : EDGE, ra);
    }
  }
}

function drawLadder(p: Painter, t: number) {
  const a = 1 - seg(t, 18.35, 18.8);
  if (t < 14.0 || a <= 0) return;
  const lv = level(t);
  for (let i = 0; i < 3; i++) {
    const g = ease(seg(t, 14.0 + i * 0.12, 14.45 + i * 0.12));
    if (g <= 0) continue;
    const on = i === lv;
    const done = on && i === 2 && t >= RES2;
    const col = done ? ACCENT : on ? WARM : EDGE;
    p.line(CX - 180 * g, PLAT[i], CX + 180 * g, PLAT[i], col, 6, a);
    // Rank pips beside each rung: one, two, three.
    for (let j = 0; j <= i; j++) p.disc(CX + 214 + j * 22, PLAT[i], 6, on ? (done ? ACCENT : INK) : LOCK, a * g);
  }
}

function drawVerify(p: Painter, t: number) {
  const a = seg(t, 18.8, 19.3) * (1 - seg(t, 23.3, 23.7));
  if (a <= 0) return;
  let closed = 0;
  for (let k = 0; k < N; k++) {
    const C = citPos(k);
    const g = easeOut(seg(t, 18.8 + k * 0.05, 19.3 + k * 0.05));
    p.arc(C.x, C.y, 34 * g, 0, PI * 2, LOCK, 3, a);
    const q = ease(seg(t, tv(k) + 0.5, closeT(k)));
    if (q > 0) p.arc(C.x, C.y, 34, -PI / 2, PI * 2 * q, q >= 1 ? ACCENT : INK, 5, a);
    if (t >= closeT(k)) closed++;
    const fp = seg(t, closeT(k), closeT(k) + 0.8);
    if (fp > 0 && fp < 1) p.disc(C.x, C.y - 60 - 30 * easeOut(fp), 6, ACCENT, a * (1 - fp));
  }
  // Closure tally: seven pips that light as citizens sign off.
  for (let k = 0; k < N; k++) p.rrect(CX - 3 * 34 - 10 + k * 34, 662, 20, 8, 4, k < closed ? ACCENT : EDGE, a);
}

function draw(p: Painter, t: number, view: View) {
  const F = focus(t);
  p.dots(
    view, INK, 0.07,
    (x, y) => {
      const f = Math.max(0, 1 - Math.hypot(x - F.x, y - F.y) / 340);
      let s = 0.12 * f * f;
      for (const e of ECHOES) if (e.ripple) s += ripple(t, e.t, e.x, e.y, x, y);
      return s;
    },
    mix(INK, ACCENT, 0.6),
  );
  drawEye(p, t);
  drawSources(p, t);
  drawLanes(p, t);
  drawLadder(p, t);
  drawVerify(p, t);
  for (let k = 0; k < N; k++) drawToken(p, tokenState(k, t));
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const argus: FilmDef = {
  ground: "#3b0d36",
  loop: LOOP,
  still: 16.2,
  chapters: [
    { label: "Report", range: [0, 5.0] },
    { label: "Classify", range: [5.0, 9.6] },
    { label: "Resolve", range: [9.6, 13.8] },
    { label: "Escalate", range: [13.8, 18.6] },
    { label: "Verify", range: [18.6, 23.6] },
  ],
  draw,
};
