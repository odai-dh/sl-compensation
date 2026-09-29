/**
 * The scroll story, as pure functions. `storyT` runs from 0 to STATIONS.length - 1:
 * the integer part is the section you're in, the fraction is how far through it you've scrolled.
 * Every visual in the 3D scene is derived from storyT (plus demo events), so scrolling backwards
 * or at any speed always produces a consistent frame.
 */
import { DEMO_TIMELINE, totalSeconds } from "@/lib/core/ride-machine";

export const STATIONS = [
  { id: "ch1", label: "On your way home" },
  { id: "ch2", label: "The train stops" },
  { id: "ch3", label: "Your right" },
  { id: "ch4", label: "Vidare takes over" },
  { id: "ch5", label: "SL pays us" },
  { id: "try", label: "Try it" },
  { id: "final", label: "The team" },
] as const;

export type StationId = (typeof STATIONS)[number]["id"];
export const TRY_STATION = STATIONS.findIndex((s) => s.id === "try");
export const LAST_STATION = STATIONS.length - 1;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;
export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};

/** Section geometry in document pixels. */
export type SectionBox = { top: number; height: number };

/** storyT from the scroll position and the (contiguous) story sections. */
export function storyTFromScroll(scrollY: number, sections: SectionBox[]): number {
  if (!sections.length) return 0;
  let index = 0;
  for (let i = 0; i < sections.length; i++) if (scrollY >= sections[i].top) index = i;
  const s = sections[index];
  const local = s.height > 0 ? clamp01((scrollY - s.top) / s.height) : 0;
  return Math.min(index + local, sections.length - 1);
}

/** Which station is "current" (for dots and chapter text). */
export function currentStation(storyT: number): number {
  return Math.min(LAST_STATION, Math.max(0, Math.floor(storyT + 0.35)));
}

/**
 * Where the camera is along its spline, in stations. The camera holds on a station while
 * you read (first ~55 % of the section), then flies to the next one.
 */
export function cameraT(storyT: number, reducedMotion = false): number {
  const i = Math.floor(storyT);
  const local = storyT - i;
  // The live demo keeps its framing while the jury uses the phone.
  const hold = i === TRY_STATION ? 0.85 : 0.55;
  if (reducedMotion) return Math.min(LAST_STATION, local > hold + 0.05 ? i + 1 : i);
  return Math.min(LAST_STATION, i + easeInOutCubic(smoothstep(hold, 1, local)));
}

/** Ratio of the ride timeline at which the driver picks the traveller up. */
export const PICKUP_FRACTION =
  (DEMO_TIMELINE.searchingSec + DEMO_TIMELINE.assignedSec + DEMO_TIMELINE.arrivingSec) / totalSeconds(DEMO_TIMELINE);

/** Taxi position along the street path (0 = off-screen left, pickupU = under the streetlight, 1 = gone). */
export function taxiUFromRide(progress: number, pickupU: number): number {
  const p = clamp01(progress);
  if (p <= PICKUP_FRACTION) return (p / PICKUP_FRACTION) * pickupU;
  return pickupU + ((p - PICKUP_FRACTION) / (1 - PICKUP_FRACTION)) * (1 - pickupU);
}

export type DemoState = {
  disruption: boolean;
  taxiOrdered: boolean;
  rideProgress: number;
  rideDone: boolean;
};

export type SceneParams = {
  /**
   * 0 = trains run freely; above 0 they stop at the red signal (see lib/site/train.ts, which only ever
   * drives them forwards). The sound fades the train rumble out with it.
   */
  trainStop: number;
  signalRed: boolean;
  rain: number;
  flicker: number;
  taxiU: number;
  taxiVisible: boolean;
  roofSign: number;
  phoneRise: number;
  /** 0..1, how much the camera turns to follow the taxi (only while it drives off in ch4). */
  cameraFollow: number;
};

export const TRAIN_STOP_X = 0;

const FINAL_DIM = 0.5;

/**
 * 0..1, how much the scene is darkened behind text-heavy sections (the money chapter and the team).
 * Continuous in storyT, so the overlay never pops on at a section boundary.
 */
export function sceneDim(storyT: number): number {
  const i = Math.floor(storyT);
  const local = storyT - i;
  if (i === 4) return smoothstep(0, 0.25, local) * 0.55 * (1 - smoothstep(0.8, 1, local));
  // Eases in while the camera flies out of the live demo to the final view.
  if (i === TRY_STATION) return FINAL_DIM * smoothstep(0.8, 1, local);
  return i > TRY_STATION ? FINAL_DIM : 0;
}

/** Everything the scene needs, derived from storyT and (in the Try-it section) demo events. */
export function sceneAt(rawT: number, demo: DemoState, pickupU: number): SceneParams {
  // Smooth scrolling can land a fraction of a pixel short of a section: treat that as the section.
  const storyT = Math.abs(rawT - Math.round(rawT)) < 0.004 ? Math.round(rawT) : rawT;
  const i = Math.floor(storyT);
  const local = storyT - i;
  const base: SceneParams = {
    trainStop: 0,
    signalRed: false,
    rain: 0.35,
    flicker: 0,
    taxiU: 0,
    taxiVisible: false,
    roofSign: 0,
    phoneRise: 0,
    cameraFollow: 0,
  };

  // Chapters 1–5: the scripted story.
  if (storyT < TRY_STATION) {
    // Train: runs in ch1, stops at the signal from the fly-in to ch2 until the story ends.
    base.trainStop = smoothstep(0.55, 0.8, storyT);
    base.signalRed = storyT >= 1.05;
    base.rain = lerp(0.35, 1, smoothstep(0.9, 1.4, storyT)) - 0.35 * smoothstep(3.2, 4.2, storyT);
    base.flicker = smoothstep(1.0, 1.3, storyT) * (1 - smoothstep(2.4, 2.9, storyT));

    if (i === 3) {
      // Ch4: the taxi arrives (0–0.4), waits under the streetlight, then drives off (0.55–1).
      base.taxiVisible = true;
      base.taxiU =
        local < 0.4 ? easeOutCubic(local / 0.4) * pickupU : local < 0.55 ? pickupU : lerp(pickupU, 1, easeInOutCubic((local - 0.55) / 0.45));
      base.roofSign = smoothstep(0.15, 0.3, local);
      base.phoneRise = smoothstep(0.05, 0.35, local) * (1 - smoothstep(0.85, 1, local));
      // Eases in as it pulls away and back out before the section ends, so the camera never lurches.
      base.cameraFollow = smoothstep(0.55, 0.7, local) * (1 - smoothstep(0.85, 1, local));
    }
    return base;
  }

  // Try it: the scene mirrors what happens in the real app.
  if (i === TRY_STATION) {
    base.trainStop = demo.disruption ? 1 : 0;
    base.signalRed = demo.disruption;
    base.rain = demo.disruption ? 0.8 : 0.4;
    base.taxiVisible = demo.taxiOrdered && !demo.rideDone;
    base.taxiU = demo.taxiOrdered ? taxiUFromRide(demo.rideProgress, pickupU) : 0;
    base.roofSign = demo.taxiOrdered ? 1 : 0;
    return base;
  }

  // Final: calm city, dimmed behind the text (see sceneDim).
  base.rain = 0.25;
  return base;
}
