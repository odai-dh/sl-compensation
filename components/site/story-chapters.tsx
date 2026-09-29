"use client";

import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";
import { SL_RULES } from "@/lib/core/sl-rules";
import { useSite } from "@/lib/site/store";
import { STATIONS } from "@/lib/site/story";
import { cn } from "@/lib/utils";
import { StrandedCounter, TimeOfDaySlider } from "./hero-controls";
import { MoneyFlow } from "./money-flow";

gsap.registerPlugin(SplitText);

const CAP = SL_RULES.maxPayoutPerOccasion;
const MIN = SL_RULES.minDelayMinutes;
const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

/** Section heights (in viewport heights) – the scroll length of each chapter. */
const HEIGHTS = ["h-[200vh]", "h-[230vh]", "h-[210vh]", "h-[260vh]", "h-[230vh]"];

const overlay = "pointer-events-none fixed inset-0 flex px-6 md:px-16";
const scrim = "rounded-3xl bg-[#070b14]/45 p-6 backdrop-blur-[2px] md:bg-transparent md:p-0 md:backdrop-blur-none";

/**
 * Chapters 1–5. The text lives in real DOM (headings in order); each chapter is a tall spacer section
 * with a fixed overlay. One paused GSAP timeline is seeked to storyT, so every reveal, counter and
 * fade is scrubbed – scrolling fast or backwards always shows the right frame.
 */
