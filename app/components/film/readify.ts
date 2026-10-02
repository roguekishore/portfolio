// Readify: a bookstore that lives entirely in the browser. One reader's pass through a login
// gate that accepts anything, around a spinning shelf of ten covers, into a 20-title catalogue
// that one substring search narrows field by field, into an append-only cart, and out through a
// checkout that resolves its order from three possible sources, submits nowhere and empties the
// cart. Every count, filter result and cart state below is computed from the real data with the
// real predicate at module load; nothing is random and nothing is text.
import {
  CX, PI, Painter, bump, clamp01, easeCubic, easeOutCubic, easeSine, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────── palette and tones ───────────────────────── */
const GROUND_HEX = "#5c1620";
const GROUND = hex(GROUND_HEX);
const INK = hex("#f4e9dc");
const ACCENT = hex("#f2b84b");
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const SIENNA = mix(ACCENT, GROUND, 0.5); // Philosophy
const DIM = mix(GROUND, INK, 0.08); // ghost cards
const PANE = mix(GROUND, INK, 0.05); // container fills
const CAT_COL: RGB[] = [ACCENT, INK, SIENNA]; // Finance, Psychology, Philosophy
const LOOP = 72;

/* ───────────────────────── helpers ───────────────────────── */
const ease = easeCubic;
const easeOut = easeOutCubic;
const easeOutBack = (x: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** Damped overshoot settle, 0 → ~1.09 → 1. */
const settle = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(2.4 * PI * x));
/** Eased rise over [a, b] and fall over [c, d]. */
const hold = (t: number, a: number, b: number, c: number, d: number) => ease(seg(t, a, b)) * (1 - ease(seg(t, c, d)));
const clampN = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

type Tok = { x: number; y: number; w: number; h: number; r: number; c: RGB; a: number; s: number };
const tok = (x: number, y: number, w: number, h: number, r: number, c: RGB, a = 1, s = 0): Tok => ({ x, y, w, h, r, c, a, s });

/** Arc travel between two states: curved path, mild stretch along the motion, related easings. */
function arc(A: Tok, B: Tok, q: number, lift: number, variant: number): Tok {
  const p = variant === 0 ? ease(q) : variant === 1 ? easeSine(q) : settle(q) * ease(Math.min(1, q * 1.4));
  const st = 0.1 * Math.sin(PI * q);
  const horizontal = Math.abs(B.x - A.x) > Math.abs(B.y - A.y);
  return {
    x: lerp(A.x, B.x, p),
    y: lerp(A.y, B.y, p) - Math.sin(PI * p) * lift,
    w: lerp(A.w, B.w, p) * (horizontal ? 1 + st : 1 - st),
    h: lerp(A.h, B.h, p) * (horizontal ? 1 - st : 1 + st),
    r: lerp(A.r, B.r, p),
    c: mix(A.c, B.c, p),
    a: lerp(A.a, B.a, p),
    s: lerp(A.s, B.s, p),
  };
}

type Role = (k: number, t: number) => Tok;
type Scene = { t: number; fn: Role; dur: number; stag: (k: number) => number; lift: number };
function chain(scenes: Scene[], k: number, t: number): Tok {
  let i = scenes.length - 1;
  while (i > 0 && scenes[i].t > t) i--;
  const sc = scenes[i];
  if (i === 0) return sc.fn(k, t);
  const st = sc.t + sc.stag(k);
  const q = seg(t, st, st + sc.dur);
  if (q >= 1) return sc.fn(k, t);
  const A = scenes[i - 1].fn(k, sc.t);
  if (q <= 0) return A;
  const B = sc.fn(k, st + sc.dur);
  return arc(A, B, q, sc.lift, k % 3);
}

/* ───────────────────────── precomputed data ───────────────────────── */
type Book = { id: number; title: string; author: string; cat: number; price: number; disc: number; tl: number; al: number };
const b = (id: number, title: string, author: string, cat: number, price: number, disc: number): Book => ({
  id, title, author, cat, price, disc,
  tl: clampN(title.length * 4.2, 40, 150),
  al: clampN(author.length * 5, 40, 110),
});
// src/components/Catalog.js: the hard-coded catalogue, verbatim (titles and authors feed the real
// predicate below; they are never drawn).
const BOOKS: Book[] = [
  b(1, "Rich Dad Poor Dad", "Robert Kiyosaki", 0, 19.99, 0.1),
  b(2, "The Intelligent Investor", "Benjamin Graham", 0, 29.99, 0.15),
  b(3, "Thinking, Fast and Slow", "Daniel Kahneman", 1, 24.99, 0.05),
  b(4, "Atomic Habits", "James Clear", 1, 18.99, 0.2),
  b(5, "Meditations", "Marcus Aurelius", 2, 14.99, 0.25),
  b(6, "Beyond Good and Evil", "Friedrich Nietzsche", 2, 16.99, 0.1),
  b(7, "Principles", "Ray Dalio", 0, 35.99, 0.05),
  b(8, "The Subtle Art of Not Giving a F*ck", "Mark Manson", 1, 22.99, 0.1),
  b(9, "The Art of War", "Sun Tzu", 2, 11.99, 0.15),
  b(10, "Grit", "Angela Duckworth", 1, 20.99, 0.1),
  b(11, "The Millionaire Next Door", "Thomas J. Stanley", 0, 27.99, 0.2),
  b(12, "Start with Why", "Simon Sinek", 0, 23.99, 0.1),
  b(13, "Man’s Search for Meaning", "Viktor E. Frankl", 1, 19.99, 0.25),
  b(14, "The 7 Habits of Highly Effective People", "Stephen R. Covey", 1, 21.99, 0.15),
  b(15, "The Wealth of Nations", "Adam Smith", 0, 33.99, 0.1),
  b(16, "The Art of Happiness", "Dalai Lama", 1, 17.99, 0.2),
  b(17, "The Nicomachean Ethics", "Aristotle", 2, 12.99, 0.05),
  b(18, "A Man for All Seasons", "Robert Bolt", 2, 13.99, 0.1),
  b(19, "The 4-Hour Workweek", "Tim Ferriss", 0, 29.99, 0.15),
  b(20, "Daring Greatly", "Brené Brown", 1, 22.99, 0.1),
];
const CAT_NAME = ["finance", "psychology", "philosophy"];

// The search, keystroke by keystroke. `filteredBooks = books.filter(title || author || category
// .toLowerCase().includes(q))` and `.map` renders the matches in id order.
const KEYS = [
  { t: 31.0, q: "p" }, { t: 32.2, q: "ph" }, { t: 33.4, q: "phi" },
  { t: 35.2, q: "" },
  { t: 37.2, q: "m" }, { t: 38.4, q: "ma" }, { t: 39.6, q: "man" },
];
type QState = { slot: number[]; match: boolean[]; hits: number[] };
function qstate(q: string): QState {
  const match: boolean[] = [], hits: number[] = [], slot: number[] = new Array(20).fill(0);
  for (const bk of BOOKS) {
    const hT = bk.title.toLowerCase().includes(q), hA = bk.author.toLowerCase().includes(q), hC = CAT_NAME[bk.cat].includes(q);
    match.push(hT || hA || hC);
    hits.push((hT ? 1 : 0) | (hA ? 2 : 0) | (hC ? 4 : 0));
  }
  let s = 0;
  for (let i = 0; i < 20; i++) if (match[i]) slot[i] = s++;
  for (let i = 0; i < 20; i++) if (!match[i]) slot[i] = s++;
  return { slot, match, hits };
}
const QS: QState[] = [qstate(""), ...KEYS.map((k) => qstate(k.q))];
function qIndex(t: number) {
  let e = 0;
  for (const k of KEYS) if (t >= k.t) e++;
  return e;
}

// Grid of 5 × 4 cards inside the 1360 × 800 core.
const COL_X = [238, 506, 774, 1042, 1310];
const ROW_Y = [355, 489, 623, 757];
const CARD_W = 236, CARD_H = 110;
const slotX = (s: number) => COL_X[s % 5];
const slotY = (s: number) => ROW_Y[(s / 5) | 0];

/** Where card `id` sits at time `t`, and how far it is a filtered-out ghost (0..1). */
function place(id: number, t: number) {
  const i = id - 1;
  const e = qIndex(t);
  if (e === 0) return { x: COL_X[i % 5], y: ROW_Y[(i / 5) | 0], g: 0 };
  const k = KEYS[e - 1], prev = QS[e - 1], cur = QS[e];
  const s0 = prev.slot[i], s1 = cur.slot[i];
  const q = seg(t, k.t + 0.12 + i * 0.015, k.t + 0.92 + i * 0.015);
  const p = ease(q);
  const lift = s0 === s1 ? 0 : 28;
  return {
    x: lerp(slotX(s0), slotX(s1), p),
    y: lerp(slotY(s0), slotY(s1), p) - Math.sin(PI * p) * lift,
    g: lerp(prev.match[i] ? 0 : 1, cur.match[i] ? 0 : 1, p),
  };
}
/** Field-flash bits (1 title, 2 author, 4 category) and intensity for card `id` after the latest key. */
function flash(id: number, t: number) {
  const e = qIndex(t);
  if (e === 0) return { bits: 0, q: 0 };
  const k = KEYS[e - 1];
  const hits = QS[e].hits[id - 1];
  return { bits: hits, q: seg(t, k.t + 0.05, k.t + 0.8) };
}

// Cart: `addToCart` appends (duplicates allowed), `removeFromCart(id)` filters every item with
// that id, `clearCart()` empties. Rows [8, 13, 18, 8] → remove(8) → [13, 18] → clear → [].
const ADDS = [
  { t: 44.8, id: 8 }, { t: 45.6, id: 13 }, { t: 46.4, id: 18 }, { t: 47.2, id: 8 },
];
const FLIGHT = 0.75;
const T_REMOVE = 52.0, T_REFLOW = 52.6, T_HOP = 56.6, T_RIDE = 57.2, T_HOME = 65.0, T_CLEAR = 65.8;
const BADGE_EVENTS = [
  ...ADDS.map((a) => ({ t: a.t + FLIGHT, d: 1 })),
  { t: 52.4, d: -2 },
  { t: T_CLEAR, d: -2 },
];
const homeSpine = (id: number) => (id - 1) % 10;
const MERGES = [
  { k: 7, t: T_REMOVE + 1.0 }, { k: 7, t: T_REMOVE + 1.08 },
  { k: homeSpine(13), t: T_HOME + 1.8 }, { k: homeSpine(18), t: T_HOME + 2.0 },
];

/* layout constants */
const CARD = { x: 800, y: 500, w: 560, h: 400, r: 28 };
const RAIL = { x: 800, y: 140, w: 1200, h: 56 };
const PILL_X = [500, 620, 740, 940]; // Home, Books, Cart, Profile
const BADGE_X0 = 796;
const CLOCK_X = 1300;
const LOGO_X = 260;
const FLOAT = { y: 876, xs: [740, 780, 820, 860] };
const RING = { x: 800, y: 430, rx: 470, ry: 82, w: 118, h: 168 };
const FRAME = { x: 800, y: 500, w: 1200, h: 560, r: 32 };
const SPILL = { x: 800, y: 232, w: 520, h: 52 };
const TRAY = { x: 800, y: 520, w: 760, h: 440 };
const FORM = { x: 1000, y: 520, w: 560, h: 480 };
const SHELF_Y = 800;
const shelfX = (k: number) => 800 + (k - 4.5) * 56;
const trayRowY = (i: number) => 360 + i * 84;
const formRowY = (i: number) => 330 + i * 70;
const TRIO_X = [540, 800, 1060];

/* ───────────────────────── per-chapter role functions ───────────────────────── */
const breathe = (k: number, t: number) => 1.5 * Math.sin(t * 1.3 + k * 0.7);

// COVER roles (ids 1–10).
const coverGate: Role = (k) => tok(CARD.x, CARD.y, 64, 92, 6, CAT_COL[BOOKS[k].cat], 0);
const ringRot = (t: number) => 2 * PI * ease(seg(t, 9.0, 17.0));
const coverRing: Role = (k, t) => {
  const a = (k / 10) * 2 * PI + ringRot(t);
  const sn = Math.sin(a), d = Math.cos(a);
  const s = 0.5 + 0.5 * (d + 1) / 2;
  return tok(RING.x + RING.rx * sn, RING.y + RING.ry * d + breathe(k, t), RING.w * s, RING.h * s, 8 * s, mix(CAT_COL[BOOKS[k].cat], GROUND, 0.55 * (1 - d) / 2), 1);
};
const coverGrid: Role = (k, t) => {
  const pl = place(k + 1, t);
  const s = 1 - 0.45 * pl.g;
  return tok(pl.x - 92 * s, pl.y + breathe(k, t) * 0.6, 52 * s, 74 * s, 6, mix(CAT_COL[BOOKS[k].cat], DIM, pl.g * 0.6), 1 - 0.5 * pl.g);
};
const coverShelf: Role = (k, t) => {
  let pop = 1;
  for (const m of MERGES) if (m.k === k) pop += 0.22 * bump(t, m.t, m.t + 0.35);
  return tok(shelfX(k), SHELF_Y - (pop - 1) * 30 + breathe(k, t) * 0.5, 18 * pop, 72 * pop, 4, CAT_COL[BOOKS[k].cat], 1);
};
const COVER_SCENES: Scene[] = [
  { t: 0, fn: coverGate, dur: 0, stag: () => 0, lift: 0 },
  { t: 4.8, fn: coverRing, dur: 1.3, stag: (k) => k * 0.08, lift: 60 },
  { t: 21.4, fn: coverGrid, dur: 1.2, stag: (k) => k * 0.08, lift: 50 },
  { t: 48.6, fn: coverShelf, dur: 1.1, stag: (k) => k * 0.06, lift: 70 },
  { t: 70.3, fn: coverGate, dur: 1.1, stag: (k) => (9 - k) * 0.06, lift: 40 },
];
const coverTok = (k: number, t: number) => chain(COVER_SCENES, k, t);

// PANEL: the one container (fill alpha in `a`, stroke alpha in `s`).
const panelGate: Role = () => tok(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r, EDGE, 1, 0);
const panelFrame: Role = () => tok(FRAME.x, FRAME.y, FRAME.w, FRAME.h, FRAME.r, PANE, 1, 1);
const panelPill: Role = () => tok(SPILL.x, SPILL.y, SPILL.w, SPILL.h, SPILL.h / 2, EDGE, 1, 0);
const panelTray: Role = () => tok(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 24, PANE, 1, 1);
const panelForm: Role = () => tok(FORM.x, FORM.y, FORM.w, FORM.h, 24, PANE, 1, 1);
const PANEL_SCENES: Scene[] = [
  { t: 0, fn: panelGate, dur: 0, stag: () => 0, lift: 0 },
  { t: 4.9, fn: panelFrame, dur: 1.2, stag: () => 0, lift: 0 },
  { t: 20.6, fn: panelPill, dur: 1.0, stag: () => 0, lift: 0 },
  { t: 48.2, fn: panelTray, dur: 1.2, stag: () => 0, lift: 0 },
  { t: 56.5, fn: panelForm, dur: 1.2, stag: () => 0, lift: 40 },
  { t: 70.4, fn: panelGate, dur: 1.2, stag: () => 0, lift: 0 },
];
const panelTok = (t: number) => chain(PANEL_SCENES, 0, t);

// TOGGLE: the login card's accent panel, which wipes across the card and rises to become the nav rail.
function toggleTok(t: number): Tok {
  const home = tok(CARD.x + 140, CARD.y, 280, CARD.h, CARD.r, ACCENT, 1);
  const full = tok(CARD.x, CARD.y, CARD.w, CARD.h, CARD.r, ACCENT, 1);
  const rail = tok(RAIL.x, RAIL.y, RAIL.w, RAIL.h, RAIL.h / 2, EDGE, 1);
  if (t < 4.2) return home;
  if (t < 4.9) return arc(home, full, seg(t, 4.2, 4.8), 0, 0);
  if (t < 70.4) return arc(full, rail, seg(t, 4.9, 5.9), 0, 0);
  return arc(rail, home, seg(t, 70.4, 71.5), 0, 1);
}

/* routes: which pill is lit. Top rail: Home, Books, Cart (Profile never); floating bar adds Checkout. */
const ROUTE_T = [5.7, 20.4, 48.0, 56.2, 70.2]; // → /home, /books, /cart, /checkout, /
function routeLit(i: number, t: number) {
  const on = ROUTE_T[i], off = ROUTE_T[i + 1];
  return hold(t, on, on + 0.35, off, off + 0.35);
}
/* nav extrusion (0..1) */
const navOut = (t: number) => hold(t, 5.3, 6.1, 70.4, 71.1);
const floatOut = (t: number) => hold(t, 5.9, 6.5, 70.6, 71.2);

/* badge */
function badgeCount(t: number) {
  let n = 0, nInt = 0, pop = 0;
  for (const e of BADGE_EVENTS) {
    n += e.d * easeOut(seg(t, e.t, e.t + 0.3));
    if (t >= e.t) nInt += e.d;
    pop += bump(t, e.t, e.t + 0.35);
  }
  return { n: Math.max(0, n), nInt: Math.max(0, nInt), pop };
}
const badgeW = (n: number) => 26 + 16 * n;
const badgeCX = (t: number) => BADGE_X0 + badgeW(badgeCount(t).n) / 2;

/* cart rows */
function rowIndex(c: number, t: number) {
  if (c === 1) return lerp(1, 0, ease(seg(t, T_REFLOW, T_REFLOW + 0.8)));
  if (c === 2) return lerp(2, 1, ease(seg(t, T_REFLOW, T_REFLOW + 0.8)));
  return c;
}
const landT = (c: number) => 48.5 + 0.12 * c + 0.9;
const leaveT = (c: number) => (ADDS[c].id === 8 ? T_REMOVE + (c === 3 ? 0.08 : 0) : T_HOP + (c - 1) * 0.15);
/** Row furniture visibility in the tray. */
const rowA = (c: number, t: number) => easeOut(seg(t, landT(c), landT(c) + 0.3)) * (1 - ease(seg(t, leaveT(c), leaveT(c) + 0.25)));
/** Running total in dollars (`cartItems.reduce((s, i) => s + i.price, 0)`). */
function cartTotal(t: number) {
  let s = 0;
  for (let c = 0; c < 4; c++) {
    const bk = BOOKS[ADDS[c].id - 1];
    const inT = easeOut(seg(t, landT(c), landT(c) + 0.4)) * (1 - ease(seg(t, leaveT(c), leaveT(c) + 0.6)));
    s += bk.price * inT;
  }
  return s;
}

/** Rail A path from the tray side into the form card, piecewise linear by arc length. */
const RAIL_PTS = (row: number) => [[300, 330], [560, 330], [620, 390], [720, 390], [790, formRowY(row)]];
function railPoint(row: number, q: number) {
  const pts = RAIL_PTS(row);
  let total = 0;
  const lens: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = q * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = clamp01(d / lens[i]);
      return { x: lerp(pts[i][0], pts[i + 1][0], f), y: lerp(pts[i][1], pts[i + 1][1], f) };
    }
    d -= lens[i];
  }
  return { x: pts[0][0], y: pts[0][1] };
}

