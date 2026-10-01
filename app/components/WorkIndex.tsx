"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { allProjects, categories, projectBySlug, projectCategories, workCopy, type Project } from "@/lib/content";
import Media from "./Media";
import { Arrow } from "./bits";
import { TLink } from "./Transition";
import { useUI } from "./ui";

// Card shapes per column, period 7 (SPEC.md › Work index › grid).
const COL1 = ["aspect-[4/5]", "aspect-[4/3]", "aspect-[4/5]", "aspect-[5/3]", "aspect-[4/3]", "aspect-[4/5]", "aspect-[5/3]"];
const COL2 = ["aspect-[5/3]", "aspect-[4/5]", "aspect-[5/3]", "aspect-[4/5]", "aspect-[4/3]", "aspect-[4/5]", "aspect-[4/3]"];

// Reads ?filter= and renders the index. Wrapped in <Suspense> by the page.
export function WorkIndexWithParams() {
  const params = useSearchParams();
  return <WorkIndex filter={params.get("filter")} />;
}

export default function WorkIndex({ filter }: { filter: string | null }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  // The grid fades out, swaps its contents, then fades back in.
  const [shownFilter, setShownFilter] = useState(filter);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (filter === shownFilter) return;
    setFading(true);
    const id = setTimeout(() => {
      setShownFilter(filter);
      setFading(false);
    }, 450);
    return () => clearTimeout(id);
  }, [filter, shownFilter]);

  const list = useMemo(
    () => (shownFilter ? allProjects.filter((p) => projectCategories[p.slug]?.includes(shownFilter)) : allProjects),
    [shownFilter],
  );
  const activeCategory = categories.find((c) => c.slug === filter);

  const choose = (slug: string | null) => {
    setPanelOpen(false);
    // let the selected option register before the panel leaves
    setTimeout(() => router.replace(slug ? `/work?filter=${slug}` : "/work", { scroll: false }), 250);
  };

  const columns = [list.filter((_, i) => i % 2 === 0), list.filter((_, i) => i % 2 === 1)];

  return (
    <main id="main" className="relative">
      <div className="flex flex-col gap-x-4 px-4 md:flex-row">
        <Sidebar count={list.length} />

        <div className="w-full">
          <div className={`transition-opacity duration-[250ms] ease-linear ${fading ? "opacity-0" : "opacity-100"}`}>
            {/* desktop: two-column masonry */}
            <div className="hidden gap-x-2 py-4 md:flex">
              {columns.map((col, c) => (
                <div key={c} className="flex w-1/2 flex-col gap-y-2">
                  {col.map((p, k) => (
                    <Card key={p.slug} project={p} shape={(c === 0 ? COL1 : COL2)[k % 7]} dim={hovered !== null && hovered !== p.slug} onHover={setHovered} />
                  ))}
                </div>
              ))}
            </div>
            {/* mobile: single column with captions */}
            <div className="flex flex-col gap-y-6 pt-4 pb-28 md:hidden">
              {list.map((p) => (
                <Card key={p.slug} project={p} shape="aspect-[4/3]" dim={false} onHover={() => {}} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <FilterButton label={activeCategory?.name} onOpen={() => setPanelOpen(true)} onClear={() => choose(null)} />
      <FilterPanel open={panelOpen} active={filter} onClose={() => setPanelOpen(false)} onChoose={choose} />
      <MobileTabs onFilter={() => setPanelOpen(true)} />
    </main>
  );
}

function Sidebar({ count }: { count: number }) {
  return (
    <div className="w-full shrink-0 pt-4 md:sticky md:top-0 md:h-svh md:w-sidebar md:py-4">
      <div className="flex h-full flex-col pt-[46px] md:pt-12">
        <div className="flex flex-col md:gap-y-6">
          <div className="pt-15 pb-12 md:px-3 md:pt-9 md:pb-0">
            <div className="flex flex-col gap-y-4 md:pt-6 md:pb-3">
              <div className="flex flex-col">
                <h1 className="t-subhead">{workCopy.heading}</h1>
                <p className="t-subhead text-grey">{workCopy.subheading}</p>
              </div>
            </div>
          </div>
          <div className="hidden flex-col md:flex md:px-3">
            {workCopy.views.map((view, i) => {
              const active = i === 0;
              return (
                <TLink key={view.label} href={view.href} className="group">
                  <div className="relative cursor-pointer py-3 text-left">
                    <span className={`absolute top-[21px] -left-3 h-[3px] w-[3px] rounded-full transition-transform duration-[333ms] ease-[cubic-bezier(0.38,0.02,0.41,0.98)] group-hover:scale-100 ${active ? "scale-100 bg-white" : "scale-0 bg-grey"}`} />
                    <h2 className={`t-body ${active ? "text-white" : "text-grey"}`}>{view.label}</h2>
                    {!active && <p className="t-small pt-1 pb-[6px] text-grey">{view.description}</p>}
                  </div>
                </TLink>
              );
            })}
          </div>
          <div className="flex items-center justify-between pb-3 md:hidden">
            <span className="t-label text-grey">{workCopy.count}</span>
            <span className="t-label text-grey">({count})</span>
          </div>
        </div>
        <div className="mt-auto hidden md:block">
          <FeaturedCard project={projectBySlug(workCopy.featured)!} />
        </div>
      </div>
    </div>
  );
}

// Sidebar card that pops in shortly after arrival.
export function FeaturedCard({ project }: { project: Project }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShown(true), 1200);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className={`origin-bottom-left transition-transform duration-[417ms] ease-[cubic-bezier(0.03,0,0,1)] ${shown ? "scale-100" : "scale-0"}`}>
      <TLink href={`/projects/${project.slug}`} className="group block rounded-md bg-off-black">
        <div className={`flex gap-x-3 p-2 pr-1 transition-[opacity,translate] delay-200 duration-[333ms] ease-[var(--ease-text-in)] ${shown ? "translate-y-0 opacity-100" : "translate-y-[10px] opacity-0"}`}>
          <div className="relative aspect-square w-[76px] shrink-0 scale-95 overflow-hidden rounded-[1.5rem]">
            <Media variant={project.media} tint={project.tint} src={project.src} film={project.film} still sizes="160px" />
          </div>
          <div className="flex min-w-0 flex-col pt-[2px] pb-1">
            <h2 className="t-body truncate">{project.client}</h2>
            <p className="t-body truncate text-grey">{project.title}</p>
            <p className="t-chip mt-auto text-light-grey">{project.sector}</p>
          </div>
          <span className="glass-strong relative ml-auto grid h-[26px] w-[26px] shrink-0 place-items-center overflow-hidden rounded-xs">
            <span className="absolute inset-[4px] scale-70 rounded-[10px] bg-white/0 transition-all duration-[250ms] ease-[var(--ease-grow)] group-hover:scale-100 group-hover:rounded-xs group-hover:bg-white/10" />
            <Arrow className="relative text-white" />
          </span>
        </div>
      </TLink>
    </div>
  );
}

