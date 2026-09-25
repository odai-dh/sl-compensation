"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { CarTaxiFront } from "lucide-react";
import { useEffect, useState } from "react";
import { useSite } from "@/lib/site/store";
import { cn } from "@/lib/utils";

export const CURSOR_EVENT = "vidare:cursor";
export type CursorDetail = { x: number; y: number; overPhone: boolean };

/** Glowing dot that grows over interactive elements and becomes a taxi over the live phone. */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"dot" | "hover" | "taxi">("dot");
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 900, damping: 50, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 900, damping: 50, mass: 0.3 });
  const reducedMotion = useSite((s) => s.reducedMotion);
  const presenting = useSite((s) => s.presenting);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    const apply = () => setEnabled(mq.matches && !reducedMotion);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [reducedMotion]);

  useEffect(() => {
    document.documentElement.classList.toggle("site-cursor", enabled);
    useSite.getState().set({ cursorOverPhone: false });
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const t = e.target as HTMLElement | null;
      const phone = t?.closest("[data-cursor=taxi]");
      setMode(phone ? "taxi" : t?.closest("a,button,input,select,label,[role=slider],[data-cursor=hover]") ? "hover" : "dot");
    };
    const onApp = (e: Event) => {
      const d = (e as CustomEvent<CursorDetail>).detail;
      x.set(d.x);
      y.set(d.y);
      setVisible(true);
      setMode(d.overPhone ? "taxi" : "dot");
    };
    const onLeave = () => setVisible(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener(CURSOR_EVENT, onApp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener(CURSOR_EVENT, onApp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("site-cursor");
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none fixed left-0 top-0 z-[100] transition-opacity", (!visible || presenting) && "opacity-0")}
      style={{ x: sx, y: sy }}
    >
      <div
        className={cn(
          "flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-200 ease-out",
          mode === "dot" && "size-3 bg-[#ffb020] shadow-[0_0_14px_4px_rgba(255,176,32,0.55)]",
          mode === "hover" && "size-11 border border-[#ffb020] bg-[#ffb020]/15 shadow-[0_0_24px_rgba(255,176,32,0.45)]",
          mode === "taxi" && "size-10 bg-[#ffb020] text-[#1a1203] shadow-[0_0_24px_rgba(255,176,32,0.7)]",
        )}
      >
        {mode === "taxi" && <CarTaxiFront className="size-5" />}
      </div>
    </motion.div>
  );
}
