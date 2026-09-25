import { describe, expect, it } from "vitest";
import {
  checkEligibility,
  refundPercentFor,
  RULE_NON_SL,
  RULE_OWN_TAXI,
  RULE_PRE_ANNOUNCED,
  RULE_UPPSALA,
  type EligibilityInput,
} from "@/lib/core/eligibility";
import { SL_RULES } from "@/lib/core/sl-rules";
import { makeDisruption, makeTrip, NOW, place, validTicket } from "./fixtures";

const input = (overrides: Partial<EligibilityInput> = {}): EligibilityInput => ({
  trip: makeTrip(),
  disruption: makeDisruption(),
  ticket: validTicket,
  now: NOW,
  ...overrides,
});

const withDelay = (minutes: number) =>
  checkEligibility(input({ disruption: makeDisruption({ expectedDelayMinutes: minutes }) }));

describe("delay threshold at the final destination", () => {
  it.each([
    [0, false, 0],
    [19, false, 0],
    [20, true, 50],
    [39, true, 50],
    [40, true, 75],
    [59, true, 75],
    [60, true, 100],
    [180, true, 100],
  ])("%i min → eligible=%s, refund %i %%", (delay, eligible, percent) => {
    const r = withDelay(delay);
    expect(r.eligible).toBe(eligible);
    expect(r.expectedDelayMinutes).toBe(delay);
    expect(r.refundPercent).toBe(percent);
    expect(r.route).toBe(eligible ? "taxi" : "none");
    expect(r.taxiCapSEK).toBe(eligible ? SL_RULES.maxPayoutPerOccasion : 0);
  });

  it("explains a sub-threshold delay", () => {
    expect(withDelay(19).reasons).toEqual(["delayBelowThreshold"]);
  });

  it("marks the exact threshold", () => {
    expect(withDelay(20).reasons).toContain("delayAtThreshold");
    expect(withDelay(21).reasons).not.toContain("delayAtThreshold");
  });

  it("refundPercentFor follows the SL tiers", () => {
    expect([19, 20, 39, 40, 59, 60].map((m) => refundPercentFor(m))).toEqual([0, 50, 50, 75, 75, 100]);
  });
});

describe("taxi route", () => {
  it("covers a Red line signal fault with a 35 min delay", () => {
    const r = checkEligibility(input());
    expect(r).toEqual({
      eligible: true,
      route: "taxi",
      reasons: ["taxiCovered"],
      expectedDelayMinutes: 35,
      refundPercent: 50,
      taxiCapSEK: 1480,
      blockedBy: null,
    });
  });

  it("uses the cap from the rules object", () => {
    const rules = { ...SL_RULES, maxPayoutPerOccasion: 1500 } as unknown as typeof SL_RULES;
    expect(checkEligibility(input(), rules).taxiCapSEK).toBe(1500);
  });
});

describe("ticket", () => {
  it("no valid ticket → no compensation on either route", () => {
    const r = checkEligibility(input({ ticket: { ...validTicket, valid: false } }));
    expect(r.eligible).toBe(false);
    expect(r.route).toBe("none");
    expect(r.reasons).toEqual(["noValidTicket"]);
  });
});

describe("pre-announced disruptions", () => {
  const departure = new Date(NOW.getTime() - 5 * 60_000);
  const announcedDaysBefore = (days: number) =>
    makeDisruption({ announcedAt: new Date(departure.getTime() - days * 86_400_000).toISOString() });

  it("announced 4 days before departure → blocked", () => {
    const r = checkEligibility(input({ disruption: announcedDaysBefore(4) }));
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toBe(RULE_PRE_ANNOUNCED);
    expect(r.reasons).toEqual(["preAnnounced"]);
  });

  it("announced exactly 3 days before → blocked", () => {
    expect(checkEligibility(input({ disruption: announcedDaysBefore(3) })).blockedBy).toBe(RULE_PRE_ANNOUNCED);
  });

  it("announced 2 days 23 h before → still covered", () => {
    const r = checkEligibility(input({ disruption: announcedDaysBefore(2 + 23 / 24) }));
    expect(r.eligible).toBe(true);
    expect(r.blockedBy).toBeNull();
  });
});

describe("geographic and operator scope", () => {
  it("trip entirely within Uppsala county → claim from UL", () => {
    const r = checkEligibility(
      input({
        trip: makeTrip({ origin: place("Knivsta", "Uppsala"), destination: place("Uppsala C", "Uppsala"), line: "41" }),
        disruption: makeDisruption({ affectedLines: ["41"], county: "Uppsala" }),
      }),
    );
    expect(r.eligible).toBe(false);
    expect(r.blockedBy).toBe(RULE_UPPSALA);
  });

  it("cross-border commuter trip from Stockholm to Uppsala is covered", () => {
    const r = checkEligibility(
      input({
        trip: makeTrip({ origin: place("Märsta"), destination: place("Uppsala C", "Uppsala"), line: "41" }),
        disruption: makeDisruption({ affectedLines: ["41"] }),
      }),
    );
    expect(r.eligible).toBe(true);
  });

  it("non-SL operator → not SL's liability", () => {
    const r = checkEligibility(input({ disruption: makeDisruption({ operator: "other" }) }));
    expect(r.blockedBy).toBe(RULE_NON_SL);
    expect(r.eligible).toBe(false);
  });

  it("line not affected by the disruption", () => {
    const r = checkEligibility(input({ trip: makeTrip({ line: "17" }) }));
    expect(r.reasons).toEqual(["lineNotAffected"]);
  });

  it("no disruption at all", () => {
    expect(checkEligibility(input({ disruption: null })).reasons).toEqual(["noDisruption"]);
    expect(checkEligibility(input({ disruption: makeDisruption({ active: false }) })).eligible).toBe(false);
  });
});

describe("taxi / refund exclusivity", () => {
  it("taxi already claimed → nothing more", () => {
    const r = checkEligibility(input({ priorClaims: { taxi: true, ticketRefund: false } }));
    expect(r.route).toBe("none");
    expect(r.reasons).toEqual(["alreadyClaimedTaxi"]);
  });

  it("refund already claimed → no taxi", () => {
    const r = checkEligibility(input({ priorClaims: { taxi: false, ticketRefund: true } }));
    expect(r.route).toBe("none");
    expect(r.reasons).toEqual(["alreadyClaimedRefund"]);
  });

  it("choosing the refund route never also opens the taxi route", () => {
    const r = checkEligibility(input({ preferredRoute: "ticketRefund" }));
    expect(r.route).toBe("ticketRefund");
    expect(r.taxiCapSEK).toBe(0);
    expect(r.refundPercent).toBe(50);
  });
});

describe("taxi-specific exclusions fall back to the refund route", () => {
  it("claimant owns the taxi company", () => {
    const r = checkEligibility(input({ claimant: { ownsTaxiCompany: true } }));
    expect(r.route).toBe("ticketRefund");
    expect(r.blockedBy).toBe(RULE_OWN_TAXI);
    expect(r.eligible).toBe(true);
  });

  it("trip already over (arrived late) → refund, not taxi", () => {
    const later = new Date(NOW.getTime() + 60 * 60_000);
    const r = checkEligibility(input({ now: later }));
    expect(r.route).toBe("ticketRefund");
    expect(r.reasons[0]).toBe("tripAlreadyEnded");
  });
});
