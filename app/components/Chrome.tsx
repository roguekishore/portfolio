"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { channels, copyright, legal, nav, routeLabel, studio } from "@/lib/content";
import { DotsIcon, GlassButton, Logo } from "./bits";
import { TLink } from "./Transition";
import { useUI } from "./ui";

const COLLAPSE_AT = 300;

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      setCollapsed(window.scrollY > COLLAPSE_AT);
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return collapsed;
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return "";
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const off = -now.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "−";
  const oh = Math.floor(Math.abs(off) / 60);
  const om = Math.abs(off) % 60;
  return `${hh}:${mm} UTC${sign}${oh}${om ? `:${String(om).padStart(2, "0")}` : ""}`;
}

export default function Chrome() {
  return (
    <>
      <DesktopHeader />
      <Clock />
      <MobileBar />
      <MobileMenu />
    </>
  );
}

function DesktopHeader() {
  const pathname = usePathname();
  const home = pathname === "/";
  const scrolled = useCollapsed();
  // Inner pages keep the pill collapsed and open at sidebar width.
  const collapsed = home ? scrolled : true;
  const { overlay, toggle, close } = useUI();
  const open = overlay === "menu";
  const [hover, setHover] = useState(false);

  // Home: 151 at rest, 195 collapsed, 320 (sidebar) on hover/open. Inner: 320.
  const width = !home || open || (collapsed && hover) ? 320 : collapsed ? 195 : 151;
  const crumb = pathname.startsWith("/projects/") ? routeLabel(pathname).label : null;
  const solid = collapsed || open;

  return (
    <>
      {/* blur backdrop behind the dropdown */}
      <div
        onClick={close}
        className={`glass-medium fixed inset-0 z-30 hidden bg-black/40 transition-opacity duration-[400ms] ease-[cubic-bezier(0.15,0,0.3,1)] md:block ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div
        className="fixed top-4 left-4 z-40 hidden animate-fade-in-1000 md:block"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div
          className="relative overflow-hidden rounded-md"
          style={{ width, transition: `width 400ms var(--ease-width) ${collapsed && !hover && !open ? 250 : 0}ms` }}
        >
          <span className={`glass-medium absolute inset-0 rounded-md bg-off-black/90 ${solid ? "opacity-100" : "opacity-0"}`} />

          <button type="button" onClick={() => toggle("menu")} className="relative flex h-12 w-full cursor-pointer items-center pr-5 pl-[14px]" aria-expanded={open} aria-label="Toggle menu">
            <Logo />
            <span className={`t-label ml-[14px] text-white/60 ${collapsed || open ? "opacity-100 delay-[350ms]" : "opacity-0"}`}>{home ? studio.pageLabel : "Work"}</span>
            {crumb && <span className="t-label ml-[10px] text-grey">{crumb}</span>}
            <span className="ml-auto flex h-[10px] w-[10px] items-center justify-center" aria-hidden>
              <span className={`block h-px bg-white/70 transition-all duration-[250ms] ease-[var(--ease-grow)] ${open ? "w-[9px]" : solid ? "h-[2px] w-[2px] rounded-full" : "w-0"}`} />
            </span>
          </button>

          {/* dropdown */}
          <div className={`relative grid transition-[grid-template-rows] duration-[400ms] ease-[var(--ease-width)] ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="min-h-0 overflow-hidden">
              <ul className="px-[14px] pt-[22px] pb-[18px]">
                {nav.map((n, i) => (
                  <li key={n.label}>
                    <TLink
                      href={n.href}
                      onClick={close}
                      className={`group/n flex items-baseline justify-between py-[6px] text-[20px] leading-[24px] transition-[opacity,translate] duration-[333ms] ease-[var(--ease-text-in)] ${open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                      style={{ transitionDelay: open ? `${120 + i * 30}ms` : "0ms" }}
                    >
                      <span>{n.label}</span>
                      <span className="t-label text-grey opacity-0 transition-opacity duration-[167ms] ease-linear group-hover/n:opacity-100">{n.hint}</span>
                    </TLink>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/5 px-[14px] pt-[21px] pb-[14px]">
                <p className="t-label pb-[22px] text-grey">Channels</p>
                {channels.map((c) => (
                  <a key={c} href="#" className="t-label block py-[2px] leading-[11px] text-white transition-opacity duration-[167ms] hover:opacity-60">
                    {c}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* inline nav (home only): slides left under the pill once collapsed */}
      {home && <div className="fixed top-4 left-24 z-40 hidden animate-fade-in-1000 overflow-hidden pl-9 mix-blend-exclusion md:block">
        <div
          className="flex h-12 items-center gap-x-9"
          style={{ transform: `translateX(${collapsed ? -255 : 0}px)`, transition: "transform 650ms var(--ease-nav)" }}
        >
          {nav.map((n, i) => (
            <div
              key={n.label}
              className={collapsed || open ? "pointer-events-none opacity-0" : "opacity-100"}
              style={{ transition: `opacity 0ms linear ${(collapsed ? i : nav.length - 1 - i) * 60}ms` }}
            >
              <TLink href={n.href} className="t-label text-white/70 transition-colors duration-[167ms] ease-linear hover:text-white">
                {n.label}
              </TLink>
            </div>
          ))}
        </div>
      </div>}
    </>
  );
}

function Clock() {
  const time = useClock();
  const { overlay, toggle } = useUI();
  const open = overlay === "widgets";
  return (
    <div className="fixed top-4 right-4 z-[61] hidden animate-fade-in-1000 md:block">
      <button type="button" onClick={() => toggle("widgets")} className="group flex h-10 cursor-pointer items-center gap-x-3 px-2" aria-label={open ? "Hide widgets" : "Show widgets"} aria-expanded={open}>
        <span className={`t-label min-w-[92px] text-right text-white/70 transition-[color,opacity] duration-[167ms] ease-linear group-hover:text-white ${open ? "opacity-0" : ""}`} suppressHydrationWarning>
          {time}
        </span>
        <span className="text-white/70 transition-colors duration-[167ms] group-hover:text-white">
          <DotsIcon open={open} />
        </span>
      </button>
    </div>
  );
}

function MobileBar() {
  const { overlay, toggle } = useUI();
  const pathname = usePathname();
  const menuOpen = overlay === "menu";
  // Case studies swap the bar for a single back button.
  if (pathname.startsWith("/projects/")) {
    return (
      <div className="fixed top-0 left-0 z-[70] px-2 pt-2 md:hidden">
        <TLink href="/work" aria-label="Back to work" className="glass-strong relative grid h-[46px] w-[46px] place-items-center overflow-hidden rounded-xs">
          <span className="absolute inset-0 bg-white/5" />
          <svg viewBox="0 0 10 10" className="relative h-[10px] w-[10px] stroke-white" fill="none" aria-hidden><path d="M8.5 5h-7M4.5 2 1.5 5l3 3" strokeWidth="1" /></svg>
        </TLink>
      </div>
    );
  }
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex items-start justify-between px-4 pt-[10px] md:hidden">
      <TLink href="/" className="pt-[10px]" aria-label="Home">
        <Logo />
      </TLink>
      <div className="flex gap-x-1">
        <GlassButton onClick={() => toggle("menu")} className="w-[78px]">
          <span className="t-label">{menuOpen ? "Close" : "Menu"}</span>
        </GlassButton>
        <GlassButton onClick={() => toggle("widgets")} label="Show widgets" className="w-[46px] px-0">
          <svg viewBox="0 0 10 10" className="h-[10px] w-[10px] stroke-white" aria-hidden>
            <path d="M2 3.5h6M2 6.5h6" strokeWidth="1" />
          </svg>
        </GlassButton>
      </div>
    </div>
  );
}

function MobileMenu() {
  const { overlay, close } = useUI();
  const open = overlay === "menu";
  return (
    <div className={`fixed inset-0 z-[65] flex flex-col bg-black px-4 pt-[100px] pb-4 transition-opacity duration-[333ms] ease-linear md:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ease-out ${open ? "opacity-100 delay-500" : "opacity-0"}`} style={{ background: "radial-gradient(60% 45% at 85% 70%, rgb(150 40 110 / 0.35), transparent 70%), radial-gradient(40% 30% at 30% 95%, rgb(60 60 200 / 0.25), transparent 70%)" }} />
      <p className="t-label relative text-grey">Explore</p>
      <ul className="relative pt-[22px]">
        {nav.map((n, i) => (
          <li key={n.label}>
            <TLink
              href={n.href}
              onClick={close}
              className={`t-heading block py-[1px] transition-[opacity,translate] duration-[333ms] ease-[var(--ease-text-in)] ${open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
              style={{ transitionDelay: open ? `${80 + i * 35}ms` : "0ms" }}
            >
              {n.label}
            </TLink>
          </li>
        ))}
      </ul>
      <div className="relative mt-auto border-t border-white/10 pt-[18px]">
        <p className="t-label pb-[22px] text-grey">Channels</p>
        {channels.map((c) => (
          <a key={c} href="#" className="t-label block py-[3px]">
            {c}
          </a>
        ))}
        <div className="t-small flex gap-x-4 pt-[60px] text-grey">
          {legal.slice(0, 2).map((l) => (
            <a key={l} href="#">{l}</a>
          ))}
        </div>
        <div className="t-small mt-[14px] flex justify-between border-t border-white/10 pt-[14px] text-mid-grey">
          <span>{copyright} Orbe Studio</span>
        </div>
      </div>
    </div>
  );
}
