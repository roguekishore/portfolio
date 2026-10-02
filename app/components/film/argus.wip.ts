// Argus: eight complaints, one lifecycle, under a watching eye.
// Report (web pin or WhatsApp phase rail) → Screen (validity gate, 500 m duplicate radius) →
// Classify (Gemini: priority, department, SLA days, confidence ≥ 0.7) → Clock (proof before RESOLVED) →
// Escalate (>1 d → dept head, >3 d → commissioner, 6-hour cron) → Verify (citizen-only CLOSED) →
// Dispute (dept-head reopen, +1 priority, 75 % SLA) → Ledger (audit ticker, points).
import {
  CX, PI, Painter, bump, clamp01, css, easeCubic as ease, easeOutCubic as easeOut, hex, lerp, mix, ripple, seg, tones,
  type FilmDef, type RGB, type View,
} from "./kit";

/* ───────────────────────────── palette and tones ───────────────────────────── */
const GROUND = hex("#3b0d36");
const INK = hex("#f6e9f2");
const ACCENT = hex("#ff6ad5");
const WARN = hex("#ffa04d");
const BLACK: RGB = [0, 0, 0];
const IRIS_BG = mix(GROUND, BLACK, 0.3);
const { edge: EDGE, idle: IDLE, lock: LOCK, grey: GREY } = tones(GROUND, INK);
const INK_WARN = mix(INK, WARN, 0.45);

/* ───────────────────────────── layout (1600×1000 stage, 1360×800 core) ───────────────────────────── */
const LOOP = 116;
const CIT_Y = 186, CIT_R = 32, DOCK_Y = 275, PTS_Y = 134;
const citX = (i: number) => 350 + i * 180;
const EYE = { x: CX, y: 370 }, EYE_HW = 170, EYE_HH = 72;
const ORB_RX = 250, ORB_RY = 85, ORB_W = 0.3;
const WEB = { x: 380, y: 370 }, WA = { x: 1220, y: 370 };
const PORT_Y = 470; // where a report waits at either port
const MAP = { x0: 250, y0: 280, x1: 510, y1: 430 };
const RAIL_X0 = 1130, RAIL_X1 = 1310, RAIL_N = 7;
const LANE_Y = 730, L1_Y = 630, L2_Y = 540, DOCK_SQ_Y = 812, TOP_Y = 578;
const laneX = (j: number) => 350 + j * 150;
const COMM = { x: CX, y: L2_Y };
const TRAY = { x: 200, y: LANE_Y };
const DIAL = { x: 1440, y: 200, r: 36 };
const TICK_Y = 878, TICK_X0 = 326, TICK_DX = 22;
const EMERGE = 36; // size of a freshly filed report

/* ───────────────────────────── the cast: eight seed categories ───────────────────────────── */
// DataInitializer.java: POTHOLE(ROADS,7,MED) ELECTRICAL_DAMAGE(ELECTRICAL,3,CRIT) WATER_SHORTAGE(WATER,5,HIGH)
// SEWER_DRAINAGE(SEWERAGE,7,MED) GARBAGE(SANITATION,3,LOW) TRAFFIC_SIGNALS(TRAFFIC,5,MED)
// PARK_MAINTENANCE(PARKS,10,LOW) STREETLIGHT(ELECTRICAL,10,MED)
const N = 8, N_ALL = 10; // +T8 duplicate, +T9 vague
const DEPT = [0, 1, 2, 3, 4, 5, 6, 1];
const SLA = [7, 3, 5, 7, 3, 5, 10, 10];
const PRI = [1, 3, 2, 1, 0, 1, 0, 1]; // LOW 0 · MEDIUM 1 · HIGH 2 · CRITICAL 3
const CONF = [0.92, 0.97, 0.88, 0.55, 0.9, 0.85, 0.8, 0.9]; // T3 < 0.7 → manual routing
const CIT = [0, 1, 2, 3, 4, 5, 1, 2, 5, 4];
const SLOT = [0, 1, 2, 3, 4, 5, 6, 7, 0, 0]; // orbit slot (T8 merges into T0's)
const LANE_OFF = [0, -42, 0, 0, 0, 0, 0, 42];
const DOCK_OFF = [0, -44, -42, 0, 0, 0, 36, 40];
const RATING = [4, 5, 5, 3, 4, 4, 5, 0];
const isWA = (k: number) => k < N && k % 2 === 1;
const SIZE = [36, 46, 56, 66];
const size = (pri: number) => SIZE[Math.max(0, Math.min(3, pri))];
const DAY = 2.0; // seconds per calendar day in Clock / Escalate / Dispute
const T_CAL = 40;

const orbitPos = (slot: number, t: number) => {
  const th = -PI / 2 + (slot * 2 * PI) / N + t * ORB_W;
  return { x: EYE.x + ORB_RX * Math.cos(th), y: EYE.y + ORB_RY * Math.sin(th) };
};

/* ───────────────────────────── keyframe engine ───────────────────────────── */
type S = {
  x: number; y: number; s: number; rr: number; tail: number; c: RGB; a: number; orb: number;
  rp: number; ra: number; rc: RGB; tk: number; res: number; tick: number; warn: number;
  card: number; cw: number; pips: number; od: number; up: number;
};
type Patch = Partial<S>;
type KF = { t: number; d: number; from: S; to: S; arc: number; lin: boolean; pop: number };
type Opts = { arc?: number; lin?: boolean; pop?: number };
type Out = S & { sx: number; sy: number; q: number; busy: number };

const KFS: KF[][] = Array.from({ length: N_ALL }, () => []);

const init = (k: number): S => ({
  x: citX(CIT[k]), y: CIT_Y, s: 0, rr: 0.5, tail: 0, c: GREY, a: 0, orb: 0,
  rp: 1, ra: 0, rc: INK, tk: 0, res: 0, tick: 0, warn: 0, card: 0, cw: 0, pips: 0, od: 0, up: 0,
});

