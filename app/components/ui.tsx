"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Overlay = "none" | "widgets" | "menu" | "reel";

type UI = {
  overlay: Overlay;
  open: (o: Overlay) => void;
  close: () => void;
  toggle: (o: Overlay) => void;
};

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay>("none");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOverlay("none");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<UI>(
    () => ({
      overlay,
      open: setOverlay,
      close: () => setOverlay("none"),
      toggle: (o) => setOverlay((cur) => (cur === o ? "none" : o)),
    }),
    [overlay],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {overlay !== "none" && <span hidden data-scroll-lock />}
    </Ctx.Provider>
  );
}

export function useUI() {
  const ui = useContext(Ctx);
  if (!ui) throw new Error("useUI outside UIProvider");
  return ui;
}
