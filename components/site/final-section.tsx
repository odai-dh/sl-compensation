"use client";

import { ArrowUp, ExternalLink, Plus, Smartphone } from "lucide-react";
import Link from "next/link";
import { CLOSING_LINE, FAQ } from "@/lib/site/content";
import { scrollToStation } from "@/lib/site/scroll";
import { STATIONS } from "@/lib/site/story";
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
          <div className="grid items-start gap-3 md:grid-cols-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-3xl border border-white/10 bg-[#0e1422]/80 backdrop-blur open:border-[#ffb020]/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-semibold text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus className="size-5 shrink-0 text-[#ffb020] transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <div className="-mt-2 flex flex-col gap-3 px-6 pb-6 text-sm leading-relaxed text-[#b3bfd1]">
                  <p>{f.a}</p>
                  {f.link && (
                    <a
                      href={f.link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 self-start font-semibold text-[#ffb020] underline-offset-4 hover:underline"
                    >
                      {f.link.label} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </details>
            ))}
          </div>
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