function Card({ project, shape, dim, onHover }: { project: Project; shape: string; dim: boolean; onHover: (slug: string | null) => void }) {
  return (
    <TLink
      href={`/projects/${project.slug}`}
      data-cursor="View case"
      onMouseEnter={() => onHover(project.slug)}
      onMouseLeave={() => onHover(null)}
      className={`group block transition-[opacity,scale] duration-[167ms] ease-linear active:scale-[0.99] md:cursor-none ${dim ? "opacity-35" : "opacity-100"}`}
    >
      <div className={`relative ${shape}`}>
        <div className="relative z-1 h-full w-full overflow-hidden rounded-md bg-off-black transition-[height] duration-[167ms] ease-linear md:group-hover:h-[calc(100%-24px)]">
          <Media variant={project.media} tint={project.tint} mark={project.mark} markColor={project.markColor} src={project.src} film={project.film} sizes="(min-width: 52.125rem) 40vw, 100vw" />
        </div>
        <div className="absolute bottom-0 left-0 hidden w-full justify-between gap-x-2 pt-2 opacity-0 transition-opacity duration-[167ms] ease-linear group-hover:opacity-100 group-hover:delay-[167ms] md:flex">
          <p className="t-body truncate text-white">{project.client}</p>
          <p className="t-body truncate text-grey">{project.title}</p>
        </div>
      </div>
      <div className="flex items-start justify-between pt-3 md:hidden">
        <div>
          <p className="t-small">{project.client}</p>
          <p className="t-small text-grey">{project.title}</p>
        </div>
        <Arrow className="mt-1 text-grey" />
      </div>
    </TLink>
  );
}

