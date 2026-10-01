"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { routeLabel, type Visual } from "@/lib/content";
import Media from "./Media";

gsap.registerPlugin(ScrollTrigger);

// Timings measured on the reference (SPEC.md › Page transitions).
const PRESS_DELAY = 0.12; // the press state shows before the panel moves
const COVER = 0.45; // panel rises from the bottom, ease-out
const MIN_HOLD = 0.7; // label + progress counter
const REVEAL = 0.38; // panel lifts off, new page slides up

type Labels = { from: string; to: string; descriptor: string };
type MorphRequest = { el: HTMLElement; visual: Visual; href: string };

type Api = { go: (href: string) => void; morph: (m: MorphRequest) => void };
const Ctx = createContext<Api | null>(null);

export function useTransition() {
  return useContext(Ctx);
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const clone = useRef<HTMLDivElement>(null);
  const pending = useRef<{ href: string; kind: "wipe" | "morph"; readyAt: number } | null>(null);
  const [labels, setLabels] = useState<Labels | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [morphVisual, setMorphVisual] = useState<Visual | null>(null);

  const arrive = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const go = useCallback(
    (href: string) => {
      if (pending.current || href === pathname) return;
      const from = routeLabel(pathname);
      const to = routeLabel(href);
      setLabels({ from: from.label, to: to.label, descriptor: to.descriptor });
      document.documentElement.dataset.transitioning = "";
      setProgress(null);
      pending.current = { href, kind: "wipe", readyAt: Infinity };
      gsap.killTweensOf(panel.current);
      gsap.set(panel.current, { yPercent: 100, autoAlpha: 1 });
      gsap.to(panel.current, {
        yPercent: 0,
        duration: COVER,
        delay: PRESS_DELAY,
        ease: "expo.out",
        onComplete: () => {
          if (!pending.current) return;
          pending.current.readyAt = performance.now() + MIN_HOLD * 1000;
          const counter = { v: 0 };
          gsap.to(counter, { v: 100, duration: MIN_HOLD, ease: "power1.inOut", onUpdate: () => setProgress(Math.round(counter.v)) });
          router.push(href, { scroll: false });
        },
      });
    },
    [pathname, router],
  );

  const morph = useCallback(
    ({ el, visual, href }: MorphRequest) => {
      if (pending.current) return;
      // Only the desktop layout has a hero slot to fly into.
      if (!matchMedia("(min-width: 52.125rem)").matches) return go(href);
      const r = el.getBoundingClientRect();
      const x = 16 + 320 + 16;
      const w = document.documentElement.clientWidth - x - 16;
      pending.current = { href, kind: "morph", readyAt: Infinity };
      document.documentElement.dataset.transitioning = "";
      setMorphVisual(visual);
      requestAnimationFrame(() => {
        const node = clone.current!;
        gsap.set(node, { autoAlpha: 1, left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 4 });
        gsap.to(node, {
          left: x,
          top: 16,
          width: w,
          height: (w * 9) / 16,
          borderRadius: 6,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            if (!pending.current) return;
            pending.current.readyAt = performance.now() + 120;
            router.push(href, { scroll: false });
          },
        });
      });
    },
    [go, router],
  );

  // The new route has committed: finish whichever transition is running.
  useEffect(() => {
    const p = pending.current;
    if (!p || pathname !== p.href.split("?")[0]) return;
    const wait = Math.max(0, p.readyAt - performance.now());
    const id = setTimeout(() => {
      arrive();
      const main = document.getElementById("main");
      if (p.kind === "wipe") {
        setProgress(100);
        gsap.to(panel.current, { yPercent: -100, duration: REVEAL, ease: "power2.inOut", onComplete: () => gsap.set(panel.current, { autoAlpha: 0 }) });
        if (main) gsap.fromTo(main, { y: window.innerHeight * 0.12 }, { y: 0, duration: REVEAL + 0.1, ease: "expo.out", clearProps: "transform", onComplete: () => ScrollTrigger.refresh() });
      } else {
        gsap.to(clone.current, { autoAlpha: 0, duration: 0.2, delay: 0.1, onComplete: () => setMorphVisual(null) });
        ScrollTrigger.refresh();
      }
      pending.current = null;
      delete document.documentElement.dataset.transitioning;
    }, wait);
    return () => clearTimeout(id);
  }, [pathname, arrive]);

  return (
    <Ctx.Provider value={{ go, morph }}>
      {children}

      {/* loader wipe */}
      <div ref={panel} className="invisible fixed inset-0 z-[150] bg-black" aria-hidden>
        {labels && (
          <div className="t-label absolute top-1/2 right-0 left-0 flex -translate-y-1/2 items-center px-4 md:px-8">
            <span className="w-[92px] text-grey">{progress === null ? labels.from : `${progress}%`}</span>
            <span className="text-white">{labels.to}</span>
            <span className="ml-auto hidden text-grey sm:block">{labels.descriptor}</span>
          </div>
        )}
      </div>

      {/* next-project media flying into the hero slot */}
      <div ref={clone} className="invisible fixed z-[140] overflow-hidden" aria-hidden>
        {morphVisual && <Media {...morphVisual} />}
      </div>
    </Ctx.Provider>
  );
}

type LinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

// next/link that routes through the transition. "#" and modified clicks fall
// through to the browser.
export function TLink({ href, onClick, ...rest }: LinkProps) {
  const t = useContext(Ctx);
  // Hash links to homepage sections ("/#about") stay plain anchors so the
  // browser scrolls to them, from any page.
  if (href.startsWith("#") || href.startsWith("/#")) return <a href={href} onClick={onClick} {...rest} />;
  return (
    <Link
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !t || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        t.go(href);
      }}
    />
  );
}