function evalAt(k: number, t: number): Out {
  const kfs = KFS[k];
  let i = kfs.length - 1;
  while (i >= 0 && kfs[i].t > t) i--;
  if (i < 0) {
    const s0 = init(k);
    return { ...s0, sx: 1, sy: 1, q: 1, busy: 0 };
  }
  const kf = kfs[i], A = kf.from, B = kf.to;
  const q = kf.d > 0 ? seg(t, kf.t, kf.t + kf.d) : 1;
  const pe = kf.lin ? q : ease(q);
  let x = lerp(A.x, B.x, pe), y = lerp(A.y, B.y, pe), sx = 1, sy = 1;
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
  if (L > 0.5 && !kf.lin) {
    const ux = dx / L, uy = dy / L;
    const m = ease(seg(q, 0.1, 1)), ant = Math.min(7, L * 0.08) * bump(q, 0, 0.22);
    const bul = kf.arc * Math.sin(PI * m);
    x = A.x + dx * m - ux * ant - uy * bul;
    y = A.y + dy * m - uy * ant + ux * bul;
    const e = 0.09 * bump(q, 0.15, 0.85) - 0.11 * bump(q, 0.86, 1.0);
    sx = 1 + e * (Math.abs(ux) - Math.abs(uy));
    sy = 1 + e * (Math.abs(uy) - Math.abs(ux));
  }
  if (kf.pop > 0) {
    const pp = 1 + kf.pop * Math.sin(PI * seg(q, 0, 0.6));
    sx *= pp;
    sy *= pp;
  }
  const orb = lerp(A.orb, B.orb, pe);
  if (orb > 0) {
    const o = orbitPos(SLOT[k], t);
    x = lerp(x, o.x, orb);
    y = lerp(y, o.y, orb);
  }
  const s = lerp(A.s, B.s, pe);
  return {
    x, y, s, sx, sy, q, busy: q < 1 ? Math.sin(PI * q) : 0,
    rr: lerp(A.rr, B.rr, pe), tail: lerp(A.tail, B.tail, pe), c: mix(A.c, B.c, pe), a: lerp(A.a, B.a, pe), orb,
    rp: lerp(A.rp, B.rp, pe), ra: lerp(A.ra, B.ra, pe), rc: mix(A.rc, B.rc, pe), tk: lerp(A.tk, B.tk, pe),
    res: lerp(A.res, B.res, pe), tick: lerp(A.tick, B.tick, pe), warn: lerp(A.warn, B.warn, pe),
    card: lerp(A.card, B.card, pe), cw: lerp(A.cw, B.cw, pe), pips: lerp(A.pips, B.pips, pe),
    od: lerp(A.od, B.od, pe), up: lerp(A.up, B.up, pe),
  };
}

/** Add a keyframe: at time t, over d seconds, move token k's state to `patch` (other fields hold). */
function K(k: number, t: number, d: number, patch: Patch, o: Opts = {}) {
  const cur = evalAt(k, t);
  const from: S = {
    x: cur.x, y: cur.y, s: cur.s, rr: cur.rr, tail: cur.tail, c: cur.c, a: cur.a, orb: cur.orb,
    rp: cur.rp, ra: cur.ra, rc: cur.rc, tk: cur.tk, res: cur.res, tick: cur.tick, warn: cur.warn,
    card: cur.card, cw: cur.cw, pips: cur.pips, od: cur.od, up: cur.up,
  };
  const to: S = { ...from, ...patch };
  KFS[k].push({ t, d, from, to, arc: o.arc ?? 0, lin: !!o.lin, pop: o.pop ?? 0 });
}

/* ───────────────────────────── precomputed event tables ───────────────────────────── */
type Staff = { lane: number; t0: number; t1: number; t3: number; card: boolean; fail: boolean; tx: number; ty: number };
const STAFF: Staff[] = [];
const staff = (lane: number, t1: number, card: boolean, tx: number, ty: number, fail = false, rise = 1.1) =>
  STAFF.push({ lane, t0: t1 - rise, t1, t3: t1 + (fail ? 0.7 : 0.9), card, fail, tx, ty });

type Pin = { k: number; t: number; mx: number; my: number; hit: boolean; valid: boolean };
const MARK: Record<number, [number, number]> = {
  0: [330, 322], 2: [455, 372], 4: [350, 398], 6: [462, 316], 8: [343, 336], 9: [402, 348],
};
const PINS: Pin[] = [];
type Pts = { t: number; v: number; bonus: boolean };
const POINTS: Pts[][] = Array.from({ length: 6 }, () => []);
const pts = (cit: number, t: number, v: number, bonus = false) => POINTS[cit].push({ t, v, bonus });
const LEDGER: number[] = []; // escalation events (dial ledger)
const MARKER: { lane: number; t: number; c: RGB }[] = []; // dept-head marker lights
type Echo = { t: number; x: number; y: number; r: number; c: RGB; rip: boolean };
const ECHOES: Echo[] = [];
const echoAt = (k: number, t: number, c: RGB, rip = false, dt = 0.05) => {
  const s = evalAt(k, t + dt);
  ECHOES.push({ t, x: s.x, y: s.y, r: s.s / 2 + 8, c, rip });
};

/* ───────────────────────────── chapter 0 · REPORT (0–13) ───────────────────────────── */
// Web reports drop a map pin at the left port; WhatsApp reports walk the 7-pip phase rail
// (GREETING → … → READY_TO_FILE, ConversationPhase.java) before the agent may file them.
const E = (k: number) => 0.5 + k * 1.05;
const RAIL_T = 1.6;
const WA_T: Record<number, number> = {}; // rail start per WhatsApp token
for (let k = 0; k < N; k++) {
  const e = E(k), wa = isWA(k);
  K(k, e, 0.5, { y: DOCK_Y, s: EMERGE, a: 1, rr: wa ? 0.5 : 0.28, tail: wa ? 1 : 0 });
  pts(CIT[k], e + 0.3, 10);
  if (wa) {
    K(k, e + 0.6, 0.9, { x: RAIL_X0, y: PORT_Y }, { arc: -70 });
    WA_T[k] = e + 1.5;
    K(k, e + 1.5, RAIL_T, { x: RAIL_X1 }, { lin: true });
    const go = e + 1.5 + RAIL_T;
    const o = orbitPos(SLOT[k], go + 1.0);
    K(k, go, 1.0, { x: o.x, y: o.y, orb: 1, tail: 0, rr: 0.5 }, { arc: 60 });
  } else {
    K(k, e + 0.6, 0.9, { x: WEB.x, y: PORT_Y }, { arc: 70 });
    const [mx, my] = MARK[k];
    PINS.push({ k, t: e + 1.6, mx, my, hit: false, valid: true });
    const go = e + 2.5;
    const o = orbitPos(SLOT[k], go + 1.0);
    K(k, go, 1.0, { x: o.x, y: o.y, orb: 1, rr: 0.5 }, { arc: -60 });
  }
}

/* ───────────────────────────── chapter 1 · SCREEN (13–25) ───────────────────────────── */
// T9 is vague: AIService.validateComplaintText says no, the gate stays shut, it bounces home.
// T8 is a second pothole 500 m from T0's pin with similarity 0.8 ≥ 0.6 (DuplicateDetectionService):
// it merges into T0 as an upvote (CommunityService).
K(9, 13.6, 0.5, { y: DOCK_Y, s: EMERGE, a: 1, rr: 0.28 });
K(9, 14.2, 1.0, { x: WEB.x, y: PORT_Y }, { arc: 70 });
PINS.push({ k: 9, t: 15.4, mx: MARK[9][0], my: MARK[9][1], hit: false, valid: false });
const GATE_FAIL = 16.6;
K(9, GATE_FAIL, 0.25, { c: mix(GREY, WARN, 0.5) }, { pop: 0.14 });
K(9, 16.9, 1.2, { x: citX(CIT[9]), y: DOCK_Y, c: GREY }, { arc: -80 });
K(9, 18.1, 0.5, { y: CIT_Y, s: 0, a: 0 });

