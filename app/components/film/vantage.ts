// Vantage: nine blocks carry the platform's five pillars in one seamless loop.
// Sort → tree → 1v1 battle → leaderboard climb → roadmap conquest.
import {
  CX, PI, Painter, bump, clamp01, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

const GROUND = hex("#1d3b2a");
const INK = hex("#eef3e2");
const ACCENT = hex("#d8ff5a");
const { edge: EDGE, idle: IDLE, lock: LOCK } = tones(GROUND, INK);

type Item = { x: number; y: number; w: number; h: number; r: number; c: RGB; z?: number; rot?: number; fill?: number; fc?: RGB };

const N = 9;
const INIT = [5, 2, 8, 1, 9, 3, 7, 4, 6];

/* 1. VISUALIZE: selection sort */
const SLOT = 110, BAR_W = 72, BASE = 760, UNIT = 56, BAR_R = 10;
const slotX = (i: number) => CX + (i - (N - 1) / 2) * SLOT;

type Step = { i: number; j: number | null; big: number; small: number; t0: number; t1: number; dur: number };
const steps: Step[] = [];
{
  const a = INIT.slice();
  for (let i = 0; i < N - 1; i++) {
    let m = i;
    for (let k = i + 1; k < N; k++) if (a[k] < a[m]) m = k;
    steps.push({ i, j: m !== i ? m : null, big: a[i], small: a[m], t0: 0, t1: 0, dur: 0 });
    if (m !== i) [a[i], a[m]] = [a[m], a[i]];
  }
  const S0 = 0.5, S1 = 4.0;
  const swaps = steps.filter((s) => s.j !== null).length;
  const d = (S1 - S0) / (swaps + 0.4 * (steps.length - swaps));
  let tt = S0;
  for (const s of steps) {
    s.t0 = tt;
    s.dur = s.j !== null ? d : 0.4 * d;
    tt += s.dur;
    s.t1 = tt;
  }
}

function sortPos(v: number, t: number) {
  let slot = INIT.indexOf(v);
  for (const s of steps) {
    if (t >= s.t1) {
      if (s.j !== null) {
        if (v === s.big) slot = s.j;
        else if (v === s.small) slot = s.i;
      }
      continue;
    }
    if (s.j !== null && t > s.t0 && (v === s.big || v === s.small)) {
      const p = ease(seg(t, s.t0 + 0.1 * s.dur, s.t0 + 0.9 * s.dur));
      const to = v === s.big ? s.j : s.i;
      const lift = v === s.small ? -Math.sin(PI * p) * 90 : 0;
      return { x: lerp(slotX(slot), slotX(to), p), lift, active: true, slot };
    }
    break;
  }
  return { x: slotX(slot), lift: 0, active: false, slot };
}
const lockedCount = (t: number) => {
  let c = 0;
  for (const s of steps) if (t >= s.t1) c++;
  return c === steps.length ? N : c;
};

function sortS(v: number, t: number): Item {
  const p = sortPos(v, t);
  const sw = 4.05 + p.slot * 0.07;
  const pop = 1 + 0.07 * bump(t, sw, sw + 0.28);
  let c = IDLE;
  if (p.active) c = INK;
  else if (t >= sw) c = ACCENT;
  else if (p.slot < lockedCount(t)) c = LOCK;
  const h = v * UNIT * pop;
  return { x: p.x, y: BASE - h / 2 + p.lift, w: BAR_W, h, r: BAR_R, c, z: p.active ? 2 : 0 };
}

/* 2. STRUCTURE: balanced BST + BFS */
const NODE = 64;
const depth: Record<number, number> = {};
const parent: Record<number, number | null> = {};
(function build(lo: number, hi: number, d: number, p: number | null) {
  if (lo > hi) return;
  const m = (lo + hi) >> 1, v = m + 1;
  depth[v] = d;
  parent[v] = p;
  build(lo, m - 1, d + 1, v);
  build(m + 1, hi, d + 1, v);
})(0, N - 1, 0, null);
const ROOT = Number(Object.keys(parent).find((v) => parent[+v] === null));
const nodeX = (v: number) => slotX(v - 1);
const treeY = (d: number) => 250 + d * 140;
const visitT = (v: number) => 7.0 + depth[v] * 0.45;

function treeS(v: number, t: number): Item {
  const tv = visitT(v);
  const s = 1 + 0.25 * bump(t, tv, tv + 0.35);
  return { x: nodeX(v), y: treeY(depth[v]), w: NODE * s, h: NODE * s, r: (NODE / 2) * s, c: mix(IDLE, ACCENT, seg(t, tv, tv + 0.12)) };
}

/* 3. BATTLE: 1v1 race with live sync */
const LEFT_X = 470, RIGHT_X = 1130, BW = 170, BH = 62, BGAP = 20, BBOT = 740;
const SERVER = { x: CX, y: 470 };
const L_PASS = [11.2, 11.9, 12.6, 13.3];
const R_PASS = [11.5, 12.3, 13.1];
const RUN = 0.6, WIN = 13.35, R_LAST_RUN = 13.15;
const blockY = (k: number) => BBOT - BH / 2 - k * (BH + BGAP);

function battleS(v: number, t: number): Item {
  if (v === 5) {
    let pulse = 0;
    for (const te of [...L_PASS, ...R_PASS]) pulse += bump(t, te + 0.22, te + 0.5);
    const s = 1 + 0.2 * pulse;
    return { x: SERVER.x, y: SERVER.y, w: 84 * s, h: 84 * s, r: 14, rot: PI / 4, c: mix(LOCK, ACCENT, seg(t, WIN, WIN + 0.3)) };
  }
  const left = v < 5;
  const k = left ? v - 1 : v - 6;
  const pc = left ? ACCENT : INK;
  const te = (left ? L_PASS : R_PASS)[k];
  let c = IDLE, fill = 0, s = 1;
  if (te !== undefined) {
    fill = seg(t, te - RUN, te);
    if (t >= te) {
      c = pc;
      fill = 0;
      s += 0.12 * bump(t, te, te + 0.3);
    }
  } else {
    fill = seg(Math.min(t, WIN), R_LAST_RUN, R_LAST_RUN + RUN) * (1 - seg(t, WIN, WIN + 0.4));
  }
  if (left) s += 0.16 * bump(t, WIN + k * 0.07, WIN + k * 0.07 + 0.32);
  else c = mix(c, LOCK, seg(t, WIN, WIN + 0.45));
  return { x: left ? LEFT_X : RIGHT_X, y: blockY(k), w: BW * s, h: BH * s, r: 12, c, fill, fc: pc };
}

/* 4. RANK: leaderboard climb */
const YOU = 4;
const OTHERS = [9, 8, 7, 6, 5, 3, 2, 1];
const X0 = 470, RH = 40, START_RANK = 6, CLIMB0 = 15.8, CLIMB1 = 18.0;
const rowY = (r: number) => 250 + r * 62;
const yourRank = (t: number) => {
  const u = seg(t, CLIMB0, CLIMB1) * START_RANK;
  const k = Math.floor(u);
  return START_RANK - Math.min(START_RANK, k + ease(u - k));
};

function boardS(v: number, t: number): Item {
  const y = yourRank(t);
  if (v === YOU) {
    const w = lerp(325, 660, ease(seg(t, CLIMB0, CLIMB1)));
    const s = 1 + 0.12 * bump(t, CLIMB1, CLIMB1 + 0.35);
    return { x: X0 + w / 2, y: rowY(y), w, h: RH * s, r: 10, c: ACCENT, z: 2 };
  }
  const j = OTHERS.indexOf(v);
  const shift = clamp01(j + 1 - y);
  const w = 600 - j * 50;
  return { x: X0 + w / 2, y: rowY(j + shift), w, h: RH, r: 10, c: mix(IDLE, LOCK, Math.sin(PI * shift)) };
}

/* 5. CONQUER: roadmap of stages */
const ORDER = [YOU, ...OTHERS];
const MX = [480, 800, 1120], MY = [300, 500, 700];
const mapPos = (p: number) => {
  const row = Math.floor(p / 3), i = p % 3;
  return { x: row % 2 === 0 ? MX[i] : MX[2 - i], y: MY[row] };
};
const CQ0 = 20.2, CQD = 0.34;
const conqT = (p: number) => CQ0 + p * CQD;
const FINAL = conqT(N - 1);
const pathProgress = (t: number) => clamp01((t - CQ0) / (FINAL - CQ0)) * (N - 1);

function mapS(v: number, t: number): Item {
  const p = ORDER.indexOf(v);
  const { x, y } = mapPos(p);
  const ct = conqT(p);
  const on = seg(t, ct, ct + 0.15);
  let size = lerp(50, 76, ease(on)) * (1 + 0.22 * bump(t, ct, ct + 0.4));
  if (p === N - 1) size *= 1 + 0.3 * bump(t, FINAL + 0.05, FINAL + 0.6);
  return { x, y, w: size, h: size, r: size * 0.26, c: mix(LOCK, ACCENT, on) };
}

/* scene chain */
type Scene = { t: number; fn: (v: number, t: number) => Item; dur?: number; stag?: (v: number) => number };
const SCENES: Scene[] = [
  { t: 0, fn: sortS },
  { t: 4.9, fn: treeS, dur: 0.8, stag: (v) => depth[v] * 0.1 },
  { t: 9.3, fn: battleS, dur: 0.8, stag: (v) => (v === 5 ? 0 : 0.08 + ((v - 1) % 5) * 0.06) },
  { t: 14.4, fn: boardS, dur: 0.8, stag: (v) => (v === YOU ? 0 : 0.1 + OTHERS.indexOf(v) * 0.04) },
  { t: 18.8, fn: mapS, dur: 0.8, stag: (v) => ORDER.indexOf(v) * 0.04 },
  { t: 23.9, fn: (v) => sortS(v, 0), dur: 0.9, stag: (v) => INIT.indexOf(v) * 0.06 },
];
const LOOP = 25.6;

function itemState(v: number, t: number): Item {
  let i = SCENES.length - 1;
  while (SCENES[i].t > t) i--;
  const sc = SCENES[i];
  if (!sc.dur || !sc.stag) return sc.fn(v, t);
  const st = sc.stag(v);
  const p = ease(seg(t, sc.t + st, sc.t + st + sc.dur));
  if (p >= 1) return sc.fn(v, t);
  const A = SCENES[i - 1].fn(v, sc.t);
  const B = sc.fn(v, sc.t + st + sc.dur);
  return {
    x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p) - Math.sin(PI * p) * 36,
    w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p), r: lerp(A.r, B.r, p),
    rot: lerp(A.rot || 0, B.rot || 0, p), c: mix(A.c, B.c, p), z: 1,
  };
}

