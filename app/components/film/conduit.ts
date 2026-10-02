// CONDUIT: eight shapes carry the gateway's five pillars in one seamless loop.
// Translate the harness request → reassemble event-stream frames → dispatch on the
// `:event-type` header → meter real context, tokens and credits → tee a copy to SAGA.
import {
  PI, Painter, bump, css, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#f5b82e");
const INK = hex("#22180a");
const ACCENT = hex("#fffaf0");
const WARN = hex("#c62f1b");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Item = {
  x: number; y: number; w: number; h: number; r: number; c: RGB;
  a?: number; z?: number;
  /** Frame segments (prelude and CRC blocks). */ sg?: number;
  /** Header glyph (the event type). */ gl?: number;
  /** Self-drawing tick. */ tick?: number;
};

const N = 8;
const lum = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const lerpItem = (A: Item, B: Item, p: number): Item => ({
  x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p), w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
  c: mix(A.c, B.c, p), a: lerp(A.a ?? 1, B.a ?? 1, p), sg: lerp(A.sg ?? 0, B.sg ?? 0, p),
  gl: lerp(A.gl ?? 0, B.gl ?? 0, p), tick: lerp(A.tick ?? 0, B.tick ?? 0, p), z: B.z,
});

/* Event types, one glyph each, in stream order:
   reasoning, text, text, toolUse, (unknown), metering, contextUsage, messageStop. */
type Glyph = "ring" | "disc" | "diamond" | "tri" | "half" | "square" | "unknown";
const KIND: Glyph[] = ["ring", "disc", "disc", "diamond", "unknown", "tri", "half", "square"];

/* 1. TRANSLATE: harness messages → conversationState.
   The system prompt moves to its native slot; consecutive same-role turns merge (no padding). */
type Role = "s" | "u" | "a";
const ROLE: Role[] = ["s", "u", "u", "a", "u", "a", "a", "u"];
const LX1 = 470, RX1 = 1130, H1 = 40;
const off = (k: number) => (ROLE[k] === "u" ? -20 : ROLE[k] === "a" ? 20 : 0);
const w1 = (k: number) => (ROLE[k] === "s" ? 340 : 280);
const r1 = (k: number) => (ROLE[k] === "s" ? 20 : 10);
const leftY = (k: number) => 236 + k * 62;
// Fused turns overlap by twice the corner radius, so the seam disappears.
const RIGHT_Y: number[] = [236];
{
  let bottom = 304;
  for (let k = 1; k < N; k++) {
    const y = ROLE[k] === ROLE[k - 1] ? RIGHT_Y[k - 1] + H1 - 20 : bottom + 16 + H1 / 2;
    RIGHT_Y.push(y);
    bottom = y + H1 / 2;
  }
}
const MERGED = [...Array(N).keys()].filter((k) => k > 1 && ROLE[k] === ROLE[k - 1]);
const dep1 = (k: number) => 0.9 + k * 0.36;
const land1 = (k: number) => dep1(k) + 0.7;
const READY = 4.35;

function translateS(k: number, t: number): Item {
  const w = w1(k), r = r1(k);
  const xl = LX1 + off(k), yl = leftY(k), xr = RX1 + off(k), yr = RIGHT_Y[k];
  const d = dep1(k), l = land1(k);
  if (t < d) return { x: xl, y: yl, w, h: H1, r, c: LOCK };
  if (t < l) {
    const p = ease(seg(t, d, l));
    return { x: lerp(xl, xr, p), y: lerp(yl, yr, p) - Math.sin(PI * p) * 70, w, h: H1, r, c: mix(LOCK, INK, seg(t, d, d + 0.12)), z: 2 };
  }
  const pop = 1 + 0.06 * bump(t, l, l + 0.3);
  return { x: xr, y: yr, w: w * pop, h: H1, r, c: mix(INK, ACCENT, seg(t, l, l + 0.12)) };
}

/* 2. FRAME: the AWS event stream arrives in HTTP chunks that ignore frame boundaries.
   Bytes pile into a buffer; a frame leaves only once its prelude's total_len is all there. */
