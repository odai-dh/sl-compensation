import { describe, expect, it } from "vitest";
import { buildSLClaim, missingRequirements, REQUIREMENT_FIELDS, type TaxiReceipt } from "@/lib/core/claim-builder";
import { missingOnboardingSteps, isOnboarded } from "@/lib/core/onboarding";
import { splitQuote } from "@/lib/core/quote";
import { assessRisk, hasRideForDisruption } from "@/lib/core/risk";
import { bookingEntries, claimBalance, settlementEntries, type LedgerDraft } from "@/lib/core/settlement";
import { SL_RULES } from "@/lib/core/sl-rules";
import { makeDisruption, makeTrip, NOW, validTicket } from "./fixtures";

describe("onboarding", () => {
  it("lists missing steps in order", () => {
    expect(
      missingOnboardingSteps({ identityVerified: true, fullmaktSigned: false, hasCard: false, hasTicket: true }),
    ).toEqual(["fullmakt", "card"]);
    expect(isOnboarded({ identityVerified: true, fullmaktSigned: true, hasCard: true, hasTicket: true })).toBe(true);
  });
});

describe("risk", () => {
  const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);

  it("flags frequent claimants and blocks extreme ones", () => {
    expect(assessRisk([daysAgo(1), daysAgo(2), daysAgo(40)], NOW)).toEqual({
      claimsInWindow: 2,
      flagged: false,
      blocked: false,
    });
    const four = [1, 2, 3, 4].map(daysAgo);
    expect(assessRisk(four, NOW).flagged).toBe(true);
    const six = [1, 2, 3, 4, 5, 6].map(daysAgo);
    expect(assessRisk(six, NOW).blocked).toBe(true);
  });

  it("one ride per disruption", () => {
    const rides = [{ disruptionId: "d1", status: "completed" }];
    expect(hasRideForDisruption(rides, "d1")).toBe(true);
    expect(hasRideForDisruption(rides, "d2")).toBe(false);
    expect(hasRideForDisruption([{ disruptionId: "d1", status: "cancelled" }], "d1")).toBe(false);
  });
});

describe("settlement: who ends up paying", () => {
  const book = (fare: number) => bookingEntries(splitQuote(fare), "r1");

  it("booking below the cap: Vidare pays the taxi", () => {
    expect(book(412)).toEqual([{ kind: "taxiPaymentByVidare", from: "vidare", to: "taxi", amountSEK: 412, rideId: "r1" }]);
  });

  it("booking above the cap: the user pays the excess", () => {
    expect(book(1600).map((e) => [e.from, e.amountSEK])).toEqual([
      ["vidare", 1480],
      ["user", 120],
    ]);
  });

  const settle = (status: "paidOut" | "rejected", existing: LedgerDraft[], reason?: "userFault" | "other") =>
    settlementEntries({ status, claimId: "c1", rideId: "r1", claimedSEK: 412, rejectionReason: reason, existing });

  it("paid out: SL pays Vidare, once", () => {
    const first = settle("paidOut", book(412));
    expect(first).toEqual([{ kind: "slPayout", from: "sl", to: "vidare", amountSEK: 412, claimId: "c1", rideId: "r1" }]);
    expect(settle("paidOut", [...book(412), ...first])).toEqual([]);
  });

  it("rejected for user fault: the user's card is charged", () => {
    expect(settle("rejected", book(412), "userFault")[0]).toMatchObject({ kind: "userFaultCharge", from: "user", to: "vidare" });
  });

  it("rejected for another reason: Vidare absorbs the loss", () => {
    expect(settle("rejected", book(412), "other")[0]).toMatchObject({ kind: "writeOff", from: "vidare", to: "loss" });
  });

  it("reconsidered and paid after a user-fault rejection: the user is refunded", () => {
    const charged = [...book(412), ...settle("rejected", book(412), "userFault")];
    expect(settle("paidOut", charged).map((e) => e.kind)).toEqual(["slPayout", "userRefund"]);
  });

  it("balances per claim", () => {
    const entries = book(412);
    expect(claimBalance(entries, { status: "underReview", claimedSEK: 412 })).toEqual({
      vidareOutSEK: 412,
      vidareInSEK: 0,
      lossSEK: 0,
      receivableSEK: 412,
      netSEK: -412,
    });
    const paid = [...entries, ...settle("paidOut", entries)];
    expect(claimBalance(paid, { status: "paidOut", claimedSEK: 412 })).toMatchObject({ netSEK: 0, receivableSEK: 0 });
    const lost = [...entries, ...settle("rejected", entries, "other")];
    expect(claimBalance(lost, { status: "rejected", claimedSEK: 412 })).toMatchObject({ lossSEK: 412, receivableSEK: 0 });
  });
});

describe("SL claim payload", () => {
  const receipt: TaxiReceipt = {
    receiptNo: "R-1",
    company: "Mock Taxi",
    orgNr: "559000-0000",
    vehicleReg: "ABC 123",
    driverName: "Driver",
    pickupAt: NOW.toISOString(),
    dropoffAt: NOW.toISOString(),
    fromAddress: "A",
    toAddress: "B",
    distanceKm: 10,
    fareSEK: 1600,
    tipSEK: 0,
    vatSEK: 90.57,
    original: true,
  };
  const build = (name = "Test Testsson") =>
    buildSLClaim({
      claimant: { name, personnummer: "19900101-0000", address: "Testgatan 1" },
      trip: makeTrip(),
      disruption: makeDisruption(),
      ticket: validTicket,
      receipt,
      payoutAccount: { holder: "Vidare AB", clearing: "8327-9", account: "000 000 000-0" },
      fullmakt: { id: "f1", signedAt: NOW.toISOString() },
      agentName: "Vidare AB",
    });

  it("maps every SL requirement to a field", () => {
    expect(Object.keys(REQUIREMENT_FIELDS).sort()).toEqual([...SL_RULES.claimRequires].sort());
    expect(missingRequirements(build())).toEqual([]);
  });

  it("never claims more than the cap", () => {
    expect(build().claimedSEK).toBe(1480);
  });

  it("detects missing data", () => {
    expect(missingRequirements(build(" "))).toEqual(["name"]);
  });
});
