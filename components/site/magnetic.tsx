"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

/** A button (or link) that leans towards the pointer. */
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  return (
    <motion.div
      className={cn("inline-flex", className)}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export const siteButton = {
  primary:
    "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#ffb020] px-6 font-semibold text-[#1a1203] shadow-[0_0_30px_rgba(255,176,32,0.35)] transition-colors hover:bg-[#ffc24d] disabled:opacity-50",
  ghost:
    "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 font-semibold text-[#e9eef7] backdrop-blur transition-colors hover:bg-white/10 disabled:opacity-40",
};
