"use client";

import { useEffect, useRef } from "react";

// Muted looping clip that follows the shared play/pause state.
export default function MediaVideo({ src, paused, className }: { src: string; paused?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused]);
  return <video ref={ref} src={src} className={className} autoPlay={!paused} muted loop playsInline preload="metadata" />;
}