const L = [96, 150, 72, 184, 118, 66, 160, 100]; // frame lengths (bytes)
const C = [60, 130, 120, 70, 200, 90, 140, 136]; // chunk lengths (bytes), same total
const S2 = 2.2, TL2 = 280, MOUTH = 880, TY = 300, FH = 34;
const rowY2 = (k: number) => 430 + k * 56;
const ca = (j: number) => 5.9 + j * 0.4;
const startL: number[] = [], endL: number[] = [], startC: number[] = [];
{
  let s = 0;
  for (const l of L) {
    startL.push(s);
    s += l;
    endL.push(s);
  }
  s = 0;
  for (const c of C) {
    startC.push(s);
    s += c;
  }
}
// Emission trace: a frame decodes shortly after the chunk holding its last byte lands.
const TE: number[] = [];
for (let k = 0; k < N; k++) {
  const j = C.findIndex((c, i) => endL[k] > startC[i] && endL[k] <= startC[i] + c);
  TE.push(Math.max(ca(j) + 0.15, k ? TE[k - 1] + 0.35 : 0));
}
const FALL = 0.5;
const tl = (k: number) => TE[k] + FALL;
const received = (t: number) => C.reduce((s, c, j) => s + c * seg(t, ca(j), ca(j) + 0.1), 0);
const consumed = (t: number) => L.reduce((s, l, k) => s + l * ease(seg(t, TE[k], TE[k] + 0.3)), 0);
const emitted = (t: number) => L.reduce((s, l, k) => s + (t >= TE[k] ? l : 0), 0);

function frameS(k: number, t: number): Item {
  const l = tl(k);
  if (t < l) return { x: TL2 + 30, y: rowY2(k), w: 60, h: FH, r: 10, c: IDLE };
  const W = L[k] * S2;
  const pop = 1 + 0.12 * bump(t, l, l + 0.3);
  return { x: TL2 + W / 2, y: rowY2(k), w: W, h: FH * pop, r: 10, c: mix(INK, ACCENT, seg(t, l, l + 0.15)), sg: 1, gl: seg(t, l, l + 0.2) };
}

/* 3. DISPATCH: each frame is routed by the glyph on its header, never by payload guesswork.
   The unrecognised event is carried through to its own lane, not dropped. */
const QX = 300, W3 = 170;
const qY = (k: number) => 290 + k * 62;
const SW = { x: 580, y: 505 };
const laneY = (i: number) => 230 + i * 90;
const LANE = [0, 1, 1, 2, 6, 3, 4, 5];
const LANE_GLYPH: Glyph[] = ["ring", "disc", "diamond", "tri", "half", "square", "unknown"];
const FAN_X = SW.x + W3 / 2 + 6, LANE_X0 = 760, LANE_X1 = 1300, OUT_X = 1372;
const slotX = (k: number) => (k === 2 ? 1000 : 1190);
const td = (k: number) => 10.8 + k * 0.4;
const HOLD = 0.4; // the frame waits at the switch while its header is read
const arr3 = (k: number) => td(k) + 0.85;

function dispatchS(k: number, t: number): Item {
  const d = td(k);
  const base = { w: W3, h: FH, r: 10, sg: 1, gl: 1 };
  if (t < d) return { ...base, x: QX, y: qY(k), c: LOCK };
  if (t < d + HOLD) {
    const p = ease(seg(t, d, d + 0.25));
    return { ...base, x: lerp(QX, SW.x, p), y: lerp(qY(k), SW.y, p), c: mix(LOCK, INK, seg(t, d, d + 0.1)), z: 2 };
  }
  const ly = laneY(LANE[k]), sx = slotX(k), a = arr3(k);
  if (t < a) {
    const p = ease(seg(t, d + HOLD, a));
    const jx = LANE_X0 + W3 / 2;
    if (p < 0.35) {
      const q = p / 0.35;
      return { ...base, x: lerp(SW.x, jx, q), y: lerp(SW.y, ly, q), c: INK, z: 2 };
    }
    return { ...base, x: lerp(jx, sx, (p - 0.35) / 0.65), y: ly, c: INK, z: 2 };
  }
  const done = k === 4 ? GREY : ACCENT;
  const s = 1 + 0.1 * bump(t, a, a + 0.3);
  return { ...base, x: sx, y: ly, h: FH * s, c: mix(INK, done, seg(t, a, a + 0.12)) };
}

/* 4. METER: the context-usage percentage is read off the wire, then inverted into exact
   token counters that fill the same share of the window. Credits tick into a ledger. */
