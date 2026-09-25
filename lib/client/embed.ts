"use client";

import { useSyncExternalStore } from "react";
import { APP_SOURCE, type AppEvent } from "@/lib/embed/events";

let embedded: boolean | null = null;

/** Embed mode: /app?embed=1, or any time the app runs inside the showcase website's iframe. */
export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  if (embedded === null) {
    embedded = new URLSearchParams(window.location.search).get("embed") === "1" || window.self !== window.top;
  }
  return embedded;
}

const noopSubscribe = () => () => undefined;

export function useEmbedded(): boolean {
  return useSyncExternalStore(noopSubscribe, isEmbedded, () => false);
}

/** Sends an event to the showcase website. A no-op unless embedded. */
export function emitToSite(event: AppEvent) {
  if (!isEmbedded() || window.parent === window) return;
  window.parent.postMessage({ source: APP_SOURCE, ...event }, window.location.origin);
}

// ── Derive site events from API traffic, so screens don't need to know about the website ─────

const rideSeen = new Map<string, string>();
const ridesCompleted = new Set<string>();
const claimSeen = new Map<string, string>();

type RideLike = { id: string; status: string; progress: number; claimId: string | null; split?: { fareSEK: number } };
type ClaimLike = { id: string; status: string; claimedSEK: number };

function observeRide(ride: RideLike) {
  const key = `${ride.status}:${ride.progress.toFixed(2)}`;
  if (rideSeen.get(ride.id) !== key) {
    rideSeen.set(ride.id, key);
    emitToSite({
      type: "rideStatusChanged",
      rideId: ride.id,
      status: ride.status as never,
      progress: Math.min(1, Math.max(0, ride.progress)),
    });
  }
  if (ride.status === "completed" && ride.claimId && !ridesCompleted.has(ride.id)) {
    ridesCompleted.add(ride.id);
    emitToSite({ type: "rideCompleted", rideId: ride.id, claimId: ride.claimId });
  }
}

/** Claims seen for the first time are recorded silently; changes after that are emitted. */
function observeClaim(claim: ClaimLike, forceEmit = false) {
  const prev = claimSeen.get(claim.id);
  claimSeen.set(claim.id, claim.status);
  if ((prev !== undefined && prev !== claim.status) || forceEmit) {
    emitToSite({ type: "claimStatusChanged", claimId: claim.id, status: claim.status as never, amountSEK: claim.claimedSEK });
  }
}

export function observeApi(method: string, path: string, data: unknown) {
  if (!isEmbedded() || !data) return;
  const p = path.split("?")[0];
  if (method === "POST" && p === "/eligibility") {
    const d = data as { result: { eligible: boolean; route: "taxi" | "ticketRefund" | "none"; expectedDelayMinutes: number }; disruption: { id: string } | null };
    emitToSite({
      type: "eligibilityChecked",
      eligible: d.result.eligible,
      route: d.result.route,
      delayMinutes: d.result.expectedDelayMinutes,
    });
  } else if (method === "POST" && p === "/rides") {
    const ride = data as RideLike;
    emitToSite({ type: "taxiOrdered", rideId: ride.id, fareSEK: ride.split?.fareSEK ?? 0 });
    observeRide(ride);
  } else if (method === "GET" && /^\/rides\/[^/]+$/.test(p)) {
    observeRide(data as RideLike);
  } else if (method === "GET" && /^\/users\/[^/]+\/rides$/.test(p)) {
    for (const r of data as RideLike[]) if (rideSeen.has(r.id)) observeRide(r);
  } else if (method === "GET" && /^\/claims\/[^/]+$/.test(p)) {
    observeClaim(data as ClaimLike);
  } else if (method === "GET" && /^\/users\/[^/]+\/claims$/.test(p)) {
    for (const c of data as ClaimLike[]) observeClaim(c);
  } else if (method === "POST" && /^\/admin\/claims\/[^/]+\/status$/.test(p)) {
    observeClaim(data as ClaimLike, true);
  }
}