/* achievement echoes */
const STACK_H = 4 * BH + 3 * BGAP;
const ECHOES = [
  { t: 8.55, x: nodeX(ROOT), y: treeY(0), w: NODE, h: NODE, r: NODE / 2, ripple: true },
  { t: WIN, x: LEFT_X, y: (blockY(0) + blockY(3)) / 2, w: BW + 28, h: STACK_H + 28, r: 18, ripple: true },
  { t: CLIMB1, x: X0 + 330, y: rowY(0), w: 676, h: RH + 16, r: 16, ripple: true },
  { t: FINAL + 0.05, x: mapPos(N - 1).x, y: mapPos(N - 1).y, w: 84, h: 84, r: 22, ripple: true },
  { t: FINAL + 0.25, x: mapPos(N - 1).x, y: mapPos(N - 1).y, w: 84, h: 84, r: 22, ripple: false },
];

function drawItem(p: Painter, it: Item) {
  const c = p.ctx;
  c.save();
  c.translate(it.x, it.y);
  if (it.rot) c.rotate(it.rot);
  p.rrect(-it.w / 2, -it.h / 2, it.w, it.h, it.r, it.c);
  if (it.fill && it.fill > 0 && it.fc) {
    p.rrPath(-it.w / 2, -it.h / 2, it.w, it.h, it.r);
    c.clip();
    p.rrect(-it.w / 2, -it.h / 2, it.w * it.fill, it.h, 0, it.fc, 0.85);
  }
  c.restore();
}