export function StoryChapters() {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useSite((s) => s.reducedMotion);
  const current = useSite((s) => s.currentChapter);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      const chapters = gsap.utils.toArray<HTMLElement>("[data-chapter]", el);
      const splits: SplitText[] = [];

      chapters.forEach((ch, i) => {
        const words: Element[] = [];
        if (!reducedMotion) {
          ch.querySelectorAll<HTMLElement>("[data-split]").forEach((node) => {
            const split = SplitText.create(node, { type: "words", mask: "words", aria: "auto" });
            splits.push(split);
            words.push(...split.words);
          });
        }
        if (i === 0) {
          gsap.set(ch, { autoAlpha: 1 });
        } else {
          tl.fromTo(ch, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: "none" }, i - 0.28);
          if (words.length) tl.from(words, { yPercent: 110, duration: 0.25, stagger: 0.012, ease: "power2.out" }, i - 0.3);
        }
        tl.to(ch, { autoAlpha: 0, y: reducedMotion ? 0 : -40, duration: 0.2, ease: "none" }, i + 0.62);
      });

      // Chapter 2: the delay clock ticks past the 20-minute threshold.
      const clock = el.querySelector<HTMLElement>("[data-delay-clock]");
      const clockProxy = { v: 0 };
      if (clock) {
        tl.fromTo(
          clockProxy,
          { v: 0 },
          {
            v: 35,
            duration: 0.5,
            ease: "none",
            onUpdate: () => {
              clock.textContent = `+${Math.floor(clockProxy.v)} min`;
              clock.dataset.over = String(clockProxy.v >= MIN);
            },
          },
          0.95,
        );
      }

      // Chapter 3: the numbers from sl-rules.ts count up.
      const nums = gsap.utils.toArray<HTMLElement>("[data-count]", el);
      nums.forEach((n) => {
        const to = Number(n.dataset.count);
        const proxy = { v: 0 };
        // The server renders the final number; start from 0 so it doesn't flash in before counting up.
        n.textContent = fmt(0);
        tl.fromTo(
          proxy,
          { v: 0 },
          { v: to, duration: 0.35, ease: "power1.out", onUpdate: () => (n.textContent = fmt(proxy.v)) },
          1.85,
        );
      });

      // Chapter 5: the money-flow paths draw in.
      const paths = gsap.utils.toArray<SVGPathElement>("[data-flow-path]", el);
      paths.forEach((p, k) => {
        const len = p.getTotalLength();
        tl.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.18, ease: "none" }, 3.78 + k * 0.08);
      });
      const nodes = gsap.utils.toArray<SVGGElement>("[data-flow-node]", el);
      tl.from(nodes, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.15, stagger: 0.05 }, 3.72);

      tl.seek(useSite.getState().storyT, false);
      const unsubscribe = useSite.subscribe((s) => tl.seek(Math.min(s.storyT, tl.duration()), false));
      return () => {
        unsubscribe();
        splits.forEach((s) => s.revert());
      };
    }, el);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={root}>
      {/* Chapter 1 */}
      <section id={STATIONS[0].id} className={cn("relative", HEIGHTS[0])} aria-labelledby="ch1-title">
        <div data-chapter className={cn(overlay, "items-center bg-gradient-to-r from-[#070b14]/80 via-[#070b14]/30 to-transparent")} inert={current !== 0 || undefined}>
          <div className={cn(scrim, "flex max-w-3xl flex-col gap-6")}>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#ffb020]">Vidare · a hackathon concept</p>
            <h1
              id="ch1-title"
              data-split
              className="font-[family-name:var(--font-display)] text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl"
            >
              17:42. On your way home.
            </h1>
            <p className="max-w-xl text-lg text-[#c9d3e3] md:text-xl">
              When SL leaves you stranded, Vidare gets you home by taxi – and gets SL to pay for it.
            </p>
            <div className="flex flex-col gap-4">
              <StrandedCounter />
              <TimeOfDaySlider />
            </div>
          </div>
          <p className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-1 text-xs font-medium uppercase tracking-[0.3em] text-[#9aa7bd]">
            Scroll
            <ChevronDown className="size-5 motion-safe:animate-bounce" aria-hidden />
          </p>
        </div>
      </section>

      {/* Chapter 2 */}
      <section id={STATIONS[1].id} className={cn("relative", HEIGHTS[1])} aria-labelledby="ch2-title">
        <div data-chapter className={cn(overlay, "items-end bg-gradient-to-t from-[#070b14]/85 via-[#070b14]/20 to-transparent pb-[10vh]")} inert={current !== 1 || undefined}>
          <div className={cn(scrim, "flex max-w-2xl flex-col gap-5")}>
            <h2 id="ch2-title" data-split className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight md:text-6xl">
              Then the train stops.
            </h2>
            <p className="text-lg text-[#c9d3e3] md:text-xl">
              <span className="font-semibold text-[#ff6b6b]">Signal fault.</span> Expected delay: 35 minutes.
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                data-delay-clock
                data-over="false"
                className="whitespace-nowrap font-[family-name:var(--font-display)] text-6xl font-extrabold tabular-nums text-white transition-colors data-[over=true]:text-[#ff3b3b] data-[over=true]:[text-shadow:0_0_30px_rgba(255,59,59,0.7)] md:text-8xl"
                aria-hidden
              >
                +0 min
              </span>
              <span className="text-sm text-[#9aa7bd]">past {MIN} min, you have a right to a taxi</span>
            </div>
          </div>
        </div>
      </section>

      {/* Chapter 3 */}
      <section id={STATIONS[2].id} className={cn("relative", HEIGHTS[2])} aria-labelledby="ch3-title">
        <div data-chapter className={cn(overlay, "items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(7,11,20,0.78),rgba(7,11,20,0.2)_75%)] text-center")} inert={current !== 2 || undefined}>
          <div className={cn(scrim, "flex max-w-4xl flex-col items-center gap-8")}>
            <h2 id="ch3-title" data-split className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight md:text-5xl">
              You have a right most people don’t know about.
            </h2>
            <div className="grid grid-cols-2 gap-6 md:gap-16">
              <div>
                <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold text-[#ffb020] md:text-8xl">
                  <span data-count={MIN}>{MIN}</span>
                  <span className="text-3xl md:text-5xl"> min</span>
                </p>
                <p className="mt-2 text-sm text-[#c9d3e3]">risk of delay at your final destination</p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-6xl font-extrabold text-[#ffb020] md:text-8xl">
                  <span data-count={CAP}>{fmt(CAP)}</span>
                  <span className="text-3xl md:text-5xl"> kr</span>
                </p>
                <p className="mt-2 text-sm text-[#c9d3e3]">SL reimburses for a taxi, per occasion</p>
              </div>
            </div>
            <p className="max-w-2xl text-lg text-[#dbe2ee]">
              Under Swedish law (Lag 2015:953) and SL’s own terms, if SL traffic risks making you more than {MIN} minutes late,
              you may take a taxi – and SL pays up to {fmt(CAP)} kr.
            </p>
            <p className="text-lg font-semibold text-white">But who fronts {fmt(CAP)} kr and waits weeks for a refund?</p>
          </div>
        </div>
      </section>

      {/* Chapter 4 */}
      <section id={STATIONS[3].id} className={cn("relative", HEIGHTS[3])} aria-labelledby="ch4-title">
        <div data-chapter className={cn(overlay, "items-start justify-end bg-gradient-to-l from-[#070b14]/80 via-[#070b14]/25 to-transparent pt-28 md:items-center md:pt-0")} inert={current !== 3 || undefined}>
          <div className={cn(scrim, "flex max-w-xl flex-col gap-5 md:text-right")}>
            <h2 id="ch4-title" data-split className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight md:text-6xl">
              Vidare takes it from here.
            </h2>
            <ol className="flex flex-col gap-2 text-lg text-[#dbe2ee]">
              <li>
                <span className="font-semibold text-[#ffb020]">1.</span> Tap “I’m stranded”.
              </li>
              <li>
                <span className="font-semibold text-[#ffb020]">2.</span> Vidare checks SL’s rules in a second.
              </li>
              <li>
                <span className="font-semibold text-[#ffb020]">3.</span> A taxi picks you up – already paid.
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Chapter 5 */}
      <section id={STATIONS[4].id} className={cn("relative", HEIGHTS[4])} aria-labelledby="ch5-title">
        <div data-chapter className={cn(overlay, "flex-col items-center justify-center gap-6 bg-[radial-gradient(ellipse_at_center,rgba(7,11,20,0.7),rgba(7,11,20,0.25)_75%)] text-center")} inert={current !== 4 || undefined}>
          <h2 id="ch5-title" data-split className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-tight md:text-6xl">
            SL pays us. You pay nothing.
          </h2>
          <MoneyFlow />
          <p className="max-w-2xl text-base text-[#c9d3e3] md:text-lg">
            You sign a power of attorney once with BankID. Vidare pays the taxi, files the claim with SL, and SL pays Vidare back.
            You only pay if the ride costs more than {fmt(CAP)} kr – and you’re told before you order.
          </p>
        </div>
      </section>
    </div>
  );
}