K(8, 18.4, 0.5, { y: DOCK_Y, s: EMERGE, a: 1, rr: 0.28 });
K(8, 19.0, 1.0, { x: WEB.x, y: PORT_Y }, { arc: 70 });
PINS.push({ k: 8, t: 20.1, mx: MARK[8][0], my: MARK[8][1], hit: true, valid: true });
const SIM_T0 = 20.8, SIM_T1 = 21.5, MERGE_T = 21.7, MERGE_D = 1.0;
{
  const o = orbitPos(SLOT[8], MERGE_T + MERGE_D);
  K(8, MERGE_T, MERGE_D, { x: o.x, y: o.y, orb: 1, rr: 0.5, s: 22 }, { arc: -90 });
}
K(8, MERGE_T + MERGE_D, 0.25, { s: 0, a: 0 });
K(0, MERGE_T + MERGE_D, 0.5, { up: 1 }, { pop: 0.18 });
pts(CIT[0], MERGE_T + MERGE_D + 0.2, 5);
echoAt(0, MERGE_T + MERGE_D, ACCENT, true);

/* ───────────────────────────── chapter 2 · CLASSIFY (25–40) ───────────────────────────── */
// Gemini returns {category, priority, slaDays, confidence}; the rulebook maps the category to a
// department; confidence < 0.7 → needsManualRouting (ComplaintService.java). Size = priority,
// ring ticks = SLA days.
const EYE_OPEN0 = 24.3, EYE_OPEN1 = 26.0, EYE_CLOSE0 = 107.8, EYE_CLOSE1 = 109.6;
const ORD = [0, 1, 2, 4, 5, 6, 3, 7];
const P = (i: number) => 26.0 + i * 1.3;
const IN_EYE: { k: number; t0: number; t1: number }[] = [];
for (let i = 0; i < N; i++) {
  const k = ORD[i], p = P(i);
  K(k, p, 0.45, { x: EYE.x, y: EYE.y, orb: 0, s: 30, c: mix(GREY, INK, 0.5) });
  IN_EYE.push({ k, t0: p + 0.35, t1: p + 0.95 });
  if (k === 3) {
    K(k, p + 1.0, 0.85, { x: TRAY.x, y: TRAY.y, s: size(PRI[k]), c: GREY }, { arc: 40 });
    continue;
  }
  const lx = laneX(DEPT[k]) + LANE_OFF[k];
  K(k, p + 1.0, 0.85, { x: lx, y: LANE_Y, s: size(PRI[k]), c: INK, rp: 1, ra: 1, rc: INK, tk: SLA[k] }, { arc: lx < CX ? 50 : -50 });
  echoAt(k, p + 1.85, INK);
}
const ADMIN_T = 36.9;
K(3, ADMIN_T, 0.9, { x: laneX(DEPT[3]), y: LANE_Y, c: INK, rp: 1, ra: 1, rc: INK, tk: SLA[3] }, { arc: -40 });
echoAt(3, ADMIN_T + 0.9, INK);
ECHOES.push({ t: EYE_OPEN1, x: EYE.x, y: EYE.y, r: EYE_HW, c: ACCENT, rip: true });

/* ───────────────────────────── chapter 3 · CLOCK (40–54) ───────────────────────────── */
// Days pass; each ring empties one tick per day (slaDeadline = now + slaDays). A staff square
// may only push IN_PROGRESS → RESOLVED with a ResolutionProof (StateTransitionService guard).
const deadline = (k: number) => T_CAL + DAY * SLA[k];
for (let k = 0; k < N; k++) K(k, T_CAL, DAY * SLA[k], { rp: 0 }, { lin: true });
const RES: Record<number, number> = { 1: 43.0, 4: 44.5, 2: 47.0, 5: 48.6, 6: 49.5, 7: 50.1, 3: 51.5 };
const FAIL_T = 46.0;
staff(5, FAIL_T, false, laneX(5), LANE_Y, true, 1.0);
for (const ks of Object.keys(RES)) {
  const k = +ks, tr = RES[k];
  const s = evalAt(k, tr);
  staff(DEPT[k], tr, true, s.x, s.y);
  K(k, tr, 0.4, { card: 1, res: 1, ra: 0.45 }, { pop: 0.14 });
  echoAt(k, tr, ACCENT);
}

/* ───────────────────────────── chapter 4 · ESCALATE (54–70) ───────────────────────────── */
// T0's ring runs dry at 54. The scheduler ticks four times a day (cron 0 0 0/6 * * *). Past one
// day overdue the next tick lifts it to L1 (dept head, priority +1); past three days to L2
// (commissioner, CRITICAL). Each lift writes one immutable EscalationEvent.
const BREACH = deadline(0); // 54
K(0, BREACH, 0.3, { warn: 1, ra: 1, c: INK_WARN }, { pop: 0.16 });
echoAt(0, BREACH, WARN, true);
const OD = (d: number) => BREACH + DAY * d; // d days overdue
K(0, OD(1), 0.3, { od: 1 });
const L1_T = OD(1) + 0.5; // first tick past one day
K(0, L1_T, 0.8, { y: L1_Y, s: size(PRI[0] + 1) }, { arc: 30, pop: 0.12 });
LEDGER.push(L1_T + 0.8);
MARKER.push({ lane: 0, t: L1_T + 0.8, c: WARN });
echoAt(0, L1_T + 0.8, WARN);
K(0, OD(2), 0.3, { od: 2 });
K(0, OD(3), 0.3, { od: 3 });
const L2_T = OD(3) + 0.5;
K(0, L2_T, 1.1, { x: COMM.x, y: COMM.y, s: size(3) }, { arc: 60, pop: 0.14 });
LEDGER.push(L2_T + 1.1);
echoAt(0, L2_T + 1.1, WARN, true);
K(0, OD(4), 0.3, { od: 4 });
K(0, OD(5), 0.3, { od: 5 });
const RES0 = 67.8;
staff(0, RES0, true, COMM.x, COMM.y, false, 1.8);
K(0, RES0, 0.5, { card: 1, res: 1, warn: 0, c: INK, ra: 0.45 }, { pop: 0.16 });
echoAt(0, RES0, ACCENT);

/* ───────────────────────────── chapter 5 · VERIFY (70–84) ───────────────────────────── */
// Only the owning citizen may take RESOLVED → CLOSED, and only with a 1–5 rating
// (CitizenSignoffService). T7's citizen disputes instead: a counter-proof card unfolds.
const HOME = [1, 4, 2, 5, 6, 3, 0, 7];
const H = (i: number) => 70.6 + i * 1.05;
for (let i = 0; i < N; i++) {
  const k = HOME[i], h = H(i), hx = citX(CIT[k]) + DOCK_OFF[k];
  K(k, h, 1.1, { x: hx, y: DOCK_Y, od: 0 }, { arc: hx < evalAt(k, h).x ? 70 : -70 });
  const a = h + 1.1;
  if (k === 7) continue;
  K(k, a + 0.2, 0.7, { pips: RATING[k] }, { lin: true });
  K(k, a + 0.95, 0.5, { c: ACCENT, res: 0, ra: 0, tick: 1 }, { pop: 0.16 });
  pts(CIT[k], a + 1.2, 20);
  echoAt(k, a + 0.95, ACCENT, k === 0);
}
const DISPUTE_T = 79.6;
K(7, DISPUTE_T, 0.5, { cw: 1 }, { pop: 0.1 });
echoAt(7, DISPUTE_T, WARN);

