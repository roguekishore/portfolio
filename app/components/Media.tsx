import type { CSSProperties } from "react";
import Image from "next/image";
import type { MediaVariant, Visual } from "@/lib/content";
import Film from "./film/Film";
import { FILMS } from "./film";
import MediaVideo from "./MediaVideo";
import s from "./Media.module.css";

type Props = Visual & {
  sizes?: string;
  paused?: boolean;
  className?: string;
};

const isVideo = (src: string) => /\.(mp4|webm)$/i.test(src);

// A project film when `film` is set; otherwise project imagery when `src` is
// set (image or looping video); otherwise an abstract animated composition.
export default function Media({ variant, tint, mark, markColor = "#fff", src, film, chapter, still, sizes = "(min-width: 52.125rem) 66vw, 100vw", paused, className = "" }: Props) {
  const ground = film ? FILMS[film].ground : src ? "#141414" : (tint ?? DEFAULT_TINT[variant]);
  return (
    <div className={`${s.root} ${className}`} data-paused={paused ? "true" : "false"} style={{ background: ground }} aria-hidden>
      {film ? (
        <Film id={film} chapter={chapter} paused={paused} still={still} />
      ) : src ? (
        isVideo(src) ? <MediaVideo src={src} paused={paused} className={s.fill} /> : <Image src={src} alt="" fill sizes={sizes} className={s.fill} draggable={false} />
      ) : (
        <Scene variant={variant} />
      )}
      {mark && (
        <div className={s.mark} style={{ color: markColor } as CSSProperties}>
          <span>{mark}</span>
        </div>
      )}
    </div>
  );
}

const DEFAULT_TINT: Record<MediaVariant, string> = {
  rings: "#3b0d36",
  glow: "#f1ece4",
  rays: "#c97a5a",
  dots: "#1d3b2a",
  wave: "#14e05a",
  curve: "#2b1030",
  tiles: "#e9e4da",
  dusk: "#555",
};

function Scene({ variant }: { variant: MediaVariant }) {
  switch (variant) {
    case "rings":
      return (
        <div className={s.layer}>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className={s.ring} />)}
        </div>
      );
    case "glow":
      return (
        <div className={s.layer}>
          <span className={s.blob} />
          <span className={s.blob} />
          <span className={s.blob} />
        </div>
      );
    case "rays":
      return (
        <>
          <div className={s.rays} />
          <div className={s.vignette} />
        </>
      );
    case "dots":
      return (
        <>
          <div className={s.dots} />
          <div className={s.dotsLit} />
        </>
      );
    case "wave":
      return (
        <svg className={s.svg} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
          <path className={s.draw} pathLength={1} d="M-10 60 C 20 20, 40 20, 60 50 S 100 80, 120 40 S 160 10, 175 45" fill="none" stroke="#062b14" strokeWidth="7" strokeLinecap="round" opacity="0.18" />
          <path className={s.draw2} pathLength={1} d="M-10 30 C 25 70, 45 70, 70 40 S 115 5, 135 50 S 165 75, 175 60" fill="none" stroke="#062b14" strokeWidth="4" strokeLinecap="round" opacity="0.12" />
        </svg>
      );
    case "curve":
      return (
        <svg className={s.svg} viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
          <path className={s.draw} pathLength={1} d="M20 75 C 20 20, 75 10, 95 40 S 140 85, 145 20" fill="none" stroke="#f3e6f0" strokeWidth="0.7" />
          <g fill="#f3e6f0">
            {[[20, 75], [20, 20], [75, 10], [95, 40], [115, 70], [145, 20]].map(([cx, cy], i) => (
              <circle key={i} className={s.handle} cx={cx} cy={cy} r="2.2" style={{ animationDelay: `${i * -0.4}s` }} />
            ))}
          </g>
          <g stroke="#f3e6f0" strokeWidth="0.35" opacity="0.6">
            <line x1="20" y1="75" x2="20" y2="20" />
            <line x1="75" y1="10" x2="95" y2="40" />
            <line x1="115" y1="70" x2="145" y2="20" />
          </g>
        </svg>
      );
    case "tiles":
      return (
        <div className={s.tiles}>
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} className={s.tile} style={{ animationDelay: `${((i * 7) % 24) * -0.13}s` }} />
          ))}
        </div>
      );
    case "dusk":
      return (
        <>
          <div className={s.dusk} />
          <div className={s.sweep} />
        </>
      );
  }
}