const RING = { x: 430, y: 470 }, RR = 150, PCT = 0.58;
const SWEEP0 = 15.9, SWEEP1 = 17.0;
const ORDER4 = [3, 1, 2, 0]; // Kiro's own system prompt, input, output, thought
const CW4: Record<number, number> = { 3: 84, 1: 150, 2: 72, 0: 42 };
const TX0 = 666, TRK_Y = 470, LED_Y = 640;
const LEFT4: Record<number, number> = {};
let FILLED = 0;
{
  let x = TX0;
  for (const k of ORDER4) {
    LEFT4[k] = x;
    x += CW4[k] + 6;
  }
  FILLED = x - 6 - TX0;
}
const TI = FILLED / PCT;
const tg = (k: number) => 17.2 + ORDER4.indexOf(k) * 0.3;
const NOTCH = [16.3, 16.9, 17.5, 18.1];
const STOP = { x: 1395, y: TRK_Y }, STOP_T = 18.9;

function meterS(k: number, t: number): Item {
  if (k === 6) {
    const s = 1 + 0.15 * bump(t, SWEEP1, SWEEP1 + 0.35), w = 96 * s;
    return { x: RING.x, y: RING.y, w, h: w, r: w / 2, c: mix(INK, ACCENT, seg(t, SWEEP1, SWEEP1 + 0.12)) };
  }
  if (k in CW4) {
    const g0 = tg(k), g = ease(seg(t, g0, g0 + 0.35)), w = lerp(12, CW4[k], g);
    const c = t < g0 + 0.35 ? mix(LOCK, INK, seg(t, g0, g0 + 0.1)) : mix(INK, ACCENT, seg(t, g0 + 0.35, g0 + 0.47));
    return { x: LEFT4[k] + w / 2, y: TRK_Y, w, h: 36, r: 8, c };
  }
  if (k === 5) {
    const n = NOTCH.reduce((s, nt) => s + ease(seg(t, nt, nt + 0.25)), 0);
    const pop = 1 + 0.14 * NOTCH.reduce((s, nt) => s + bump(t, nt + 0.2, nt + 0.45), 0);
    const w = 40 + 60 * n, last = NOTCH[NOTCH.length - 1] + 0.25;
    return { x: TX0 + w / 2, y: LED_Y, w, h: 30 * pop, r: 8, c: mix(INK, ACCENT, seg(t, last, last + 0.12)) };
  }
  if (k === 7) {
    const s = 1 + 0.15 * bump(t, STOP_T, STOP_T + 0.35), w = 76 * s;
    return { x: STOP.x, y: STOP.y, w, h: w, r: 16, c: mix(LOCK, ACCENT, seg(t, STOP_T, STOP_T + 0.12)), tick: seg(t, STOP_T + 0.05, STOP_T + 0.4) };
  }
  return { x: RING.x, y: 712, w: 130, h: 28, r: 14, c: GREY };
}

/* 5. TEE: the response reaches the client without waiting; a copy goes into a bounded
   queue that a slow worker drains to SAGA. When the queue is full the oldest is evicted. */
const GATE = { x: 800, y: 300 }, CLIENT = { x: 250, y: 300 }, KIRO = { x: 1340, y: 300 }, SAGA = { x: 1340, y: 600 };
const QY = 600, QSLOT = [980, 860, 740, 620], CAP = 4, V5 = 180;
const EMIT = (k: number) => 21.2 + k * 0.3;
const DRAINS = [21.7, 23.15, 24.0];
type KF = { t: number; d: number; s: Item };
const KFS: KF[][] = Array.from({ length: N }, () => []);
const DELIVERED: { k: number; t: number }[] = [];
const EVICTED: { k: number; t: number }[] = [];
{
  const q: number[] = [];
  const env = (x: number, y: number): Item => ({ x, y, w: 100, h: 44, r: 12, c: INK });
  const reslot = (t: number) => q.forEach((k, i) => KFS[k].push({ t, d: 0.32, s: env(QSLOT[i], QY) }));
  const evs = [
    ...[...Array(N).keys()].map((k) => ({ t: EMIT(k), k })),
    ...DRAINS.map((t) => ({ t, k: -1 })),
  ].sort((a, b) => a.t - b.t);
  for (const e of evs) {
    if (e.k >= 0) {
      if (q.length >= CAP) {
        const old = q.shift()!, j = EVICTED.length;
        EVICTED.push({ k: old, t: e.t });
        KFS[old].push({ t: e.t, d: 0.45, s: { x: QSLOT[0], y: 715 + j * 36, w: 90, h: 24, r: 10, c: WARN, a: 0.55 } });
      }
      q.push(e.k);
      reslot(e.t);
    } else if (q.length) {
      const k = q.shift()!, j = DELIVERED.length;
      DELIVERED.push({ k, t: e.t });
      KFS[k].push({ t: e.t, d: 0.4, s: { x: SAGA.x, y: SAGA.y, w: 56, h: 30, r: 10, c: INK } });
      KFS[k].push({ t: e.t + 0.45, d: 0.3, s: { x: SAGA.x, y: 712 + j * 36, w: 90, h: 24, r: 10, c: ACCENT } });
      reslot(e.t);
    }
  }
}

