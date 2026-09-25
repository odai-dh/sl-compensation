import "server-only";
import { getAdapters } from "@/lib/adapters";
import { PaymentError, TaxiUnavailableError } from "@/lib/adapters/types";
import { buildSLClaim, type TaxiReceipt } from "@/lib/core/claim-builder";
import { complaintDeadline, reconsiderationDeadline, type ClaimStatus } from "@/lib/core/claim-machine";
import { checkEligibility, type EligibilityResult } from "@/lib/core/eligibility";
import { haversineKm, roadDistanceKm } from "@/lib/core/geo";
import { isOnboarded, missingOnboardingSteps } from "@/lib/core/onboarding";
import type { RejectionReason } from "@/lib/core/policy";
import { splitQuote, vatPart } from "@/lib/core/quote";
import { assessRisk, hasRideForDisruption } from "@/lib/core/risk";
import { bookingEntries, claimBalance, settlementEntries } from "@/lib/core/settlement";
import type { Disruption, LatLng, PriceCategory, TicketType, Trip } from "@/lib/core/types";
import { FULLMAKT_VERSION, fullmaktPlainText } from "@/lib/i18n/fullmakt";
import { DISRUPTION_TEMPLATES } from "@/lib/mock-data/disruptions";
import { TAXI_COMPANY, VIDARE_AGENT_NAME, VIDARE_PAYOUT_ACCOUNT } from "@/lib/mock-data/people";
import { findPlace } from "@/lib/mock-data/places";
import type {
  AdminState,
  BankIdPollView,
  ClaimView,
  DisruptionView,
  EligibilityResponse,
  LedgerSummary,
  QuoteResponse,
  RideView,
  UserView,
} from "@/lib/schemas";
import { getStore, newId, now, nowIso, type Ride, type User } from "./store";

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

const app = () => getStore().app;

// ── Users ────────────────────────────────────────────────────────────────────────────────────

export function requireUser(userId: string): User {
  const user = app().users[userId];
  if (!user) throw new ServiceError("USER_NOT_FOUND", "Unknown user – sign in with BankID again", 404);
  return user;
}

function claimDates(userId: string): Date[] {
  return Object.values(app().claims)
    .filter((c) => c.userId === userId)
    .map((c) => new Date(c.submittedAt));
}

export async function userView(userId: string): Promise<UserView> {
  const user = requireUser(userId);
  const card = await getAdapters().payments.getCard(userId);
  const facts = {
    identityVerified: !!user.identityVerifiedAt,
    fullmaktSigned: !!user.fullmakt && !user.fullmakt.revokedAt,
    hasCard: !!card,
    hasTicket: !!user.ticket,
  };
  return {
    id: user.id,
    name: user.name,
    personnummer: user.personnummer,
    address: user.address,
    identityVerifiedAt: user.identityVerifiedAt,
    fullmakt: user.fullmakt,
    ticket: user.ticket,
    homePlace: user.homePlaceId ? (findPlace(user.homePlaceId) ?? null) : null,
    workPlace: user.workPlaceId ? (findPlace(user.workPlaceId) ?? null) : null,
    card: card ? { brand: card.brand, last4: card.last4, expMonth: card.expMonth, expYear: card.expYear } : null,
    missingSteps: missingOnboardingSteps(facts),
    onboarded: isOnboarded(facts),
    risk: assessRisk(claimDates(userId), new Date(now())),
  };
}

function upsertUserByPersonnummer(person: { name: string; personnummer: string; address: string }): User {
  const existing = Object.values(app().users).find((u) => u.personnummer === person.personnummer);
  if (existing) {
    existing.identityVerifiedAt = nowIso();
    return existing;
  }
  const user: User = {
    id: newId("usr"),
    ...person,
    identityVerifiedAt: nowIso(),
    fullmakt: null,
    ticket: null,
    homePlaceId: null,
    workPlaceId: null,
    ownsTaxiCompany: false,
    createdAt: nowIso(),
  };
  app().users[user.id] = user;
  return user;
}

// ── BankID ───────────────────────────────────────────────────────────────────────────────────

export async function startAuth() {
  return getAdapters().bankid.startAuth();
}