/** Position of card `id`'s Add-to-Cart pill at time t. */
function addPillPos(id: number, t: number) {
  const pl = place(id, t);
  const s = 1 - 0.45 * pl.g;
  return { x: pl.x + 33 * s, y: pl.y + 40 * s };
}

/** The four cart copies: emitted from a card's Add pill, absorbed by the badge, re-emitted into the
 *  tray, and finally returned to a shelf spine. Returns null when hidden. */
function copyTok(c: number, t: number): Tok | null {
  const ad = ADDS[c];
  const id = ad.id;
  const col = CAT_COL[BOOKS[id - 1].cat];
  if (t < ad.t) return null;
  if (t < ad.t + FLIGHT) {
    const q = seg(t, ad.t, ad.t + FLIGHT);
    const from = addPillPos(id, ad.t);
    const A = tok(from.x, from.y, 18, 26, 3, col, 1);
    const B = tok(badgeCX(ad.t + FLIGHT), RAIL.y, 8, 10, 2, ACCENT, 0);
    const o = arc(A, B, q, 110, 1);
    o.a = 1 - seg(q, 0.8, 1);
    return o;
  }
  const d0 = 48.5 + 0.12 * c;
  if (t < d0) return null;
  const row = c;
  const rowX = TRAY.x - TRAY.w / 2 + 50;
  const inTray = (i: number) => tok(rowX, trayRowY(i), 36, 50, 4, col, 1);
  if (t < d0 + 0.9) {
    const A = tok(badgeCX(d0), RAIL.y, 8, 10, 2, ACCENT, 1);
    return arc(A, inTray(row), seg(t, d0, d0 + 0.9), 60, c % 3);
  }
  if (id === 8) {
    const l0 = leaveT(c);
    if (t < l0) return inTray(row);
    if (t < l0 + 1.0) {
      const B = tok(shelfX(7), SHELF_Y, 18, 72, 4, col, 0);
      const o = arc(inTray(row), B, seg(t, l0, l0 + 1.0), 140, c % 3);
      o.a = 1 - seg(seg(t, l0, l0 + 1.0), 0.85, 1);
      return o;
    }
    return null;
  }
  const h0 = leaveT(c), r0 = T_RIDE + (c - 1) * 0.25, fr = c - 1;
  if (t < h0) return inTray(rowIndex(c, t));
  const start = tok(300, 330, 32, 44, 4, col, 1);
  if (t < h0 + 0.6) return arc(inTray(fr), start, seg(t, h0, h0 + 0.6), 40, c % 3);
  if (t < r0) return start;
  const formRow = tok(790, formRowY(fr), 32, 44, 4, col, 1);
  if (t < r0 + 1.4) {
    const q = ease(seg(t, r0, r0 + 1.4));
    const pt = railPoint(fr, q);
    const st = 0.1 * Math.sin(PI * q);
    return tok(pt.x, pt.y, 32 * (1 + st), 44 * (1 - st), 4, col, 1);
  }
  const g0 = T_HOME + fr * 0.2;
  if (t < g0) return formRow;
  if (t < g0 + 1.8) {
    const B = tok(shelfX(homeSpine(id)), SHELF_Y, 18, 72, 4, col, 0);
    const q = seg(t, g0, g0 + 1.8);
    const o = arc(formRow, B, q, 180, c % 3);
    o.a = 1 - seg(q, 0.85, 1);
    return o;
  }
  return null;
}

