// SAGA: eight captured requests carry the proxy's five pillars in one seamless loop.
// Forward (tee, never block) → redact → classify call roles → replay → retention tiers.
import {
  CX, PI, Painter, bump, clamp01, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#2440d8");
const INK = hex("#f3f5ff");
const ACCENT = hex("#ffd23f");
const WARN = hex("#ff6b5a");
const SHADE = hex("#0d1a5c");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);

type Item = { x: number; y: number; w: number; h: number; r: number; c: RGB; z?: number; fill?: number; fc?: RGB };

const N = 8;

/* 1. FORWARD: client → SAGA → upstream, with a copy teed down into the store */
const CLIENT = { x: 260, y: 400 }, GATE = { x: CX, y: 400 }, UP = { x: 1340, y: 400 }, STORE = { x: CX, y: 720 };
const WIRE_L = 355, WIRE_R = 1250;
const dep = (k: number) => 0.5 + k * 0.4;
const arr = (k: number) => dep(k) + 0.55;
const kept = (k: number) => arr(k) + 0.5;
const pillY = (k: number) => CLIENT.y + (k - 3.5) * 30;
const slotY = (k: number) => 804 - k * 24;

function forwardS(k: number, t: number): Item {
  const d = dep(k), a = arr(k), s = kept(k);
  if (t < d) return { x: CLIENT.x, y: pillY(k), w: 130, h: 22, r: 11, c: GREY };
  if (t < a) {
    const p = ease(seg(t, d, a));
    return {
      x: lerp(CLIENT.x, GATE.x, p), y: lerp(pillY(k), GATE.y, p), w: lerp(130, 64, p), h: 22, r: 11,
      c: mix(GREY, INK, seg(t, d, d + 0.15)), z: 2,
    };
  }
  if (t < s) {
    const p = ease(seg(t, a, s));
    return { x: GATE.x, y: lerp(GATE.y, slotY(k), p), w: lerp(64, 300, p), h: lerp(22, 16, p), r: lerp(11, 8, p), c: INK, z: 2 };
  }
  const pop = 1 + 0.08 * bump(t, s, s + 0.3);
  return { x: GATE.x, y: slotY(k), w: 300 * pop, h: 16, r: 8, c: mix(INK, ACCENT, bump(t, s, s + 0.45)) };
}

/* 2. REDACT: a scan sweeps the captured body; secrets are blacked out with a correlating stub */
const LX = 390;
const W2 = [720, 560, 820, 640, 760, 480, 700, 600];
const lineY = (k: number) => 250 + k * 66;
const SCAN0 = 6.4, SCAN1 = 8.8, SY0 = 215, SY1 = 750;
const scanY = (t: number) => lerp(SY0, SY1, seg(t, SCAN0, SCAN1));
const scanT = (k: number) => SCAN0 + ((lineY(k) - SY0) / (SY1 - SY0)) * (SCAN1 - SCAN0);
// The same secret twice (id 0) gets the same fingerprint stub.
const SECRETS = [
  { k: 1, off: 260, w: 170, id: 0 },
  { k: 3, off: 120, w: 150, id: 1 },
  { k: 4, off: 470, w: 200, id: 2 },
  { k: 6, off: 300, w: 170, id: 0 },
];
const PRINT = [
  [10, 20, 13],
  [18, 8, 15],
  [12, 14, 20],
];

function redactS(k: number, t: number): Item {
  const w = W2[k], ts = scanT(k);
  return { x: LX + w / 2, y: lineY(k), w, h: 30, r: 15, c: mix(INK, ACCENT, seg(t, ts + 0.05, ts + 0.3)) };
}

/* 3. CLASSIFY: main / subagent / utility, folded into the conversation tree */
type Role = "m" | "s" | "u";
const ROLE: Role[] = ["m", "m", "s", "u", "m", "s", "m", "u"];
const ROLEC: Record<Role, RGB> = { m: ACCENT, s: INK, u: GREY };
const MSG = [5, 6, 4, 2, 7, 4, 8, 3];
const ROW_Y = 680;
const rowX = (k: number) => CX + (k - 3.5) * 130;
const ROW_S: Record<Role, number> = { m: 60, s: 52, u: 40 };
const TREE_S: Record<Role, number> = { m: 72, s: 56, u: 30 };
const SPINE = 400, SUB_Y = 610, TURN_Y = 212, TREE_TURN_Y = 282;
const TREE: [number, number][] = [
  [400, SPINE], [640, SPINE], [640, SUB_Y], [702, SPINE + 50],
  [900, SPINE], [900, SUB_Y], [1160, SPINE], [1222, SPINE + 50],
];
const PARENT = [-1, -1, 1, 1, -1, 4, -1, 6];
const CL0 = 11.3, CLD = 0.32;
const clsT = (k: number) => CL0 + k * CLD;