function teeS(k: number, t: number): Item {
  const e = EMIT(k);
  if (t < e) return { x: GATE.x + (e - t) * V5, y: GATE.y, w: 40, h: 24, r: 8, c: INK };
  let cur: Item = { x: GATE.x, y: GATE.y, w: 40, h: 24, r: 8, c: INK };
  for (const f of KFS[k]) {
    if (t < f.t) break;
    cur = lerpItem(cur, f.s, ease(seg(t, f.t, f.t + f.d)));
  }
  return cur;
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Item; dur?: number; stag?: (k: number) => number };
const STAG = (k: number) => k * 0.04;
const SCENES: Scene[] = [
  { t: 0, fn: translateS },
  { t: 5.0, fn: frameS, dur: 0.8, stag: STAG },
  { t: 10.0, fn: dispatchS, dur: 0.7, stag: STAG },
  { t: 15.0, fn: meterS, dur: 0.8, stag: STAG },
  { t: 20.0, fn: teeS, dur: 0.8, stag: STAG },
  { t: 24.4, fn: (k) => translateS(k, 0), dur: 0.8, stag: STAG },
];
const LOOP = 25.6;

function itemState(k: number, t: number): Item {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (!sc.dur || !sc.stag) return sc.fn(k, t);
  const st = sc.stag(k);
  const p = ease(seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(k, t);
  const it = lerpItem(SCENES[i - 1].fn(k, sc.t), sc.fn(k, sc.t + st + sc.dur), p);
  return { ...it, y: it.y - Math.sin(PI * p) * 28, z: 1 };
}

/* echoes and ripples */
type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; col: RGB; ripple: boolean };
const ECHOES: Echo[] = [
  ...MERGED.map((k) => ({ t: land1(k), x: RX1 + off(k), y: (RIGHT_Y[k - 1] + RIGHT_Y[k]) / 2, w: 280, h: H1 + 20, r: 12, col: ACCENT, ripple: false })),
  { t: READY, x: RX1, y: 450, w: 400, h: 520, r: 28, col: ACCENT, ripple: true },
  { t: tl(N - 1), x: TL2 + (L[N - 1] * S2) / 2, y: rowY2(N - 1), w: L[N - 1] * S2, h: FH, r: 10, col: ACCENT, ripple: true },
  ...[...Array(N).keys()].map((k) => ({
    t: arr3(k), x: OUT_X, y: laneY(LANE[k]), w: 44, h: 44, r: 22, col: k === 4 ? GREY : ACCENT, ripple: k === N - 1,
  })),
  { t: SWEEP1, x: RING.x, y: RING.y, w: 96, h: 96, r: 48, col: ACCENT, ripple: false },
  { t: STOP_T, x: STOP.x, y: STOP.y, w: 76, h: 76, r: 16, col: ACCENT, ripple: true },
  ...DELIVERED.map((d) => ({ t: d.t + 0.4, x: SAGA.x, y: SAGA.y, w: 120, h: 120, r: 60, col: ACCENT, ripple: false })),
  ...EVICTED.map((d, j) => ({ t: d.t, x: QSLOT[0], y: QY, w: 100, h: 44, r: 12, col: WARN, ripple: j === 0 })),
];

function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 34 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, e.col, 3, 0.8 * (1 - q));
}

/* drawing helpers */
function poly(p: Painter, pts: number[][], col: RGB, a: number) {
  const c = p.ctx;
  c.fillStyle = css(col, a);
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
  c.fill();
}

