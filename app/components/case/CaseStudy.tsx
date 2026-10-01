"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { nextCopy, type CaseModule, type CaseStudy as CaseData, type Project, type Visual } from "@/lib/content";
import Media from "../Media";
import { Arrow, BracketLabel, PlayPause, UnderlineLink } from "../bits";
import { TLink, useTransition } from "../Transition";

gsap.registerPlugin(ScrollTrigger);

type Chapter = { id: string; label: string };

// Shared section frame for the introduction and chapter modules.
const FRAME = "grid grid-cols-8 gap-x-2 gap-y-9 border-t border-dark-grey pt-6 pb-3 md:grid-cols-12 md:gap-y-3 md:pt-3 md:pb-9";

export default function CaseStudy({ project, data, next, index, total }: { project: Project; data: CaseData; next: { project: Project; hero: Visual }; index: number; total: number }) {
  const chapters: Chapter[] = [
    { id: "introduction", label: "Overview" },
    ...data.modules.filter((m): m is Extract<CaseModule, { type: "chapter" }> => m.type === "chapter").map((m) => ({ id: m.id, label: m.label })),
  ];

  const content = useRef<HTMLDivElement>(null);
  const dim = useRef<HTMLDivElement>(null);

  // Desktop end-of-page: the content pins, slides left by its own width (1:1
  // with scroll) and dims, uncovering the footer fixed behind it; the footer
  // copy fades in and the next-project card grows to full size.
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 52.125rem)", () => {
      const el = content.current!;
      const width = () => document.getElementById("project-content")?.offsetWidth ?? 1057;
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "bottom bottom", end: () => `+=${width()}`, pin: true, scrub: true, invalidateOnRefresh: true },
        })
        .to(el, { x: () => -width(), duration: 1 }, 0)
        .fromTo(dim.current, { opacity: 0 }, { opacity: 0.55, duration: 1 }, 0)
        .fromTo("[data-footer-fade]", { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.45)
        .fromTo("[data-footer-media]", { scale: 0.67 }, { scale: 1, duration: 1 }, 0);
    });
    return () => mm.revert();
  }, []);

  return (
    <main id="main" className="relative">
      {/* content sits above the fixed footer; see the pin above */}
      <div ref={content} className="relative z-10 bg-black px-2 md:px-4">
        <div ref={dim} className="pointer-events-none absolute inset-0 z-20 hidden bg-black opacity-0 md:block" />
        <div className="flex flex-col gap-x-4 md:flex-row">
          <CaseNav project={project} chapters={chapters} credits={data.credits} />
          <div id="project-content" className="relative flex w-full flex-col gap-y-2 pb-2 md:py-4">
            {/* mobile: edge to edge from the top, under the back button */}
            <MediaFrame visual={data.hero} className="-mx-2 aspect-[4/5] md:mx-0 md:aspect-video" flush />
            <TitleBlock project={project} className="px-2 pt-4 pb-6 md:hidden" />
            <div className="flex flex-col gap-y-2 px-2 pb-8 md:hidden">
              {data.intro.body.map((p) => (
                <p key={p} className="t-body text-light-grey">{p}</p>
              ))}
            </div>
            <section id="introduction" className="hidden pt-1 md:block">
              <div className={FRAME}>
                <div className="col-span-8 px-2 md:col-span-6 md:pt-2 md:pl-6">
                  <h2 className="t-subhead md:max-w-90">{data.intro.heading}</h2>
                </div>
                <Body paragraphs={data.intro.body} />
              </div>
            </section>
            <div className="flex flex-col gap-y-2">
              {data.modules.map((m, i) => (
                <Module key={i} module={m} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <NextFooter next={next} index={index} total={total} />
    </main>
  );
}

function TitleBlock({ project, className = "" }: { project: Project; className?: string }) {
  return (
    <div className={`flex flex-col gap-y-4 ${className}`}>
      <div className="flex flex-col">
        <h1 className="t-subhead">{project.client}</h1>
        <p className="t-subhead text-grey">{project.title}</p>
      </div>
      <div className="t-label flex items-center gap-x-1 text-grey">
        <span>{project.sector}</span>
        <span className="mx-[2px] h-[2px] w-[2px] rounded-full bg-grey" />
        <span>{project.year}</span>
      </div>
    </div>
  );
}

function Body({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="col-span-8 flex flex-col gap-y-4 px-2 md:col-span-6 md:gap-y-6 md:pt-2 md:pl-0">
      <div className="flex flex-col gap-y-2 pb-3 md:pr-6">
        {paragraphs.map((p) => (
          <p key={p} className="t-body text-grey">{p}</p>
        ))}
      </div>
    </div>
  );
}

function Module({ module: m }: { module: CaseModule }) {
  switch (m.type) {
    case "chapter":
      return (
        <section id={m.id} className="pt-1">
          <div className={FRAME}>
            <div className="col-span-8 px-2 md:col-span-6 md:pt-2 md:pl-6">
              <h3 className="t-label text-grey">{m.label}</h3>
            </div>
            <div className="col-span-8 flex flex-col gap-y-4 px-2 md:col-span-6 md:gap-y-6 md:pt-2 md:pl-0">
              {m.heading && <h4 className="t-subhead -mt-1 text-white md:max-w-90">{m.heading}</h4>}
              <div className="flex flex-col gap-y-2 pb-3 md:pr-6">
                {m.body.map((p) => (
                  <p key={p} className="t-body text-grey">{p}</p>
                ))}
                {m.links?.map((l) => (
                  <div key={l.href} className="t-body text-grey">
                    <UnderlineLink href={l.href} className="transition-colors duration-[167ms] hover:text-white">{l.label}</UnderlineLink>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    case "media":
      return (
        <MediaFrame visual={m.visual} className="aspect-video">
          {m.caption && (
            <div className="absolute inset-0 z-[5] grid place-items-center bg-black/35 p-6">
              <div className="flex max-w-[360px] flex-col items-center gap-y-4 text-center">
                <p className="t-small text-white/90">{m.caption}</p>
                <span className="h-[5px] w-[5px] rounded-full bg-white/70" />
              </div>
            </div>
          )}
        </MediaFrame>
      );
    case "pair":
      return (
        <div className="flex gap-x-2">
          <MediaFrame visual={m.left} className="aspect-[4/5] w-1/2" />
          <MediaFrame visual={m.right} className="aspect-[4/5] w-1/2" />
        </div>
      );
    case "quote":
      return (
        <div className="grid grid-cols-8 gap-x-2 border-t border-b border-white/10 md:grid-cols-12">
          <div className="col-span-8 md:col-start-3">
            <div className="flex flex-col gap-y-9 px-3 py-16">
              <div className="flex flex-col items-center gap-y-3">
                <svg viewBox="0 0 8 7" className="mt-2 w-[8px] fill-white" aria-hidden>
                  <path d="M0 7V4.2C0 1.8 1.1.5 3.2 0l.4.9C2.5 1.3 1.9 2 1.8 3h1.6v4H0Zm4.4 0V4.2C4.4 1.8 5.5.5 7.6 0l.4.9C6.9 1.3 6.3 2 6.2 3h1.6v4H4.4Z" />
                </svg>
                <p className="t-subhead text-center text-white">{m.text}</p>
              </div>
              <div className="flex flex-col gap-y-[6px] text-center">
                <p className="t-label text-white">{m.name}</p>
                <p className="t-label text-grey">{m.role}</p>
              </div>
            </div>
          </div>
        </div>
      );
  }
}

// Rounded media cell; video visuals get the play/pause ring.
function MediaFrame({ visual, className = "", flush = false, children }: { visual: Visual; className?: string; flush?: boolean; children?: React.ReactNode }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute inset-0 overflow-hidden bg-off-black ${flush ? "md:rounded-md" : "rounded-md"}`}>
        <Media {...visual} paused={paused} />
        {children}
        {visual.video && <PlayPause paused={paused} onToggle={() => setPaused((p) => !p)} className="absolute right-2 bottom-2 z-10" />}
      </div>
    </div>
  );
}

// Sidebar (desktop) and bottom bar (mobile) share one scroll-spy.
function CaseNav({ project, chapters, credits }: { project: Project; chapters: Chapter[]; credits?: string }) {
  const [active, setActive] = useState(0);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      let idx = 0;
      chapters.forEach((c, i) => {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= 160) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [chapters]);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: "smooth" });
    setListOpen(false);
  };
  const atEnd = active === chapters.length - 1;

  return (
    <>
      <div className="hidden w-sidebar shrink-0 py-4 md:sticky md:top-0 md:block md:h-svh">
        <div className="flex h-full flex-col pt-12">
          <div className="flex flex-col gap-y-6">
            <div className="px-3 pt-9">
              <TitleBlock project={project} className="pt-6 pb-3" />
            </div>
            <div className="flex flex-col px-3">
              {chapters.map((c, i) => (
                <div key={c.id} className="relative py-2">
                  <button type="button" onClick={() => jump(c.id)} className="group block cursor-pointer text-left">
                    <span className={`absolute top-[17px] -left-3 h-[3px] w-[3px] rounded-full transition-transform duration-[333ms] ease-[cubic-bezier(0.38,0.02,0.41,0.98)] group-hover:scale-100 ${i === active ? "scale-100 bg-white" : "scale-0 bg-grey"}`} />
                    <h2 className={`t-body transition-colors duration-[167ms] ease-linear ${i === active ? "text-white" : "text-grey group-hover:text-white"}`}>{c.label}</h2>
                  </button>
                </div>
              ))}
            </div>
          </div>
          {credits && <div className="mt-auto">
            <div className={`origin-bottom-left transition-transform duration-[417ms] ease-[cubic-bezier(0.03,0,0,1)] ${atEnd ? "scale-100" : "scale-0"}`}>
              <div className="rounded-md bg-off-black p-3">
                <button type="button" onClick={() => setCreditsOpen((o) => !o)} className="flex w-full cursor-pointer items-center justify-between">
                  <span className="t-small">Thanks</span>
                  <span className={`t-label text-grey transition-transform duration-[250ms] ${creditsOpen ? "rotate-45" : ""}`}>+</span>
                </button>
                <p className={`t-small pt-3 text-grey ${creditsOpen ? "" : "line-clamp-2"}`}>{credits}</p>
              </div>
            </div>
          </div>}
        </div>
      </div>

      {/* mobile: current project + chapter, expandable list */}
      <div className="fixed inset-x-2 bottom-3 z-30 md:hidden">
        <div className={`glass-strong mb-1 overflow-hidden rounded-md bg-black/60 transition-[max-height,opacity] duration-[333ms] ease-[var(--ease-width)] ${listOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
          {chapters.map((c, i) => (
            <button key={c.id} type="button" onClick={() => jump(c.id)} className={`t-label block w-full px-4 py-3 text-left ${i === active ? "text-white" : "text-grey"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="glass-strong flex items-center gap-x-1 rounded-md bg-black/50 p-1">
          <span className="t-label grid h-[38px] place-items-center rounded-xs px-4 text-grey">{project.client}</span>
          <span className="t-label grid h-[38px] flex-1 place-items-center rounded-xs bg-white/10 px-4 text-white">{chapters[active].label}</span>
          <button type="button" onClick={() => setListOpen((o) => !o)} aria-label="Chapters" className="t-label grid h-[38px] w-[38px] place-items-center rounded-xs bg-white/5">
            <span className={`transition-transform duration-[250ms] ${listOpen ? "rotate-45" : ""}`}>+</span>
          </button>
        </div>
      </div>
    </>
  );
}

// Desktop: fixed behind the content and uncovered at the end of the page;
// clicking the media flies it into the next case study's hero slot.
function NextFooter({ next, index, total }: { next: { project: Project; hero: Visual }; index: number; total: number }) {
  const media = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const transition = useTransition();
  const href = `/projects/${next.project.slug}`;

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (leaving || !transition) return;
    if (!matchMedia("(min-width: 52.125rem)").matches) return transition.go(href);
    setLeaving(true);
    // The scrub owns these elements' inline opacity, so fade them the same way.
    gsap.to("[data-footer-fade]", { opacity: 0, duration: 0.45, ease: "none", overwrite: true });
    setTimeout(() => media.current && transition.morph({ el: media.current, visual: next.hero, href }), 520);
  };

  // Mobile has no scrub, so the leave fade there is a plain class.
  const leave = leaving ? "opacity-0 transition-opacity duration-[450ms] ease-linear" : "";
  const counter = `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;

  return (
    <>
      <div className="flex flex-col gap-x-4 bg-black md:fixed md:bottom-0 md:left-0 md:h-[79svh] md:w-full md:flex-row">
        <div className="shrink-0 md:w-sidebar" />
        <div className="w-full md:pl-8">
          <div className="flex h-full flex-col gap-y-6 overflow-hidden px-2 pt-10 pb-20 md:gap-y-0 md:pt-37 md:pr-4 md:pb-0 md:pl-7">
            <div data-footer-fade className={`flex flex-col gap-y-6 md:flex-row md:items-start md:gap-x-6 ${leave}`}>
              <div className="flex items-center justify-between md:w-full md:max-w-62">
                <h2 className="t-label text-grey">Next up</h2>
                <TLink href="/work" className="group md:hidden">
                  <BracketLabel>View all projects</BracketLabel>
                </TLink>
              </div>
              <TLink href={href} className="md:pr-[50px]">
                <span className="t-next flex flex-col">
                  <span>{next.project.client}</span>
                  <span className="text-grey">{next.project.title}</span>
                </span>
              </TLink>
            </div>
            <div className="flex gap-x-6 md:mt-auto">
              <div data-footer-fade className={`mt-auto hidden w-full flex-col gap-y-27 border-t border-white/10 py-4 md:flex ${leave}`}>
                <p className="t-small max-w-62">
                  {nextCopy.prompt}
                  <span className="block text-grey">{nextCopy.promptSub}</span>
                </p>
                <div className="flex">
                  <a href={nextCopy.cta.href} className="group glass-strong relative flex items-center overflow-hidden rounded-xs p-[14px]">
                    <span className="absolute inset-0 bg-white/5 transition-colors duration-[167ms] ease-linear group-hover:bg-white/10" />
                    <span className="t-label relative flex items-center gap-x-[6px] text-grey">
                      {nextCopy.cta.label} <Arrow />
                    </span>
                  </a>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-y-4 md:max-w-104">
                <div data-footer-fade className={`hidden items-center justify-between md:flex ${leave}`}>
                  <TLink href="/work" className="group">
                    <BracketLabel>View all projects</BracketLabel>
                  </TLink>
                  <p className="t-label text-grey">{counter}</p>
                </div>
                <a href={href} onClick={goNext} data-cursor="Next case" data-footer-media className="relative block aspect-[4/5] w-full origin-bottom-right overflow-hidden rounded-sm md:-mb-[75%] md:cursor-none">
                  <div ref={media} className="absolute inset-0">
                    <Media {...next.hero} />
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
