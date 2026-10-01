// Shared toolkit for the project films: easing, colour and a small canvas painter.
// Every film draws on a virtual 1600×1000 stage; the player fits it to the frame.

export type RGB = readonly [number, number, number];

export const VW = 1600;
export const VH = 1000;
export const CX = VW / 2;
export const PI = Math.PI;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeSine = (x: number) => 0.5 - 0.5 * Math.cos(PI * x);
export const easeOutQuad = (x: number) => 1 - (1 - x) * (1 - x);
/** 0 → 1 → 0 over [a, b]. */
export const bump = (t: number, a: number, b: number) => Math.sin(PI * seg(t, a, b));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const mix = (a: RGB, b: RGB, p: number): RGB =>
  p <= 0 ? a : p >= 1 ? b : [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
export const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Monochrome steps between the ground and the ink, for tracks, outlines and idle shapes. */
export function tones(ground: RGB, ink: RGB) {
  return {
    edge: mix(ground, ink, 0.14),
    idle: mix(ground, ink, 0.22),
    lock: mix(ground, ink, 0.34),
    grey: mix(ground, ink, 0.55),
  };
}

/** Visible region of the stage in virtual units (wider or taller than 1600×1000 when letterboxed). */
export type View = { x0: number; y0: number; x1: number; y1: number };

export type Chapter = { label: string; range: [number, number] };

export type FilmDef = {
  ground: string;
  loop: number;
  /** Representative frame for stills (reduced motion, tiny thumbnails). */
  still: number;
  chapters: Chapter[];
  draw: (p: Painter, t: number, view: View) => void;
};

export class Painter {
  constructor(public ctx: CanvasRenderingContext2D) {}

  rrPath(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  rrect(x: number, y: number, w: number, h: number, r: number, col: RGB, a = 1) {
    if (a <= 0 || w <= 0 || h <= 0) return;
    this.ctx.fillStyle = css(col, a);
    this.rrPath(x, y, w, h, r);
    this.ctx.fill();
  }

  rstroke(x: number, y: number, w: number, h: number, r: number, col: RGB, width: number, a = 1) {
    if (a <= 0) return;
    this.ctx.strokeStyle = css(col, a);
    this.ctx.lineWidth = width;
    this.rrPath(x, y, w, h, r);
    this.ctx.stroke();
  }

  line(x1: number, y1: number, x2: number, y2: number, col: RGB, width: number, a = 1) {
    if (a <= 0) return;
    const c = this.ctx;
    c.strokeStyle = css(col, a);
    c.lineWidth = width;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  arc(x: number, y: number, r: number, from: number, sweep: number, col: RGB, width: number, a = 1) {
    if (a <= 0 || r <= 0) return;
    const c = this.ctx;
    c.strokeStyle = css(col, a);
    c.lineWidth = width;
    c.lineCap = "round";
    c.beginPath();
    c.arc(x, y, r, from, from + sweep);
    c.stroke();
  }

  disc(x: number, y: number, r: number, col: RGB, a = 1) {
    if (a <= 0 || r <= 0) return;
    const c = this.ctx;
    c.fillStyle = css(col, a);
    c.beginPath();
    c.arc(x, y, r, 0, PI * 2);
    c.fill();
  }

  /** Background dot grid. `lit` returns extra alpha (0..1) for a dot, e.g. a spotlight or ripple. */
  dots(view: View, ink: RGB, base: number, lit?: (x: number, y: number) => number, litCol?: RGB) {
    const c = this.ctx;
    const gap = 40;
    for (let y = Math.floor(view.y0 / gap) * gap; y < view.y1; y += gap) {
      for (let x = Math.floor(view.x0 / gap) * gap; x < view.x1; x += gap) {
        const extra = lit ? lit(x, y) : 0;
        c.fillStyle = extra > 0.005 && litCol ? css(litCol, Math.min(base + extra, base + 0.22)) : css(ink, base);
        c.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
  }
}

/** A ring sweeping outward through the dot grid after an event at time `t0`. */
export function ripple(t: number, t0: number, ex: number, ey: number, x: number, y: number) {
  const dt = t - t0;
  if (dt < 0 || dt > 1.4) return 0;
  const d = Math.hypot(x - ex, y - ey);
  return 0.12 * Math.max(0, 1 - Math.abs(d - easeOutCubic(dt / 1.4) * 800) / 50) * (1 - dt / 1.4);
}
