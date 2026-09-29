"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import { useEffect } from "react";
import { useSite } from "@/lib/site/store";

export function Toast() {
  const toast = useSite((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useSite.getState().set({ toast: null }), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex items-center gap-2 rounded-full bg-[#ffb020] px-5 py-3 font-semibold text-[#1a1203] shadow-[0_0_40px_rgba(255,176,32,0.55)]"
          >
            <BadgeCheck className="size-5" aria-hidden />
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