/* ───────────────────────────── chapter 6 · DISPUTE (84–100) ───────────────────────────── */
// DisputeService.approveDispute: DEPT_HEAD only (StateTransitionPolicy), RESOLVED → IN_PROGRESS,
// priority +1, SLA = ceil(10 × 0.75) = 8 days, escalation reset, old proofs deleted.
const DH = { x: laneX(DEPT[7]), y: L1_Y };
K(7, 84.6, 1.2, { x: DH.x, y: DH.y }, { arc: 90 });
MARKER.push({ lane: DEPT[7], t: 85.8, c: INK });
K(7, 86.0, 0.5, { card: 0 });
K(7, 86.6, 0.4, { cw: 0 });
const REOPEN_SLA = Math.ceil(SLA[7] * 0.75);
const REOPEN_T = 87.0;
K(7, REOPEN_T, 0.8, { x: laneX(DEPT[7]) + LANE_OFF[7], y: LANE_Y, c: INK, s: size(PRI[7] + 1), rp: 1, ra: 1, rc: INK, tk: REOPEN_SLA, res: 0, tick: 0, pips: 0 }, { arc: -40, pop: 0.12 });
echoAt(7, REOPEN_T + 0.8, INK);
K(7, REOPEN_T + 0.8, DAY * REOPEN_SLA, { rp: 0 }, { lin: true });
const RES7 = 93.1;
{
  const s = evalAt(7, RES7);
  staff(DEPT[7], RES7, true, s.x, s.y);
}
K(7, RES7, 0.4, { card: 1, res: 1, ra: 0.45 }, { pop: 0.14 });
echoAt(7, RES7, ACCENT);
const HOME7 = 93.8;
K(7, HOME7, 1.1, { x: citX(CIT[7]) + DOCK_OFF[7], y: DOCK_Y }, { arc: -80 });
K(7, HOME7 + 1.3, 0.6, { pips: 4 }, { lin: true });
const CLOSE7 = HOME7 + 1.9;
K(7, CLOSE7, 0.5, { c: ACCENT, res: 0, ra: 0, tick: 1 }, { pop: 0.16 });
pts(CIT[7], CLOSE7 + 0.3, 20);
echoAt(7, CLOSE7, ACCENT, true);

/* ───────────────────────────── chapter 7 · LEDGER (100–112) ───────────────────────────── */
// AuditAction: CREATE, ASSIGNMENT, STATE_CHANGE, ESCALATION, ACCEPT, DISPUTE (+SLA_UPDATE,
// SUSPENSION unused here). Staff score = 10 per close before deadline + 2 per star
// (StaffLeaderboardService); citizens +50 clean-record bonus (CitizenPointsService).
type Act = 0 | 1 | 2 | 3 | 4 | 5; // create, assignment, state, escalation, accept, dispute
const TICKER: Act[] = [];
for (const k of ORD) TICKER.push(0, 1, 2);
for (let i = 0; i < 7; i++) TICKER.push(2);
TICKER.push(3, 3);
for (let i = 0; i < 7; i++) TICKER.push(4);
TICKER.push(5, 2, 2, 4);
const TICK_T0 = 100.4, TICK_DT = 0.16;
const ticker_t = (i: number) => TICK_T0 + i * TICK_DT;
const TICK_END = ticker_t(TICKER.length - 1) + 0.3;
const STAFF_SCORE = [8, 38, 20, 16, 18, 18, 20]; // per lane, see header comment
const BARS_T = 101.2;
for (let i = 0; i < 6; i++) if (i !== 2) pts(i, 102.0 + i * 0.25, 50, true);
ECHOES.push({ t: EYE_CLOSE1, x: EYE.x, y: EYE.y, r: EYE_HW, c: ACCENT, rip: true });

/* ───────────────────────────── return morph (112–116) ───────────────────────────── */
const RET = 112.2;
for (let k = 0; k < N; k++) {
  const s = evalAt(k, RET);
  K(k, RET + k * 0.08, 1.3, { x: citX(CIT[k]), y: CIT_Y, s: 0, a: 0, card: 0, cw: 0, tick: 0, pips: 0, res: 0, ra: 0, od: 0, up: 0, rp: 1, orb: 0, c: GREY, rr: 0.5, tail: 0, tk: 0, warn: 0, rc: INK },
    { arc: s.x < citX(CIT[k]) ? -30 : 30 });
}
const FADE0 = 113.0, FADE1 = 115.2; // furniture residue fades out
const fadeOut = (t: number) => 1 - seg(t, FADE0, FADE1);

/* ───────────────────────────── painters: helpers ───────────────────────────── */
function tickMark(p: Painter, x: number, y: number, s: number, q: number, col: RGB, a = 1) {
  if (q <= 0 || a <= 0) return;
  const P = [[x - 0.26 * s, y + 0.02 * s], [x - 0.07 * s, y + 0.2 * s], [x + 0.27 * s, y - 0.2 * s]];
  const l1 = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]);
  const l2 = Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const d = q * (l1 + l2);
  const c = p.ctx;
  c.strokeStyle = css(col, a);
  c.lineWidth = Math.max(2, s * 0.11);
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

function diamond(p: Painter, x: number, y: number, s: number, col: RGB, a: number, fill = true) {
  if (a <= 0) return;
  const c = p.ctx;
  c.beginPath();
  c.moveTo(x, y - s);
  c.lineTo(x + s, y);
  c.lineTo(x, y + s);
  c.lineTo(x - s, y);
  c.closePath();
  if (fill) {
    c.fillStyle = css(col, a);
    c.fill();
  } else {
    c.strokeStyle = css(col, a);
    c.lineWidth = 2.5;
    c.lineJoin = "round";
    c.stroke();
  }
}

/** A proof card: pin dot + tick on a small rounded rect; `fold` unfolds it from its bottom edge. */
function card(p: Painter, x: number, y: number, col: RGB, a: number, fold = 1) {
  if (a <= 0.01 || fold <= 0.02) return;
  const w = 26, h = 32 * fold;
  p.rrect(x - w / 2, y + 16 - h, w, h, 6, col, a);
  if (fold > 0.6) {
    p.disc(x, y - 7, 3.5, GROUND, a * seg(fold, 0.6, 1));
    tickMark(p, x, y + 7, 18, seg(fold, 0.7, 1), GROUND, a);
  }
}

