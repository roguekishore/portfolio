import type { ReactNode } from "react";

// Placeholder wordmark for the fictional studio.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[3px] font-sans text-yellow ${className}`} aria-label="Orbe">
      <span className="text-[25px] leading-none font-[780] tracking-[-0.06em] [font-stretch:112%]">orbe</span>
      <span className="mb-[11px] h-[5px] w-[5px] rounded-full bg-yellow" />
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
  return (
    <a href={href} className={`group/ul relative inline-block overflow-hidden align-top ${className}`}>
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
