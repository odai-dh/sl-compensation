import { VIDARE_POLICY, type VidarePolicy } from "./policy";

export type RiskAssessment = {
  claimsInWindow: number;
  /** SL may ask frequent claimants for extra proof – we flag them early. */
  flagged: boolean;
  /** New rides are blocked until a human reviews the account. */
  blocked: boolean;
};

export function assessRisk(
  claimDates: Date[],
  now: Date,
  policy: Pick<VidarePolicy, "claimWindowDays" | "flagAfterClaimsInWindow" | "blockAfterClaimsInWindow"> = VIDARE_POLICY,
): RiskAssessment {
  const windowStart = now.getTime() - policy.claimWindowDays * 24 * 60 * 60 * 1000;
  const claimsInWindow = claimDates.filter((d) => d.getTime() >= windowStart && d <= now).length;
  return {
    claimsInWindow,
    flagged: claimsInWindow > policy.flagAfterClaimsInWindow,
    blocked: claimsInWindow >= policy.blockAfterClaimsInWindow,
  };
}

/** One ride per disruption per user (cancelled rides don't count). */
export function hasRideForDisruption(
  rides: { disruptionId: string; status: string }[],
  disruptionId: string,
  max: number = VIDARE_POLICY.maxRidesPerDisruption,
): boolean {
  return rides.filter((r) => r.disruptionId === disruptionId && r.status !== "cancelled").length >= max;
}
