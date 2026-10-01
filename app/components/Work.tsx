"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { projects, type Project } from "@/lib/content";
import Media from "./Media";
import { Arrow, BracketLabel, PlayPause } from "./bits";
import { TLink } from "./Transition";

gsap.registerPlugin(ScrollTrigger);

export default function Work() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]");
      cards.forEach((card, i) => {
        ScrollTrigger.create({
          trigger: card,
          start: "top 50%",
          end: "bottom 50%",
          onToggle: (self) => self.isActive && setActive(i),
        });
      });
    }, root);
    // md+: the sticky column is scrubbed in while the first card's top travels
    // from 39% to 22% of the viewport (scroll ~1450 → 1600 on the reference).
    const mm = gsap.matchMedia();
    mm.add("(min-width: 52.125rem)", () => {
      gsap.fromTo(
        root.current!.querySelectorAll("[data-work-fade]"),
        { opacity: 0 },
        { opacity: 1, ease: "none", scrollTrigger: { trigger: root.current!.querySelector("[data-card]"), start: "top 39%", end: "top 22%", scrub: true } },
      );
    });
    return () => {
      ctx.revert();
      mm.revert();
    };
  }, []);

  return (
    <section id="work" ref={root} className="pb-16 md:pb-40">
      <div className="grid grid-cols-8 gap-x-2 md:grid-cols-16">
        <div className="col-span-8 pb-8 md:col-span-6 md:pb-0">
          <div className="pointer-events-none flex flex-col gap-y-3 md:sticky md:top-0 md:-mt-[100svh] md:h-[100svh] md:pt-[30svh] md:pb-6">
            <div className="pointer-events-auto flex flex-col md:pl-3">
              <h2 data-work-fade className="t-heading">Our work</h2>
              <ProjectName active={active} />
            </div>
            <div data-work-fade className="mt-auto hidden flex-col gap-y-12 md:flex md:pl-3">
              <div className="relative grid grid-cols-6 gap-x-2">
                {projects.map((p, i) => (
                  <p
                    key={p.slug}
                    className={`t-body col-span-4 text-grey transition-opacity duration-[167ms] ease-linear ${i === active ? "relative opacity-100 delay-[333ms]" : "absolute bottom-0 left-0 opacity-0 delay-0"}`}
                    style={{ width: i === active ? undefined : "66.6%" }}
                  >
                    {p.description}
                  </p>
                ))}
              </div>
              <div className="relative h-10">
                {projects.map((p, i) => (
                  <Meta key={p.slug} project={p} shown={i === active} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-8 md:col-span-10">
          <div className="flex flex-col gap-y-6 md:gap-y-3">
            {projects.map((p, i) => (
              <Card key={p.slug} project={p} active={i === active} />
            ))}
            <div className="hidden md:block">
              <TLink href="/work" className="group block">
                <div className="flex aspect-[922/168] items-end justify-end overflow-hidden rounded-md bg-white/10 p-9">
                  <BracketLabel>View all projects</BracketLabel>
                </div>
              </TLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Client name under "Our work": outgoing name exits upward fast, incoming
// characters rise from below with a small stagger.
function ProjectName({ active }: { active: number }) {
  return (
    <div data-work-fade className="relative hidden h-[42px] overflow-hidden md:block">
      {projects.map((p, i) => {
        const state = i === active ? "in" : i < active ? "above" : "below";
        return (
          <p key={p.slug} className="t-heading absolute bottom-0 left-0 whitespace-nowrap text-grey" aria-hidden={state !== "in"}>
            {[...p.client].map((ch, c) => (
              <span
                key={c}
                className="inline-block"
                style={{
                  transform: state === "in" ? "translateY(0)" : state === "above" ? "translateY(-100%)" : "translateY(100%)",
                  transition:
                    state === "in"
                      ? `transform 333ms var(--ease-text-in) ${150 + c * 18}ms`
                      : "transform 133ms var(--ease-text-out) 0ms",
                }}
              >
                {ch === " " ? " " : ch}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Meta({ project, shown }: { project: Project; shown: boolean }) {
  return (
    <div className={`absolute bottom-0 left-0 flex items-center gap-x-4 transition-opacity duration-[167ms] ease-linear ${shown ? "opacity-100 delay-[333ms]" : "opacity-0 delay-0"}`}>
      <div className="relative h-10 w-10 overflow-hidden rounded-xs bg-off-black">
        <Media variant={project.media} tint={project.tint} src={project.src} sizes="80px" />
      </div>
      <div className="flex flex-col gap-y-[7px]">
        <p className="t-small text-white">{project.title}</p>
        <p className="t-chip text-grey">
          {project.year}, {project.sector}
        </p>
      </div>
    </div>
  );
}

function Card({ project, active }: { project: Project; active: boolean }) {
  const [paused, setPaused] = useState(false);
  return (
    <div id={`work-${project.slug}`} data-card>
      <TLink
        href={`/projects/${project.slug}`}
        data-cursor="View case"
        className={`flex flex-col gap-y-3 transition-opacity duration-[167ms] ease-linear md:cursor-none ${active ? "md:opacity-100" : "md:opacity-20"}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-off-black sm:aspect-video">
          <Media variant={project.media} tint={project.tint} mark={project.mark} markColor={project.markColor} src={project.src} paused={paused} />
          <PlayPause paused={paused} onToggle={() => setPaused((p) => !p)} className="absolute right-2 bottom-2 z-10" />
        </div>
        <div className="flex items-start justify-between md:hidden">
          <div>
            <p className="t-small">{project.client}</p>
            <p className="t-small text-grey">{project.title}</p>
          </div>
          <Arrow className="mt-1 text-grey" />
        </div>
      </TLink>
    </div>
  );
}
