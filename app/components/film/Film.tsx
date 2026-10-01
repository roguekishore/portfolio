"use client";

import { useEffect, useRef } from "react";
import { FILMS, type FilmId } from "./index";
import { Painter, VH, VW, seg } from "./kit";

// Core region every film keeps in frame; anything outside it is ground and dots.
const CORE_W = 1360;
const CORE_H = 800;
// Fade through the ground colour when a single chapter loops back to its start.
const VEIL = 0.45;

type Props = {
  id: FilmId;
  /** Loop a single chapter instead of the whole film. */
  chapter?: number;
  paused?: boolean;
  /** Draw one representative frame and never animate (tiny thumbnails). */
  still?: boolean;
  className?: string;
};

// Canvas player for the project films. Each film is a pure function of time,
// so pausing just stops the clock, and offscreen players don't run at all.
export default function Film({ id, chapter, paused = false, still = false, className = "" }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const film = FILMS[id];
    const range = chapter !== undefined ? film.chapters[chapter]?.range : undefined;
    const painter = new Painter(ctx);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0, H = 0, dpr = 1;
    let elapsed = 0, last: number | null = null, raf = 0, onScreen = false;

    const timeAt = (e: number) => {
      if (!range) return { t: e % film.loop, veil: 0 };
      const len = range[1] - range[0];
      const u = e % len;
      return { t: range[0] + u, veil: 1 - Math.min(seg(u, 0, VEIL), 1 - seg(u, len - VEIL, len)) };
    };
    const stillTime = () => {
      if (!range) return { t: film.still, veil: 0 };
      // Late in the chapter, once its event has played out.
      return { t: range[0] + (range[1] - range[0]) * 0.72, veil: 0 };
    };

    const draw = ({ t, veil }: { t: number; veil: number }) => {
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = film.ground;
      ctx.fillRect(0, 0, W, H);
      const s = Math.min(W / CORE_W, H / CORE_H);
      const ox = (W - VW * s) / 2, oy = (H - VH * s) / 2;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      film.draw(painter, t, { x0: -ox / s, y0: -oy / s, x1: (W - ox) / s, y1: (H - oy) / s });
      if (veil > 0.001) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = veil;
        ctx.fillStyle = film.ground;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    };

    // Verification hook: `?film-t=<seconds>` freezes every film at that time.
    const forcedRaw = new URLSearchParams(window.location.search).get("film-t");
    const forced = forcedRaw !== null && Number.isFinite(Number(forcedRaw)) ? ((Number(forcedRaw) % film.loop) + film.loop) % film.loop : null;

    const frozen = () => still || reduce.matches || forced !== null;
    const paint = () => draw(forced !== null ? { t: forced, veil: 0 } : frozen() ? stillTime() : timeAt(elapsed));

    const tick = (now: number) => {
      if (last !== null) elapsed += Math.min(0.1, (now - last) / 1000);
      last = now;
      draw(timeAt(elapsed));
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    };
    const sync = () => {
      const run = onScreen && !pausedRef.current && !frozen() && !document.hidden;
      if (run && !raf) raf = requestAnimationFrame(tick);
      else if (!run && raf) {
        stop();
        paint();
      }
    };
    kick.current = sync;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      // Thumbnails don't need retina backing stores.
      dpr = Math.min(window.devicePixelRatio || 1, r.width < 200 ? 1 : 2);
      W = r.width;
      H = r.height;
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
      paint();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    }, { rootMargin: "100px" });
    io.observe(cv);
    const onVis = () => sync();
    const onReduce = () => {
      paint();
      sync();
    };
    document.addEventListener("visibilitychange", onVis);
    reduce.addEventListener("change", onReduce);
    resize();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", onReduce);
      kick.current = () => {};
    };
  }, [id, chapter, still]);

  useEffect(() => {
    pausedRef.current = paused;
    kick.current();
  }, [paused]);

  return <canvas ref={canvas} className={`absolute inset-0 h-full w-full ${className}`} style={{ background: FILMS[id].ground }} aria-hidden />;
}
