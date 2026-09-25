import { beforeEach, describe, expect, it } from "vitest";
import { BANKID_MOCK_DURATION_MS, createMockBankIdAdapter } from "@/lib/adapters/mock/bankid";
import { createMockDisruptionAdapter } from "@/lib/adapters/mock/disruptions";
import { createMockPaymentAdapter, TEST_CARDS } from "@/lib/adapters/mock/payments";
import { AUTO_REVIEW_AFTER_MS, createMockSLClaimsAdapter } from "@/lib/adapters/mock/sl-claims";
import { createMockTaxiAdapter, mockFare } from "@/lib/adapters/mock/taxi";
import { PaymentError, TaxiUnavailableError } from "@/lib/adapters/types";
import { buildSLClaim } from "@/lib/core/claim-builder";
import { DEMO_TIMELINE, totalSeconds } from "@/lib/core/ride-machine";
import { seedDisruptions } from "@/lib/mock-data/disruptions";
import { findPlace } from "@/lib/mock-data/places";
import { emptyStore, type MockState } from "@/lib/server/store";
import { makeDisruption, makeTrip, NOW, validTicket } from "./fixtures";

let state: MockState;
let clock: number;
let seq: number;
const deps = () => ({ state: () => state, now: () => clock, id: (p: string) => `${p}_${++seq}` });

beforeEach(() => {
  state = emptyStore().mock;
  clock = NOW.getTime();
  seq = 0;
});

const place = (id: string) => findPlace(id)!;

describe("mock SL disruptions", () => {
  it("seeds five disruptions and finds the one for a trip", async () => {
    for (const d of seedDisruptions(clock)) state.disruptions[d.id] = d;
    const sl = createMockDisruptionAdapter(deps());
    expect(await sl.getActiveDisruptions()).toHaveLength(5);
    expect((await sl.getDisruptionForTrip({ line: "13", stop: "Slussen" }))?.id).toBe("d-red-signal");
    expect(await sl.getDisruptionForTrip({ line: "99" })).toBeNull();
    await sl.setActive("d-red-signal", false);
    expect(await sl.getActiveDisruptions()).toHaveLength(4);
  });
});

describe("mock taxi", () => {
  it("prices 45 kr + 14 kr/km", () => {
    expect(mockFare(10)).toBe(185);
  });

  it("quotes a realistic Red line ride home", async () => {
    const taxi = createMockTaxiAdapter(deps());
    const q = await taxi.getQuote(place("t-centralen"), place("norsborg"));
    expect(q.distanceKm).toBeGreaterThan(20);
    expect(q.distanceKm).toBeLessThan(30);
    expect(q.fareSEK).toBe(mockFare(q.distanceKm));
  });

  it("runs searching → driverAssigned → arriving → inProgress → completed", async () => {
    const taxi = createMockTaxiAdapter(deps());
    const q = await taxi.getQuote(place("t-centralen"), place("liljeholmen"));
    const b = await taxi.book(q.id);
    const statuses: string[] = [];
    for (let s = 0; s <= totalSeconds(DEMO_TIMELINE) + 1; s++) {
      clock = NOW.getTime() + s * 1000;
      const st = await taxi.getRideStatus(b.id);
      if (statuses.at(-1) !== st.status) statuses.push(st.status);
    }
    expect(statuses).toEqual(["searching", "driverAssigned", "arriving", "inProgress", "completed"]);
  });

  it("fast-forwards and reports no taxis when unavailable", async () => {
    const taxi = createMockTaxiAdapter(deps());
    const q = await taxi.getQuote(place("t-centralen"), place("liljeholmen"));
    const b = await taxi.book(q.id);
    await taxi.fastForward(b.id, "completed");
    expect((await taxi.getRideStatus(b.id)).status).toBe("completed");
    await taxi.setAvailability(false);
    await expect(taxi.getQuote(place("t-centralen"), place("liljeholmen"))).rejects.toBeInstanceOf(TaxiUnavailableError);
  });
});