function drawEcho(p: Painter, e: (typeof ECHOES)[number], t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  const g = 36 * easeOut(q);
  p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, ACCENT, 3, 0.75 * (1 - q));
}

function drawSortCursor(p: Painter, t: number) {
  if (t <= 0.3 || t >= 4.4) return;
  const cur = steps.find((st) => t < st.t1) || steps[steps.length - 1];
  const idx = steps.indexOf(cur);
  const prevI = idx > 0 ? steps[idx - 1].i : cur.i;
  const x = lerp(slotX(prevI), slotX(cur.i), ease(seg(t, cur.t0, cur.t0 + 0.2 * cur.dur)));
  const size = 18 * ease(seg(t, 0.3, 0.5)) * (1 - ease(seg(t, 4.0, 4.4)));
  p.rrect(x - size / 2, BASE + 34 - size / 2, size, size, 4, ACCENT);
}

function drawTreeEdges(p: Painter, t: number) {
  if (t <= 5.7 || t >= 9.35) return;
  const retract = 1 - ease(seg(t, 9.0, 9.3));
  for (let v = 1; v <= N; v++) {
    const pa = parent[v];
    if (pa === null) continue;
    const d = depth[v] - 1;
    const g = ease(seg(t, 5.8 + d * 0.22, 6.15 + d * 0.22)) * retract;
    if (g <= 0) continue;
    const x1 = nodeX(pa), y1 = treeY(depth[pa]), x2 = nodeX(v), y2 = treeY(depth[v]);
    p.line(x1, y1, lerp(x1, x2, g), lerp(y1, y2, g), EDGE, 7);
    const tv = visitT(v);
    const q = Math.min(g, ease(seg(t, tv - 0.35, tv)));
    if (q > 0) p.line(x1, y1, lerp(x1, x2, q), lerp(y1, y2, q), ACCENT, 7);
  }
}

