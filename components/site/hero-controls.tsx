"use client";

import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { Moon, Sunset } from "lucide-react";
import { useEffect, useState } from "react";
import { estimateStranded } from "@/lib/site/stranded";
import { useSite } from "@/lib/site/store";
import { api } from "@/lib/client/api";

/** Drag from evening to midnight: sky, windows and streetlights follow. */
export function TimeOfDaySlider() {
  const tod = useSite((s) => s.timeOfDay);
  return (
    <label className="pointer-events-auto flex w-full max-w-xs items-center gap-3 text-xs font-medium text-[#c9d3e3]">
      <Sunset className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">Time of day, from evening to midnight</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(tod * 100)}
        onChange={(e) => useSite.getState().set({ timeOfDay: Number(e.target.value) / 100 })}
        aria-valuetext={tod < 0.5 ? "Evening" : "Midnight"}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-[#ffb020]"
      />
      <Moon className="size-4 shrink-0" aria-hidden />
    </label>
  );
}

/** Live "stranded right now" estimate from the (mock) SL disruption adapter. */
export function StrandedCounter() {
  const [target, setTarget] = useState<number | null>(null);
  const [lines, setLines] = useState(0);
  const value = useMotionValue(0);
  const rounded = useTransform(value, (v) => Math.round(v).toLocaleString("sv-SE"));

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const list = await api.disruptions();
        if (!alive) return;
        setTarget(estimateStranded(list, new Date()));
        setLines(list.length);
      } catch {
        /* keep the last value */
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (target === null) return;
    const controls = animate(value, target, { duration: 1.6, ease: "easeOut" });
    return () => controls.stop();
  }, [target, value]);

  return (
    <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-[#ff3b3b]/40 bg-[#ff3b3b]/10 py-2 pl-3 pr-4 text-sm backdrop-blur">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#ff3b3b] opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2.5 rounded-full bg-[#ff3b3b]" />
      </span>
      <span>
        <motion.span className="font-bold tabular-nums text-white">{rounded}</motion.span>{" "}
        <span className="text-[#dbe2ee]">travellers stranded right now</span>
        <span className="text-[#9aa7bd]"> · {lines} disruptions · demo data</span>
      </span>
    </div>
  );
}
