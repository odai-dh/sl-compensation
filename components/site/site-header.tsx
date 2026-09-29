"use client";

import { Smartphone, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { scrollToStation } from "@/lib/site/scroll";
import { useSite } from "@/lib/site/store";
import { TRY_STATION } from "@/lib/site/story";
import { cn } from "@/lib/utils";
import { Magnetic, siteButton } from "./magnetic";

export function SiteHeader() {
  const soundOn = useSite((s) => s.soundOn);
  return (
    <header
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 bg-gradient-to-b from-[#070b14]/85 to-transparent px-4 py-4 md:px-8"
    >
      <button
        type="button"
        onClick={() => scrollToStation(0)}
        className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[#ffb020]"
        aria-label="Vidare – back to the top"
      >
        Vidare
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => useSite.getState().set({ soundOn: !soundOn })}
          aria-pressed={soundOn}
          className={cn(siteButton.ghost, "h-10 px-4 text-sm")}
        >
          {soundOn ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
          Sound {soundOn ? "on" : "off"}
        </button>
        <Link href="/app" className={cn(siteButton.ghost, "hidden h-10 px-4 text-sm sm:inline-flex")}>
          <Smartphone className="size-4" aria-hidden /> Open app
        </Link>
        <Magnetic>
          <button type="button" onClick={() => scrollToStation(TRY_STATION, { offsetRatio: 0 })} className={cn(siteButton.primary, "h-10 px-5 text-sm")}>
            Try it
          </button>
        </Magnetic>
      </div>
    </header>
  );
}
