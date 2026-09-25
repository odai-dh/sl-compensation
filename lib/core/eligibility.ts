import { PRE_ANNOUNCED_DAYS, SL_RULES, type NoCompensationRule, type SLRules } from "./sl-rules";
import type { Disruption, Route, Ticket, Trip } from "./types";

export type EligibilityInput = {
  trip: Trip;
  disruption: Disruption | null;
  ticket: Ticket;
  now: Date;
  claimant?: { ownsTaxiCompany?: boolean };
  /** Compensation already claimed for this same disruption (taxi and refund are exclusive). */
  priorClaims?: { taxi: boolean; ticketRefund: boolean };
  /** The traveller can choose to stay on SL and ask for a ticket refund instead. */
  preferredRoute?: "taxi" | "ticketRefund";
};

/** i18n keys (see lib/i18n) explaining the verdict, most important first. */
export type EligibilityReason =
  | "noDisruption"
  | "lineNotAffected"
  | "uppsalaOnly"
  | "nonSlOperator"
  | "preAnnounced"
  | "delayBelowThreshold"
  | "delayAtThreshold"
  | "noValidTicket"
  | "alreadyClaimedTaxi"
  | "alreadyClaimedRefund"
  | "ownsTaxiCompany"
  | "tripAlreadyEnded"
  | "refundChosen"
  | "taxiCovered"
  | "refundAvailable";

export type EligibilityResult = {
  eligible: boolean;
  route: Route;
  reasons: EligibilityReason[];
  expectedDelayMinutes: number;
  /** Percent of the fare refunded on the ticket-refund route (0 when not applicable). */
  refundPercent: number;
  /** Max SL reimburses for a taxi on this occasion (0 when the taxi route is not open). */
  taxiCapSEK: number;
  blockedBy: NoCompensationRule | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const rule = (index: number, rules: SLRules = SL_RULES): NoCompensationRule =>
  rules.noCompensationIf[index];

export const RULE_PRE_ANNOUNCED = rule(0);
export const RULE_CONSEQUENTIAL = rule(1);
export const RULE_TIPS = rule(2);
export const RULE_OWN_TAXI = rule(3);
export const RULE_NON_SL = rule(4);
export const RULE_UPPSALA = rule(5);

/** Refund percent for a delay, from SL's tiers. 0 below the threshold. */
export function refundPercentFor(delayMinutes: number, rules: SLRules = SL_RULES): number {
  if (delayMinutes < rules.minDelayMinutes) return 0;
  const tier = rules.refundTiers.find(
    (t) => delayMinutes >= t.minDelay && (t.maxDelay === null || delayMinutes <= t.maxDelay),
  );
  return tier?.percent ?? 0;
}

export function isPreAnnounced(disruption: Disruption, scheduledDeparture: Date): boolean {
  const announced = new Date(disruption.announcedAt).getTime();
  return scheduledDeparture.getTime() - announced >= PRE_ANNOUNCED_DAYS * DAY_MS;
}

export function isUppsalaCountyOnly(trip: Trip): boolean {
  return trip.origin.county === "Uppsala" && trip.destination.county === "Uppsala";
}

function result(
  partial: Partial<EligibilityResult> & Pick<EligibilityResult, "reasons">,
  expectedDelayMinutes: number,
): EligibilityResult {
  return {
    eligible: false,
    route: "none",
    refundPercent: 0,
    taxiCapSEK: 0,
    blockedBy: null,
    expectedDelayMinutes,
    ...partial,
  };
}

/**
 * Decides whether a stranded traveller may take a taxi (or get a ticket refund) under SL's rules.
 * Pure: every input, including "now", is passed in.
 */
export function checkEligibility(
  input: EligibilityInput,
  rules: SLRules = SL_RULES,
): EligibilityResult {
  const { trip, disruption, ticket, now } = input;

  if (!disruption || !disruption.active) {
    return result({ reasons: ["noDisruption"] }, 0);
  }

  const delay = Math.max(0, Math.round(disruption.expectedDelayMinutes));

  if (!disruption.affectedLines.includes(trip.line)) {
    return result({ reasons: ["lineNotAffected"] }, 0);
  }

  // Geographic and operator scope come first: these are never SL's liability.
  if (isUppsalaCountyOnly(trip)) {
    return result({ reasons: ["uppsalaOnly"], blockedBy: RULE_UPPSALA }, delay);
  }
  if (trip.operator !== "SL" || disruption.operator !== "SL") {
    return result({ reasons: ["nonSlOperator"], blockedBy: RULE_NON_SL }, delay);
  }

  if (isPreAnnounced(disruption, new Date(trip.scheduledDeparture))) {
    return result({ reasons: ["preAnnounced"], blockedBy: RULE_PRE_ANNOUNCED }, delay);
  }

  // The threshold applies to the delay at the FINAL destination.
  if (delay < rules.minDelayMinutes) {
    return result({ reasons: ["delayBelowThreshold"] }, delay);
  }

  if (!ticket.valid) {
    return result({ reasons: ["noValidTicket"] }, delay);
  }

  const refundPercent = refundPercentFor(delay, rules);
  const prior = input.priorClaims ?? { taxi: false, ticketRefund: false };

  // Taxi and refund are mutually exclusive for the same delay.
  if (rules.refundAndTaxiExclusive && prior.taxi) {
    return result({ reasons: ["alreadyClaimedTaxi"] }, delay);
  }
  if (rules.refundAndTaxiExclusive && prior.ticketRefund) {
    return result({ reasons: ["alreadyClaimedRefund"] }, delay);
  }

  const thresholdReason: EligibilityReason[] =
    delay === rules.minDelayMinutes ? ["delayAtThreshold"] : [];

  const refund = (reasons: EligibilityReason[], blockedBy: NoCompensationRule | null = null) =>
    result(
      { eligible: true, route: "ticketRefund", reasons, refundPercent, blockedBy },
      delay,
    );

  if (input.claimant?.ownsTaxiCompany) {
    return refund(["ownsTaxiCompany", "refundAvailable"], RULE_OWN_TAXI);
  }

  const expectedArrival = new Date(trip.scheduledArrival).getTime() + delay * MINUTE_MS;
  if (now.getTime() >= expectedArrival) {
    return refund(["tripAlreadyEnded", "refundAvailable"]);
  }

  if (input.preferredRoute === "ticketRefund") {
    return refund(["refundChosen", ...thresholdReason]);
  }

  return result(
    {
      eligible: true,
      route: "taxi",
      reasons: ["taxiCovered", ...thresholdReason],
      refundPercent,
      taxiCapSEK: rules.maxPayoutPerOccasion,
    },
    delay,
  );
}