describe("mock payments", () => {
  it("accepts 4242, declines 0002, and records a ledger", async () => {
    const pay = createMockPaymentAdapter(deps());
    await expect(pay.addCard("u", { number: TEST_CARDS.declined, expMonth: 1, expYear: 2030, cvc: "123" })).rejects.toBeInstanceOf(
      PaymentError,
    );
    const card = await pay.addCard("u", { number: "4242 4242 4242 4242", expMonth: 1, expYear: 2030, cvc: "123" });
    expect(card.last4).toBe("4242");
    await pay.chargeUser("u", { kind: "taxiExcessByUser", from: "user", to: "taxi", amountSEK: 100, rideId: "r" });
    expect(await pay.ledger({ userId: "u" })).toHaveLength(1);
  });

  it("fails charges on the charge-fails test card", async () => {
    const pay = createMockPaymentAdapter(deps());
    await pay.addCard("u", { number: TEST_CARDS.chargeFails, expMonth: 1, expYear: 2030, cvc: "123" });
    await expect(
      pay.chargeUser("u", { kind: "taxiExcessByUser", from: "user", to: "taxi", amountSEK: 1, rideId: "r" }),
    ).rejects.toMatchObject({ code: "charge_failed" });
  });
});

describe("mock BankID", () => {
  it("completes after ~3 s", async () => {
    const bankid = createMockBankIdAdapter(deps());
    const order = await bankid.startAuth();
    expect((await bankid.poll(order.orderRef)).status).toBe("pending");
    clock += BANKID_MOCK_DURATION_MS;
    const done = await bankid.poll(order.orderRef);
    expect(done.status).toBe("complete");
    expect(done.completion?.personnummer).toBe("19900101-0000");
  });

  it("signs a document with a stable hash", async () => {
    const bankid = createMockBankIdAdapter(deps());
    const order = await bankid.startSign({ title: "Fullmakt", text: "..." });
    clock += BANKID_MOCK_DURATION_MS;
    const done = await bankid.poll(order.orderRef);
    expect(done.completion?.signature).toMatch(/^MOCKSIG-/);
    expect(done.completion?.documentHash).toHaveLength(16);
  });

  it("can be cancelled", async () => {
    const bankid = createMockBankIdAdapter(deps());
    const order = await bankid.startAuth();
    const cancelled = await bankid.cancel(order.orderRef);
    expect(cancelled.status).toBe("cancelled");
    clock += BANKID_MOCK_DURATION_MS * 2;
    expect((await bankid.poll(order.orderRef)).status).toBe("cancelled");
  });
});

describe("mock SL claims", () => {
  const payload = buildSLClaim({
    claimant: { name: "Test Testsson", personnummer: "19900101-0000", address: "Testgatan 1" },
    trip: makeTrip(),
    disruption: makeDisruption(),
    ticket: validTicket,
    receipt: {
      receiptNo: "K-1",
      company: "Mocktaxi",
      orgNr: "559999-0000",
      vehicleReg: "VDR 101",
      driverName: "Alex",
      pickupAt: NOW.toISOString(),
      dropoffAt: NOW.toISOString(),
      fromAddress: "A",
      toAddress: "B",
      distanceKm: 26,
      fareSEK: 412,
      tipSEK: 0,
      vatSEK: 23.32,
      original: true,
    },
    payoutAccount: { holder: "Vidare", clearing: "8327-9", account: "0" },
    fullmakt: { id: "f", signedAt: NOW.toISOString() },
    agentName: "Vidare",
  });

  it("moves submitted → underReview automatically, then approved → paidOut by force", async () => {
    const sl = createMockSLClaimsAdapter(deps());
    const c = await sl.submitClaim(payload);
    expect(c.state.status).toBe("submitted");
    clock += AUTO_REVIEW_AFTER_MS;
    expect((await sl.getClaimStatus(c.id)).status).toBe("underReview");
    const paid = await sl.forceStatus(c.id, "paidOut");
    expect(paid.history.map((h) => h.status)).toEqual(["submitted", "underReview", "approved", "paidOut"]);
  });

  it("rejects with a reason and refuses impossible moves", async () => {
    const sl = createMockSLClaimsAdapter(deps());
    const c = await sl.submitClaim(payload);
    const rejected = await sl.forceStatus(c.id, "rejected", { rejectionReason: "userFault" });
    expect(rejected.rejectionReason).toBe("userFault");
    await sl.forceStatus(c.id, "paidOut");
    await expect(sl.forceStatus(c.id, "submitted")).rejects.toThrow();
  });

  it("refuses incomplete claims", async () => {
    const sl = createMockSLClaimsAdapter(deps());
    await expect(sl.submitClaim({ ...payload, personnummer: "" })).rejects.toThrow(/personnummer/);
  });
});
