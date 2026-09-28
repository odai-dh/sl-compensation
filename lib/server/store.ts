import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { BankIdCompletion, BankIdStatus, Card, LedgerEntry, TaxiBooking, TaxiQuote } from "@/lib/adapters/types";
import type { ClaimState } from "@/lib/core/claim-machine";
import type { SLClaimPayload, TaxiReceipt } from "@/lib/core/claim-builder";
import type { EligibilityResult } from "@/lib/core/eligibility";
import type { QuoteSplit } from "@/lib/core/quote";
import type { RideStatus } from "@/lib/core/ride-machine";
import type { Disruption, PriceCategory, TicketType, Trip } from "@/lib/core/types";

/* ── State owned by the mock adapters (would live at SL, the taxi partner, the PSP, BankID) ── */

export type MockState = {
  disruptions: Record<string, Disruption>;
  quotes: Record<string, TaxiQuote>;
  bookings: Record<string, { booking: TaxiBooking; bookedAtMs: number; cancelled: boolean }>;
  taxiAvailable: boolean;
  cards: Record<string, Card & { chargeFails: boolean }>;
  ledger: LedgerEntry[];
  bankid: Record<
    string,
    {
      kind: "auth" | "sign";
      startedAtMs: number;
      status: BankIdStatus;
      documentHash?: string;
      personnummer?: string;
      completion?: BankIdCompletion;
    }
  >;
  slClaims: Record<string, { payload: SLClaimPayload; state: ClaimState; slReference: string; submittedAtMs: number }>;
};

/* ── Vidare's own data ─────────────────────────────────────────────────────────────────────── */

export type Fullmakt = {
  id: string;
  version: string;
  signedAt: string;
  documentHash: string;
  signature: string;
  revokedAt: string | null;
};

export type User = {
  id: string;
  name: string;
  personnummer: string;
  address: string;
  identityVerifiedAt: string | null;
  fullmakt: Fullmakt | null;
  ticket: { type: TicketType; priceCategory: PriceCategory; registeredAt: string } | null;
  homePlaceId: string | null;
  workPlaceId: string | null;
  ownsTaxiCompany: boolean;
  createdAt: string;
};

export type Ride = {
  id: string;
  userId: string;
  disruptionId: string;
  bookingId: string;
  trip: Trip;
  split: QuoteSplit;
  eligibility: EligibilityResult;
  ticketValid: boolean;
  createdAt: string;
  lastStatus: RideStatus;
  receipt: TaxiReceipt | null;
  claimId: string | null;
};

export type VidareClaim = {
  id: string;
  userId: string;
  rideId: string;
  disruptionId: string;
  slReference: string;
  claimedSEK: number;
  submittedAt: string;
};

export type AppState = {
  users: Record<string, User>;
  rides: Record<string, Ride>;
  claims: Record<string, VidareClaim>;
};

export type Store = {
  mock: MockState;
  app: AppState;
  /** Shifts the server clock (used when seeding history in the past). */
  timeOffsetMs: number;
  seq: number;
  /** When this sandbox was seeded (epoch ms). Old sandboxes are re-seeded so "12 min ago" stays true. */
  seededAt: number;
};

export function emptyStore(): Store {
  return {
    mock: {
      disruptions: {},
      quotes: {},
      bookings: {},
      taxiAvailable: true,
      cards: {},
      ledger: [],
      bankid: {},
      slClaims: {},
    },
    app: { users: {}, rides: {}, claims: {} },
    timeOffsetMs: 0,
    seq: 0,
    seededAt: Date.now(),
  };
}

/**
 * One request's private copy of a visitor's sandbox. AsyncLocalStorage keeps concurrent requests apart,
 * so the store can never be shared between visitors (or between two polls of the same visitor).
 */
const scope = new AsyncLocalStorage<{ store: Store }>();

export function runWithStore<T>(store: Store, fn: () => Promise<T>): Promise<{ result: T; store: Store }> {
  const box = { store };
  return scope.run(box, async () => {
    const result = await fn();
    return { result, store: box.store };
  });
}

export function getStore(): Store {
  const box = scope.getStore();
  if (!box) throw new Error("getStore() called outside a sandbox – wrap the work in withSandbox()");
  return box.store;
}

/** Swaps the whole store for this request (used by "reset demo"). */
export function replaceStore(store: Store) {
  const box = scope.getStore();
  if (!box) throw new Error("replaceStore() called outside a sandbox");
  box.store = store;
}

export function now(): number {
  return Date.now() + getStore().timeOffsetMs;
}

export function nowIso(): string {
  return new Date(now()).toISOString();
}

export function newId(prefix: string): string {
  const store = getStore();
  store.seq += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${store.seq.toString(36)}${rand}`;
}
