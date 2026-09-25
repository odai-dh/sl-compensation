"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Gentle slide-in for every screen change. */
export default function ScreenTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col"
      initial={reduce ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
