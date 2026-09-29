"use client";

import { ArrowUp, Smartphone } from "lucide-react";
import Link from "next/link";
import { CLOSING_LINE } from "@/lib/site/content";
import { scrollToStation } from "@/lib/site/scroll";
import { STATIONS } from "@/lib/site/story";
import { Faq } from "./faq";
import { Magnetic, siteButton } from "./magnetic";

export function FinalSection() {
  return (
    <section id={STATIONS[STATIONS.length - 1].id} className="relative min-h-[120vh] px-4 pb-10 pt-32 md:px-16" aria-labelledby="final-title">
      <div className="mx-auto flex max-w-6xl flex-col gap-24">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffb020]">Good to know</p>
          <h2 id="final-title" className="font-[family-name:var(--font-display)] text-4xl font-extrabold md:text-5xl">
            Before you ride.
          </h2>
          <Faq />
        </div>

        <div className="flex flex-col items-center gap-8 py-16 text-center">
          <p className="max-w-4xl font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight md:text-6xl">
            {CLOSING_LINE}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Magnetic>
              <Link href="/app" className={siteButton.primary}>
                <Smartphone className="size-5" aria-hidden /> Open the app
              </Link>
            </Magnetic>
            <button type="button" onClick={() => scrollToStation(0)} className={siteButton.ghost}>
              <ArrowUp className="size-4" aria-hidden /> Back to the start
            </button>
          </div>
        </div>

        <footer className="border-t border-white/10 pt-6 text-center text-sm text-[#9aa7bd] md:text-left">
          <p>Vidare is a concept demo – no real taxis, payments or claims. Not affiliated with SL.</p>
        </footer>
      </div>
    </section>
  );
}