function FilterButton({ label, onOpen, onClear }: { label?: string; onOpen: () => void; onClear: () => void }) {
  return (
    <div className="fixed right-8 bottom-4 z-30 hidden items-center gap-x-1 md:flex">
      <button type="button" onClick={onOpen} className="group glass-strong relative flex h-[38px] cursor-pointer items-center gap-x-[10px] overflow-hidden rounded-xs px-[14px]">
        <span className="absolute inset-0 bg-black/60 transition-colors duration-[167ms] ease-linear group-hover:bg-black/40" />
        <span className="t-label relative">{label ?? "Filter"}</span>
        <SlidersIcon />
      </button>
      {label && (
        <button type="button" onClick={onClear} aria-label="Clear filter" className="glass-strong relative grid h-[38px] w-[38px] cursor-pointer place-items-center overflow-hidden rounded-xs">
          <span className="absolute inset-0 bg-black/60" />
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

function FilterPanel({ open, active, onClose, onChoose }: { open: boolean; active: string | null; onClose: () => void; onChoose: (slug: string) => void }) {
  const { overlay } = useUI();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const counts = (slug: string) => allProjects.filter((p) => projectCategories[p.slug]?.includes(slug)).length;
  return (
    <div className={`fixed inset-0 z-[100] flex flex-col justify-center px-4 ${open && overlay === "none" ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={onClose} className={`glass-strong absolute inset-0 bg-black/90 transition-opacity duration-500 ease-[var(--ease-width)] md:glass-medium md:bg-black/80 ${open ? "opacity-100" : "opacity-0"}`} />
      <div className={`relative transition-transform duration-500 ease-[var(--ease-width)] ${open ? "scale-100" : "scale-[1.1]"}`}>
        <div className={`transition-opacity duration-[167ms] ease-linear ${open ? "opacity-100 delay-[167ms]" : "opacity-0"}`}>
          <div className="relative mx-auto flex w-full flex-col gap-y-6 pt-20 md:-mt-9 md:max-w-[817px] md:gap-y-4 md:pt-0">
            <p className="t-body text-light-grey">{workCopy.filterPrompt}</p>
            <div className="flex flex-col gap-y-2 md:grid md:grid-cols-3 md:gap-x-2">
              {categories.map((c) => (
                <button key={c.slug} type="button" onClick={() => onChoose(c.slug)} className="group text-left">
                  <div className={`glass-strong flex gap-x-4 rounded-md p-2 pr-1 transition-colors duration-[167ms] ease-linear md:gap-x-3 md:pr-6 ${active === c.slug ? "bg-white/15" : "bg-white/5 group-hover:bg-white/10"}`}>
                    <div className="relative aspect-square w-[56px] shrink-0 overflow-hidden rounded-sm md:w-[76px]">
                      <Media {...c.thumb} sizes="160px" />
                    </div>
                    <div className="flex flex-col justify-between py-1">
                      <p className="t-body text-white">{c.name}</p>
                      <p className="t-chip text-mid-grey">{counts(c.slug)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} aria-label="Close filters" className={`glass-strong absolute right-8 bottom-4 grid h-[38px] w-[38px] cursor-pointer place-items-center overflow-hidden rounded-xs transition-opacity duration-[167ms] ${open ? "opacity-100 delay-[167ms]" : "opacity-0"}`}>
        <span className="absolute inset-0 bg-white/5" />
        <CloseIcon />
      </button>
    </div>
  );
}

function MobileTabs({ onFilter }: { onFilter: () => void }) {
  return (
    <div className="glass-strong fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-x-1 rounded-md bg-black/50 p-1 md:hidden">
      {workCopy.views.map((view, i) => (
        <TLink key={view.label} href={view.href} className={`t-label grid h-[38px] place-items-center rounded-xs px-5 ${i === 0 ? "bg-white/10 text-white" : "text-grey"}`}>
          {view.label}
        </TLink>
      ))}
      <button type="button" onClick={onFilter} aria-label="Filter" className="grid h-[38px] w-[38px] place-items-center rounded-xs bg-white/5">
        <SlidersIcon />
      </button>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 10 10" className="relative h-[10px] w-[10px] stroke-white" fill="none" aria-hidden>
      <path d="M1 3h8M1 7h8" strokeWidth="1" />
      <circle cx="3.5" cy="3" r="1.2" className="fill-black" strokeWidth="1" />
      <circle cx="6.5" cy="7" r="1.2" className="fill-black" strokeWidth="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 10 10" className="relative h-[10px] w-[10px] stroke-white" fill="none" aria-hidden>
      <path d="m2 2 6 6M8 2 2 8" strokeWidth="1" />
    </svg>
  );
}