function pinGlyph(p: Painter, x: number, y: number, col: RGB, a: number, s = 1) {
  if (a <= 0) return;
  p.disc(x, y - 6 * s, 4.5 * s, col, a);
  p.line(x, y - 2 * s, x, y + 5 * s, col, 2.5 * s, a);
}

/* ───────────────────────────── painters: the cast ───────────────────────────── */
function drawToken(p: Painter, k: number, s: Out, t: number) {
  if (s.a <= 0.005 || s.s <= 0.5) return;
  const c = p.ctx;
  const idle = s.busy === 0 && s.orb <= 0 ? 1.4 * Math.sin(t * 1.3 + k * 1.7) : 0;
  const x = s.x, y = s.y + idle, a = s.a;
  const w = s.s * s.sx, h = s.s * s.sy, rad = s.rr * Math.min(w, h);
  const R = s.s / 2 + 11;
  if (s.ra > 0.01) {
    p.arc(x, y, R, 0, PI * 2, EDGE, 4, s.ra * a);
    if (s.rp > 0.002) p.arc(x, y, R, -PI / 2, PI * 2 * s.rp, s.rc, 4, s.ra * a);
    const n = Math.round(s.tk);
    if (n > 0 && n <= 14) {
      for (let i = 0; i < n; i++) {
        const th = -PI / 2 + (i * PI * 2) / n, cs = Math.cos(th), sn = Math.sin(th);
        p.line(x + cs * (R - 5), y + sn * (R - 5), x + cs * (R + 5), y + sn * (R + 5), LOCK, 2, s.ra * a);
      }
    }
  }
  if (s.warn > 0.01) p.arc(x, y, R, 0, PI * 2, WARN, 4, s.warn * a * (0.6 + 0.4 * Math.cos(t * 9)));
  p.rrect(x - w / 2, y - h / 2, w, h, rad, s.c, a);
  if (s.tail > 0.02) {
    const q = s.tail;
    c.fillStyle = css(s.c, a * q);
    c.beginPath();
    c.moveTo(x - w * 0.34, y + h * 0.2);
    c.lineTo(x - w * (0.34 + 0.24 * q), y + h * (0.2 + 0.42 * q));
    c.lineTo(x - w * 0.06, y + h * 0.44);
    c.closePath();
    c.fill();
  }
  if (s.res > 0.01) p.arc(x, y, s.s / 2 + 5, 0, PI * 2, ACCENT, 3, s.res * a);
  if (s.tick > 0.01) tickMark(p, x, y, s.s * 0.95, s.tick, GROUND, a);
  if (s.up > 0.01) p.disc(x + w / 2 + 3, y - h / 2 - 3, 7 * s.up, ACCENT, a);
  if (s.card > 0.01) card(p, x + s.s / 2 + 22, y - s.s / 2 - 2, INK, a * Math.min(1, s.card * 1.5), s.card);
  if (s.cw > 0.01) card(p, x - s.s / 2 - 22, y - s.s / 2 - 2, WARN, a * Math.min(1, s.cw * 1.5), s.cw);
  if (s.pips > 0.01) {
    const rr = s.s / 2 + 22;
    for (let i = 0; i < 5; i++) {
      const th = -PI * (150 / 180) + (i * PI * (120 / 180)) / 4;
      const f = clamp01(s.pips - i);
      p.disc(x + rr * Math.cos(th), y + rr * Math.sin(th), 4.5 * (0.7 + 0.3 * f), f > 0 ? ACCENT : LOCK, a * (f > 0 ? 1 : 0.7));
    }
  }
  if (s.od > 0.01) {
    const n = Math.ceil(s.od - 0.001);
    for (let i = 0; i < n; i++) {
      const f = clamp01(s.od - i);
      p.disc(x + s.s / 2 + 17, y - s.s / 2 + 4 + i * 13, 5 * f, WARN, a);
    }
  }
}

/* ───────────────────────────── painters: furniture ───────────────────────────── */
function drawCitizens(p: Painter, t: number) {
  const fo = fadeOut(t);
  for (let i = 0; i < 6; i++) {
    const x = citX(i);
    p.arc(x, CIT_Y, CIT_R + Math.sin(t * 0.9 + i) * 1.2, 0, PI * 2, LOCK, 3);
    let base = 0, bonus = 0, pop = 0;
    for (const e of POINTS[i]) {
      const g = easeOut(seg(t, e.t, e.t + 0.5));
      if (e.bonus) bonus += e.v * g;
      else base += e.v * g;
      pop = Math.max(pop, bump(t, e.t, e.t + 0.5));
    }
    p.line(x - 55, PTS_Y, x + 55, PTS_Y, EDGE, 2);
    const hh = 4 + 2 * pop;
    if (base > 0) p.rrect(x - 55, PTS_Y - hh, base * fo, hh * 2, hh, INK, fo);
    if (bonus > 0) p.rrect(x - 55 + base * fo, PTS_Y - hh, bonus * fo, hh * 2, hh, ACCENT, fo);
  }
}