function glyph(p: Painter, g: Glyph, x: number, y: number, s: number, col: RGB, a: number) {
  if (a <= 0.01) return;
  const c = p.ctx;
  switch (g) {
    case "ring":
      p.arc(x, y, s * 0.72, 0, PI * 2, col, s * 0.42, a);
      break;
    case "disc":
      p.disc(x, y, s, col, a);
      break;
    case "square":
      p.rrect(x - s * 0.85, y - s * 0.85, s * 1.7, s * 1.7, s * 0.3, col, a);
      break;
    case "diamond":
      poly(p, [[x, y - s * 1.1], [x + s * 1.1, y], [x, y + s * 1.1], [x - s * 1.1, y]], col, a);
      break;
    case "tri":
      poly(p, [[x, y - s], [x + s * 1.05, y + s * 0.8], [x - s * 1.05, y + s * 0.8]], col, a);
      break;
    case "half":
      c.fillStyle = css(col, a);
      c.beginPath();
      c.arc(x, y + s * 0.45, s * 1.1, PI, PI * 2);
      c.closePath();
      c.fill();
      break;
    case "unknown":
      c.setLineDash([s * 0.55, s * 0.5]);
      p.arc(x, y, s * 0.8, 0, PI * 2, col, s * 0.28, a);
      c.setLineDash([]);
      break;
  }
}