function classifyS(k: number, t: number): Item {
  const role = ROLE[k], tc = clsT(k);
  const p = ease(seg(t, tc + 0.05, tc + 0.6));
  const pop = 1 + 0.18 * bump(t, tc + 0.6, tc + 0.9);
  const s = lerp(ROW_S[role], TREE_S[role], p) * pop;
  return {
    x: lerp(rowX(k), TREE[k][0], p), y: lerp(ROW_Y, TREE[k][1], p) - Math.sin(PI * p) * 30,
    w: s, h: s, r: s * 0.28, c: mix(LOCK, ROLEC[role], seg(t, tc, tc + 0.15)), z: p > 0 && p < 1 ? 2 : 0,
  };
}

/* 4. REPLAY: the turn played back as a request waterfall */
const S4 = [0, 170, 220, 480, 540, 590, 810, 940];
const D4 = [150, 300, 200, 50, 250, 150, 160, 50];
const TL = 300, AXIS_Y = 790;
const rowY = (k: number) => 250 + k * 68;
const PH0 = 16.3, PH1 = 19.3;
const PX = (t: number) => TL + 1000 * seg(t, PH0, PH1);
const doneT = (k: number) => PH0 + ((S4[k] + D4[k]) / 1000) * (PH1 - PH0);

function replayS(k: number, t: number): Item {
  const left = TL + S4[k], w = D4[k], rc = ROLEC[ROLE[k]];
  const f = clamp01((PX(t) - left) / w);
  if (f >= 1) {
    const s = 1 + 0.16 * bump(t, doneT(k), doneT(k) + 0.3);
    return { x: left + w / 2, y: rowY(k), w, h: 34 * s, r: 10, c: rc };
  }
  return { x: left + w / 2, y: rowY(k), w, h: 34, r: 10, c: IDLE, fill: f, fc: rc };
}

/* 5. RETAIN: hot → warm → cold (inputs dropped) → archive (bodies dropped), then VACUUM */
const COLS = [380, 650, 920, 1190];
const HT = [48, 48, 22, 8];
const TC: RGB[] = [ACCENT, mix(ACCENT, INK, 0.55), GREY, LOCK];
const STEPS = [
  { t: 21.2, max: 5 },
  { t: 21.85, max: 3 },
  { t: 22.5, max: 1 },
];
const VAC = 23.1;
const finalTier = (k: number) => (k <= 1 ? 3 : k <= 3 ? 2 : k <= 5 ? 1 : 0);
const tierAt = (k: number, t: number) =>
  STEPS.reduce((u, s) => (k <= s.max ? u + ease(seg(t, s.t + k * 0.05, s.t + k * 0.05 + 0.5)) : u), 0);
const at = (a: number[], u: number) => {
  const i = Math.min(a.length - 2, Math.floor(u));
  return lerp(a[i], a[i + 1], u - i);
};
const atC = (a: RGB[], u: number) => {
  const i = Math.min(a.length - 2, Math.floor(u));
  return mix(a[i], a[i + 1], u - i);
};
const vacP = (k: number, t: number) => ease(seg(t, VAC + k * 0.04, VAC + k * 0.04 + 0.6));
const packedTop = (k: number) => 226 + (k % 2) * (HT[finalTier(k)] + 14);

function retainS(k: number, t: number): Item {
  const u = tierAt(k, t), h = at(HT, u);
  const top = lerp(rowY(k) - 24, packedTop(k), vacP(k, t));
  return { x: at(COLS, u), y: top + h / 2, w: 190, h, r: Math.min(12, h / 2), c: atC(TC, u) };
}