function drawPorts(p: Painter, t: number) {
  const fo = fadeOut(t);
  const c = p.ctx;
  // Web portal: a map panel. Pins rise from the waiting report into the map; a 500 m radius ring
  // sweeps around each new pin; the validity gate opens (accent) or stays shut (warn).
  p.rstroke(MAP.x0, MAP.y0, MAP.x1 - MAP.x0, MAP.y1 - MAP.y0, 14, LOCK, 3);
  p.line(MAP.x0 + 16, MAP.y0 + 62, MAP.x1 - 16, MAP.y0 + 62, IDLE, 2);
  p.line(MAP.x0 + 16, MAP.y0 + 112, MAP.x1 - 16, MAP.y0 + 104, EDGE, 2);
  p.line(MAP.x0 + 120, MAP.y0 + 14, MAP.x0 + 120, MAP.y1 - 14, IDLE, 2);
  p.line(MAP.x0 + 40, MAP.y0 + 14, MAP.x0 + 60, MAP.y1 - 14, EDGE, 2);
  p.line(MAP.x0 + 180, MAP.y0 + 14, MAP.x1 - 20, MAP.y0 + 62, EDGE, 2);
  let gateOpen = 0, gateFail = 0, mark0 = 0;
  for (const pin of PINS) {
    if (t < pin.t) continue;
    const q = easeOut(seg(t, pin.t, pin.t + 0.5));
    const px = lerp(WEB.x, pin.mx, q), py = lerp(PORT_Y - 24, pin.my, q) - Math.sin(PI * q) * 30;
    let a = fo;
    if (!pin.valid) a *= 1 - seg(t, GATE_FAIL + 0.3, GATE_FAIL + 0.8);
    if (pin.k === 8) a *= 1 - seg(t, MERGE_T, MERGE_T + 0.4);
    pinGlyph(p, px, py, pin.k === 8 ? ACCENT : INK, a);
    const rq = seg(t, pin.t + 0.5, pin.t + 1.3);
    if (rq > 0 && rq < 1) {
      c.save();
      p.rrPath(MAP.x0, MAP.y0, MAP.x1 - MAP.x0, MAP.y1 - MAP.y0, 14);
      c.clip();
      p.arc(pin.mx, pin.my, 44 * easeOut(rq), 0, PI * 2, pin.hit ? ACCENT : INK, 2.5, 0.9 * (1 - rq));
      c.restore();
    }
    if (pin.valid) gateOpen = Math.max(gateOpen, bump(t, pin.t + 0.7, pin.t + 1.6));
    else gateFail = Math.max(gateFail, bump(t, GATE_FAIL - 0.1, GATE_FAIL + 0.7));
    if (pin.hit) mark0 = Math.max(mark0, seg(t, pin.t + 0.9, pin.t + 1.1) * (1 - seg(t, MERGE_T + MERGE_D, MERGE_T + MERGE_D + 0.4)));
  }
  if (mark0 > 0) p.disc(MARK[0][0], MARK[0][1] - 6, 9 + 3 * Math.sin(t * 8), ACCENT, 0.6 * mark0);
  // The gate: two halves between the map and the waiting report.
  const gy = MAP.y1 + 14, gap = 4 + 30 * easeOut(gateOpen), shake = Math.sin(t * 50) * 3 * gateFail;
  const gc = mix(mix(LOCK, ACCENT, gateOpen), WARN, gateFail);
  p.line(WEB.x - 44 + shake, gy, WEB.x - gap, gy, gc, 5);
  p.line(WEB.x + gap, gy, WEB.x + 44 + shake, gy, gc, 5);
  // Similarity meter under the duplicate: fills to 0.8, past the 0.6 mark.
  const ma = seg(t, SIM_T0 - 0.5, SIM_T0) * (1 - seg(t, MERGE_T + 0.6, MERGE_T + 1.0));
  if (ma > 0) {
    const mx0 = WEB.x - 60, mw = 120, my = PORT_Y + 42;
    p.line(mx0, my, mx0 + mw, my, EDGE, 4, ma);
    p.line(mx0 + mw * 0.6, my - 8, mx0 + mw * 0.6, my + 8, LOCK, 2, ma);
    const f = 0.8 * easeOut(seg(t, SIM_T0, SIM_T1));
    if (f > 0) p.line(mx0, my, mx0 + mw * f, my, f >= 0.6 ? ACCENT : INK, 4, ma);
  }
  // WhatsApp: a bubble and its seven-pip phase rail.
  p.rstroke(WA.x - 34, WA.y - 28, 68, 54, 18, LOCK, 3);
  p.line(WA.x - 22, WA.y + 24, WA.x - 34, WA.y + 40, LOCK, 3);
  p.line(WA.x - 34, WA.y + 40, WA.x - 10, WA.y + 26, LOCK, 3);
  p.line(WA.x - 16, WA.y - 8, WA.x + 16, WA.y - 8, EDGE, 2.5);
  p.line(WA.x - 16, WA.y + 4, WA.x + 6, WA.y + 4, EDGE, 2.5);
  p.line(RAIL_X0, PORT_Y + 30, RAIL_X1, PORT_Y + 30, EDGE, 2);
  for (let j = 0; j < RAIL_N; j++) {
    const px = RAIL_X0 + (j * (RAIL_X1 - RAIL_X0)) / (RAIL_N - 1);
    let lit = 0, pop = 0;
    for (const ks of Object.keys(WA_T)) {
      const t0 = WA_T[+ks], tj = t0 + (RAIL_T * j) / (RAIL_N - 1);
      const on = seg(t, tj, tj + 0.12) * (1 - seg(t, t0 + RAIL_T + 0.3, t0 + RAIL_T + 0.7));
      lit = Math.max(lit, on);
      pop = Math.max(pop, bump(t, tj, tj + 0.35));
    }
    p.disc(px, PORT_Y + 30, 5 + 3 * pop, mix(LOCK, INK, lit));
  }
}

function drawLanes(p: Painter, t: number) {
  const fo = fadeOut(t);
  const c = p.ctx;
  // Orbit halo around the Eye: where filed reports wait to be read.
  c.strokeStyle = css(EDGE, 1);
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(EYE.x, EYE.y, ORB_RX, ORB_RY, 0, 0, PI * 2);
  c.stroke();
  p.line(290, L1_Y, 1310, L1_Y, IDLE, 2);
  p.line(290, L2_Y, 1310, L2_Y, IDLE, 2);
  for (let j = 0; j < 7; j++) {
    const x = laneX(j);
    p.rrect(x - 56, TOP_Y - 26, 112, DOCK_SQ_Y - TOP_Y + 52, 18, INK, 0.07);
    p.line(x, TOP_Y + 16, x, DOCK_SQ_Y - 26, IDLE, 2);
    p.rrect(x - 8, TOP_Y - 8, 16, 16, 4, LOCK);
    let lit = 0, pop = 0, col: RGB = LOCK;
    for (const m of MARKER) {
      if (m.lane !== j || t < m.t) continue;
      lit = Math.max(lit, 1) * fo;
      pop = Math.max(pop, bump(t, m.t, m.t + 0.5));
      col = m.c;
    }
    diamond(p, x, L1_Y, 11 + 6 * pop, mix(LOCK, col, lit), 1, lit > 0.5);
  }
  // Commissioner marker: lights warn when T0 arrives, accent when it is resolved under his watch.
  const cl = seg(t, L2_T + 1.0, L2_T + 1.2) * fo, cres = seg(t, RES0, RES0 + 0.3);
  const cpop = bump(t, L2_T + 1.0, L2_T + 1.6) + bump(t, RES0, RES0 + 0.5);
  diamond(p, COMM.x, COMM.y, 15 + 6 * cpop, mix(LOCK, mix(WARN, ACCENT, cres), cl), 1, cl > 0.5);
  // Admin tray and the manual-routing bar that slides T3 into SEWERAGE.
  p.rstroke(TRAY.x - 38, TRAY.y - 30, 76, 60, 12, LOCK, 3);
  const aq = seg(t, ADMIN_T, ADMIN_T + 0.9);
  if (aq > 0 && aq < 1) {
    const ax = lerp(TRAY.x, laneX(3), ease(aq)) - 36;
    p.line(ax - 22, TRAY.y, ax, TRAY.y, ACCENT, 6, Math.sin(PI * aq));
  }
}

