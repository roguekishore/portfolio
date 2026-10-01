"use client";

import { useEffect, useRef, useState } from "react";
import { contact, copyright, legal, offices } from "@/lib/content";
import Media from "./Media";
import { UnderlineLink } from "./bits";

function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export default function Contact() {
  const [rows, rowsIn] = useInView<HTMLDivElement>(0.15);
  return (
    <>
      <section id="contact" className="pt-6 md:pt-43">
        <div className="grid grid-cols-8 gap-y-12 pb-11 md:grid-cols-16 md:gap-x-2 md:pb-0">
          <div className="col-span-8 md:col-span-5 md:pl-3">
            <h2 className="t-heading">Contact</h2>
            <p className="t-heading text-grey">Press and careers</p>
          </div>
          <div ref={rows} className="col-span-8 flex flex-col gap-y-3 md:col-span-9 md:col-start-8">
            {contact.map((row, i) => (
              <div key={row.label} className={`pt-3 pb-9 transition-opacity duration-500 ease-linear md:pb-12 ${rowsIn ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="pb-3 md:pr-3">
                  <div
                    className={`h-px origin-left bg-white/10 transition-transform duration-[900ms] ease-[var(--ease-drawer-in)] ${rowsIn ? "scale-x-100" : "scale-x-0"}`}
                    style={{ transitionDelay: `${i * 120}ms` }}
                  />
                </div>
                <div className="grid grid-cols-8 gap-x-2 md:grid-cols-9">
                  <h3 className="t-body col-span-4 md:col-span-3">{row.label}</h3>
                  <div className="t-body col-span-4 flex flex-col gap-y-[2px] text-grey md:col-span-5">
                    {row.lines.map((l) => (
                      <p key={l} className="hidden text-white md:block">{l}</p>
                    ))}
                    {row.links.map((l) => (
                      <div key={l}>
                        <UnderlineLink className="transition-colors duration-[167ms] hover:text-white">{l}</UnderlineLink>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

function Footer() {
  const [row, atBottom] = useInView<HTMLDivElement>(0.98);
  const office = offices[0];
  return (
    <div className="mt-auto">
      <div ref={row} className="grid grid-cols-8 gap-x-2 md:grid-cols-16">
        <div className="col-span-8 pb-4 md:col-span-7">
          <div className="relative md:h-[92px]">
            <div
              className={`bottom-0 left-0 w-full origin-bottom-left transition-transform duration-[417ms] ease-[cubic-bezier(0.03,0,0,1)] md:absolute md:max-w-sidebar-wide ${atBottom ? "md:scale-100" : "md:scale-0"}`}
            >
              <OfficeCard email={office.email} />
            </div>
          </div>
        </div>
        <div className="col-span-8 flex flex-col md:col-span-9">
          <div className="mt-auto">
            <footer className="t-small hidden items-center pb-4 text-mid-grey md:flex">
              <div className="flex h-[50px] w-full items-center">
                <div className="grid w-full grid-cols-9 gap-x-2">
                  <div className="col-span-3">{copyright}</div>
                  <div className="col-span-6 flex items-center gap-x-6 pr-3">
                    {legal.map((l) => (
                      <UnderlineLink key={l} className="transition-colors duration-[167ms] hover:text-white">{l}</UnderlineLink>
                    ))}
                    <a href="#intro" className="ml-auto" aria-label="Back to top">
                      <span className="block h-[2px] w-[2px] rounded-full bg-mid-grey" />
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfficeCard({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative aspect-[5/3] overflow-hidden rounded-md">
      <Media variant="tiles" />
      <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/0 via-55% to-black/70" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2">
        <div className="t-label flex flex-col gap-y-[3px] text-white">
          <span className="text-white/70">Say hello</span>
          <span>{email}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(email).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="group glass-strong relative flex h-[26px] w-[26px] items-center justify-end overflow-hidden rounded-xs px-[8px] transition-[width] duration-[250ms] ease-[var(--ease-grow)] hover:w-[62px]"
          aria-label="Copy email"
        >
          <span className="absolute inset-0 scale-70 rounded-[10px] bg-white/0 transition-all duration-[250ms] ease-[var(--ease-grow)] group-hover:scale-100 group-hover:rounded-xs group-hover:bg-white/10" />
          <span className="t-chip relative mr-[6px] translate-y-[10px] opacity-0 transition-all duration-[250ms] ease-[var(--ease-grow)] group-hover:translate-y-0 group-hover:opacity-100">{copied ? "Done" : "Copy"}</span>
          <svg viewBox="0 0 10 10" className="relative h-[10px] w-[10px] shrink-0 stroke-white" fill="none" aria-hidden>
            <rect x="1.5" y="3" width="5.5" height="5.5" rx="0.5" />
            <path d="M3.5 1.5h5v5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
