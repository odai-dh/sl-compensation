import { SL_RULES, type ClaimRequirement } from "./sl-rules";
import type { Disruption, Ticket, Trip } from "./types";

export type TaxiReceipt = {
  receiptNo: string;
  company: string;
  orgNr: string;
  vehicleReg: string;
  driverName: string;
  pickupAt: string; // ISO
  dropoffAt: string; // ISO
  fromAddress: string;
  toAddress: string;
  distanceKm: number;
  fareSEK: number;
  tipSEK: number;
  vatSEK: number;
  /** A digital receipt from the taxi partner; SL asks for originals (open question). */
  original: true;
};

export type PayoutAccount = {
  holder: string;
  clearing: string;
  account: string;
};

export type Claimant = {
  name: string;
  personnummer: string;
  address: string;
};

/** Exactly what Vidare sends to SL, one field per item in SL_RULES.claimRequires. */
export type SLClaimPayload = {
  kind: "alternativeTransport";
  mode: "taxi";
  name: string;
  personnummer: string;
  address: string;
  tripDetails: {
    date: string;
    from: string;
    to: string;
    line: string;
    scheduledArrival: string;
    disruption: string;
    expectedDelayMinutes: number;
    whyEntitled: string;
  };
  ticketInfo: { type: string; priceCategory: string; validAtTimeOfDelay: boolean };
  taxiReceipt: TaxiReceipt;
  payoutAccount: PayoutAccount;
  claimedSEK: number;
  onBehalfOf: { agent: string; fullmaktId: string; fullmaktSignedAt: string };
};

export const REQUIREMENT_FIELDS: Record<ClaimRequirement, keyof SLClaimPayload> = {
  name: "name",
  personnummer: "personnummer",
  address: "address",
  "trip details": "tripDetails",
  "ticket info": "ticketInfo",
  "original taxi receipt with time, route and tip": "taxiReceipt",
  "bank account for payout": "payoutAccount",
};

export function buildSLClaim(args: {
  claimant: Claimant;
  trip: Trip;
  disruption: Disruption;
  ticket: Ticket;
  receipt: TaxiReceipt;
  payoutAccount: PayoutAccount;
  fullmakt: { id: string; signedAt: string };
  agentName: string;
}): SLClaimPayload {
  const { trip, disruption, receipt } = args;
  return {
    kind: "alternativeTransport",
    mode: "taxi",
    name: args.claimant.name,
    personnummer: args.claimant.personnummer,
    address: args.claimant.address,
    tripDetails: {
      date: trip.scheduledDeparture.slice(0, 10),
      from: trip.origin.name,
      to: trip.destination.name,
      line: disruption.lineName,
      scheduledArrival: trip.scheduledArrival,
      disruption: disruption.title.sv,
      expectedDelayMinutes: disruption.expectedDelayMinutes,
      whyEntitled: `Risk of more than ${SL_RULES.minDelayMinutes} min delay at final destination; took a taxi by the shortest route.`,
    },
    ticketInfo: {
      type: args.ticket.type,
      priceCategory: args.ticket.priceCategory,
      validAtTimeOfDelay: args.ticket.valid,
    },
    taxiReceipt: receipt,
    payoutAccount: args.payoutAccount,
    // SL reimburses the actual fare, never the tip, up to the cap.
    claimedSEK: Math.min(receipt.fareSEK, SL_RULES.maxPayoutPerOccasion),
    onBehalfOf: {
      agent: args.agentName,
      fullmaktId: args.fullmakt.id,
      fullmaktSignedAt: args.fullmakt.signedAt,
    },
  };
}

/** Requirements that are empty in the payload. An empty list means the claim is complete. */
export function missingRequirements(payload: SLClaimPayload): ClaimRequirement[] {
  return SL_RULES.claimRequires.filter((req) => {
    const value = payload[REQUIREMENT_FIELDS[req]];
    if (value === null || value === undefined) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
  });
}