function drawStaff(p: Painter, t: number) {
  const fo = fadeOut(t);
  const out = new Array<boolean>(7).fill(false);
  for (const ev of STAFF) {
    if (t < ev.t0 || t > ev.t3) continue;
    out[ev.lane] = true;
    const dx = laneX(ev.lane), dy = DOCK_SQ_Y;
    let x: number, y: number, col: RGB = INK, a = 1;
    if (t < ev.t1) {
      const q = ease(seg(t, ev.t0, ev.t1));
      const ty = ev.ty + 52;
      x = lerp(dx, ev.tx, q);
      y = lerp(dy, ty, q) - Math.sin(PI * q) * (ev.tx === dx ? 0 : 60);
      col = mix(LOCK, INK, seg(q, 0, 0.3));
    } else {
      const q = ev.fail ? easeOut(seg(t, ev.t1, ev.t3)) : ease(seg(t, ev.t1 + 0.15, ev.t3));
      const ty = ev.ty + 52;
      x = lerp(ev.tx, dx, q);
      y = lerp(ty, dy, q) + (ev.fail ? 0 : -Math.sin(PI * q) * (ev.tx === dx ? 0 : 60));
      col = mix(INK, LOCK, seg(q, 0.6, 1));
      if (ev.fail) {
        const fl = bump(t, ev.t1, ev.t1 + 0.5);
        col = mix(col, WARN, fl);
        x += Math.sin(t * 60) * 3 * fl;
      }
    }
    const sq = 26 * (1 + 0.1 * bump(t, ev.t1 - 0.1, ev.t1 + 0.2));
    p.rrect(x - sq / 2, y - sq / 2, sq, sq, 6, col, a);
    if (ev.card) {
      const fold = seg(t, ev.t0 + 0.1, ev.t0 + 0.5);
      const ca = 1 - seg(t, ev.t1, ev.t1 + 0.25);
      card(p, x + 20, y - 18, INK, ca, fold);
    }
  }
  for (let j = 0; j < 7; j++) {
    if (!out[j]) p.rrect(laneX(j) - 13, DOCK_SQ_Y - 13, 26, 26, 7, LOCK);
    // Staff score bars (Ledger): 10 per on-time close + 2 per star.
    const g = easeOut(seg(t, BARS_T + j * 0.2, BARS_T + j * 0.2 + 0.8)) * fo;
    if (g > 0) p.rrect(laneX(j) + 18, DOCK_SQ_Y - 4, STAFF_SCORE[j] * 2.2 * g, 8, 4, INK, g);
  }
}

function drawDial(p: Painter, t: number) {
  const fo = fadeOut(t);
  p.arc(DIAL.x, DIAL.y, DIAL.r, 0, PI * 2, LOCK, 3);
  for (let i = 0; i < 4; i++) {
    const th = (i * PI) / 2;
    p.line(DIAL.x + Math.cos(th) * (DIAL.r - 7), DIAL.y + Math.sin(th) * (DIAL.r - 7), DIAL.x + Math.cos(th) * (DIAL.r - 1), DIAL.y + Math.sin(th) * (DIAL.r - 1), LOCK, 2.5);
  }
  const n = Math.floor(t / 0.5), f = easeOut(seg(t, n * 0.5, n * 0.5 + 0.15));
  const ang = -PI / 2 + ((n + f) * PI) / 2;
  p.line(DIAL.x, DIAL.y, DIAL.x + Math.cos(ang) * (DIAL.r - 10), DIAL.y + Math.sin(ang) * (DIAL.r - 10), INK, 4);
  p.disc(DIAL.x, DIAL.y, 4 + 2 * bump(t, n * 0.5, n * 0.5 + 0.2), INK);
  for (let i = 0; i < LEDGER.length; i++) {
    const ts = LEDGER[i];
    if (t < ts) continue;
    p.disc(DIAL.x, DIAL.y + 62 + i * 22, 6 * (1 + 0.6 * bump(t, ts, ts + 0.4)), WARN, fo);
  }
}

const TICK_FLY = 0.6;
const actCol = (act: Act) => (act === 0 ? GREY : act === 1 ? IDLE : act === 2 ? INK : act === 4 ? ACCENT : WARN);
function drawTicker(p: Painter, t: number) {
  const fo = fadeOut(t), fold = ease(1 - fo);
  p.line(TICK_X0 - 14, TICK_Y, TICK_X0 + TICKER.length * TICK_DX, TICK_Y, EDGE, 2);
  if (t < TICK_T0 - TICK_FLY) return;
  const open = eyeOpen(t), ey = EYE.y + EYE_HH * 0.5 * open;
  for (let i = 0; i < TICKER.length; i++) {
    const ts = ticker_t(i);
    if (t < ts - TICK_FLY) break;
    const act = TICKER[i], col = actCol(act), x = lerp(TICK_X0 + i * TICK_DX, TICK_X0, fold);
    if (t < ts) {
      // in flight: released from the iris, arcing down to its slot on the audit rail
      const q = ease(seg(t, ts - TICK_FLY, ts)), u = 1 - q;
      const cx = lerp(EYE.x, x, 0.85), cy = ey + 40;
      const px = u * u * EYE.x + 2 * u * q * cx + q * q * x;
      const py = u * u * ey + 2 * u * q * cy + q * q * TICK_Y;
      p.disc(px, py, 3 + 3 * q, col, 0.4 + 0.6 * q);
      continue;
    }
    const sc = 1 + 0.6 * bump(t, ts, ts + 0.3);
    if (act === 5) p.rrect(x - 6 * sc, TICK_Y - 6 * sc, 12 * sc, 12 * sc, 3, col, fo);
    else p.disc(x, TICK_Y, 6 * sc, col, fo);
  }
}

/* ───────────────────────────── the Eye ───────────────────────────── */
const BLINKS = [31.2, 47.3, 62.7, 77.4, 92.3, 104.5];
function eyeOpen(t: number) {
  let open = ease(seg(t, EYE_OPEN0, EYE_OPEN1)) * (1 - ease(seg(t, EYE_CLOSE0, EYE_CLOSE1)));
  for (const b of BLINKS) open *= 1 - 0.95 * bump(t, b, b + 0.3);
  return open;
}

function drawEye(p: Painter, t: number, fx: number, fy: number) {
  const c = p.ctx;
  const open = eyeOpen(t);
  if (open <= 0.02) {
    c.strokeStyle = css(LOCK, 1);
    c.lineWidth = 4;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(EYE.x - EYE_HW, EYE.y);
    c.quadraticCurveTo(EYE.x, EYE.y + 26, EYE.x + EYE_HW, EYE.y);
    c.stroke();
    return;
  }
  const hh = EYE_HH * open;
  c.save();
  c.beginPath();
  c.moveTo(EYE.x - EYE_HW, EYE.y);
  c.quadraticCurveTo(EYE.x, EYE.y - 2 * hh, EYE.x + EYE_HW, EYE.y);
  c.quadraticCurveTo(EYE.x, EYE.y + 2 * hh, EYE.x - EYE_HW, EYE.y);
  c.closePath();
  c.fillStyle = css(IRIS_BG, 1);
  c.fill();
  c.strokeStyle = css(LOCK, 1);
  c.lineWidth = 4;
  c.stroke();
  c.clip();
  const dx = fx - EYE.x, dy = fy - EYE.y, dl = Math.hypot(dx, dy) || 1;
  const look = Math.min(24, dl * 0.07);
  const ix = EYE.x + (dx / dl) * look, iy = EYE.y + (dy / dl) * look * 0.5;
  let scan = 0;
  for (const e of IN_EYE) scan += bump(t, e.t0 - 0.1, e.t1 + 0.1);
  p.disc(ix, iy, 44, ACCENT);
  p.disc(ix, iy, 16 + 8 * scan, GROUND);
  c.restore();
}

