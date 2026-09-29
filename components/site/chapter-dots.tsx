"use client";

import { scrollToStation } from "@/lib/site/scroll";
import { useSite } from "@/lib/site/store";
import { STATIONS } from "@/lib/site/story";
import { cn } from "@/lib/utils";

export function ChapterDots() {
  const current = useSite((s) => s.currentChapter);
  return (
    <nav
      aria-label="Chapters"
      className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 md:flex"
    >
      {STATIONS.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollToStation(i)}
          aria-label={s.label}
          aria-current={i === current ? "step" : undefined}
          className="group flex h-8 items-center justify-end gap-3"
        >
          <span className="pointer-events-none translate-x-2 whitespace-nowrap text-xs font-medium text-[#c9d3e3] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
            {s.label}
          </span>
          <span
            className={cn(
              "block rounded-full transition-all duration-300",
              i === current ? "h-6 w-1.5 bg-[#ffb020] shadow-[0_0_12px_#ffb020]" : "size-1.5 bg-[#8995ab] group-hover:bg-white",
            )}
          />
        </button>
      ))}
    </nav>
  );
}
