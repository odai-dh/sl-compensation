"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useSite } from "@/lib/site/store";
import { StaticScene } from "./static-scene";

const Scene = dynamic(() => import("./three/scene"), { ssr: false, loading: () => null });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** One fixed, full-screen canvas behind the whole page – or an illustrated fallback. */
export function SiteCanvas() {
  const quality = useSite((s) => s.quality);

  useEffect(() => {
    if (!hasWebGL()) useSite.getState().set({ quality: "fallback", loaded: true });
  }, []);

  useEffect(() => {
    if (quality === "fallback") useSite.getState().set({ loaded: true });
  }, [quality]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {quality === "fallback" ? <StaticScene /> : <Scene />}
      <DimOverlay />
    </div>
  );
}

/** Darkens the scene behind text-heavy sections without re-rendering React on scroll. */
function DimOverlay() {
  useEffect(() => {
    const el = document.getElementById("scene-dim");
    return useSite.subscribe((s) => {
      if (!el) return;
      const t = s.storyT;
      const i = Math.floor(t);
      const local = t - i;
      const dim = i === 4 ? 0.55 * Math.min(1, local / 0.25) * (1 - Math.max(0, (local - 0.8) / 0.2)) : i >= 6 ? 0.5 : 0;
      el.style.opacity = String(dim);
    });
  }, []);
  return <div id="scene-dim" className="absolute inset-0 bg-[#05070d] opacity-0" />;
}