function drawBattle(p: Painter, t: number) {
  if (t <= 10.1 || t >= 14.5) return;
  const a = seg(t, 10.1, 10.5) * (1 - seg(t, 14.0, 14.4));
  const g = ease(seg(t, 10.1, 10.6));
  // Lane divider, broken around the server.
  p.line(CX, SERVER.y - 280 * g, CX, SERVER.y - 90 * g, EDGE, 4, a);
  p.line(CX, SERVER.y + 90 * g, CX, SERVER.y + 280 * g, EDGE, 4, a);
  p.line(LEFT_X - BW / 2, BBOT + 22, LEFT_X - BW / 2 + BW * g, BBOT + 22, EDGE, 4, a);
  p.line(RIGHT_X + BW / 2, BBOT + 22, RIGHT_X + BW / 2 - BW * g, BBOT + 22, EDGE, 4, a);
  // Player markers in place of labels: your dot is lit, the rival's dims on the loss.
  const lose = seg(t, WIN, WIN + 0.45);
  p.disc(LEFT_X, BBOT + 62, 9 * g, ACCENT, a);
  p.disc(RIGHT_X, BBOT + 62, 9 * g, mix(INK, LOCK, lose), a);

  const packets = [
    ...L_PASS.map((te, k) => ({ te, from: { x: LEFT_X + BW / 2, y: blockY(k) }, to: { x: RIGHT_X - BW / 2, y: blockY(3) }, c: ACCENT })),
    ...R_PASS.map((te, k) => ({ te, from: { x: RIGHT_X - BW / 2, y: blockY(k) }, to: { x: LEFT_X + BW / 2, y: blockY(3) }, c: INK })),
  ];
  for (const pk of packets) {
    for (let tr = 0; tr < 4; tr++) {
      const tt = t - tr * 0.025;
      const p1 = seg(tt, pk.te, pk.te + 0.3), p2 = seg(tt, pk.te + 0.3, pk.te + 0.62);
      if (p1 <= 0 || p2 >= 1) continue;
      const e1 = ease(p1), e2 = ease(p2);
      const x = p2 > 0 ? lerp(SERVER.x, pk.to.x, e2) : lerp(pk.from.x, SERVER.x, e1);
      const y = p2 > 0 ? lerp(SERVER.y, pk.to.y, e2) : lerp(pk.from.y, SERVER.y, e1);
      const size = 16 - tr * 3;
      p.rrect(x - size / 2, y - size / 2, size, size, 4, pk.c, (1 - tr * 0.25) * (1 - p2 * 0.6));
    }
  }
}