export async function pollAuth(orderRef: string): Promise<BankIdPollView> {
  const poll = await getAdapters().bankid.poll(orderRef).catch(() => {
    throw new ServiceError("ORDER_NOT_FOUND", "Unknown BankID order", 404);
  });
  let user: UserView | null = null;
  if (poll.status === "complete" && poll.completion) {
    const u = upsertUserByPersonnummer(poll.completion);
    user = await userView(u.id);
  }
  const { completion: _c, ...rest } = poll;
  void _c;
  return { ...rest, user };
}

export async function cancelBankId(orderRef: string): Promise<BankIdPollView> {
  const poll = await getAdapters().bankid.cancel(orderRef).catch(() => {
    throw new ServiceError("ORDER_NOT_FOUND", "Unknown BankID order", 404);
  });
  const { completion: _c, ...rest } = poll;
  void _c;
  return { ...rest, user: null };
}

export async function startFullmaktSign(userId: string, lang: "en" | "sv") {
  const user = requireUser(userId);
  return getAdapters().bankid.startSign(fullmaktPlainText(lang), user.personnummer);
}

export async function pollFullmaktSign(userId: string, orderRef: string): Promise<BankIdPollView> {
  const user = requireUser(userId);
  const poll = await getAdapters().bankid.poll(orderRef).catch(() => {
    throw new ServiceError("ORDER_NOT_FOUND", "Unknown BankID order", 404);
  });
  if (poll.status === "complete" && poll.completion?.signature) {
    const alreadySaved = user.fullmakt && !user.fullmakt.revokedAt && user.fullmakt.signature === poll.completion.signature;
    if (!alreadySaved) {
      user.fullmakt = {
        id: newId("fm"),
        version: FULLMAKT_VERSION,
        signedAt: nowIso(),
        documentHash: poll.completion.documentHash ?? "",
        signature: poll.completion.signature,
        revokedAt: null,
      };
    }
  }
  const { completion: _c, ...rest } = poll;
  void _c;
  return { ...rest, user: await userView(userId) };
}

export async function revokeFullmakt(userId: string): Promise<UserView> {
  const user = requireUser(userId);
  if (user.fullmakt && !user.fullmakt.revokedAt) user.fullmakt.revokedAt = nowIso();
  return userView(userId);
}

// ── Profile ──────────────────────────────────────────────────────────────────────────────────

export async function addCard(
  userId: string,
  card: { number: string; expMonth: number; expYear: number; cvc: string },
): Promise<UserView> {
  requireUser(userId);
  try {
    await getAdapters().payments.addCard(userId, card);
  } catch (e) {
    if (e instanceof PaymentError) throw new ServiceError(e.code.toUpperCase(), e.message, 402);
    throw e;
  }
  return userView(userId);
}

export async function updateProfile(
  userId: string,
  patch: {
    ticket?: { type: TicketType; priceCategory: PriceCategory };
    homePlaceId?: string | null;
    workPlaceId?: string | null;
  },
): Promise<UserView> {
  const user = requireUser(userId);
  for (const key of ["homePlaceId", "workPlaceId"] as const) {
    const value = patch[key];
    if (value === undefined) continue;
    if (value !== null && !findPlace(value)) throw new ServiceError("UNKNOWN_PLACE", `Unknown place ${value}`);
    user[key] = value;
  }
  if (patch.ticket) user.ticket = { ...patch.ticket, registeredAt: nowIso() };
  return userView(userId);
}

// ── Disruptions ──────────────────────────────────────────────────────────────────────────────

export async function listDisruptions(near?: LatLng): Promise<DisruptionView[]> {
  const list = await getAdapters().disruptions.getActiveDisruptions();
  const withDistance = list.map((d) => ({
    ...d,
    distanceKm: near ? Math.round(haversineKm(near, d.position) * 10) / 10 : null,
  }));
  if (near) withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  return withDistance;
}

// ── Eligibility ──────────────────────────────────────────────────────────────────────────────

const AVG_TRANSIT_KMH = 30;

function buildTrip(disruption: Disruption | null, originPlaceId: string, destinationPlaceId: string): Trip {
  const origin = findPlace(originPlaceId);
  const destination = findPlace(destinationPlaceId);
  if (!origin || !destination) throw new ServiceError("UNKNOWN_PLACE", "Unknown origin or destination");
  if (origin.id === destination.id) throw new ServiceError("SAME_PLACE", "Origin and destination are the same");
  const t = now();
  const transitMin = Math.max(8, Math.round((roadDistanceKm(origin.position, destination.position) / AVG_TRANSIT_KMH) * 60));
  return {
    origin,
    destination,
    mode: disruption?.mode ?? "metro",
    line: disruption?.affectedLines[0] ?? "",
    operator: disruption?.operator ?? "SL",
    // The traveller was about to board: departure 2 min ago, arrival per timetable.
    scheduledDeparture: new Date(t - 2 * 60_000).toISOString(),
    scheduledArrival: new Date(t - 2 * 60_000 + transitMin * 60_000).toISOString(),
  };
}

