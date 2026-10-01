"use client";

import { useEffect, useState } from "react";
import { drawerPhotos as PHOTOS, helloVisual, news, newsCopy, offices } from "@/lib/content";
import Media from "./Media";
import { Arrow } from "./bits";
import { useUI } from "./ui";

function useZonedTime(tz: string) {
  const [t, setT] = useState<{ h: number; m: number; label: string } | null>(null);
  useEffect(() => {
    const read = () => {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }).formatToParts(new Date());
      const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
      setT({ h: Number(get("hour")), m: Number(get("minute")), label: `${get("hour")}:${get("minute")} ${get("timeZoneName")}` });
    };
    read();
    const id = setInterval(read, 15_000);
    return () => clearInterval(id);
  }, [tz]);
  return t;
}

export default function Widgets() {
  const { overlay, close } = useUI();
  const open = overlay === "widgets";
  const [officeIdx, setOfficeIdx] = useState(0);
  const [photo, setPhoto] = useState(0);
  const office = offices[officeIdx];
  const time = useZonedTime(office.tz);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setPhoto((p) => (p + 1) % PHOTOS.length), 1800);
    return () => clearInterval(id);
  }, [open]);

  const slide = (dx: number, delay: number) => ({
    transform: open ? "translateX(0)" : `translateX(${dx}px)`,
    transition: open ? `transform 517ms var(--ease-drawer-in) ${delay}ms` : `transform 383ms var(--ease-drawer-out) ${delay}ms`,
  });
  const fade = (delay: number) => ({
    opacity: open ? 1 : 0,
    transition: `opacity 117ms linear ${open ? delay : 0}ms`,
  });

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div onClick={close} className={`glass-medium absolute inset-0 bg-black/40 transition-opacity duration-[400ms] ease-[cubic-bezier(0.15,0,0.3,1)] ${open ? "opacity-100" : "opacity-0"}`} />

      <div className="pointer-events-none absolute inset-0 flex flex-col px-4 pt-4">
        {/* office tabs; the clock's dot icon sits over the right end */}
        <div className="flex justify-end overflow-hidden">
          <div className="glass-medium pointer-events-auto flex h-[46px] w-full items-center gap-x-1 rounded-md bg-white/5 p-1 pr-17 sm:h-12 sm:w-[370px]" style={slide(370, 0)}>
            {offices.map((o, i) => (
              <button
                key={o.code}
                type="button"
                onClick={() => setOfficeIdx(i)}
                className={`t-label relative h-full cursor-pointer rounded-xs px-3 transition-colors duration-[167ms] ease-linear ${i === officeIdx ? "bg-white/10 text-white" : "text-grey hover:bg-white/5 hover:text-white"}`}
                style={fade(300)}
              >
                {o.code}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-x-4 pt-4">
          {/* column B: photo stack + clock dial */}
          <div className="relative hidden w-[274px] shrink-0 overflow-hidden lg:block">
            <div style={slide(140, 34)}>
              <div className="pointer-events-auto flex flex-col gap-y-4" style={fade(200)}>
                <div className="relative aspect-[5/3] overflow-hidden rounded-md bg-off-black">
                  {PHOTOS.map((v, i) => (
                    <div key={i} className={`absolute inset-0 ${i === photo ? "z-1 opacity-100" : "opacity-0"}`}>
                      <Media {...v} sizes="274px" paused={!open} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-x-4">
                  <div className="relative aspect-square w-full overflow-hidden rounded-md bg-off-black">
                    <Media variant="tiles" paused={!open} />
                  </div>
                  <div className="relative aspect-square w-full overflow-hidden rounded-md bg-off-black">
                    <Dial h={time?.h ?? 0} m={time?.m ?? 0} />
                    <span className="t-chip absolute top-2 left-2 text-grey">{time?.label}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* column A: office card + latest news */}
          <div className="relative z-20 w-full shrink-0 overflow-hidden sm:w-[370px]">
            <div style={slide(370, 0)}>
              <div className="pointer-events-auto flex flex-col gap-y-4" style={fade(167)}>
                <div className="relative aspect-[5/3] overflow-hidden rounded-md">
                  <Media {...helloVisual} sizes="370px" paused={!open} />
                  <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/0 via-55% to-black/70" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center gap-x-2 p-2">
                    <span className="grid h-9 w-9 place-items-center rounded-sm bg-yellow text-black">
                      <Arrow />
                    </span>
                    <div className="t-label flex flex-col gap-y-[3px]">
                      <span className="text-white/70">Say hello — {office.city}</span>
                      <span>{office.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-y-5 rounded-md bg-off-black p-3 pt-[14px] sm:gap-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="t-label text-grey">{newsCopy.drawerHeading}</h2>
                  </div>
                  <div>
                    {news.map((n, i) => (
                      <a key={n.title} href={n.href ?? "/#about"} onClick={close} className={`flex items-center gap-x-4 border-white/5 py-3 ${i < news.length - 1 ? "border-b" : ""} ${i === 0 ? "pt-1" : ""}`}>
                        <div className="min-w-0 flex-1">
                          <p className="t-small truncate">{n.title}</p>
                          {n.excerpt && <p className="t-small truncate text-grey">{n.excerpt}</p>}
                          <p className="t-chip pt-2 text-white/80">{n.tag}</p>
                        </div>
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xs">
                          <Media variant={n.media} src={n.src} sizes="80px" paused={!open} />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dial({ h, m }: { h: number; m: number }) {
  const minute = m * 6;
  const hour = (h % 12) * 30 + m * 0.5;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
      <circle cx="50" cy="54" r="34" fill="#1b1b1b" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1="50" y1="23" x2="50" y2="26" stroke="#3a3a3a" strokeWidth="1" transform={`rotate(${i * 30} 50 54)`} />
      ))}
      <line x1="50" y1="54" x2="50" y2="34" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" transform={`rotate(${hour} 50 54)`} style={{ transition: "transform 600ms var(--ease-text-in)" }} />
      <line x1="50" y1="54" x2="50" y2="27" stroke="#989898" strokeWidth="1" strokeLinecap="round" transform={`rotate(${minute} 50 54)`} />
      <circle cx="50" cy="54" r="1.6" fill="#ffe800" />
    </svg>
  );
}