/* scene chain */
type Scene = { t: number; fn: (k: number, t: number) => Item; dur?: number; stag?: (k: number) => number };
const STAG = (k: number) => k * 0.06;
const SCENES: Scene[] = [
  { t: 0, fn: forwardS },
  { t: 5.0, fn: redactS, dur: 0.8, stag: STAG },
  { t: 10.0, fn: classifyS, dur: 0.8, stag: STAG },
  { t: 15.0, fn: replayS, dur: 0.8, stag: STAG },
  { t: 20.0, fn: retainS, dur: 0.8, stag: STAG },
  { t: 24.3, fn: (k) => forwardS(k, 0), dur: 0.8, stag: STAG },
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
  const A = SCENES[i - 1].fn(k, sc.t);
  const B = sc.fn(k, sc.t + st + sc.dur);
  return {
    x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * 32,
    w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p), c: mix(A.c, B.c, p), z: 1,
  };
}

/* echoes and ripples */
const A_ECHO = scanT(6) + 0.4;
const ECHOES = [
  { t: kept(N - 1) + 0.05, x: STORE.x, y: STORE.y, w: 360, h: 232, r: 24, ripple: true },
  ...SECRETS.filter((s) => s.id === 0).map((s) => ({
    t: A_ECHO, x: LX + s.off + s.w / 2, y: lineY(s.k), w: s.w + 8, h: 40, r: 12, ripple: false,
  })),
  { t: SCAN1 + 0.15, x: 800, y: 480, w: 0, h: 0, r: 0, ripple: true },
  { t: clsT(N - 1) + 0.6, x: 780, y: SPINE, w: 0, h: 0, r: 0, ripple: true },
  { t: PH1 + 0.05, x: TL + 1000, y: 500, w: 0, h: 0, r: 0, ripple: true },
  { t: VAC + 0.3, x: 785, y: 500, w: 0, h: 0, r: 0, ripple: true },
];

function drawItem(p: Painter, it: Item) {
  const c = p.ctx;
  p.rrect(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, it.r, it.c);
  if (it.fill && it.fill > 0 && it.fc) {
    c.save();
    p.rrPath(it.x - it.w / 2, it.y - it.h / 2, it.w, it.h, it.r);
    c.clip();
    p.rrect(it.x - it.w / 2, it.y - it.h / 2, it.w * it.fill, it.h, 0, it.fc);
    c.restore();
  }
}

function drawEcho(p: Painter, e: (typeof ECHOES)[number], t: number) {
  if (e.w <= 0) return;
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 34 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, ACCENT, 3, 0.75 * (1 - q));
}

/* chapter furniture */
function drawForward(p: Painter, t: number) {
  const a = Math.max(1 - seg(t, 4.9, 5.4), seg(t, 24.5, 25.3));
  if (a <= 0) return;
  let gate = 0, up = 0, client = 0;
  for (let k = 0; k < N; k++) {
    gate = Math.max(gate, bump(t, arr(k) - 0.05, arr(k) + 0.3));
    up = Math.max(up, bump(t, arr(k) + 0.42, arr(k) + 0.72));
    client = Math.max(client, bump(t, arr(k) + 1.12, arr(k) + 1.4));
  }
  p.line(WIRE_L, GATE.y, WIRE_R, GATE.y, EDGE, 6, a);
  p.line(GATE.x, GATE.y + 75, GATE.x, STORE.y - 116, EDGE, 6, a);
  for (let k = 0; k < N; k++) {
    const q = seg(t, arr(k), kept(k));
    if (q > 0 && q < 1) p.line(GATE.x, GATE.y + 75, GATE.x, Math.max(GATE.y + 75, lerp(GATE.y, slotY(k), ease(q))), ACCENT, 6, a * (1 - q));
  }
  p.rstroke(CLIENT.x - 95, CLIENT.y - 145, 190, 290, 26, mix(LOCK, ACCENT, client), 4, a);
  p.arc(UP.x, UP.y, 90, 0, PI * 2, LOCK, 5, a);
  p.disc(UP.x, UP.y, 40 * (1 + 0.18 * up), mix(GREY, INK, up), a);
  p.rstroke(STORE.x - 180, STORE.y - 116, 360, 232, 24, LOCK, 4, a);
  const gw = 44 * (1 + 0.25 * gate), gh = 150 * (1 + 0.06 * gate);
  p.rrect(GATE.x - gw / 2, GATE.y - gh / 2, gw, gh, gw / 2, mix(LOCK, ACCENT, gate), a);
  // The original request carries on upstream untouched; the response returns without waiting.
  for (let k = 0; k < N; k++) {
    const q = seg(t, arr(k), arr(k) + 0.45);
    if (q > 0 && q < 1) {
      const x = lerp(GATE.x, WIRE_R - 32, ease(q));
      p.rstroke(x - 32, GATE.y - 11, 64, 22, 11, INK, 3, a * (1 - 0.6 * q));
    }
    for (let tr = 0; tr < 3; tr++) {
      const r = seg(t - tr * 0.03, arr(k) + 0.45, arr(k) + 1.15);
      if (r <= 0 || r >= 1) continue;
      p.disc(lerp(WIRE_R, WIRE_L, ease(r)), GATE.y, 9 - tr * 2.5, ACCENT, a * (1 - tr * 0.3));
    }
  }
}

