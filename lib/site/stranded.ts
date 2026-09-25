import { PRE_ANNOUNCED_DAYS } from "@/lib/core/sl-rules";
import type { Disruption, TransportMode } from "@/lib/core/types";

/** Rough boardings per minute on an affected stretch at rush hour. Demo numbers, not SL data. */
const RIDERS_PER_MINUTE: Record<TransportMode, number> = {
  metro: 120,
  commuterRail: 80,
  lightRail: 25,
  tram: 25,
  bus: 12,
  ferry: 5,
};

/** Share of affected travellers who end up 20+ minutes late. */
const STRANDED_SHARE = 0.15;

/**
 * Estimates how many travellers are stranded right now by active, unplanned disruptions.
 * Pre-announced (planned) disruptions are skipped – people plan around them.
 */
export function estimateStranded(disruptions: Pick<Disruption, "mode" | "expectedDelayMinutes" | "announcedAt" | "active">[], now: Date): number {
  return Math.round(
    disruptions
      .filter((d) => d.active)
      .filter((d) => now.getTime() - new Date(d.announcedAt).getTime() < PRE_ANNOUNCED_DAYS * 86_400_000)
      .reduce((sum, d) => sum + RIDERS_PER_MINUTE[d.mode] * Math.min(d.expectedDelayMinutes, 60) * STRANDED_SHARE, 0),
  );
}