/* siblings (ids 11–20): emerge from behind hero id−10, merge back into it. */
function sibTok(j: number, t: number): Tok | null {
  const id = j + 11;
  const col = CAT_COL[BOOKS[id - 1].cat];
  const e0 = 24.0 + 0.08 * j, m0 = 48.0 + 0.05 * j;
  if (t < e0 || t > m0 + 0.9) return null;
  const gridTok = (tt: number) => {
    const pl = place(id, tt);
    const s = 1 - 0.45 * pl.g;
    return tok(pl.x - 92 * s, pl.y + breathe(id, tt) * 0.6, 52 * s, 74 * s, 6, mix(col, DIM, pl.g * 0.6), 1 - 0.5 * pl.g);
  };
  if (t < e0 + 1.0) {
    const hero = coverTok(j, e0);
    const A = tok(hero.x, hero.y, hero.w * 0.9, hero.h * 0.9, hero.r, col, 0.4);
    return arc(A, gridTok(e0 + 1.0), seg(t, e0, e0 + 1.0), -20, j % 3);
  }
  if (t < m0) return gridTok(t);
  const hero = coverTok(j, t);
  const B = tok(hero.x, hero.y, hero.w * 0.9, hero.h * 0.9, hero.r, col, 0);
  return arc(gridTok(m0), B, seg(t, m0, m0 + 0.9), -20, j % 3);
}
/** Card-body unfold (0..1) for any id. */
function cardVis(id: number, t: number) {
  if (id <= 10) return easeOut(seg(t, 22.5 + 0.07 * (id - 1), 23.3 + 0.07 * (id - 1))) * (1 - ease(seg(t, 48.0 + 0.03 * (id - 1), 48.55 + 0.03 * (id - 1))));
  const j = id - 11;
  return easeOut(seg(t, 24.9 + 0.08 * j, 25.7 + 0.08 * j)) * (1 - ease(seg(t, 47.9 + 0.05 * j, 48.5 + 0.05 * j)));
}
const priceP = (id: number, t: number) => easeOut(seg(t, 26.0 + 0.04 * (id - 1), 26.9 + 0.04 * (id - 1)));
const notchP = (id: number, t: number) => ease(seg(t, 27.1 + 0.03 * (id - 1), 27.4 + 0.03 * (id - 1)));