function priorClaimsFor(userId: string, disruptionId: string) {
  const rides = Object.values(app().rides).filter((r) => r.userId === userId && r.disruptionId === disruptionId);
  return { taxi: rides.length > 0, ticketRefund: false };
}

async function evaluate(input: {
  userId: string;
  disruptionId: string | null;
  originPlaceId: string;
  destinationPlaceId: string;
  ticketValid: boolean;
  preferredRoute?: "taxi" | "ticketRefund";
}): Promise<EligibilityResponse & { result: EligibilityResult }> {
  const user = requireUser(input.userId);
  const disruption = input.disruptionId ? await getAdapters().disruptions.getDisruption(input.disruptionId) : null;
  if (input.disruptionId && !disruption) throw new ServiceError("UNKNOWN_DISRUPTION", "Unknown disruption", 404);
  const trip = buildTrip(disruption, input.originPlaceId, input.destinationPlaceId);
  const result = checkEligibility({
    trip,
    disruption,
    ticket: {
      type: user.ticket?.type ?? "reskassa",
      priceCategory: user.ticket?.priceCategory ?? "adult",
      valid: input.ticketValid && !!user.ticket,
    },
    now: new Date(now()),
    claimant: { ownsTaxiCompany: user.ownsTaxiCompany },
    priorClaims: disruption ? priorClaimsFor(user.id, disruption.id) : undefined,
    preferredRoute: input.preferredRoute,
  });
  return { result, trip, disruption };
}

export const eligibility = evaluate;

// ── Taxi ─────────────────────────────────────────────────────────────────────────────────────

export async function quote(originPlaceId: string, destinationPlaceId: string): Promise<QuoteResponse> {
  const from = findPlace(originPlaceId);
  const to = findPlace(destinationPlaceId);
  if (!from || !to) throw new ServiceError("UNKNOWN_PLACE", "Unknown origin or destination");
  try {
    const q = await getAdapters().taxi.getQuote(from, to);
    return { quote: q, split: splitQuote(q.fareSEK) };
  } catch (e) {
    if (e instanceof TaxiUnavailableError) throw new ServiceError(e.code, e.message, 503);
    throw e;
  }
}

