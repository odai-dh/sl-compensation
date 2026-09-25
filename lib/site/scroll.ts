"use client";

import type Lenis from "lenis";
import { STATIONS } from "./story";

let lenis: Lenis | null = null;

export function setLenis(instance: Lenis | null) {
  lenis = instance;
}

/** Smooth-scrolls to the start of a story station (or instantly with reduced motion). */
export function scrollToStation(index: number, opts: { offsetRatio?: number } = {}) {
  const i = Math.max(0, Math.min(STATIONS.length - 1, index));
  const el = document.getElementById(STATIONS[i].id);
  if (!el) return;
  // Land a little into the section so the chapter text is fully revealed.
  const offset = i === 0 ? 0 : Math.max(4, el.offsetHeight * (opts.offsetRatio ?? 0.12));
  const top = el.offsetTop + offset;
  if (lenis) lenis.scrollTo(top, { duration: 1.6 });
  else window.scrollTo({ top, behavior: "auto" });
}