/* search pill notches */
function notchScale(i: number, t: number) {
  const grow = (t0: number) => easeOutBack(seg(t, t0, t0 + 0.3));
  const a = grow(KEYS[i].t) * (1 - ease(seg(t, 35.2 + (2 - i) * 0.06, 35.5 + (2 - i) * 0.06)));
  const b2 = grow(KEYS[4 + i].t) * (1 - ease(seg(t, 48.0 + i * 0.05, 48.35 + i * 0.05)));
  return Math.max(0, a + b2);
}
const notchCount = (t: number) => { const e = qIndex(t); return e === 0 ? 0 : KEYS[e - 1].q.length; };

/* ───────────────────────── camera ───────────────────────── */
function camera(t: number) {
  const a = hold(t, 10.0, 11.6, 16.6, 18.2);
  const bq = hold(t, 38.0, 39.4, 42.4, 43.8);
  const c = hold(t, 62.8, 63.8, 66.2, 67.6);
  const s = 1 + 0.06 * a + 0.08 * bq + 0.05 * c;
  const w = a + bq + c;
  if (w <= 0) return { s: 1, fx: CX, fy: 500 };
  return { s, fx: (a * RING.x + bq * 640 + c * FORM.x) / w, fy: (a * RING.y + bq * 355 + c * FORM.y) / w };
}

