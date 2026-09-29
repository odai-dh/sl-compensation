"use client";

import { create } from "zustand";
import type { AppEvent } from "@/lib/embed/events";
import { currentStation, type DemoState } from "./story";

export type Quality = "high" | "low" | "fallback";

type Checklist = { stranded: boolean; ordered: boolean; paid: boolean };

type SiteState = {
  /** Continuous story position (see lib/site/story.ts). */
  storyT: number;
  /** 0–1 over the whole page. */
  scrollProgress: number;
  currentChapter: number;
  quality: Quality;
  mobile: boolean;
  reducedMotion: boolean;
  /** 0 = evening, 1 = midnight. */
  timeOfDay: number;
  soundOn: boolean;
  presenting: boolean;
  debug: boolean;
  loaded: boolean;
  cursorOverPhone: boolean;
  demo: DemoState & {
    rideId: string | null;
    claimId: string | null;
    rideStatus: string | null;
    paidCount: number;
    doorCount: number;
    checklist: Checklist;
    appReady: boolean;
    juryRunning: boolean;
  };
  toast: { id: number; text: string } | null;
  setScroll: (storyT: number, scrollProgress: number) => void;
  set: (patch: Partial<Omit<SiteState, "demo">>) => void;
  applyAppEvent: (e: AppEvent) => void;
  resetDemo: () => void;
  setJury: (running: boolean) => void;
  showToast: (text: string) => void;
};

const freshDemo = (): SiteState["demo"] => ({
  disruption: false,
  taxiOrdered: false,
  rideProgress: 0,
  rideDone: false,
  rideId: null,
  claimId: null,
  rideStatus: null,
  paidCount: 0,
  doorCount: 0,
  checklist: { stranded: false, ordered: false, paid: false },
  appReady: false,
  juryRunning: false,
});

/** One store for the DOM and the 3D scene, so both always show the same moment. */
export const useSite = create<SiteState>()((set, get) => ({
  storyT: 0,
  scrollProgress: 0,
  currentChapter: 0,
  quality: "high",
  mobile: false,
  reducedMotion: false,
  timeOfDay: 0.35,
  soundOn: false,
  presenting: false,
  debug: false,
  loaded: false,
  cursorOverPhone: false,
  demo: freshDemo(),
  toast: null,

  setScroll: (storyT, scrollProgress) => {
    const currentChapter = currentStation(storyT);
    set(get().currentChapter === currentChapter ? { storyT, scrollProgress } : { storyT, scrollProgress, currentChapter });
  },
  set: (patch) => set(patch),

  applyAppEvent: (e) => {
    const d = get().demo;
    switch (e.type) {
      case "ready":
        set({ demo: { ...d, appReady: true } });
        break;
      case "disruptionDetected":
        set({ demo: { ...d, disruption: true, checklist: { ...d.checklist, stranded: true } } });
        break;
      case "eligibilityChecked":
        set({ demo: { ...d, disruption: d.disruption || e.route !== "none", checklist: { ...d.checklist, stranded: true } } });
        break;
      case "taxiOrdered":
        set({
          demo: {
            ...d,
            disruption: true,
            taxiOrdered: true,
            rideDone: false,
            rideProgress: 0,
            rideId: e.rideId,
            claimId: null,
            doorCount: d.doorCount + 1,
            checklist: { ...d.checklist, stranded: true, ordered: true },
          },
        });
        break;
      case "rideStatusChanged":
        if (e.rideId !== d.rideId && d.rideId) break;
        set({ demo: { ...d, taxiOrdered: true, rideId: e.rideId, rideStatus: e.status, rideProgress: e.progress } });
        break;
      case "rideCompleted":
        set({ demo: { ...d, rideProgress: 1, rideDone: true, claimId: e.claimId ?? d.claimId } });
        break;
      case "claimStatusChanged":
        if (e.status === "paidOut" && !d.checklist.paid) {
          set({ demo: { ...d, claimId: e.claimId, paidCount: d.paidCount + 1, checklist: { ...d.checklist, paid: true } } });
          get().showToast(`Paid by SL · ${e.amountSEK} kr`);
        } else if (!d.claimId) {
          set({ demo: { ...d, claimId: e.claimId } });
        }
        break;
      default:
        break;
    }
  },
  resetDemo: () => set({ demo: { ...freshDemo(), appReady: get().demo.appReady } }),
  setJury: (running) => set({ demo: { ...get().demo, juryRunning: running } }),
  showToast: (text) => set({ toast: { id: Date.now(), text } }),
}));