function drawDoc(p: Painter, t: number) {
  const a = seg(t, 5.6, 6.0) * (1 - seg(t, 9.6, 10.0));
  if (a <= 0) return;
  p.rstroke(LX - 40, 205, 900, 550, 28, EDGE, 4, a);
}

function drawSecrets(p: Painter, t: number) {
  if (t < 6.2 || t > 10.0) return;
  const a = seg(t, 6.2, 6.45) * (1 - seg(t, 9.5, 9.9));
  for (const s of SECRETS) {
    const x = LX + s.off, y = lineY(s.k), ts = scanT(s.k);
    p.rrect(x, y - 15, s.w, 30, 8, WARN, a);
    const q = ease(seg(t, ts + 0.05, ts + 0.35));
    if (q > 0) p.rrect(x - 4, y - 19, (s.w + 8) * q, 38, 10, SHADE, a);
    const sq = seg(t, ts + 0.3, ts + 0.5);
    if (sq <= 0) continue;
    // Six hex chars of the hash become three bars: equal secrets share a pattern.
    const cx = x + s.w / 2;
    PRINT[s.id].forEach((h, i) => {
      const hh = h * easeOut(sq);
      p.rrect(cx - 23 + i * 18, y - hh / 2, 10, hh, 3, ACCENT, a);
    });
  }
}

function drawScanner(p: Painter, t: number) {
  const a = seg(t, 6.15, 6.4) * (1 - seg(t, SCAN1, SCAN1 + 0.2));
  if (a <= 0) return;
  const y = scanY(t);
  p.rrect(LX - 30, y - 44, 880, 44, 0, ACCENT, 0.07 * a);
  p.line(LX - 30, y, LX + 850, y, ACCENT, 3, 0.9 * a);
  p.disc(LX - 30, y, 7, ACCENT, a);
}

function drawRowMarks(p: Painter, t: number) {
  if (t < 10.9 || t > 14.0) return;
  for (let k = 0; k < N; k++) {
    const a = seg(t, 11.0, 11.25) * (1 - seg(t, clsT(k), clsT(k) + 0.15));
    if (a <= 0) continue;
    const x = rowX(k);
    // Tools attached → a tab; message count → a row of squares.
    if (ROLE[k] !== "u") p.rrect(x - 8, ROW_Y - 72, 16, 16, 4, GREY, a);
    const n = MSG[k], w = n * 13 - 5;
    for (let i = 0; i < n; i++) p.rrect(x - w / 2 + i * 13, ROW_Y + 56, 8, 8, 2, GREY, a);
  }
}

function drawCursor(p: Painter, t: number) {
  const a = seg(t, 10.95, 11.1) * (1 - seg(t, clsT(N - 1) + 0.05, clsT(N - 1) + 0.25));
  if (a <= 0) return;
  const k = Math.max(0, Math.min(N - 1, Math.floor((t - (CL0 - CLD)) / CLD)));
  const from = rowX(Math.max(0, k - 1));
  const x = lerp(from, rowX(k), ease(seg(t, clsT(k) - CLD, clsT(k) - CLD + 0.16)));
  p.rstroke(x - 46, ROW_Y - 46, 92, 92, 26, ACCENT, 3, a);
}

function drawTree(p: Painter, t: number) {
  if (t < 11.3 || t > 15.0) return;
  const a = 1 - seg(t, 14.6, 15.0);
  const g = ease(seg(t, 11.5, 13.9));
  if (g > 0) p.line(340, SPINE, lerp(340, 1230, g), SPINE, EDGE, 6, a);
  for (let k = 0; k < N; k++) {
    const ta = clsT(k) + 0.6;
    const q = ease(seg(t, ta - 0.1, ta + 0.25));
    if (q <= 0) continue;
    const [x, y] = TREE[k];
    const pk = PARENT[k];
    if (ROLE[k] === "m") {
      // The human turn that triggered this request.
      p.arc(x, TREE_TURN_Y, 12 * q, 0, PI * 2, INK, 4, a);
      p.line(x, TREE_TURN_Y + 18, x, lerp(TREE_TURN_Y + 18, SPINE - 40, q), EDGE, 4, a);
    } else if (ROLE[k] === "s") {
      const [px, py] = TREE[pk];
      p.line(px, py + 40, px, lerp(py + 40, y - 30, q), EDGE, 5, a);
    } else {
      const [px, py] = TREE[pk];
      p.line(px, py, lerp(px, x, q), lerp(py, y, q), EDGE, 4, a);
    }
  }
}