export async function bookRide(input: {
  userId: string;
  quoteId: string;
  disruptionId: string;
  originPlaceId: string;
  destinationPlaceId: string;
  ticketValid: boolean;
  acceptExcess: boolean;
}): Promise<RideView> {
  const { taxi, payments } = getAdapters();
  const view = await userView(input.userId);
  if (!view.onboarded) {
    throw new ServiceError("ONBOARDING_INCOMPLETE", "Finish setting up Vidare first", 403, view.missingSteps);
  }
  if (view.risk.blocked) {
    throw new ServiceError("ACCOUNT_REVIEW", "Your account is being reviewed because of many recent claims", 403);
  }
  const userRides = Object.values(app().rides).filter((r) => r.userId === input.userId);
  if (hasRideForDisruption(userRides.map((r) => ({ disruptionId: r.disruptionId, status: r.lastStatus })), input.disruptionId)) {
    throw new ServiceError("ALREADY_RIDDEN", "You have already taken a taxi for this disruption", 409);
  }

  // Never trust the client: re-run eligibility on the server.
  const { result, trip, disruption } = await evaluate({ ...input, preferredRoute: "taxi" });
  if (!disruption || result.route !== "taxi") {
    throw new ServiceError("NOT_ELIGIBLE", "This trip is not covered", 403, result);
  }

  const storedQuote = getStore().mock.quotes[input.quoteId];
  if (!storedQuote) throw new ServiceError("QUOTE_NOT_FOUND", "The price quote has expired – get a new one", 410);
  if (storedQuote.from.id !== trip.origin.id || storedQuote.to.id !== trip.destination.id) {
    // Shortest route to the FINAL destination only.
    throw new ServiceError("QUOTE_MISMATCH", "The quote does not match your trip", 409);
  }
  if (new Date(storedQuote.expiresAt).getTime() < now()) {
    throw new ServiceError("QUOTE_EXPIRED", "The price quote has expired – get a new one", 410);
  }

  const split = splitQuote(storedQuote.fareSEK, { capSEK: result.taxiCapSEK });
  if (split.userPaysSEK > 0 && !input.acceptExcess) {
    throw new ServiceError("EXCESS_NOT_ACCEPTED", "Accept paying the part above the cap to continue", 409, split);
  }
  if (!(await taxi.isAvailable())) throw new ServiceError("NO_TAXIS", "No taxis available right now", 503);

  const rideId = newId("ride");
  const [vidareEntry, userEntry] = bookingEntries(split, rideId);

  // Charge the user's part first, so a failed card never leaves a booked taxi behind.
  if (userEntry) {
    try {
      await payments.chargeUser(input.userId, userEntry);
    } catch (e) {
      if (e instanceof PaymentError) throw new ServiceError("PAYMENT_FAILED", e.message, 402);
      throw e;
    }
  }

  let booking;
  try {
    booking = await taxi.book(storedQuote.id);
  } catch (e) {
    if (userEntry) {
      await payments.record(input.userId, { ...userEntry, kind: "userRefund", from: "taxi", to: "user" });
    }
    if (e instanceof TaxiUnavailableError) throw new ServiceError(e.code, e.message, 503);
    throw e;
  }
  await payments.payTaxi(input.userId, vidareEntry);

  const ride: Ride = {
    id: rideId,
    userId: input.userId,
    disruptionId: disruption.id,
    bookingId: booking.id,
    trip,
    split,
    eligibility: result,
    ticketValid: input.ticketValid,
    createdAt: nowIso(),
    lastStatus: "searching",
    receipt: null,
    claimId: null,
  };
  app().rides[ride.id] = ride;
  return rideView(ride.id);
}

async function fileClaimForRide(ride: Ride) {
  const user = requireUser(ride.userId);
  const { disruptions, claims, taxi } = getAdapters();
  const status = await taxi.getRideStatus(ride.bookingId);
  const booking = getStore().mock.bookings[ride.bookingId].booking;
  // Times as they happened on the (compressed) demo clock; a fast-forward never predates the booking.
  const createdAtMs = new Date(ride.createdAt).getTime();
  const pickupAtMs = Math.max(createdAtMs, new Date(status.pickupAtIso).getTime());
  const pickupAtIso = new Date(pickupAtMs).toISOString();
  const dropoffAtIso = new Date(Math.max(pickupAtMs, new Date(status.completesAtIso).getTime())).toISOString();
  const receipt: TaxiReceipt = {
    receiptNo: `K-${ride.id.slice(-6).toUpperCase()}`,
    company: TAXI_COMPANY.name,
    orgNr: TAXI_COMPANY.orgNr,
    vehicleReg: status.driver.reg,
    driverName: status.driver.name,
    pickupAt: pickupAtIso,
    dropoffAt: dropoffAtIso,
    fromAddress: `${ride.trip.origin.name}, ${ride.trip.origin.address}`,
    toAddress: `${ride.trip.destination.name}, ${ride.trip.destination.address}`,
    distanceKm: booking.quote.distanceKm,
    fareSEK: ride.split.fareSEK,
    tipSEK: 0,
    vatSEK: vatPart(ride.split.fareSEK),
    original: true,
  };
  ride.receipt = receipt;

  const disruption = await disruptions.getDisruption(ride.disruptionId);
  if (!disruption || !user.fullmakt || !user.ticket) return;
  const payload = buildSLClaim({
    claimant: { name: user.name, personnummer: user.personnummer, address: user.address },
    trip: ride.trip,
    disruption,
    ticket: { ...user.ticket, valid: ride.ticketValid },
    receipt,
    payoutAccount: VIDARE_PAYOUT_ACCOUNT,
    fullmakt: { id: user.fullmakt.id, signedAt: user.fullmakt.signedAt },
    agentName: VIDARE_AGENT_NAME,
  });
  const submitted = await claims.submitClaim(payload);
  ride.claimId = submitted.id;
  app().claims[submitted.id] = {
    id: submitted.id,
    userId: ride.userId,
    rideId: ride.id,
    disruptionId: ride.disruptionId,
    slReference: submitted.slReference,
    claimedSEK: payload.claimedSEK,
    submittedAt: submitted.state.history[0].at,
  };
}

