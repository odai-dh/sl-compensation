/**
 * Zod schemas for every API request and response. Shared by the route handlers (validation)
 * and the web client (types). A future iOS client can mirror these.
 */
import { z } from "zod";
import { CLAIM_STATUSES } from "@/lib/core/claim-machine";
import { VIDARE_POLICY } from "@/lib/core/policy";
import { RIDE_FLOW } from "@/lib/core/ride-machine";
import { TICKET_TYPE_IDS } from "@/lib/core/tickets";

// ── Domain ───────────────────────────────────────────────────────────────────────────────────

export const LatLngSchema = z.object({ lat: z.number(), lng: z.number() });
export const CountySchema = z.enum(["Stockholm", "Uppsala", "Södermanland", "Other"]);
export const LangSchema = z.enum(["en", "sv"]);
export const I18nTextSchema = z.object({ en: z.string(), sv: z.string() });

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  county: CountySchema,
  position: LatLngSchema,
});

export const TransportModeSchema = z.enum(["metro", "commuterRail", "bus", "tram", "lightRail", "ferry"]);
export const OperatorSchema = z.enum(["SL", "UL", "other"]);

export const DisruptionSchema = z.object({
  id: z.string(),
  title: I18nTextSchema,
  cause: I18nTextSchema,
  mode: TransportModeSchema,
  lineName: z.string(),
  affectedLines: z.array(z.string()),
  affectedStops: z.array(z.string()),
  position: LatLngSchema,
  county: CountySchema,
  operator: OperatorSchema,
  announcedAt: z.string(),
  expectedDelayMinutes: z.number(),
  active: z.boolean(),
});

export const DisruptionWithDistanceSchema = DisruptionSchema.extend({ distanceKm: z.number().nullable() });

export const TicketTypeSchema = z.enum(TICKET_TYPE_IDS);
export const PriceCategorySchema = z.enum(["adult", "reduced"]);

export const TripSchema = z.object({
  origin: PlaceSchema,
  destination: PlaceSchema,
  mode: TransportModeSchema,
  line: z.string(),
  operator: OperatorSchema,
  scheduledDeparture: z.string(),
  scheduledArrival: z.string(),
});

export const EligibilitySchema = z.object({
  eligible: z.boolean(),
  route: z.enum(["taxi", "ticketRefund", "none"]),
  reasons: z.array(z.string()),
  expectedDelayMinutes: z.number(),
  refundPercent: z.number(),
  taxiCapSEK: z.number(),
  blockedBy: z.string().nullable(),
});

export const QuoteSplitSchema = z.object({
  fareSEK: z.number(),
  vidarePaysSEK: z.number(),
  userPaysSEK: z.number(),
  tipCoveredSEK: z.literal(0),
  vidareFeeSEK: z.number(),
  capSEK: z.number(),
  overCap: z.boolean(),
});

export const TaxiQuoteSchema = z.object({
  id: z.string(),
  provider: z.string(),
  from: PlaceSchema,
  to: PlaceSchema,
  distanceKm: z.number(),
  fareSEK: z.number(),
  pickupEtaMin: z.number(),
  tripDurationMin: z.number(),
  createdAt: z.string(),
  expiresAt: z.string(),
});

export const DriverSchema = z.object({ name: z.string(), car: z.string(), reg: z.string(), rating: z.number() });

export const ReceiptSchema = z.object({
  receiptNo: z.string(),
  company: z.string(),
  orgNr: z.string(),
  vehicleReg: z.string(),
  driverName: z.string(),
  pickupAt: z.string(),
  dropoffAt: z.string(),
  fromAddress: z.string(),
  toAddress: z.string(),
  distanceKm: z.number(),
  fareSEK: z.number(),
  tipSEK: z.number(),
  vatSEK: z.number(),
  original: z.literal(true),
});

export const RideStatusSchema = z.enum([...RIDE_FLOW, "cancelled"]);
export const ClaimStatusSchema = z.enum(CLAIM_STATUSES);
export const RejectionReasonSchema = z.enum(["userFault", "other"]);

