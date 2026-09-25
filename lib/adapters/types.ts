/**
 * Adapter interfaces. Every external dependency sits behind one of these; the mocks in ./mock
 * implement them for the demo and a real implementation can replace each without touching the UI.
 */
import type { ClaimState, ClaimStatus } from "@/lib/core/claim-machine";
import type { SLClaimPayload } from "@/lib/core/claim-builder";
import type { RejectionReason } from "@/lib/core/policy";
import type { RideSnapshot } from "@/lib/core/ride-machine";
import type { LedgerDraft } from "@/lib/core/settlement";
import type { Disruption, LatLng, Place } from "@/lib/core/types";

// ── SL disruptions (production: Trafiklab SL Deviations + realtime APIs) ─────────────────────────

export type NewDisruption = Omit<Disruption, "id" | "announcedAt" | "active"> & { announcedAt?: string };

export interface SLDisruptionAdapter {
  getActiveDisruptions(): Promise<Disruption[]>;
  getDisruption(id: string): Promise<Disruption | null>;
  getDisruptionForTrip(trip: { line: string; stop?: string }): Promise<Disruption | null>;
  /** Demo admin only. */
  createDisruption(input: NewDisruption): Promise<Disruption>;
  setActive(id: string, active: boolean): Promise<Disruption | null>;
}

// ── Taxi (production: a taxi partner's business API) ──────────────────────────────────────────────

export type TaxiQuote = {
  id: string;
  provider: string;
  from: Place;
  to: Place;
  distanceKm: number;
  fareSEK: number;
  pickupEtaMin: number;
  tripDurationMin: number;
  createdAt: string;
  expiresAt: string;
};

export type Driver = { name: string; car: string; reg: string; rating: number };

export type TaxiBooking = {
  id: string;
  quote: TaxiQuote;
  driver: Driver;
  driverStart: LatLng;
  bookedAt: string;
};

export type TaxiRideStatus = RideSnapshot & { bookingId: string; driver: Driver; pickupAtIso: string; completesAtIso: string };

export class TaxiUnavailableError extends Error {
  readonly code = "NO_TAXIS";
  constructor() {
    super("No taxis available right now");
  }
}

export interface TaxiAdapter {
  getQuote(from: Place, to: Place): Promise<TaxiQuote>;
  book(quoteId: string): Promise<TaxiBooking>;
  getRideStatus(bookingId: string): Promise<TaxiRideStatus>;
  /** Demo admin only. */
  fastForward(bookingId: string, to: "arriving" | "inProgress" | "completed"): Promise<void>;
  setAvailability(available: boolean): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// ── Payments (production: Stripe / Adyen) ─────────────────────────────────────────────────────────

export type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

export class PaymentError extends Error {
  constructor(
    public readonly code: "card_declined" | "invalid_card" | "charge_failed" | "no_card",
    message: string,
  ) {
    super(message);
  }
}

export type LedgerEntry = LedgerDraft & { id: string; at: string; userId: string };

export interface PaymentAdapter {
  addCard(userId: string, card: { number: string; expMonth: number; expYear: number; cvc: string }): Promise<Card>;
  getCard(userId: string): Promise<Card | null>;
  /** Charges the user's card on file. Records a ledger entry. */
  chargeUser(userId: string, draft: LedgerDraft): Promise<LedgerEntry>;
  /** Vidare pays the taxi company. */
  payTaxi(userId: string, draft: LedgerDraft): Promise<LedgerEntry>;
  /** Records a non-card movement (SL payout, refunds, write-offs). */
  record(userId: string, draft: LedgerDraft): Promise<LedgerEntry>;
  ledger(filter?: { userId?: string; rideId?: string }): Promise<LedgerEntry[]>;
}

// ── BankID (production: BankID RP API via a provider such as Freja/Signicat) ─────────────────────

export type BankIdStatus = "pending" | "complete" | "cancelled" | "failed";

export type BankIdOrder = {
  orderRef: string;
  autoStartToken: string;
  kind: "auth" | "sign";
  startedAt: string;
};

export type BankIdCompletion = {
  name: string;
  personnummer: string;
  /** Mock SPAR lookup: folkbokföringsadress. */
  address: string;
  signature?: string;
  documentHash?: string;
};

export type BankIdPoll = {
  orderRef: string;
  status: BankIdStatus;
  hintCode: "outstandingTransaction" | "userSign" | "userCancel" | "startFailed" | null;
  /** Rotating QR payload (animated QR in real BankID). */
  qrData: string;
  completion?: BankIdCompletion;
};

export interface BankIDAdapter {
  startAuth(): Promise<BankIdOrder>;
  startSign(document: { title: string; text: string }, personnummer?: string): Promise<BankIdOrder>;
  poll(orderRef: string): Promise<BankIdPoll>;
  cancel(orderRef: string): Promise<BankIdPoll>;
}

// ── SL claims (production: claim filed with SL under the fullmakt) ───────────────────────────────

export type SubmittedClaim = { id: string; slReference: string; state: ClaimState };

export interface SLClaimsAdapter {
  submitClaim(payload: SLClaimPayload): Promise<SubmittedClaim>;
  getClaimStatus(id: string): Promise<ClaimState>;
  /** Demo admin only: move a claim to any reachable status. */
  forceStatus(id: string, status: ClaimStatus, opts?: { rejectionReason?: RejectionReason; note?: string }): Promise<ClaimState>;
}

export type Adapters = {
  disruptions: SLDisruptionAdapter;
  taxi: TaxiAdapter;
  payments: PaymentAdapter;
  bankid: BankIDAdapter;
  claims: SLClaimsAdapter;
};
