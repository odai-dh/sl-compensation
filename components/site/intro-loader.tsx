"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSite } from "@/lib/site/store";

const RAIL = "M 40 150 C 160 150, 200 60, 320 60 S 480 150, 600 150 S 760 60, 860 60";

/** The Vidare wordmark drawn as a rail line with a little train running along it. */
export function IntroLoader() {
  const loaded = useSite((s) => s.loaded);
  // Read on the very first render (the store only learns it after mount), so the drawing never starts animating first.
  const reduced = useReducedMotion() ?? false;
  const [minDone, setMinDone] = useState(false);
  const [giveUp, setGiveUp] = useState(false);

  useEffect(() => {
    const a = setTimeout(() => setMinDone(true), reduced ? 300 : 1800);
    // Never block the page for long, even if the 3D is slow to start.
    const b = setTimeout(() => setGiveUp(true), 7000);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduced]);

  const show = !((loaded && minDone) || giveUp);
  // The line and the train share one timing, so the train rides the tip of the line as it is drawn.
  const draw = { duration: reduced ? 0 : 1.6, ease: "easeInOut" } as const;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="loader"
          role="status"
          aria-label="Loading the city"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-6 bg-[#070b14]"
        >
          <svg viewBox="0 0 900 210" className="w-[min(640px,86vw)]" aria-hidden>
            <defs>
              {/* pathLength draws with stroke-dasharray, which would replace the dots: draw a mask instead. */}
              <mask id="loader-rail-reveal" maskUnits="userSpaceOnUse">
                <motion.path
                  d={RAIL}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={12}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={draw}
                />
              </mask>
            </defs>
            <path d={RAIL} fill="none" stroke="#1d2536" strokeWidth={10} strokeLinecap="round" />
            <path
              d={RAIL}
              fill="none"
              stroke="#ffb020"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="1 14"
              mask="url(#loader-rail-reveal)"
            />
            <motion.g
              style={{ offsetPath: `path("${RAIL}")`, offsetRotate: "auto" }}
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: "100%" }}
              transition={draw}
            >
              <rect x={-26} y={-9} width={52} height={18} rx={6} fill="#aeb8c6" />
              <rect x={-20} y={-5} width={40} height={5} rx={1} fill="#ffc774" />
              <rect x={24} y={-2} width={4} height={4} fill="#fff2cf" />
            </motion.g>
            <text
              x={450}
              y={205}
              textAnchor="middle"
              className="font-[family-name:var(--font-display)]"
              fontSize={64}
              fontWeight={800}
              fill="#e9eef7"
              letterSpacing={6}
            >
              VIDARE
            </text>
          </svg>
          <p className="text-sm text-[#9aa7bd]">Building Stockholm…</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
