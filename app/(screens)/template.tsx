"use client";

import { motion, MotionConfig } from "framer-motion";

/** Gentle slide-in for every screen change (transforms are skipped for reduced-motion users). */
export default function ScreenTemplate({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