/* ───────────────────────── fx ───────────────────────── */
const RIPPLES = [
  { t: 3.9, x: CARD.x - 140, y: CARD.y + 80 },
  { t: 39.6, x: SPILL.x, y: SPILL.y },
  { t: ADDS[0].t + FLIGHT, x: 812, y: RAIL.y },
  { t: T_REMOVE, x: TRAY.x + TRAY.w / 2 - 60, y: trayRowY(0) },
  { t: 63.0, x: FORM.x, y: 690 },
];
type Echo = { t: number; x: number; y: number; w: number; h: number; r: number; c: RGB };
const ECHOES: Echo[] = [
  { t: 3.9, x: CARD.x - 140, y: CARD.y + 80, w: 160, h: 44, r: 22, c: INK },
  { t: 20.4, x: PILL_X[1], y: RAIL.y, w: 92, h: 30, r: 15, c: ACCENT },
  { t: 33.4, x: SPILL.x, y: SPILL.y, w: SPILL.w, h: SPILL.h, r: SPILL.h / 2, c: ACCENT },
  { t: 39.6, x: SPILL.x, y: SPILL.y, w: SPILL.w, h: SPILL.h, r: SPILL.h / 2, c: ACCENT },
  { t: 48.0, x: PILL_X[2], y: RAIL.y, w: 92, h: 30, r: 15, c: ACCENT },
  { t: T_REMOVE - 0.2, x: TRAY.x + TRAY.w / 2 - 60, y: trayRowY(0), w: 56, h: 16, r: 8, c: ACCENT },
  { t: 56.2, x: TRAY.x - 120, y: 716, w: 150, h: 36, r: 18, c: ACCENT },
  { t: 57.7, x: 620, y: 390, w: 28, h: 28, r: 14, c: ACCENT },
  { t: 63.0, x: FORM.x, y: 690, w: 200, h: 44, r: 22, c: ACCENT },
];
function drawEchoes(p: Painter, t: number) {
  for (const e of ECHOES) {
    const q = seg(t, e.t, e.t + 0.8);
    if (q <= 0 || q >= 1) continue;
    const g = 36 * easeOut(q);
    p.rstroke(e.x - e.w / 2 - g, e.y - e.h / 2 - g, e.w + 2 * g, e.h + 2 * g, e.r + g, e.c, 3, 0.75 * (1 - q));
  }
}

/* ───────────────────────── painters ───────────────────────── */
function drawTok(p: Painter, k: Tok, bookMarks = false) {
  if (k.a > 0.002 && k.w > 0.5 && k.h > 0.5) p.rrect(k.x - k.w / 2, k.y - k.h / 2, k.w, k.h, k.r, k.c, k.a);
  if (k.s > 0.002) p.rstroke(k.x - k.w / 2, k.y - k.h / 2, k.w, k.h, k.r, EDGE, 2, k.s);
  if (bookMarks && k.a > 0.05 && k.w > 24) {
    // spine line and a title stripe, so a cover reads as a book at every size
    const sx = k.x - k.w / 2 + k.w * 0.18;
    p.line(sx, k.y - k.h / 2 + 4, sx, k.y + k.h / 2 - 4, GROUND, Math.max(1.5, k.w * 0.035), 0.45 * k.a);
    p.rrect(k.x - k.w * 0.12, k.y - k.h / 2 + k.h * 0.2, k.w * 0.5, Math.max(2, k.h * 0.06), 2, GROUND, 0.4 * k.a);
  }
}

/* chapter 0: login form inside the card */
function drawLoginForm(p: Painter, t: number) {
  const vis = (1 - ease(seg(t, 4.4, 4.9))) + ease(seg(t, 71.1, 71.6));
  if (vis <= 0.002) return;
  const fx = CARD.x - 140;
  // field outlines
  p.rstroke(fx - 120, CARD.y - 90, 240, 40, 12, LOCK, 2, vis);
  p.rstroke(fx - 120, CARD.y - 30, 240, 40, 12, LOCK, 2, vis);
  // email bar fills
  const ef = easeOut(seg(t, 0.9, 2.0)) * (1 - seg(t, 70, 71));
  if (ef > 0) p.rrect(fx - 108, CARD.y - 78, 216 * ef, 16, 8, INK, 0.9 * vis);
  // password dots
  for (let i = 0; i < 6; i++) {
    const d0 = 2.2 + i * 0.18;
    const s = easeOutBack(seg(t, d0, d0 + 0.3)) * (1 - seg(t, 70, 71));
    if (s > 0) p.disc(fx - 100 + i * 22, CARD.y - 10, 6 * s, INK, vis);
  }
  // sign-in pill
  const pop = 1 + 0.18 * bump(t, 3.9, 4.2);
  const fill = seg(t, 3.9, 4.05) * (1 - seg(t, 70, 71));
  const w = 160 * pop, h = 44 * pop;
  p.rstroke(fx - w / 2, CARD.y + 80 - h / 2, w, h, h / 2, ACCENT, 3, vis * (1 - fill));
  p.rrect(fx - w / 2, CARD.y + 80 - h / 2, w, h, h / 2, ACCENT, vis * fill);
}
/* the accent panel's headline block and ghost button, drawn over the toggle */
function drawToggleGlyph(p: Painter, t: number) {
  const vis = (1 - ease(seg(t, 4.2, 4.7))) + ease(seg(t, 71.2, 71.6));
  if (vis <= 0.002) return;
  const tg = toggleTok(t);
  p.rrect(tg.x - 70, tg.y - 40, 140, 14, 7, GROUND, 0.55 * vis);
  p.rrect(tg.x - 50, tg.y - 14, 100, 8, 4, GROUND, 0.4 * vis);
  p.rstroke(tg.x - 56, tg.y + 30, 112, 36, 18, GROUND, 2.5, 0.6 * vis);
}