function drawReplay(p: Painter, t: number) {
  const a = seg(t, 15.7, 16.1) * (1 - seg(t, 19.6, 20.0));
  if (a <= 0) return;
  const px = PX(t);
  p.line(TL, AXIS_Y, TL + 1000, AXIS_Y, EDGE, 4, a);
  for (let k = 0; k < N; k++) {
    const x = TL + S4[k];
    if (ROLE[k] === "m") {
      p.line(x, TURN_Y + 18, x, rowY(k) - 22, EDGE, 3, a);
      p.arc(x, TURN_Y, 12, 0, PI * 2, INK, 4, a);
      p.disc(x, TURN_Y, 6 * easeOut(clamp01((px - x) / 30)), INK, a);
    } else {
      const pk = PARENT[k];
      const x0 = TL + S4[pk] + 18, y0 = rowY(pk) + 17, y1 = rowY(k);
      const c = px > x ? LOCK : EDGE;
      p.line(x0, y0, x0, y1, c, 4, a);
      p.line(x0, y1, x - 8, y1, c, 4, a);
    }
  }
  const ph = seg(t, 16.0, PH0) * (1 - seg(t, PH1, PH1 + 0.3));
  if (ph > 0) {
    p.line(px, 236, px, AXIS_Y, ACCENT, 3, ph * a);
    p.disc(px, AXIS_Y, 9, ACCENT, ph * a);
  }
}

function drawRetain(p: Painter, t: number) {
  const a = seg(t, 20.6, 21.0) * (1 - seg(t, 24.0, 24.4));
  if (a <= 0) return;
  for (let i = 0; i < 4; i++) {
    p.rstroke(COLS[i] - 115, 196, 230, 600, 26, EDGE, 4, a);
    if (i < 3) p.line(COLS[i] + 34, 150, COLS[i + 1] - 34, 150, EDGE, 3, a);
  }
  p.disc(COLS[0], 150, 14, TC[0], a);
  p.disc(COLS[1], 150, 14, TC[1], a);
  p.arc(COLS[2], 150, 12, 0, PI * 2, GREY, 4, a);
  p.disc(COLS[3], 150, 6, LOCK, a);
  // Dropped bodies leave free pages behind until VACUUM reclaims them.
  const c = p.ctx;
  c.setLineDash([10, 9]);
  for (let k = 0; k < N; k++) {
    if (finalTier(k) < 2) continue;
    const ga = seg(t, STEPS[1].t + k * 0.05, STEPS[1].t + k * 0.05 + 0.25) * (1 - seg(t, VAC, VAC + 0.35));
    if (ga <= 0) continue;
    const u = tierAt(k, t), x = at(COLS, u), top = rowY(k) - 24;
    p.rstroke(x - 95, top, 190, 48, 12, LOCK, 3, ga * a);
  }
  c.setLineDash([]);
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => ECHOES.reduce((s, e) => (e.ripple ? s + ripple(t, e.t, e.x, e.y, x, y) : s), 0), ACCENT);
  drawForward(p, t);
  drawDoc(p, t);
  drawTree(p, t);
  drawRowMarks(p, t);
  drawReplay(p, t);
  drawRetain(p, t);
  const items: Item[] = [];
  for (let k = 0; k < N; k++) items.push(itemState(k, t));
  items.sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const it of items) drawItem(p, it);
  drawSecrets(p, t);
  drawScanner(p, t);
  drawCursor(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const saga: FilmDef = {
  ground: "#2440d8",
  loop: LOOP,
  still: 8.45,
  chapters: [
    { label: "Forward", range: [0, 5.0] },
    { label: "Redact", range: [5.0, 10.0] },
    { label: "Classify", range: [10.0, 15.0] },
    { label: "Replay", range: [15.0, 20.0] },
    { label: "Retain", range: [20.0, 24.3] },
  ],
  draw,
};
