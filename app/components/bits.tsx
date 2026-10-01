import type { ReactNode } from "react";

// Personal mark from the original portfolio (public/logo-white.svg).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-yellow ${className}`} role="img" aria-label="Kishore N E">
      <svg viewBox="0 0 520 435" className="h-[25px] w-auto fill-current" aria-hidden>
        <g transform="translate(0,435) scale(0.1,-0.1)">
          <path d="M0 3424 c0 -512 3 -1492 7 -2178 l6 -1248 967 967 967 967 323 -331 c178 -182 326 -331 330 -331 3 0 158 149 343 331 l336 330 424 -428 c232 -235 660 -669 950 -963 290 -294 532 -536 537 -538 7 -2 10 776 10 2154 l0 2159 -102 -101 c-548 -536 -1343 -1318 -1556 -1528 l-262 -261 -334 334 -335 334 -78 -71 c-43 -39 -195 -188 -338 -331 l-260 -261 -625 622 c-344 343 -779 776 -967 963 l-343 340 0 -931z m1023 -1901 c-360 -365 -657 -663 -659 -663 -2 0 -4 595 -4 1322 l0 1323 659 -659 660 -660 -656 -663z m3824 114 l-2 -778 -652 663 -653 663 648 650 647 650 7 -535 c4 -294 7 -885 5 -1313z m-2037 742 c160 -174 190 -213 179 -223 -8 -7 -100 -96 -205 -199 l-190 -187 -156 158 c-85 86 -175 179 -198 205 l-44 48 205 205 c112 112 207 204 210 204 4 0 93 -95 199 -211z" />
        </g>
      </svg>
    </span>
  );
}

// "[ LABEL ]" — brackets slide outward 4px on hover (333ms), text greys up.
export function BracketLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`group/br t-label inline-flex items-center gap-x-[6px] text-grey transition-colors duration-[167ms] ease-linear group-hover:text-white hover:text-white ${className}`}>
      <span className="transition-transform duration-[333ms] ease-linear group-hover:-translate-x-1 group-hover/br:-translate-x-1">[</span>
      <span>{children}</span>
      <span className="transition-transform duration-[333ms] ease-linear group-hover:translate-x-1 group-hover/br:translate-x-1">]</span>
    </span>
  );
}

// Underline that wipes in from the left on hover and out to the right on leave.
export function UnderlineLink({ children, href = "#", className = "" }: { children: ReactNode; href?: string; className?: string }) {
  const external = /^https?:/.test(href);
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={`group/ul relative inline-block overflow-hidden align-top ${className}`}>
      {children}
      <span className="absolute bottom-0 left-0 h-px w-full animate-underline-out bg-current group-hover/ul:animate-underline-in" />
    </a>
  );
}

// 2×2 dot grid; dots spread ±1.9px when the parent group is hovered.
export function DotsIcon({ open = false }: { open?: boolean }) {
  // Class strings are literal so Tailwind can see them.
  const d = [
    { cx: 3, cy: 3, on: "-translate-x-[1.9px] -translate-y-[1.9px]", hover: "group-hover:-translate-x-[1.9px] group-hover:-translate-y-[1.9px]" },
    { cx: 7, cy: 3, on: "translate-x-[1.9px] -translate-y-[1.9px]", hover: "group-hover:translate-x-[1.9px] group-hover:-translate-y-[1.9px]" },
    { cx: 3, cy: 7, on: "-translate-x-[1.9px] translate-y-[1.9px]", hover: "group-hover:-translate-x-[1.9px] group-hover:translate-y-[1.9px]" },
    { cx: 7, cy: 7, on: "translate-x-[1.9px] translate-y-[1.9px]", hover: "group-hover:translate-x-[1.9px] group-hover:translate-y-[1.9px]" },
  ];
  return (
    <svg viewBox="0 0 10 10" className="h-[10px] w-[10px] overflow-visible" aria-hidden>
      {d.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r="1" className={`fill-current transition-transform duration-[167ms] ease-linear ${open ? dot.on : dot.hover}`} />
      ))}
    </svg>
  );
}

// Circular progress ring with a pause/play glyph (bottom-right of media).
export function PlayPause({ paused, onToggle, className = "" }: { paused: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`group/pp block h-6 w-6 cursor-pointer rounded-full bg-white/0 transition-colors duration-[167ms] ease-linear hover:bg-white/10 ${className}`}
      aria-label={paused ? "Play" : "Pause"}
    >
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-6 w-6 -rotate-90 stroke-white opacity-20 transition-opacity duration-[167ms] group-hover/pp:opacity-5" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" strokeWidth="1" />
      </svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-6 w-6 -rotate-90 stroke-white" aria-hidden>
        <circle cx="12" cy="12" r="11" fill="none" strokeWidth="1" pathLength={1} strokeDasharray="1" className="animate-[ring-progress_12s_linear_infinite]" style={{ animationPlayState: paused ? "paused" : "running" }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center opacity-50 transition-opacity duration-[167ms] group-hover/pp:opacity-100">
        {paused ? (
          <svg viewBox="0 0 10 10" className="h-[10px] w-[10px] fill-white" aria-hidden><path d="M2.5 1.5v7l6-3.5z" /></svg>
        ) : (
          <svg viewBox="0 0 10 10" className="h-[10px] w-[10px] fill-white" aria-hidden><rect x="2.5" y="1.5" width="1.2" height="7" /><rect x="6.3" y="1.5" width="1.2" height="7" /></svg>
        )}
      </span>
    </button>
  );
}

// Translucent rounded button used across the chrome.
export function GlassButton({ children, onClick, className = "", label }: { children: ReactNode; onClick?: () => void; className?: string; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`group glass-strong relative flex h-[46px] cursor-pointer items-center justify-center overflow-hidden rounded-xs px-4 sm:h-10 ${className}`}>
      <span className="absolute inset-0 bg-white/5 transition-colors duration-[167ms] ease-linear group-hover:bg-white/10 group-active:bg-white/5" />
      <span className="relative z-1 flex items-center gap-x-[6px]">{children}</span>
    </button>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 10" className={`h-[10px] w-[10px] ${className}`} fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden>
      <path d="M2.5 7.5 7.5 2.5M3.5 2.5h4v4" />
    </svg>
  );
}