function drawBoard(p: Painter, t: number) {
  if (t <= 15.2 || t >= 18.8) return;
  const a = seg(t, 15.2, 15.6) * (1 - seg(t, 18.4, 18.8));
  const mine = Math.round(yourRank(t));
  for (let r = 0; r < N; r++) {
    const c = r === mine ? ACCENT : r < 3 ? LOCK : EDGE;
    p.disc(X0 - 34, rowY(r), r === mine ? 8 : 6, c, a);
  }
  // A small rising chevron rides at the end of your row.
  const yw = lerp(325, 660, ease(seg(t, CLIMB0, CLIMB1)));
  const x = X0 + yw + 30, y = rowY(yourRank(t));
  const c = p.ctx;
  c.save();
  c.globalAlpha = a * 0.9;
  c.fillStyle = `rgb(${ACCENT.join(",")})`;
  c.beginPath();
  c.moveTo(x - 11, y + 7);
  c.lineTo(x, y - 9);
  c.lineTo(x + 11, y + 7);
  c.closePath();
  c.fill();
  c.restore();
}

function drawMap(p: Painter, t: number) {
  if (t <= 19.5 || t >= 23.95) return;
  const a = 1 - seg(t, 23.55, 23.9);
  const P = pathProgress(t);
  for (let k = 0; k < N - 1; k++) {
    const A = mapPos(k), B = mapPos(k + 1);
    const g = ease(seg(t, 19.5 + k * 0.06, 19.75 + k * 0.06));
    if (g <= 0) continue;
    p.line(A.x, A.y, lerp(A.x, B.x, g), lerp(A.y, B.y, g), EDGE, 10, a);
    const f = Math.min(g, clamp01(P - k));
    if (f > 0) p.line(A.x, A.y, lerp(A.x, B.x, f), lerp(A.y, B.y, f), ACCENT, 10, a);
  }
  if (t >= CQ0 - 0.2 && P < N - 1) {
    const nx = mapPos(Math.floor(P) + 1);
    p.arc(nx.x, nx.y, 50 + 6 * Math.sin(t * 9), 0, PI * 2, ACCENT, 3, 0.45 * a);
  }
  const mv = seg(t, CQ0 - 0.2, CQ0) * (1 - seg(t, FINAL, FINAL + 0.25));
  if (mv > 0) {
    const k = Math.min(N - 2, Math.floor(P)), f = P - k;
    const A = mapPos(k), B = mapPos(k + 1);
    p.disc(lerp(A.x, B.x, f), lerp(A.y, B.y, f), 11 * mv, INK, mv);
  }
}

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => ECHOES.reduce((s, e) => (e.ripple ? s + ripple(t, e.t, e.x, e.y, x, y) : s), 0), ACCENT);
  drawTreeEdges(p, t);
  drawBattle(p, t);
  drawBoard(p, t);
  drawMap(p, t);
  const items: Item[] = [];
  for (let v = 1; v <= N; v++) items.push(itemState(v, t));
  items.sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const it of items) drawItem(p, it);
  drawSortCursor(p, t);
  for (const e of ECHOES) drawEcho(p, e, t);
}

export const vantage: FilmDef = {
  ground: "#1d3b2a",
  loop: LOOP,
  still: 12.95,
  chapters: [
    { label: "Visualize", range: [0, 4.9] },
    { label: "Structure", range: [4.9, 9.3] },
    { label: "Battle", range: [9.3, 14.4] },
    { label: "Rank", range: [14.4, 18.8] },
    { label: "Conquer", range: [18.8, 23.9] },
  ],
  draw,
};