function requireRide(rideId: string): Ride {
  const ride = app().rides[rideId];
  if (!ride) throw new ServiceError("RIDE_NOT_FOUND", "Unknown ride", 404);
  return ride;
}

export async function rideView(rideId: string): Promise<RideView> {
  const ride = requireRide(rideId);
  const status = await getAdapters().taxi.getRideStatus(ride.bookingId);
  ride.lastStatus = status.status;
  // Arrival: build the receipt and file the claim with SL automatically (once).
  if (status.status === "completed" && !ride.receipt) {
    await fileClaimForRide(ride);
  }
  const booking = getStore().mock.bookings[ride.bookingId].booking;
  const disruption = await getAdapters().disruptions.getDisruption(ride.disruptionId);
  return {
    id: ride.id,
    userId: ride.userId,
    disruptionId: ride.disruptionId,
    disruptionTitle: disruption?.title ?? { en: "Disruption", sv: "Störning" },
    trip: ride.trip,
    split: ride.split,
    distanceKm: booking.quote.distanceKm,
    createdAt: ride.createdAt,
    status: status.status,
    carPosition: status.carPosition,
    driverStart: booking.driverStart,
    etaPickupMin: status.etaPickupMin,
    etaArrivalMin: status.etaArrivalMin,
    progress: status.progress,
    driver: status.driver,
    receipt: ride.receipt,
    claimId: ride.claimId,
  };
}