/* nav rail, pills, badge, clock, floating bar */
function drawNav(p: Painter, t: number) {
  const out = navOut(t);
  if (out <= 0.002) return;
  // logo mark
  const lx = LOGO_X, ly = RAIL.y;
  p.disc(lx, ly, 11 * out, INK);
  p.rrect(lx + 16, ly - 5 * out, 44 * out, 10 * out, 5, INK, 0.9);
  // route pills unfold from the logo
  for (let i = 0; i < 4; i++) {
    const q = ease(seg(out, 0.15 + i * 0.12, 0.55 + i * 0.12));
    if (q <= 0) continue;
    const x = lerp(lx + 40, PILL_X[i], q);
    const w = 92 * q, h = 30 * q;
    const lit = i < 3 ? routeLit(i, t) : 0;
    const pop = 1 + 0.14 * (i < 3 ? bump(t, ROUTE_T[i], ROUTE_T[i] + 0.35) : 0);
    p.rstroke(x - (w * pop) / 2, RAIL.y - (h * pop) / 2, w * pop, h * pop, (h * pop) / 2, LOCK, 2, 1 - lit);
    p.rrect(x - (w * pop) / 2, RAIL.y - (h * pop) / 2, w * pop, h * pop, (h * pop) / 2, INK, lit);
  }
  // cart badge
  const bq = ease(seg(out, 0.5, 0.9));
  if (bq > 0) {
    const bc = badgeCount(t);
    const w = badgeW(bc.n) * bq, h = 24 * bq * (1 + 0.2 * bc.pop);
    const x0 = BADGE_X0;
    const on = clamp01(bc.n);
    p.rstroke(x0, RAIL.y - h / 2, w, h, h / 2, IDLE, 2, (1 - on) * bq);
    p.rrect(x0, RAIL.y - h / 2, w, h, h / 2, ACCENT, on * bq);
    for (let i = 0; i < bc.nInt; i++) {
      const dpop = 1 + 0.5 * bump(t, BADGE_EVENTS[i < 4 ? i : 0].t, BADGE_EVENTS[i < 4 ? i : 0].t + 0.3);
      p.disc(x0 + 13 + 8 + i * 16, RAIL.y, 4 * dpop * bq, GROUND, 0.9);
    }
  }
  // clock: one sweep per loop
  const cq = easeOutBack(seg(out, 0.6, 1));
  if (cq > 0) {
    p.arc(CLOCK_X, RAIL.y, 15 * cq, 0, 2 * PI, INK, 2.5, 0.9);
    const ang = -PI / 2 + (2 * PI * t) / LOOP;
    p.line(CLOCK_X, RAIL.y, CLOCK_X + Math.cos(ang) * 10 * cq, RAIL.y + Math.sin(ang) * 10 * cq, INK, 2.5);
    p.disc(CLOCK_X, RAIL.y, 2 * cq, INK);
  }
}
function drawFloatBar(p: Painter, t: number) {
  const out = floatOut(t);
  if (out <= 0.002) return;
  const w = 220 * out, h = 36 * out;
  p.rrect(800 - w / 2, FLOAT.y - h / 2, w, h, h / 2, EDGE, 1);
  for (let i = 0; i < 4; i++) {
    const lit = routeLit(i, t);
    const pop = 1 + 0.3 * bump(t, ROUTE_T[i], ROUTE_T[i] + 0.35);
    p.disc(lerp(800, FLOAT.xs[i], out), FLOAT.y, 7 * out * pop, mix(LOCK, INK, lit));
  }
}

/* chapter 1: the best-seller trio at the frame's foot */
function drawTrio(p: Painter, t: number) {
  for (let i = 0; i < 3; i++) {
    const up = easeOutBack(seg(t, 11.0 + 0.3 * i, 11.8 + 0.3 * i)) * (1 - ease(seg(t, 20.0 + 0.1 * i, 20.6 + 0.1 * i)));
    if (up <= 0.002) continue;
    const l0 = 13.0 + 1.2 * i;
    const lift = hold(t, l0, l0 + 0.3, l0 + 0.7, l0 + 1.0);
    const x = TRIO_X[i];
    const foot = FRAME.y + FRAME.h / 2; // 780
    const h = 140 * up * (1 - 0.1 * lift), w = 100 * up;
    const cy = foot - h / 2 - 14 * lift;
    p.rrect(x - w / 2, cy - h / 2, w, h, 10, mix(LOCK, GREY, lift), 1);
    // title block rises above the cover on hover, the character fades in
    const ty = cy - h / 2 + 22 - 30 * lift;
    p.rrect(x - 30 * up, ty - 5, 60 * up, 10, 5, INK, 0.9);
    p.disc(x, cy + h / 2 - 34 - 24 * lift, 14 * up * (0.5 + 0.5 * lift), INK, 0.3 + 0.7 * lift);
    if (lift > 0.01) p.rstroke(x - w / 2 - 6, cy - h / 2 - 6, w + 12, h + 12, 14, ACCENT, 2, 0.6 * lift);
  }
}

/* chapters 2–3: one catalogue card's body and info column */
function drawCard(p: Painter, id: number, t: number) {
  const vis = cardVis(id, t);
  if (vis <= 0.002) return;
  const pl = place(id, t);
  const g = pl.g;
  const sc = (1 - 0.45 * g) * (0.7 + 0.3 * vis);
  const c = p.ctx;
  c.save();
  c.translate(pl.x, pl.y);
  c.scale(sc, sc);
  const alpha = vis * (1 - 0.55 * g);
  p.rrect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14, mix(EDGE, DIM, g), alpha);
  const bk = BOOKS[id - 1];
  const fl = flash(id, t);
  const fT = fl.bits & 1 ? bump(fl.q, 0, 1) : 0, fA = fl.bits & 2 ? bump(fl.q, 0, 1) : 0, fC = fl.bits & 4 ? bump(fl.q, 0, 1) : 0;
  const u = ease(seg(vis, 0.3, 1)); // info column unfolds after the body
  const x0 = -56;
  const inkA = alpha * (1 - 0.5 * g);
  // title bar
  p.rrect(x0, -40, bk.tl * u, 10, 5, mix(INK, ACCENT, fT), inkA);
  // author line
  p.rrect(x0, -22, bk.al * u, 6, 3, mix(LOCK, ACCENT, fA), inkA);
  // category chip
  const chipCol = bk.cat === 0 ? mix(ACCENT, INK, fC) : mix(CAT_COL[bk.cat], ACCENT, fC);
  p.rrect(x0, -8, 46 * u, 12, 6, chipCol, inkA);
  // price bar with the discount tier as a grey tail
  const pw = bk.price * 4 * priceP(id, t) * u;
  if (pw > 0) {
    const cut = 1 - bk.disc * notchP(id, t);
    p.rrect(x0, 12, pw * cut, 8, 4, INK, inkA);
    p.rrect(x0 + pw * cut, 12, pw * (1 - cut), 8, 4, GREY, inkA);
  }
  // buy and add pills
  let addP = 0;
  for (const a of ADDS) if (a.id === id) addP = Math.max(addP, bump(t, a.t - 0.15, a.t + 0.4));
  const ap = 1 + 0.2 * addP;
  p.rstroke(x0, 33, 44 * u, 14, 7, LOCK, 2, inkA);
  p.rstroke(x0 + 58 - (62 * u * (ap - 1)) / 2, 33 - (14 * (ap - 1)) / 2, 62 * u * ap, 14 * ap, 7 * ap, ACCENT, 2, inkA * (1 - seg(addP, 0, 0.3)));
  p.rrect(x0 + 58 - (62 * u * (ap - 1)) / 2, 33 - (14 * (ap - 1)) / 2, 62 * u * ap, 14 * ap, 7 * ap, ACCENT, inkA * seg(addP, 0, 0.3));
  // field echoes on a match
  if (fl.q > 0 && fl.q < 1 && fl.bits) {
    const gq = 10 * easeOut(fl.q), ea = 0.7 * (1 - fl.q) * inkA;
    if (fl.bits & 1) p.rstroke(x0 - gq, -40 - gq, bk.tl + 2 * gq, 10 + 2 * gq, 5 + gq, ACCENT, 2, ea);
    if (fl.bits & 2) p.rstroke(x0 - gq, -22 - gq, bk.al + 2 * gq, 6 + 2 * gq, 3 + gq, ACCENT, 2, ea);
    if (fl.bits & 4) p.rstroke(x0 - gq, -8 - gq, 46 + 2 * gq, 12 + 2 * gq, 6 + gq, ACCENT, 2, ea);
  }
  c.restore();
}

