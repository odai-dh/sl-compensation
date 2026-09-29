import { describe, expect, it } from "vitest";
import { APP_SOURCE, readAppEvent, readSiteMessage, SITE_SOURCE } from "@/lib/embed/events";
import { estimateStranded } from "@/lib/site/stranded";
import {
  cameraT,
  currentStation,
  PICKUP_FRACTION,
  sceneAt,
  STATIONS,
  storyTFromScroll,
  taxiUFromRide,
  TRAIN_STOP_X,
  TRY_STATION,
  type DemoState,
} from "@/lib/site/story";

const ORIGIN = "http://localhost:3000";
const idle: DemoState = { disruption: false, taxiOrdered: false, rideProgress: 0, rideDone: false };

describe("postMessage protocol", () => {
  it("accepts well-formed app events from our origin", () => {
    const ev = readAppEvent({ origin: ORIGIN, data: { source: APP_SOURCE, type: "taxiOrdered", rideId: "r1", fareSEK: 354 } }, ORIGIN);
    expect(ev).toEqual({ type: "taxiOrdered", rideId: "r1", fareSEK: 354 });
  });

  it("rejects other origins, other sources and malformed payloads", () => {
    const data = { source: APP_SOURCE, type: "taxiOrdered", rideId: "r1", fareSEK: 354 };
    expect(readAppEvent({ origin: "https://evil.example", data }, ORIGIN)).toBeNull();
    expect(readAppEvent({ origin: ORIGIN, data: { ...data, source: "other" } }, ORIGIN)).toBeNull();
    expect(readAppEvent({ origin: ORIGIN, data: { ...data, fareSEK: "a lot" } }, ORIGIN)).toBeNull();
    expect(readAppEvent({ origin: ORIGIN, data: "hello" }, ORIGIN)).toBeNull();
    expect(readAppEvent({ origin: ORIGIN, data: { source: APP_SOURCE, type: "rideStatusChanged", rideId: "r", status: "completed", progress: 2 } }, ORIGIN)).toBeNull();
  });

  it("parses site messages", () => {
    expect(readSiteMessage({ origin: ORIGIN, data: { source: SITE_SOURCE, type: "resetDemo" } }, ORIGIN)).toEqual({ type: "resetDemo" });
    expect(readSiteMessage({ origin: ORIGIN, data: { source: SITE_SOURCE, type: "launchMissiles" } }, ORIGIN)).toBeNull();
  });
});

describe("scroll → story", () => {
  const sections = STATIONS.map((_, i) => ({ top: i * 1000, height: 1000 }));

  it("maps scroll position to storyT continuously", () => {
    expect(storyTFromScroll(0, sections)).toBe(0);
    expect(storyTFromScroll(500, sections)).toBe(0.5);
    expect(storyTFromScroll(1000, sections)).toBe(1);
    expect(storyTFromScroll(2250, sections)).toBe(2.25);
    expect(storyTFromScroll(99999, sections)).toBe(STATIONS.length - 1);
  });

  it("holds the camera while reading, then flies", () => {
    expect(cameraT(1.2)).toBe(1);
    expect(cameraT(1.5)).toBe(1);
    expect(cameraT(1.999)).toBeCloseTo(2, 2);
    expect(cameraT(1.8)).toBeGreaterThan(1);
  });

  it("snaps instead of flying with reduced motion", () => {
    expect(cameraT(1.3, true)).toBe(1);
    expect(cameraT(1.7, true)).toBe(2);
  });

  it("names the current station", () => {
    expect(currentStation(0)).toBe(0);
    expect(currentStation(0.7)).toBe(1);
    expect(currentStation(TRY_STATION + 0.1)).toBe(TRY_STATION);
  });
});