export async function listRides(userId?: string): Promise<RideView[]> {
  const rides = Object.values(app().rides)
    .filter((r) => !userId || r.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Promise.all(rides.map((r) => rideView(r.id)));
}

export async function fastForwardRide(rideId: string, to: "arriving" | "inProgress" | "completed") {
  const ride = requireRide(rideId);
  await getAdapters().taxi.fastForward(ride.bookingId, to);
  return rideView(rideId);
}

// ── Claims ───────────────────────────────────────────────────────────────────────────────────

export async function claimView(claimId: string): Promise<ClaimView> {
  const claim = app().claims[claimId];
  if (!claim) throw new ServiceError("CLAIM_NOT_FOUND", "Unknown claim", 404);
  const { claims, payments } = getAdapters();
  const state = await claims.getClaimStatus(claimId);
  const payload = getStore().mock.slClaims[claimId].payload;
  const ledger = await payments.ledger({ rideId: claim.rideId });
  const user = app().users[claim.userId];
  const ride = app().rides[claim.rideId];
  const reconsiderationBy =
    state.status === "rejected" && state.decidedAt ? reconsiderationDeadline(new Date(state.decidedAt)) : null;
  return {
    id: claim.id,
    userId: claim.userId,
    userName: user?.name ?? "—",
    rideId: claim.rideId,
    slReference: claim.slReference,
    claimedSEK: claim.claimedSEK,
    submittedAt: claim.submittedAt,
    status: state.status,
    history: state.history,
    rejectionReason: state.rejectionReason ?? null,
    decidedAt: state.decidedAt ?? null,
    complaintDeadline: complaintDeadline(new Date(ride?.trip.scheduledDeparture ?? claim.submittedAt)).toISOString(),
    reconsiderationDeadline: reconsiderationBy?.toISOString() ?? null,
    canRequestReconsideration: !!reconsiderationBy && reconsiderationBy.getTime() > now(),
    payload,
    ledger,
    balance: claimBalance(ledger, { status: state.status, claimedSEK: claim.claimedSEK }),
  };
}

export async function listClaims(userId?: string): Promise<ClaimView[]> {
  const list = Object.values(app().claims)
    .filter((c) => !userId || c.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return Promise.all(list.map((c) => claimView(c.id)));
}

/** Moves a claim (demo admin) and books the resulting money movements. */
export async function setClaimStatus(
  claimId: string,
  status: ClaimStatus,
  opts: { rejectionReason?: RejectionReason; note?: string } = {},
): Promise<ClaimView> {
  const claim = app().claims[claimId];
  if (!claim) throw new ServiceError("CLAIM_NOT_FOUND", "Unknown claim", 404);
  if (status === "rejected" && !opts.rejectionReason) {
    throw new ServiceError("REASON_REQUIRED", "Choose why SL rejected the claim");
  }
  const { claims, payments } = getAdapters();
  let state;
  try {
    state = await claims.forceStatus(claimId, status, opts);
  } catch (e) {
    throw new ServiceError("INVALID_TRANSITION", e instanceof Error ? e.message : "Invalid status change", 409);
  }
  const existing = await payments.ledger({ rideId: claim.rideId });
  const drafts = settlementEntries({
    status: state.status,
    claimId,
    rideId: claim.rideId,
    claimedSEK: claim.claimedSEK,
    rejectionReason: state.rejectionReason,
    existing,
  });
  for (const d of drafts) {
    if (d.kind === "userFaultCharge") {
      // Charge the card on file; if that fails the debt is still recorded.
      await payments.chargeUser(claim.userId, d).catch(() => payments.record(claim.userId, d));
    } else {
      await payments.record(claim.userId, d);
    }
  }
  return claimView(claimId);
}

export async function requestReconsideration(userId: string, claimId: string): Promise<ClaimView> {
  const view = await claimView(claimId);
  if (view.userId !== userId) throw new ServiceError("CLAIM_NOT_FOUND", "Unknown claim", 404);
  if (!view.canRequestReconsideration) {
    throw new ServiceError("WINDOW_CLOSED", "The 3-week reconsideration window has passed", 409);
  }
  return setClaimStatus(claimId, "underReview", { note: "Omprövning begärd" });
}

// ── Ledger ───────────────────────────────────────────────────────────────────────────────────

export async function ledgerSummary(): Promise<LedgerSummary> {
  const entries = await getAdapters().payments.ledger();
  const claims = await listClaims();
  const sum = (pred: (e: (typeof entries)[number]) => boolean) =>
    entries.filter(pred).reduce((s, e) => s + e.amountSEK, 0);
  const perClaim = claims.map((c) => ({
    claimId: c.id,
    rideId: c.rideId,
    userName: c.userName,
    slReference: c.slReference,
    status: c.status,
    balance: c.balance,
  }));
  return {
    entries: [...entries].reverse(),
    perClaim,
    totals: {
      paidToTaxisSEK: sum((e) => e.kind === "taxiPaymentByVidare"),
      receivedFromSlSEK: sum((e) => e.kind === "slPayout"),
      chargedToUsersSEK: sum((e) => e.kind === "userFaultCharge") - sum((e) => e.kind === "userRefund" && e.from === "vidare"),
      writtenOffSEK: sum((e) => e.kind === "writeOff") - sum((e) => e.kind === "writeOffReversal"),
      outstandingReceivablesSEK: perClaim.reduce((s, c) => s + c.balance.receivableSEK, 0),
    },
  };
}

// ── Admin ────────────────────────────────────────────────────────────────────────────────────

export async function adminState(): Promise<AdminState> {
  const { taxi } = getAdapters();
  const all = Object.values(getStore().mock.disruptions).sort((a, b) => b.announcedAt.localeCompare(a.announcedAt));
  return {
    taxiAvailable: await taxi.isAvailable(),
    disruptions: all,
    templates: DISRUPTION_TEMPLATES.map((t) => ({ id: t.id, title: t.title, expectedDelayMinutes: t.expectedDelayMinutes })),
    claims: await listClaims(),
    rides: await listRides(),
    users: await Promise.all(Object.keys(app().users).map((id) => userView(id))),
  };
}

export async function triggerDisruption(templateId: string, expectedDelayMinutes?: number) {
  const tpl = DISRUPTION_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) throw new ServiceError("UNKNOWN_TEMPLATE", "Unknown disruption template", 404);
  const { id: _id, announcedAgoMs: _ago, ...rest } = tpl;
  void _id;
  void _ago;
  return getAdapters().disruptions.createDisruption({
    ...rest,
    expectedDelayMinutes: expectedDelayMinutes ?? tpl.expectedDelayMinutes,
  });
}

export async function setDisruptionActive(id: string, active: boolean) {
  const d = await getAdapters().disruptions.setActive(id, active);
  if (!d) throw new ServiceError("UNKNOWN_DISRUPTION", "Unknown disruption", 404);
  return d;
}

export async function setTaxiAvailability(available: boolean) {
  await getAdapters().taxi.setAvailability(available);
  return { taxiAvailable: available };
}
