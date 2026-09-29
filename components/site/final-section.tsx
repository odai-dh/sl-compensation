"use client";

import { ArrowUp, Smartphone } from "lucide-react";
import Link from "next/link";
import { CLOSING_LINE, OPEN_QUESTIONS, TEAM, TECH } from "@/lib/site/content";
import { scrollToStation } from "@/lib/site/scroll";
import { STATIONS } from "@/lib/site/story";
import { cn } from "@/lib/utils";
import { Magnetic, siteButton } from "./magnetic";
import { TiltCard } from "./tilt-card";

export function FinalSection() {
  return (
    <section id={STATIONS[STATIONS.length - 1].id} className="relative min-h-[120vh] px-4 pb-10 pt-32 md:px-16" aria-labelledby="final-title">
      <div className="mx-auto flex max-w-6xl flex-col gap-24">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffb020]">The team</p>
          <h2 id="final-title" className="font-[family-name:var(--font-display)] text-4xl font-extrabold md:text-5xl">
            Built for the stranded.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {TEAM.map((m) => (
              <TiltCard key={m.name} className="rounded-3xl">
                <div className="flex h-full flex-col gap-3 rounded-3xl border border-white/10 bg-[#0e1422]/80 p-6 backdrop-blur">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#ffb020]/15 font-bold text-[#ffb020]">
                    {m.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <p className="text-lg font-semibold">{m.name}</p>
                  <p className="text-sm text-[#9aa7bd]">{m.role}</p>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">Built with</h3>
          <ul className="flex flex-wrap gap-3 [perspective:700px]">
            {TECH.map((t, i) => (
              <li key={t}>
                <TiltCard max={18}>
                  <span
                    className="inline-flex items-center rounded-xl border border-[#ffb020]/40 bg-gradient-to-b from-[#1c2436] to-[#0c111b] px-4 py-2.5 text-sm font-semibold shadow-[0_6px_0_#05070d,0_0_24px_rgba(255,176,32,0.18)] [transform:translateZ(0)]"
                    style={{ transform: `rotateX(${8 + (i % 3) * 4}deg)` }}
                  >
                    <span className="mr-2 size-1.5 rounded-full bg-[#ffb020] shadow-[0_0_8px_#ffb020]" aria-hidden />
                    {t}
                  </span>
                </TiltCard>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold">Open questions we’re honest about</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {OPEN_QUESTIONS.map((q) => (
              <TiltCard key={q.q} max={6} className="rounded-3xl">
                <div className="h-full rounded-3xl border border-white/10 bg-[#0e1422]/80 p-6 backdrop-blur">
                  <p className="font-semibold text-white">{q.q}</p>
                  <p className="mt-2 text-sm text-[#b3bfd1]">{q.a}</p>
                </div>
              </TiltCard>
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
            <button type="button" onClick={() => scrollToStation(0)} className={cn(siteButton.ghost)}>
              <ArrowUp className="size-4" aria-hidden /> Back to the start
            </button>
          </div>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-sm text-[#9aa7bd] md:flex-row">
          <p>Hackathon concept. Not affiliated with SL.</p>
          <p>
            Press <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-xs">P</kbd> to present
          </p>
        </footer>
      </div>
    </section>
  );
}
