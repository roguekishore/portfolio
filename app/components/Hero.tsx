"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { studio, type MediaVariant } from "@/lib/content";
import Media from "./Media";
import { GlassButton, PlayPause } from "./bits";
import { useUI } from "./ui";

gsap.registerPlugin(ScrollTrigger, SplitText);

const REEL: { variant: MediaVariant; tint?: string; mark?: string; markColor?: string }[] = [
  { variant: "curve" },
  { variant: "glow", mark: "lumen", markColor: "#ff6a1a" },
  { variant: "rays" },
  { variant: "rings", mark: "halden", markColor: "#f6e9f2" },
  { variant: "dots", mark: "pebble", markColor: "#d8ff5a" },
  { variant: "tiles" },
  { variant: "wave", mark: "wayfare", markColor: "#062b14" },
];

// Cuts between scenes like an edit; pausing freezes both the cut and the scene.
function Reel({ paused, interval = 2800 }: { paused: boolean; interval?: number }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI((n) => (n + 1) % REEL.length), interval);
    return () => clearInterval(id);
  }, [paused, interval]);
  const clip = REEL[i];
  return <Media key={i} {...clip} paused={paused} />;
}

// Scroll range of the pinned showreel (measured on the reference): the scrub
// starts 150px in and ends when the 200lvh section releases its sticky child.
const SCRUB_START = 150;

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const mask = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const introWrap = useRef<HTMLDivElement>(null);
  const introP = useRef<HTMLParagraphElement>(null);
  const [paused, setPaused] = useState(false);
  const { open, overlay } = useUI();

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline fades over the first 150px, before the mask starts moving.
      gsap.to("[data-hero-fade]", {
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: section.current, start: "top top", end: `+=${SCRUB_START}`, scrub: true },
      });

      const clipEnd = () => {
        const h = mask.current!.offsetHeight;
        const banner = spacer.current!.offsetTop + spacer.current!.offsetHeight;
        return `inset(8px 8px ${h - banner}px 8px round 4px)`;
      };

      document.fonts.ready.then(() => {
        SplitText.create(introP.current, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            // A staggered from() only pre-renders the first target inside a
            // scrubbed timeline, so set the hidden state explicitly.
            gsap.set(self.lines, { yPercent: 100 });
            const tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: section.current,
                start: `top+=${SCRUB_START} top`,
                end: "bottom bottom",
                scrub: true,
                invalidateOnRefresh: true,
              },
            });
            tl.fromTo(mask.current, { clipPath: "inset(0px 0px 0px 0px round 0px)" }, { clipPath: clipEnd, duration: 1 }, 0)
              .fromTo(inner.current, { yPercent: 0 }, { yPercent: -37.5, duration: 1 }, 0)
              .fromTo(introWrap.current, { y: () => window.innerHeight * 0.75 }, { y: 0, duration: 1 }, 0)
              // each line rises through its mask; ~150px of scroll each, 50px apart
              .to(self.lines, { yPercent: 0, ease: "power3.out", duration: 0.2, stagger: 0.0667 }, 0.613);
            return tl;
          },
        });
      });
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section id="intro" ref={section} className="relative h-[200lvh]">
      <div className="sticky top-0 h-[100svh]">
        {/* full-bleed media layer (escapes the page gutter) */}
        <div className="pointer-events-none absolute inset-y-0 -inset-x-4 z-10">
          <div
            ref={mask}
            onClick={() => open("reel")}
            data-cursor="Play reel"
            className="pointer-events-auto absolute inset-0 cursor-pointer overflow-hidden bg-black will-change-transform md:cursor-none"
            style={{ clipPath: "inset(0px 0px 0px 0px round 0px)" }}
          >
            <div ref={inner} className="absolute inset-0 animate-[fade-in_.6s_linear_1.5s_both] will-change-transform">
              <Reel paused={paused || overlay === "reel"} />
            </div>
            <PlayPause paused={paused} onToggle={() => setPaused((p) => !p)} className="absolute right-2 bottom-2 z-10 hidden md:block" />
            <div className="absolute top-1/2 left-1/2 -mt-6 -translate-x-1/2 -translate-y-1/2 md:hidden">
              <GlassButton label="Play reel" className="h-auto rounded-xs p-4 sm:h-auto">
                <svg viewBox="0 0 10 10" className="h-[10px] w-[10px] fill-white" aria-hidden><path d="M2.5 1.5v7l6-3.5z" /></svg>
              </GlassButton>
            </div>
          </div>

          <div className="absolute bottom-23 w-full animate-fade-in-1300 px-4 mix-blend-exclusion md:bottom-6">
            <div className="md:grid md:grid-cols-16 md:gap-x-2">
              <div className="md:col-span-6 md:pl-3">
                <h1 className="t-display">
                  <span data-hero-fade>{studio.headline[0]}</span>
                </h1>
                <p className="t-display text-grey">
                  <span data-hero-fade>{studio.headline[1]}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* content that the showreel shrinks away from */}
        <div className="absolute inset-0 flex flex-col pt-2 pb-10 md:pb-0">
          <div ref={spacer} className="pointer-events-none -mx-2 aspect-[377/250] md:aspect-[1496/216]" />
          <div className="grid grid-cols-8 gap-x-2 pt-10 md:grid-cols-16">
            <div className="col-span-8">
              <div ref={introWrap} className="pt-4 md:pt-0 md:pl-3" style={{ transform: "translateY(75svh)" }}>
                <p ref={introP} className="t-heading">
                  {studio.intro.lead} <span className="text-grey">{studio.intro.tail}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ReelPlayer />
    </section>
  );
}

// Fullscreen-ish player opened from the hero (glass backdrop, 16:9 frame).
function ReelPlayer() {
  const { overlay, close } = useUI();
  const isOpen = overlay === "reel";
  return (
    <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={close} data-cursor="Close">
      <div className="glass-medium absolute inset-0 bg-black/60" />
      <div className="absolute inset-0 flex items-center px-4">
        <div className="grid w-full grid-cols-8 gap-x-2 md:grid-cols-16">
          <div className="col-span-8 md:col-span-12 md:col-start-3">
            <div className="relative aspect-video overflow-hidden rounded-sm md:cursor-none md:rounded-md">
              {isOpen && <Reel paused={false} interval={2200} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