/** Readout under the Eye while a report is inside: priority ×4, department ×7, confidence vs 0.7. */
function drawReadout(p: Painter, t: number) {
  for (const e of IN_EYE) {
    const ra = seg(t, e.t0, e.t0 + 0.12) * (1 - seg(t, e.t1, e.t1 + 0.12));
    if (ra <= 0) continue;
    const k = e.k, g = seg(t, e.t0, e.t0 + 0.45);
    for (let j = 0; j < 4; j++) {
      const on = j <= PRI[k] && g * 4 > j;
      p.rrect(CX - 66 + j * 36, 474, 26, 12, 6, on ? (PRI[k] === 3 ? ACCENT : INK) : EDGE, ra);
    }
    for (let j = 0; j < 7; j++) {
      const on = j === DEPT[k] && CONF[k] >= 0.7 && g > 0.6;
      p.rrect(CX - 110 + j * 32, 498, 24, 10, 5, on ? INK : EDGE, ra);
    }
    const mx0 = CX - 60, mw = 120, my = 522;
    p.line(mx0, my, mx0 + mw, my, EDGE, 4, ra);
    p.line(mx0 + mw * 0.7, my - 8, mx0 + mw * 0.7, my + 8, LOCK, 2, ra);
    const f = CONF[k] * easeOut(seg(t, e.t0 + 0.1, e.t0 + 0.5));
    if (f > 0) p.line(mx0, my, mx0 + mw * f, my, CONF[k] >= 0.7 ? INK : WARN, 4, ra);
  }
}

/* ───────────────────────────── fx, focus, camera ───────────────────────────── */
function drawEcho(p: Painter, e: Echo, t: number) {
  const q = seg(t, e.t, e.t + 0.8);
  if (q <= 0 || q >= 1) return;
  p.arc(e.x, e.y, e.r + 32 * easeOut(q), 0, PI * 2, e.c, 3, 0.8 * (1 - q));
}

function focus(states: Out[], t: number) {
  let sx = CX * 0.35, sy = 560 * 0.35, sw = 0.35;
  for (let k = 0; k < N_ALL; k++) {
    const s = states[k];
    const w = s.busy * s.a;
    if (w <= 0) continue;
    sx += s.x * w;
    sy += s.y * w;
    sw += w;
  }
  const w0 = 0.8 * seg(t, BREACH, BREACH + 0.5) * (1 - seg(t, RES0 + 0.5, RES0 + 1));
  if (w0 > 0) {
    sx += states[0].x * w0;
    sy += states[0].y * w0;
    sw += w0;
  }
  if (t >= TICK_T0 && t <= TICK_END) {
    const i = Math.min(TICKER.length - 1, Math.floor((t - TICK_T0) / TICK_DT));
    sx += (TICK_X0 + i * TICK_DX) * 1.5;
    sy += TICK_Y * 1.5;
    sw += 1.5;
  }
  return { x: sx / sw, y: sy / sw };
}

// [in0, in1, out0, out1, zoom, anchor x, anchor y]: Screen (web port), Classify (Eye), Escalate (rails), Dispute (lane 1)
const SHOTS: [number, number, number, number, number, number, number][] = [
  [16.8, 19.0, 22.9, 24.8, 0.08, 480, 430],
  [26, 28.5, 35.5, 38, 0.06, 800, 400],
  [58, 60.5, 66, 68.5, 0.07, 620, 600],
  [84.4, 86.6, 95.6, 98.2, 0.06, 620, 560],
];
function camera(t: number) {
  let w = 0, ax = 0, ay = 0;
  for (const [a0, a1, b0, b1, z, x, y] of SHOTS) {
    if (t <= a0 || t >= b1) continue;
    const wi = z * ease(seg(t, a0, a1)) * (1 - ease(seg(t, b0, b1)));
    w += wi;
    ax += x * wi;
    ay += y * wi;
  }
  if (w <= 0.0005) return null;
  return { z: 1 + w, ax: ax / w, ay: ay / w };
}

/** The supporting cast steps back while one complaint carries the chapter (Escalate: T0, Dispute: T7). */
function solo(t: number) {
  const e = 0.4 * ease(seg(t, 55.0, 56.4)) * (1 - ease(seg(t, 68.2, 69.6)));
  const d = 0.45 * ease(seg(t, 84.5, 85.8)) * (1 - ease(seg(t, 96.4, 97.8)));
  return { k: e > 0 ? 0 : 7, dim: Math.max(e, d) };
}

/* ───────────────────────────── draw ───────────────────────────── */
function draw(p: Painter, t: number, view: View) {
  const states: Out[] = [];
  for (let k = 0; k < N_ALL; k++) states.push(evalAt(k, t));
  const so = solo(t);
  if (so.dim > 0) for (let k = 0; k < N; k++) if (k !== so.k) states[k].a *= 1 - so.dim;
  const F = focus(states, t);
  p.dots(
    view, INK, 0.07,
    (x, y) => {
      const f = Math.max(0, 1 - Math.hypot(x - F.x, y - F.y) / 320);
      let s = 0.12 * f * f;
      for (const e of ECHOES) if (e.rip) s += ripple(t, e.t, e.x, e.y, x, y);
      return s;
    },
    mix(INK, ACCENT, 0.6),
  );
  const cam = camera(t);
  const c = p.ctx;
  if (cam) {
    c.save();
    c.translate(cam.ax, cam.ay);
    c.scale(cam.z, cam.z);
    c.translate(-cam.ax, -cam.ay);
  }
  drawLanes(p, t);
  drawStaff(p, t);
  drawCitizens(p, t);
  drawPorts(p, t);
  drawDial(p, t);
  drawTicker(p, t);
  drawEye(p, t, F.x, F.y);
  drawReadout(p, t);
  const order = [...Array(N_ALL).keys()].sort((a, b) => states[a].busy - states[b].busy);
  for (const k of order) drawToken(p, k, states[k], t);
  for (const e of ECHOES) drawEcho(p, e, t);
  if (cam) c.restore();
}

export const argus: FilmDef = {
  ground: "#3b0d36",
  loop: LOOP,
  still: 65.5,
  chapters: [
    { label: "Report", range: [0, 13] },
    { label: "Screen", range: [13, 25] },
    { label: "Classify", range: [25, 40] },
    { label: "Clock", range: [40, 54] },
    { label: "Escalate", range: [54, 70] },
    { label: "Verify", range: [70, 84] },
    { label: "Dispute", range: [84, 100] },
    { label: "Ledger", range: [100, 112] },
  ],
  draw,
};