describe("scene params", () => {
  it("is the same frame whichever way you scroll", () => {
    const a = sceneAt(1.6, idle, 0.5);
    sceneAt(3.5, idle, 0.5);
    expect(sceneAt(1.6, idle, 0.5)).toEqual(a);
  });

  it("ch1: train cruises, signal green", () => {
    const s = sceneAt(0.2, idle, 0.5);
    expect(s.trainScripted).toBe(0);
    expect(s.signalRed).toBe(false);
  });

  it("ch2: the train stops, the signal turns red and the rain gets heavier", () => {
    const s = sceneAt(1.5, idle, 0.5);
    expect(s.trainScripted).toBe(1);
    expect(s.trainScriptX).toBeCloseTo(TRAIN_STOP_X);
    expect(s.signalRed).toBe(true);
    expect(s.rain).toBeGreaterThan(sceneAt(0.2, idle, 0.5).rain);
  });

  it("ch4: the taxi arrives, waits at the pickup and drives off", () => {
    expect(sceneAt(3.0, idle, 0.5).taxiU).toBe(0);
    expect(sceneAt(3.45, idle, 0.5).taxiU).toBe(0.5);
    expect(sceneAt(3.99, idle, 0.5).taxiU).toBeGreaterThan(0.95);
    expect(sceneAt(3.45, idle, 0.5).roofSign).toBe(1);
  });

  it("ch4: the camera follows the taxi only while it drives off, easing in and out", () => {
    expect(sceneAt(3.1, idle, 0.5).cameraFollow).toBe(0);
    expect(sceneAt(3.5, idle, 0.5).cameraFollow).toBe(0);
    expect(sceneAt(3.78, idle, 0.5).cameraFollow).toBe(1);
    expect(sceneAt(3.99, idle, 0.5).cameraFollow).toBeLessThan(0.05);
    expect(sceneAt(4.0, idle, 0.5).cameraFollow).toBe(0);
    const riding = { disruption: true, taxiOrdered: true, rideProgress: 0.8, rideDone: false };
    expect(sceneAt(TRY_STATION + 0.3, riding, 0.5).cameraFollow).toBe(0);
  });

  it("try it: follows the demo events", () => {
    expect(sceneAt(TRY_STATION + 0.3, idle, 0.5).signalRed).toBe(false);
    const stuck = sceneAt(TRY_STATION + 0.3, { ...idle, disruption: true }, 0.5);
    expect(stuck.signalRed).toBe(true);
    expect(stuck.trainScripted).toBe(1);
    const riding = sceneAt(TRY_STATION + 0.3, { disruption: true, taxiOrdered: true, rideProgress: PICKUP_FRACTION, rideDone: false }, 0.5);
    expect(riding.taxiVisible).toBe(true);
    expect(riding.taxiU).toBeCloseTo(0.5);
  });

  it("maps ride progress to the street path with the pickup under the streetlight", () => {
    expect(taxiUFromRide(0, 0.4)).toBe(0);
    expect(taxiUFromRide(PICKUP_FRACTION, 0.4)).toBeCloseTo(0.4);
    expect(taxiUFromRide(1, 0.4)).toBe(1);
  });
});

describe("stranded counter", () => {
  const now = new Date("2026-09-25T07:30:00Z");
  const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

  it("counts active, unplanned disruptions only", () => {
    const n = estimateStranded(
      [
        { mode: "metro", expectedDelayMinutes: 35, announcedAt: ago(10), active: true },
        { mode: "bus", expectedDelayMinutes: 25, announcedAt: ago(5), active: true },
        { mode: "metro", expectedDelayMinutes: 30, announcedAt: ago(4 * 24 * 60), active: true },
        { mode: "commuterRail", expectedDelayMinutes: 70, announcedAt: ago(5), active: false },
      ],
      now,
    );
    expect(n).toBe(Math.round(120 * 35 * 0.15 + 12 * 25 * 0.15));
  });
});

describe("section boundaries", () => {
  it("treats a sub-pixel miss before the Try-it section as Try-it", () => {
    const riding = { disruption: true, taxiOrdered: true, rideProgress: 0.6, rideDone: false };
    expect(sceneAt(TRY_STATION - 0.001, riding, 0.5).taxiVisible).toBe(true);
    expect(sceneAt(TRY_STATION - 0.2, riding, 0.5).taxiVisible).toBe(false);
  });
});