function tickMark(p: Painter, x: number, y: number, s: number, q: number, col: RGB) {
  if (q <= 0) return;
  const P = [[x - 0.26 * s, y + 0.02 * s], [x - 0.07 * s, y + 0.2 * s], [x + 0.27 * s, y - 0.2 * s]];
  const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const d = q * (l1 + l2);
  const c = p.ctx;
  c.strokeStyle = css(col, 1);
  c.lineWidth = s * 0.11;
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

function drawItem(p: Painter, k: number, it: Item) {
  const a = it.a ?? 1;
  if (a <= 0.005 || it.w <= 0) return;
  const c = p.ctx;
  c.save();
  c.globalAlpha = a;
  const x0 = it.x - it.w / 2, y0 = it.y - it.h / 2;
  p.rrect(x0, y0, it.w, it.h, it.r, it.c);
  const light = lum(it.c) > 150;
  if (it.sg && it.sg > 0.01) {
    c.save();
    p.rrPath(x0, y0, it.w, it.h, it.r);
    c.clip();
    const blk = light ? mix(it.c, INK, 0.4) : mix(it.c, GROUND, 0.3);
    p.rrect(x0, y0, 26, it.h, 0, blk, it.sg);
    p.rrect(x0 + it.w - 12, y0, 12, it.h, 0, blk, it.sg);
    c.restore();
  }
  if (it.gl && it.gl > 0.01) glyph(p, KIND[k], x0 + 48, it.y, 9, light ? INK : GROUND, it.gl);
  if (it.tick && it.tick > 0) tickMark(p, it.x, it.y, it.w, it.tick, INK);
  c.restore();
}

/* chapter furniture */
function drawTranslate(p: Painter, t: number) {
  const a = Math.max(1 - seg(t, 4.6, 5.0), seg(t, 24.5, 25.2));
  if (a <= 0) return;
  const ready = bump(t, READY, READY + 0.6);
  p.rstroke(270, 190, 400, 520, 28, LOCK, 4, a);
  p.rstroke(930, 190, 400, 520, 28, mix(LOCK, ACCENT, ready), 4, a);
  p.line(960, 288, 1300, 288, EDGE, 4, a);
  p.line(690, 450, 910, 450, EDGE, 6, a);
  // Two doors into the gateway: the Anthropic messages door is the one in use.
  p.rrect(252, 360, 22, 60, 9, ACCENT, a);
  p.rrect(252, 480, 22, 60, 9, LOCK, a);
}

function drawFrame(p: Painter, t: number) {
  const a = seg(t, 5.4, 5.8) * (1 - seg(t, 9.9, 10.3));
  if (a <= 0) return;
  p.rstroke(TL2 - 10, TY - 30, MOUTH - TL2 + 20, 60, 18, LOCK, 4, a);
  p.line(MOUTH + 22, TY, 1480, TY, EDGE, 4, a);
  const rec = received(t), cs = consumed(t), em = emitted(t);
  const left = TL2 + S2 * (em - cs), right = TL2 + S2 * (rec - cs);
  if (right - left > 1) p.rrect(left, TY - FH / 2, right - left, FH, 10, INK, 0.92 * a);
  // The next frame's prelude: once its 12 bytes are in, its total length is known.
  const n = TE.findIndex((te) => t < te);
  if (n >= 0) {
    const s = startL[n], pa = seg(rec, s + 12, s + 24) * a;
    if (pa > 0) {
      p.rrect(TL2 + S2 * (s - cs), TY - FH / 2, 12 * S2, FH, 8, GREY, pa);
      const xe = TL2 + S2 * (endL[n] - cs);
      p.line(xe, TY - 26, xe, TY + 26, rec >= endL[n] ? ACCENT : GREY, 4, pa);
    }
  }
  // Incoming chunks slide in from the backend and become buffered bytes.
  for (let j = 0; j < C.length; j++) {
    const t0 = ca(j) - 0.45, t1 = ca(j) + 0.1;
    if (t < t0 || t >= t1) continue;
    const target = TL2 + S2 * (startC[j] - cs);
    const x = lerp(1500, target, easeOut(seg(t, t0, ca(j))));
    const ca2 = seg(t, t0, t0 + 0.1) * (1 - seg(t, ca(j), t1));
    p.rrect(x, TY - FH / 2, C[j] * S2, FH, 10, GREY, ca2 * a);
  }
}

function drawDrops(p: Painter, t: number) {
  for (let k = 0; k < N; k++) {
    if (t < TE[k] || t >= tl(k)) continue;
    const y = lerp(TY, rowY2(k), ease(seg(t, TE[k], tl(k))));
    p.rrect(TL2, y - FH / 2, L[k] * S2, FH, 10, INK);
  }
}

function drawDispatch(p: Painter, t: number) {
  const a = seg(t, 10.3, 10.7) * (1 - seg(t, 14.6, 15.0));
  if (a <= 0) return;
  const c = p.ctx;
  let flash = 0;
  for (let k = 0; k < N; k++) flash = Math.max(flash, bump(t, td(k) + 0.2, td(k) + HOLD + 0.1));
  p.rstroke(SW.x - W3 / 2 - 14, SW.y - 31, W3 + 28, 62, 18, mix(LOCK, ACCENT, flash), 4, a);
  for (let i = 0; i < LANE_GLYPH.length; i++) {
    const ly = laneY(i), unk = LANE_GLYPH[i] === "unknown";
    p.line(FAN_X, SW.y, LANE_X0, ly, EDGE, 3, a);
    if (unk) c.setLineDash([14, 12]);
    p.line(LANE_X0, ly, LANE_X1, ly, EDGE, 4, a);
    if (unk) c.setLineDash([]);
    const first = Math.min(...[...Array(N).keys()].filter((k) => LANE[k] === i).map(arr3));
    glyph(p, LANE_GLYPH[i], OUT_X, ly, 16, mix(LOCK, unk ? GREY : ACCENT, seg(t, first, first + 0.15)), a);
  }
  for (let k = 0; k < N; k++) {
    const ra = bump(t, td(k) + HOLD - 0.05, arr3(k) + 0.15) * a;
    if (ra <= 0) continue;
    const ly = laneY(LANE[k]);
    p.line(FAN_X, SW.y, LANE_X0, ly, ACCENT, 3, ra);
    p.line(LANE_X0, ly, slotX(k) + W3 / 2, ly, ACCENT, 4, ra * 0.6);
  }
}

function drawHeaderScan(p: Painter, t: number) {
  if (t < 10.5 || t > 14.2) return;
  for (let k = 0; k < N; k++) {
    const q = bump(t, td(k) + 0.2, td(k) + HOLD + 0.05);
    if (q > 0) p.arc(SW.x - W3 / 2 + 48, SW.y, 17, 0, PI * 2, ACCENT, 3, q);
  }
}

function drawMeter(p: Painter, t: number) {
  const a = seg(t, 15.4, 15.8) * (1 - seg(t, 19.6, 20.0));
  if (a <= 0) return;
  p.arc(RING.x, RING.y, RR, 0, PI * 2, EDGE, 24, a);
  const sw = ease(seg(t, SWEEP0, SWEEP1));
  if (sw > 0) p.arc(RING.x, RING.y, RR, -PI / 2, sw * PCT * PI * 2, mix(INK, ACCENT, seg(t, SWEEP1, SWEEP1 + 0.15)), 24, a);
  const lit = seg(t, SWEEP1, SWEEP1 + 0.2);
  p.line(RING.x + RR + 24, TRK_Y, TX0 - 22, TRK_Y, mix(EDGE, ACCENT, lit), 4, a);
  p.rstroke(TX0 - 8, TRK_Y - 26, TI + 16, 52, 14, LOCK, 4, a);
  // The derived total is known before the counters fill to it.
  const q = easeOut(seg(t, SWEEP1, SWEEP1 + 0.3));
  if (q > 0) p.line(TX0 + FILLED + 3, TRK_Y - 40 * q, TX0 + FILLED + 3, TRK_Y + 40 * q, ACCENT, 4, a);
  p.rstroke(TX0 - 8, LED_Y - 24, TI + 16, 48, 14, LOCK, 4, a);
  for (let i = 0; i <= NOTCH.length; i++) p.disc(TX0 + 40 + 60 * i - 4, LED_Y + 40, 4, LOCK, a);
}

function drawTee(p: Painter, t: number) {
  const a = seg(t, 20.4, 20.8) * (1 - seg(t, 24.4, 24.8));
  if (a <= 0) return;
  let client = 0, gate = 0;
  for (let k = 0; k < N; k++) {
    client = Math.max(client, bump(t, EMIT(k) + 0.42, EMIT(k) + 0.72));
    gate = Math.max(gate, bump(t, EMIT(k) - 0.05, EMIT(k) + 0.25));
  }
  let saga = 0;
  for (const d of DELIVERED) saga = Math.max(saga, bump(t, d.t + 0.3, d.t + 0.65));
  p.line(CLIENT.x + 75, GATE.y, KIRO.x - 50, GATE.y, EDGE, 6, a);
  p.rstroke(CLIENT.x - 75, CLIENT.y - 95, 150, 190, 26, mix(LOCK, ACCENT, client), 4, a);
  p.arc(KIRO.x, KIRO.y, 80, 0, PI * 2, LOCK, 5, a);
  p.disc(KIRO.x, KIRO.y, 36, GREY, a);
  p.line(GATE.x, GATE.y + 82, GATE.x, QY - 44, EDGE, 5, a);
  p.rstroke(560, QY - 38, 480, 76, 20, LOCK, 4, a);
  p.line(1046, QY, SAGA.x - 68, QY, EDGE, 5, a);
  p.arc(SAGA.x, SAGA.y, 60, 0, PI * 2, LOCK, 5, a);
  p.disc(SAGA.x, SAGA.y, 28 * (1 + 0.2 * saga), mix(INK, ACCENT, saga), a);
  const gw = 44 * (1 + 0.2 * gate);
  p.rrect(GATE.x - gw / 2, GATE.y - 75, gw, 150, gw / 2, ACCENT, a);
  // Every response carries straight on to the client, whatever the queue is doing.
  for (let k = 0; k < N; k++) {
    for (let tr = 0; tr < 3; tr++) {
      const q = seg(t - tr * 0.03, EMIT(k), EMIT(k) + 0.5);
      if (q <= 0 || q >= 1) continue;
      p.disc(lerp(GATE.x - 30, CLIENT.x + 75, ease(q)), GATE.y, 9 - tr * 2.5, ACCENT, a * (1 - tr * 0.3));
    }
  }
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.08, (x, y) => ECHOES.reduce((s, e) => (e.ripple ? s + ripple(t, e.t, e.x, e.y, x, y) : s), 0), ACCENT);
  drawTranslate(p, t);
  drawFrame(p, t);
  drawDispatch(p, t);
  drawMeter(p, t);
  drawTee(p, t);
  const items: { k: number; it: Item }[] = [];
  for (let k = 0; k < N; k++) items.push({ k, it: itemState(k, t) });
  items.sort((a, b) => (a.it.z || 0) - (b.it.z || 0));
  for (const { k, it } of items) drawItem(p, k, it);
  drawDrops(p, t);
  drawHeaderScan(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const conduit: FilmDef = {
  ground: "#f5b82e",
  loop: LOOP,
  still: 13.9,
  chapters: [
    { label: "Translate", range: [0, 5.0] },
    { label: "Frame", range: [5.0, 10.0] },
    { label: "Dispatch", range: [10.0, 15.0] },
    { label: "Meter", range: [15.0, 20.0] },
    { label: "Tee", range: [20.0, 24.4] },
  ],
  draw,
};
