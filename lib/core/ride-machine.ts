import { interpolate } from "./geo";
import type { LatLng } from "./types";

export const RIDE_FLOW = ["searching", "driverAssigned", "arriving", "inProgress", "completed"] as const;
export type RideStatus = (typeof RIDE_FLOW)[number] | "cancelled";

/** Real (wall-clock) seconds each phase lasts in the demo. */
export type RideTimeline = {
  searchingSec: number;
  assignedSec: number;
  arrivingSec: number;
  inProgressSec: number;
};

export const DEMO_TIMELINE: RideTimeline = {
  searchingSec: 3,
  assignedSec: 3,
  arrivingSec: 14,
  inProgressSec: 24,
};

export type RideSimInput = {
  bookedAt: number; // epoch ms
  now: number; // epoch ms
  timeline: RideTimeline;
  driverStart: LatLng;
  origin: LatLng;
  destination: LatLng;
  /** "Real world" minutes shown to the user; the demo compresses them into the timeline. */
  pickupEtaMin: number;
  tripDurationMin: number;
  cancelled?: boolean;
};

export type RideSnapshot = {
  status: RideStatus;
  carPosition: LatLng | null;
  /** Minutes until the car reaches the traveller (0 once picked up). */
  etaPickupMin: number;
  /** Minutes until arrival at the final destination. */
  etaArrivalMin: number;
  /** 0..1 across the whole ride. */
  progress: number;
  /** Epoch ms at which the ride completes (for the demo clock). */
  completesAt: number;
  pickedUpAt: number;
};

export function totalSeconds(t: RideTimeline): number {
  return t.searchingSec + t.assignedSec + t.arrivingSec + t.inProgressSec;
}

/** Pure status machine: where is the ride at time `now`? */
export function rideSnapshot(input: RideSimInput): RideSnapshot {
  const { timeline: t, bookedAt } = input;
  const elapsed = Math.max(0, (input.now - bookedAt) / 1000);
  const total = totalSeconds(t);
  const pickedUpAt = bookedAt + (t.searchingSec + t.assignedSec + t.arrivingSec) * 1000;
  const completesAt = bookedAt + total * 1000;
  const base = { completesAt, pickedUpAt };

  if (input.cancelled) {
    return { ...base, status: "cancelled", carPosition: null, etaPickupMin: 0, etaArrivalMin: 0, progress: 0 };
  }

  const tA = t.searchingSec;
  const tB = tA + t.assignedSec;
  const tC = tB + t.arrivingSec;
  const progress = Math.min(1, elapsed / total);

  if (elapsed < tA) {
    return {
      ...base,
      status: "searching",
      carPosition: null,
      etaPickupMin: input.pickupEtaMin,
      etaArrivalMin: input.pickupEtaMin + input.tripDurationMin,
      progress,
    };
  }
  if (elapsed < tB) {
    return {
      ...base,
      status: "driverAssigned",
      carPosition: input.driverStart,
      etaPickupMin: input.pickupEtaMin,
      etaArrivalMin: input.pickupEtaMin + input.tripDurationMin,
      progress,
    };
  }
  if (elapsed < tC) {
    const k = (elapsed - tB) / t.arrivingSec;
    const etaPickupMin = Math.max(1, Math.ceil(input.pickupEtaMin * (1 - k)));
    return {
      ...base,
      status: "arriving",
      carPosition: interpolate(input.driverStart, input.origin, k),
      etaPickupMin,
      etaArrivalMin: etaPickupMin + input.tripDurationMin,
      progress,
    };
  }
  if (elapsed < total) {
    const k = (elapsed - tC) / t.inProgressSec;
    return {
      ...base,
      status: "inProgress",
      carPosition: interpolate(input.origin, input.destination, k),
      etaPickupMin: 0,
      etaArrivalMin: Math.max(1, Math.ceil(input.tripDurationMin * (1 - k))),
      progress,
    };
  }
  return {
    ...base,
    status: "completed",
    carPosition: input.destination,
    etaPickupMin: 0,
    etaArrivalMin: 0,
    progress: 1,
  };
}

/** How far to move `bookedAt` back so the ride jumps to the start of `target`. */
export function fastForwardOffsetSec(t: RideTimeline, target: Exclude<RideStatus, "cancelled">): number {
  switch (target) {
    case "searching":
      return 0;
    case "driverAssigned":
      return t.searchingSec;
    case "arriving":
      return t.searchingSec + t.assignedSec;
    case "inProgress":
      return t.searchingSec + t.assignedSec + t.arrivingSec;
    case "completed":
      return totalSeconds(t);
  }
}