/* search pill interior: magnifier, cursor, notches */
function drawSearch(p: Painter, t: number) {
  const vis = hold(t, 21.2, 21.7, 48.0, 48.4);
  if (vis <= 0.002) return;
  const left = SPILL.x - SPILL.w / 2;
  p.arc(left + 36, SPILL.y - 3, 9 * vis, 0, 2 * PI, LOCK, 2.5);
  p.line(left + 43, SPILL.y + 4, left + 49, SPILL.y + 10, LOCK, 2.5, vis);
  const n = notchCount(t);
  let cx = left + 72;
  for (let i = 0; i < 3; i++) {
    const s = notchScale(i, t);
    if (s > 0.01) {
      p.rrect(cx - 7 * s, SPILL.y - 11 * s, 14 * s, 22 * s, 4, INK, vis);
    }
    if (i < n) cx += 22;
  }
  const cq = easeOutBack(seg(t, 29.4, 29.8)) * (1 - ease(seg(t, 47.8, 48.1)));
  if (cq > 0) {
    const blink = 0.55 + 0.45 * Math.sign(Math.sin(t * 2 * PI * 1.3));
    p.rrect(cx - 1.5, SPILL.y - 12 * cq, 3, 24 * cq, 1.5, INK, vis * blink);
  }
}

/* chapter 4: tray interior */
function drawTray(p: Painter, t: number) {
  const vis = hold(t, 49.0, 49.4, 56.4, 56.9);
  if (vis <= 0.002) return;
  const left = TRAY.x - TRAY.w / 2;
  for (let c = 0; c < 4; c++) {
    const a = rowA(c, t) * vis;
    if (a <= 0.002) continue;
    const bk = BOOKS[ADDS[c].id - 1];
    const y = trayRowY(rowIndex(c, t));
    p.rrect(left + 90, y - 20, bk.tl * 1.2, 12, 6, INK, 0.9 * a);
    p.rrect(left + 90, y, bk.al, 7, 3.5, LOCK, a);
    const pw = bk.price * 5;
    p.rrect(left + 90, y + 14, pw * (1 - bk.disc), 10, 5, INK, a);
    p.rrect(left + 90 + pw * (1 - bk.disc), y + 14, pw * bk.disc, 10, 5, GREY, a);
    // remove pill; the first id-8 row's pops
    const rp = c === 0 ? bump(t, T_REMOVE - 0.2, T_REMOVE + 0.2) : 0;
    const rw = 56 * (1 + 0.2 * rp), rh = 16 * (1 + 0.2 * rp);
    const rx = left + TRAY.w - 60;
    p.rstroke(rx - rw / 2, y - rh / 2, rw, rh, rh / 2, LOCK, 2, a * (1 - rp));
    p.rrect(rx - rw / 2, y - rh / 2, rw, rh, rh / 2, ACCENT, a * rp);
    p.line(rx - 10, y, rx + 10, y, mix(LOCK, GROUND, rp), 2.5, a);
  }
  // divider and running total
  const total = cartTotal(t);
  p.line(left + 40, 668, left + TRAY.w - 40, 668, EDGE, 2, vis);
  p.rrect(left + 60, 680, 5 * total, 12, 6, INK, vis);
  // proceed / clear
  const pu = easeOutBack(seg(t, 50.4, 51.0)) * (1 - ease(seg(t, 56.4, 56.9)));
  if (pu > 0) {
    const pp = 1 + 0.16 * bump(t, 56.2, 56.55);
    const pf = seg(t, 56.2, 56.35);
    const pw = 150 * pu * pp, ph = 36 * pu * pp;
    const px = TRAY.x - 120, cx2 = TRAY.x + 100;
    p.rstroke(px - pw / 2, 716 - ph / 2, pw, ph, ph / 2, ACCENT, 3, 1 - pf);
    p.rrect(px - pw / 2, 716 - ph / 2, pw, ph, ph / 2, ACCENT, pf);
    p.rstroke(cx2 - 55 * pu, 716 - 18 * pu, 110 * pu, 36 * pu, 18 * pu, LOCK, 2);
  }
}