export const LedgerEntrySchema = z.object({
  id: z.string(),
  at: z.string(),
  userId: z.string(),
  kind: z.enum([
    "taxiPaymentByVidare",
    "taxiExcessByUser",
    "slPayout",
    "userFaultCharge",
    "writeOff",
    "userRefund",
    "writeOffReversal",
  ]),
  from: z.enum(["vidare", "user", "sl", "taxi", "loss"]),
  to: z.enum(["vidare", "user", "sl", "taxi", "loss"]),
  amountSEK: z.number(),
  rideId: z.string(),
  claimId: z.string().optional(),
});

export const SLClaimPayloadSchema = z.object({
  kind: z.literal("alternativeTransport"),
  mode: z.literal("taxi"),
  name: z.string(),
  personnummer: z.string(),
  address: z.string(),
  tripDetails: z.object({
    date: z.string(),
    from: z.string(),
    to: z.string(),
    line: z.string(),
    scheduledArrival: z.string(),
    disruption: z.string(),
    expectedDelayMinutes: z.number(),
    whyEntitled: z.string(),
  }),
  ticketInfo: z.object({ type: z.string(), priceCategory: z.string(), validAtTimeOfDelay: z.boolean() }),
  taxiReceipt: ReceiptSchema,
  payoutAccount: z.object({ holder: z.string(), clearing: z.string(), account: z.string() }),
  claimedSEK: z.number(),
  onBehalfOf: z.object({ agent: z.string(), fullmaktId: z.string(), fullmaktSignedAt: z.string() }),
});

export const BalanceSchema = z.object({
  vidareOutSEK: z.number(),
  vidareInSEK: z.number(),
  lossSEK: z.number(),
  receivableSEK: z.number(),
  netSEK: z.number(),
});

// ── Views returned by the API ────────────────────────────────────────────────────────────────

export const FullmaktSchema = z.object({
  id: z.string(),
  version: z.string(),
  signedAt: z.string(),
  documentHash: z.string(),
  signature: z.string(),
  revokedAt: z.string().nullable(),
});

export const UserViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  personnummer: z.string(),
  address: z.string(),
  identityVerifiedAt: z.string().nullable(),
  fullmakt: FullmaktSchema.nullable(),
  ticket: z
    .object({ type: TicketTypeSchema, priceCategory: PriceCategorySchema, registeredAt: z.string() })
    .nullable(),
  homePlace: PlaceSchema.nullable(),
  workPlace: PlaceSchema.nullable(),
  card: z.object({ brand: z.string(), last4: z.string(), expMonth: z.number(), expYear: z.number() }).nullable(),
  missingSteps: z.array(z.enum(VIDARE_POLICY.onboardingSteps)),
  onboarded: z.boolean(),
  risk: z.object({ claimsInWindow: z.number(), flagged: z.boolean(), blocked: z.boolean() }),
});

export const BankIdPollSchema = z.object({
  orderRef: z.string(),
  status: z.enum(["pending", "complete", "cancelled", "failed"]),
  hintCode: z.string().nullable(),
  qrData: z.string(),
  user: UserViewSchema.nullable(),
});

export const EligibilityResponseSchema = z.object({
  result: EligibilitySchema,
  trip: TripSchema,
  disruption: DisruptionSchema.nullable(),
});

export const QuoteResponseSchema = z.object({ quote: TaxiQuoteSchema, split: QuoteSplitSchema });

export const RideViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  disruptionId: z.string(),
  disruptionTitle: I18nTextSchema,
  trip: TripSchema,
  split: QuoteSplitSchema,
  distanceKm: z.number(),
  createdAt: z.string(),
  status: RideStatusSchema,
  carPosition: LatLngSchema.nullable(),
  driverStart: LatLngSchema,
  etaPickupMin: z.number(),
  etaArrivalMin: z.number(),
  progress: z.number(),
  driver: DriverSchema,
  receipt: ReceiptSchema.nullable(),
  claimId: z.string().nullable(),
});

export const ClaimViewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  rideId: z.string(),
  slReference: z.string(),
  claimedSEK: z.number(),
  submittedAt: z.string(),
  status: ClaimStatusSchema,
  history: z.array(z.object({ status: ClaimStatusSchema, at: z.string(), note: z.string().optional() })),
  rejectionReason: RejectionReasonSchema.nullable(),
  decidedAt: z.string().nullable(),
  complaintDeadline: z.string(),
  reconsiderationDeadline: z.string().nullable(),
  canRequestReconsideration: z.boolean(),
  payload: SLClaimPayloadSchema,
  ledger: z.array(LedgerEntrySchema),
  balance: BalanceSchema,
});

