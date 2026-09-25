"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { setLenis, scrollToStation } from "@/lib/site/scroll";
import { SoundEngine } from "@/lib/site/sound";
import { useSite } from "@/lib/site/store";
import { sceneAt, STATIONS, storyTFromScroll } from "@/lib/site/story";
import { ChapterDots } from "./chapter-dots";
import { Cursor } from "./cursor";
import { IntroLoader } from "./intro-loader";
import { SiteCanvas } from "./site-canvas";
import { SiteHeader } from "./site-header";
import { PresentingHint, Toast } from "./toast";

gsap.registerPlugin(ScrollTrigger);

/** Client root of the showcase site: scroll, keyboard, sound and global overlays. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  useEnvironment();
  useSmoothScroll();
  useStoryScroll();
  useKeyboard();
  useSound();
  const presenting = useSite((s) => s.presenting);

  return (
    <div className="site-root relative min-h-dvh bg-[#070b14] font-[family-name:var(--font-text)] text-[#e9eef7] antialiased" data-presenting={presenting || undefined}>
      <a href="#try" className="sr-only z-50 rounded bg-[#ffb020] px-3 py-2 text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to the live demo
      </a>
      <IntroLoader />
      <SiteCanvas />
      <SiteHeader />
      <ChapterDots />
      <Toast />
      <PresentingHint />
      <Cursor />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function useEnvironment() {
  useEffect(() => {
    const mqMobile = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () =>
      useSite.getState().set({
        mobile: mqMobile.matches,
        reducedMotion: mqReduced.matches,
        debug: new URLSearchParams(window.location.search).get("debug") === "1",
      });
    // ?static=1 forces the illustrated fallback (handy on a weak projector laptop).
    if (new URLSearchParams(window.location.search).get("static") === "1") useSite.getState().set({ quality: "fallback" });
    apply();
    if (useSite.getState().debug) (window as unknown as { __site: typeof useSite }).__site = useSite;
    mqMobile.addEventListener("change", apply);
    mqReduced.addEventListener("change", apply);
    return () => {
      mqMobile.removeEventListener("change", apply);
      mqReduced.removeEventListener("change", apply);
    };
  }, []);
}

function useSmoothScroll() {
  const reducedMotion = useSite((s) => s.reducedMotion);
  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [reducedMotion]);
}

/** scrollY → storyT, written to the store for both the DOM and the 3D scene. */
function useStoryScroll() {
  useEffect(() => {
    let boxes: { top: number; height: number }[] = [];
    const measure = () => {
      boxes = STATIONS.map((s) => {
        const el = document.getElementById(s.id);
        return el ? { top: el.offsetTop, height: el.offsetHeight } : { top: 0, height: 0 };
      });
    };
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      useSite.getState().setScroll(storyTFromScroll(window.scrollY, boxes), max > 0 ? window.scrollY / max : 0);
    };
    measure();
    update();
    const ro = new ResizeObserver(() => {
      measure();
      update();
    });
    ro.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, []);
}

function useKeyboard() {
  useEffect(() => {
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useSite.getState();
      const key = e.key.toLowerCase();

      buffer = (buffer + key).slice(-2);
      if (buffer === "sl") {
        s.spawnTrain();
        buffer = "";
      }
      if (key === "p") {
        s.set({ presenting: !s.presenting });
        return;
      }
      if (s.presenting && ["arrowdown", "arrowright", "pagedown", " "].includes(key)) {
        e.preventDefault();
        scrollToStation(s.currentChapter + 1);
      } else if (s.presenting && ["arrowup", "arrowleft", "pageup"].includes(key)) {
        e.preventDefault();
        scrollToStation(s.currentChapter - 1);
      } else if (key === "escape" && s.presenting) {
        s.set({ presenting: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useSound() {
  useEffect(() => {
    let engine: SoundEngine | null = null;
    let last = 0;
    return useSite.subscribe((s, prev) => {
      if (s.soundOn && !engine) engine = new SoundEngine();
      if (!engine) return;
      if (s.soundOn !== prev.soundOn) engine.setEnabled(s.soundOn);
      if (!s.soundOn) return;
      // Brake squeal when the train stops: in the story (chapter 2) and in the live demo.
      if (s.currentChapter === 1 && prev.currentChapter === 0) engine.brakeSqueal();
      if (s.demo.disruption && !prev.demo.disruption) engine.brakeSqueal();
      if (s.demo.doorCount > prev.demo.doorCount) engine.taxiDoor();
      if (s.demo.paidCount > prev.demo.paidCount) engine.chime();
      const now = performance.now();
      if (now - last > 200) {
        last = now;
        const p = sceneAt(s.storyT, s.demo, 0.5);
        engine.setAmbience(p.rain, 1 - p.trainScripted);
      }
    });
  }, []);
}