/* chapter 5: rails, junction, form interior, tick */
function drawRails(p: Painter, t: number) {
  const vis = hold(t, 56.6, 57.2, T_HOME + 0.6, T_HOME + 1.6);
  if (vis <= 0.002) return;
  const grow = ease(seg(t, 56.6, 57.3));
  const ys = [330, 390, 450];
  for (let i = 0; i < 3; i++) {
    const g = ease(seg(grow, i * 0.15, 0.7 + i * 0.15));
    const x1 = lerp(300, 560, g);
    p.line(300, ys[i], x1, ys[i], EDGE, 6, vis);
    if (g > 0.95) p.line(560, ys[i], 620, 390, EDGE, 6, vis);
  }
  p.line(620, 390, 720, 390, EDGE, 6, vis * ease(seg(grow, 0.8, 1)));
  // the chosen rail lights as the rows pass; the junction pops
  const lit = hold(t, T_RIDE, T_RIDE + 0.5, T_RIDE + 1.6, T_RIDE + 2.4);
  if (lit > 0) {
    p.line(300, 330, 560, 330, ACCENT, 6, 0.9 * lit * vis);
    p.line(560, 330, 620, 390, ACCENT, 6, 0.9 * lit * vis);
    p.line(620, 390, 720, 390, ACCENT, 6, 0.9 * lit * vis);
  }
  const jp = 1 + 0.3 * bump(t, 57.7, 58.1);
  p.disc(620, 390, 14 * jp * vis, mix(LOCK, ACCENT, lit));
  // empty sources: a hollow cover on the Buy-Now rail, a hollow badge on the context rail
  p.rstroke(260 - 14, 390 - 19, 28, 38, 4, LOCK, 2, vis);
  p.rstroke(260 - 22, 450 - 10, 44, 20, 10, LOCK, 2, vis);
  p.rrect(260 - 20, 330 - 6, 40, 12, 6, mix(LOCK, ACCENT, lit), vis);
}
function drawForm(p: Painter, t: number) {
  const vis = hold(t, 57.6, 58.0, 70.2, 70.7);
  if (vis <= 0.002) return;
  const left = FORM.x - FORM.w / 2;
  const dim = 1 - 0.6 * hold(t, 63.1, 63.5, 69.6, 70.2); // success state dims the form
  // listed books
  for (let r = 0; r < 2; r++) {
    const c = r + 1;
    const bk = BOOKS[ADDS[c].id - 1];
    const arrive = T_RIDE + r * 0.25 + 1.4;
    const a = easeOut(seg(t, arrive, arrive + 0.3)) * (1 - ease(seg(t, T_HOME + r * 0.2, T_HOME + r * 0.2 + 0.3))) * vis * dim;
    if (a <= 0.002) continue;
    const y = formRowY(r);
    p.rrect(830, y - 14, bk.tl, 10, 5, INK, 0.9 * a);
    p.rrect(830, y + 2, bk.al * 0.8, 6, 3, LOCK, a);
    p.rrect(830, y + 14, 46, 10, 5, CAT_COL[bk.cat], a);
    p.rrect(890, y + 15, bk.price * 4, 8, 4, INK, a);
  }
  p.line(left + 40, 450, left + FORM.w - 40, 450, EDGE, 2, vis);
  // fields
  const fw = FORM.w - 80;
  for (let f = 0; f < 2; f++) {
    const y = 495 + f * 56;
    p.rstroke(left + 40, y - 18, fw, 36, 10, LOCK, 2, vis * dim);
    const fill = easeOut(seg(t, 58.8 + f * 1.0, 59.6 + f * 1.0)) * (1 - ease(seg(t, 70.2, 70.7)));
    if (fill > 0) p.rrect(left + 52, y - 7, (fw - 24) * fill * (f ? 0.7 : 0.55), 14, 7, INK, 0.9 * vis * dim);
  }
  // payment switch: two options, the first selected
  const su = easeOutBack(seg(t, 61.0, 61.4)) * vis;
  if (su > 0) {
    for (let o = 0; o < 2; o++) {
      const x = 915 + o * 170, w = 150 * su, h = 34 * su;
      const sel = o === 0 ? 1 : 0;
      p.rstroke(x - w / 2, 612 - h / 2, w, h, h / 2, LOCK, 2, vis * dim * (1 - sel));
      p.rrect(x - w / 2, 612 - h / 2, w, h, h / 2, INK, vis * dim * sel);
      p.disc(x - 50 * su, 612, 6 * su, sel ? GROUND : LOCK, vis * dim);
    }
  }
  // submit
  const sp = 1 + 0.18 * bump(t, 63.0, 63.35);
  const sf = seg(t, 63.0, 63.15) * (1 - ease(seg(t, 70.0, 70.5)));
  const sw = 200 * sp, sh = 44 * sp;
  p.rstroke(FORM.x - sw / 2, 690 - sh / 2, sw, sh, sh / 2, ACCENT, 3, vis * (1 - sf));
  p.rrect(FORM.x - sw / 2, 690 - sh / 2, sw, sh, sh / 2, ACCENT, vis * sf);
  // the tick draws itself across the card, then folds back into the submit pill
  const tq = ease(seg(t, 63.2, 64.4)) * (1 - ease(seg(t, 70.0, 70.6)));
  if (tq > 0) {
    const ax = 920, ay = 500, bx = 975, by = 560, cx2 = 1090, cy2 = 440;
    const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx2 - bx, cy2 - by);
    const d = tq * (l1 + l2);
    const w = 12 * (0.6 + 0.4 * tq);
    if (d <= l1) {
      const f = d / l1;
      p.line(ax, ay, lerp(ax, bx, f), lerp(ay, by, f), ACCENT, w);
    } else {
      const f = (d - l1) / l2;
      p.line(ax, ay, bx, by, ACCENT, w);
      p.line(bx, by, lerp(bx, cx2, f), lerp(by, cy2, f), ACCENT, w);
    }
  }
}

/* shelf rail under the spines */
function drawShelf(p: Painter, t: number) {
  const vis = hold(t, 49.2, 49.9, 70.3, 70.9);
  if (vis <= 0.002) return;
  const w = 10 * 56 * vis;
  p.line(800 - w / 2, SHELF_Y + 44, 800 + w / 2, SHELF_Y + 44, EDGE, 4);
}

/* ───────────────────────── draw ───────────────────────── */
const ORDER = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const Z = new Float64Array(10);

function draw(p: Painter, t: number, view: View) {
  p.dots(view, INK, 0.07, (x, y) => {
    let s = 0;
    for (const r of RIPPLES) s += ripple(t, r.t, r.x, r.y, x, y);
    return s;
  }, ACCENT);

  const cam = camera(t);
  const c = p.ctx;
  c.save();
  c.translate(cam.fx, cam.fy);
  c.scale(cam.s, cam.s);
  c.translate(-cam.fx, -cam.fy);

  // containers and furniture
  drawTok(p, panelTok(t));
  drawLoginForm(p, t);
  drawTok(p, toggleTok(t));
  drawToggleGlyph(p, t);
  drawNav(p, t);
  drawFloatBar(p, t);
  drawShelf(p, t);
  drawRails(p, t);
  drawTray(p, t);
  drawForm(p, t);
  drawSearch(p, t);

  // siblings first (they slide out from behind the heroes): bodies, then covers
  if (t > 23.5 && t < 49.5) {
    for (let j = 9; j >= 0; j--) drawCard(p, j + 11, t);
    for (let j = 9; j >= 0; j--) {
      const s = sibTok(j, t);
      if (s) drawTok(p, s, true);
    }
  }
  // hero cards
  if (t > 22 && t < 49) for (let k = 0; k < 10; k++) drawCard(p, k + 1, t);
  drawTrio(p, t);
  // hero covers, depth-sorted while on the ring
  const toks: Tok[] = [];
  for (let k = 0; k < 10; k++) {
    toks.push(coverTok(k, t));
    Z[k] = Math.cos((k / 10) * 2 * PI + ringRot(t));
    ORDER[k] = k;
  }
  if (t > 5 && t < 23) ORDER.sort((a, bb) => Z[a] - Z[bb]);
  for (const k of ORDER) drawTok(p, toks[k], true);

  // cart copies, echoes
  for (let i = 0; i < 4; i++) {
    const k = copyTok(i, t);
    if (k) drawTok(p, k, true);
  }
  drawEchoes(p, t);
  c.restore();
}

export const readify: FilmDef = {
  ground: GROUND_HEX,
  loop: LOOP,
  still: 12.6,
  chapters: [
    { label: "Gate", range: [0, 8] },
    { label: "Carousel", range: [8, 20] },
    { label: "Catalogue", range: [20, 30] },
    { label: "Search", range: [30, 44] },
    { label: "Cart", range: [44, 56] },
    { label: "Checkout", range: [56, 70] },
  ],
  draw,
};