export const LedgerSummarySchema = z.object({
  entries: z.array(LedgerEntrySchema),
  perClaim: z.array(
    z.object({
      claimId: z.string(),
      rideId: z.string(),
      userName: z.string(),
      slReference: z.string(),
      status: ClaimStatusSchema,
      balance: BalanceSchema,
    }),
  ),
  totals: z.object({
    paidToTaxisSEK: z.number(),
    receivedFromSlSEK: z.number(),
    chargedToUsersSEK: z.number(),
    writtenOffSEK: z.number(),
    outstandingReceivablesSEK: z.number(),
  }),
});

export const AdminStateSchema = z.object({
  taxiAvailable: z.boolean(),
  disruptions: z.array(DisruptionSchema),
  templates: z.array(z.object({ id: z.string(), title: I18nTextSchema, expectedDelayMinutes: z.number() })),
  claims: z.array(ClaimViewSchema),
  rides: z.array(RideViewSchema),
  users: z.array(UserViewSchema),
});

// ── Requests ─────────────────────────────────────────────────────────────────────────────────

const id = z.string().min(1).max(64);

export const UserRef = z.object({ userId: id });

export const StartAuthResponseSchema = z.object({
  orderRef: z.string(),
  autoStartToken: z.string(),
  kind: z.enum(["auth", "sign"]),
  startedAt: z.string(),
});

export const StartSignRequest = z.object({ lang: LangSchema });

export const AddCardRequest = z.object({
  number: z.string().regex(/^[\d ]{12,23}$/, "Card number must be digits"),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2000).max(2100),
  cvc: z.string().regex(/^\d{3,4}$/),
});

export const UpdateProfileRequest = z.object({
  ticket: z.object({ type: TicketTypeSchema, priceCategory: PriceCategorySchema }).optional(),
  homePlaceId: id.nullable().optional(),
  workPlaceId: id.nullable().optional(),
});

export const EligibilityRequest = z.object({
  userId: id,
  disruptionId: id.nullable(),
  originPlaceId: id,
  destinationPlaceId: id,
  ticketValid: z.boolean(),
  preferredRoute: z.enum(["taxi", "ticketRefund"]).optional(),
});

export const QuoteRequest = z.object({ userId: id, originPlaceId: id, destinationPlaceId: id });

export const BookRideRequest = EligibilityRequest.omit({ preferredRoute: true }).extend({
  disruptionId: id,
  quoteId: id,
  acceptExcess: z.boolean(),
});

export const CreateDisruptionRequest = z.object({
  templateId: id,
  expectedDelayMinutes: z.number().int().min(0).max(600).optional(),
});

export const SetDisruptionActiveRequest = z.object({ active: z.boolean() });

export const ForceClaimStatusRequest = z.object({
  status: ClaimStatusSchema,
  rejectionReason: RejectionReasonSchema.optional(),
  note: z.string().max(200).optional(),
});

export const TaxiAvailabilityRequest = z.object({ available: z.boolean() });
export const FastForwardRequest = z.object({ to: z.enum(["arriving", "inProgress", "completed"]) });

// ── Envelope ─────────────────────────────────────────────────────────────────────────────────

export type ApiError = { code: string; message: string; details?: unknown };
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type Place = z.infer<typeof PlaceSchema>;
export type DisruptionView = z.infer<typeof DisruptionWithDistanceSchema>;
export type UserView = z.infer<typeof UserViewSchema>;
export type BankIdPollView = z.infer<typeof BankIdPollSchema>;
export type EligibilityResponse = z.infer<typeof EligibilityResponseSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type RideView = z.infer<typeof RideViewSchema>;
export type ClaimView = z.infer<typeof ClaimViewSchema>;
export type LedgerSummary = z.infer<typeof LedgerSummarySchema>;
export type LedgerEntryView = z.infer<typeof LedgerEntrySchema>;
export type AdminState = z.infer<typeof AdminStateSchema>;
