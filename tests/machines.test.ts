import { describe, expect, it } from "vitest";
import {
  canTransition,
  ClaimTransitionError,
  complaintDeadline,
  pathTo,
  reconsiderationDeadline,
  transition,
  type ClaimState,
} from "@/lib/core/claim-machine";
import { DEMO_TIMELINE, fastForwardOffsetSec, rideSnapshot, totalSeconds, type RideSimInput } from "@/lib/core/ride-machine";

describe("claim status machine", () => {
  const start: ClaimState = { status: "submitted", history: [{ status: "submitted", at: "2026-09-25T08:00:00.000Z" }] };
  const t = (iso: string) => new Date(iso);

  it("follows submitted → underReview → approved → paidOut", () => {
    let s = transition(start, "underReview", t("2026-09-26T08:00:00Z"));
    s = transition(s, "approved", t("2026-10-01T08:00:00Z"));
    s = transition(s, "paidOut", t("2026-10-05T08:00:00Z"));
    expect(s.status).toBe("paidOut");
    expect(s.history.map((h) => h.status)).toEqual(["submitted", "underReview", "approved", "paidOut"]);
    expect(s.decidedAt).toBe("2026-10-01T08:00:00.000Z");
  });

  it("rejects illegal jumps", () => {
    expect(canTransition("submitted", "paidOut")).toBe(false);
    expect(canTransition("paidOut", "underReview")).toBe(false);
    expect(() => transition(start, "approved", new Date())).toThrow(ClaimTransitionError);
  });

  it("a rejection needs a reason", () => {
    const review = transition(start, "underReview", new Date());
    expect(() => transition(review, "rejected", new Date())).toThrow(/reason/);
    const rejected = transition(review, "rejected", new Date(), { rejectionReason: "userFault" });
    expect(rejected.rejectionReason).toBe("userFault");
  });

  it("allows reconsideration only within 3 weeks of the decision", () => {
    const review = transition(start, "underReview", t("2026-09-26T08:00:00Z"));
    const rejected = transition(review, "rejected", t("2026-10-01T08:00:00Z"), { rejectionReason: "other" });
    expect(transition(rejected, "underReview", t("2026-10-20T08:00:00Z")).status).toBe("underReview");
    expect(() => transition(rejected, "underReview", t("2026-10-23T08:00:00Z"))).toThrow(/3-week/);
  });

  it("finds a path for the admin force action", () => {
    expect(pathTo("submitted", "paidOut")).toEqual(["underReview", "approved", "paidOut"]);
    expect(pathTo("submitted", "rejected")).toEqual(["underReview", "rejected"]);
    expect(pathTo("rejected", "paidOut")).toEqual(["underReview", "approved", "paidOut"]);
    expect(pathTo("paidOut", "submitted")).toBeNull();
    expect(pathTo("approved", "approved")).toEqual([]);
  });

  it("computes SL deadlines", () => {
    expect(complaintDeadline(t("2026-09-25T08:00:00Z")).toISOString()).toBe("2026-12-25T08:00:00.000Z");
    expect(complaintDeadline(t("2026-11-30T08:00:00Z")).toISOString()).toBe("2027-02-28T08:00:00.000Z");
    expect(reconsiderationDeadline(t("2026-10-01T08:00:00Z")).toISOString()).toBe("2026-10-22T08:00:00.000Z");
  });
});

describe("ride status machine", () => {
  const bookedAt = Date.UTC(2026, 8, 25, 7, 30);
  const base: RideSimInput = {
    bookedAt,
    now: bookedAt,
    timeline: DEMO_TIMELINE,
    driverStart: { lat: 59.34, lng: 18.05 },
    origin: { lat: 59.33, lng: 18.06 },
    destination: { lat: 59.31, lng: 18.02 },
    pickupEtaMin: 4,
    tripDurationMin: 18,
  };
  const at = (sec: number) => rideSnapshot({ ...base, now: bookedAt + sec * 1000 });

  it("walks through every status in order", () => {
    const seen = new Set<string>();
    for (let s = 0; s <= totalSeconds(DEMO_TIMELINE) + 1; s += 0.5) seen.add(at(s).status);
    expect([...seen]).toEqual(["searching", "driverAssigned", "arriving", "inProgress", "completed"]);
  });

  it("counts the pickup ETA down while arriving", () => {
    const early = at(fastForwardOffsetSec(DEMO_TIMELINE, "arriving") + 0.1);
    const late = at(fastForwardOffsetSec(DEMO_TIMELINE, "inProgress") - 0.1);
    expect(early.status).toBe("arriving");
    expect(early.etaPickupMin).toBe(4);
    expect(late.etaPickupMin).toBe(1);
  });

  it("moves the car along a straight line to the destination", () => {
    const mid = at(fastForwardOffsetSec(DEMO_TIMELINE, "inProgress") + DEMO_TIMELINE.inProgressSec / 2);
    expect(mid.status).toBe("inProgress");
    expect(mid.carPosition!.lat).toBeCloseTo(59.32, 5);
    expect(mid.carPosition!.lng).toBeCloseTo(18.04, 5);
    expect(at(1000).carPosition).toEqual(base.destination);
  });

  it("has no car while searching and handles cancellation", () => {
    expect(at(0).carPosition).toBeNull();
    expect(rideSnapshot({ ...base, cancelled: true }).status).toBe("cancelled");
  });

  it("reports progress from 0 to 1", () => {
    expect(at(0).progress).toBe(0);
    expect(at(totalSeconds(DEMO_TIMELINE)).progress).toBe(1);
  });
});
