"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "./bits";

// Glass label that replaces the pointer over elements with `data-cursor`
// (md+ fine pointers only). Position is eased toward the pointer each frame.
export default function Cursor() {
  const el = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const pathname = usePathname();

  // A new route has no element under the pointer yet.
  useEffect(() => setLabel(null), [pathname]);

  useEffect(() => {
    if (!matchMedia("(pointer: fine) and (min-width: 52.125rem)").matches) return;
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { ...target };
    let raf = 0;
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.35;
      pos.y += (target.y - pos.y) * 0.35;
      if (el.current) el.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    const pick = (el: Element | null) => {
      const hit = el?.closest?.("[data-cursor]");
      setLabel(hit ? hit.getAttribute("data-cursor") : null);
    };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      pick(e.target as Element | null);
    };
    // Content moves under a still pointer while scrolling; re-test the hit.
    const onScroll = () => pick(document.elementFromPoint(target.x, target.y));
    const onLeave = () => setLabel(null);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={el} data-cursor-root className="pointer-events-none fixed top-0 left-0 z-[500] hidden select-none md:block" aria-hidden>
      <div className={`glass-strong flex flex-row-reverse items-center gap-x-2 rounded-xs bg-black/20 p-[6px] whitespace-nowrap text-white transition-[opacity,scale] duration-[167ms] ease-linear ${label ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}>
        <span className="t-label">{label}</span>
        <Arrow />
      </div>
    </div>
  );
}
