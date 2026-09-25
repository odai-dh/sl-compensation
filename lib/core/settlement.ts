import type { ClaimStatus } from "./claim-machine";
import { VIDARE_POLICY, type RejectionReason } from "./policy";
import type { QuoteSplit } from "./quote";

export type Party = "vidare" | "user" | "sl" | "taxi" | "loss";

export type LedgerKind =
  | "taxiPaymentByVidare"
  | "taxiExcessByUser"
  | "slPayout"
  | "userFaultCharge"
  | "writeOff"
  | "userRefund"
  | "writeOffReversal";

export type LedgerDraft = {
  kind: LedgerKind;
  from: Party;
  to: Party;
  amountSEK: number;
  rideId: string;
  claimId?: string;
};

/** Money movements when a ride is booked with a fixed-price quote. */
export function bookingEntries(split: QuoteSplit, rideId: string): LedgerDraft[] {
  const entries: LedgerDraft[] = [
    { kind: "taxiPaymentByVidare", from: "vidare", to: "taxi", amountSEK: split.vidarePaysSEK, rideId },
  ];
  if (split.userPaysSEK > 0) {
    entries.push({ kind: "taxiExcessByUser", from: "user", to: "taxi", amountSEK: split.userPaysSEK, rideId });
  }
  return entries;
}

/** Who ends up paying when a claim reaches a decisive status. Existing entries make it idempotent. */
export function settlementEntries(args: {
  status: ClaimStatus;
  claimId: string;
  rideId: string;
  claimedSEK: number;
  rejectionReason?: RejectionReason;
  existing: LedgerDraft[];
}): LedgerDraft[] {
  const { status, claimId, rideId, claimedSEK, existing } = args;
  const has = (kind: LedgerKind) => existing.some((e) => e.kind === kind && e.claimId === claimId);
  const base = { claimId, rideId, amountSEK: claimedSEK };
  const out: LedgerDraft[] = [];

  if (status === "paidOut" && !has("slPayout")) {
    out.push({ ...base, kind: "slPayout", from: "sl", to: "vidare" });
    // A reconsidered claim that was first rejected: undo whatever the rejection did.
    if (has("userFaultCharge") && !has("userRefund")) {
      out.push({ ...base, kind: "userRefund", from: "vidare", to: "user" });
    }
    if (has("writeOff") && !has("writeOffReversal")) {
      out.push({ ...base, kind: "writeOffReversal", from: "loss", to: "vidare" });
    }
  }

  if (status === "rejected" && args.rejectionReason) {
    const action = VIDARE_POLICY.rejection[args.rejectionReason];
    if (action === "chargeUser" && !has("userFaultCharge")) {
      out.push({ ...base, kind: "userFaultCharge", from: "user", to: "vidare" });
    }
    if (action === "vidareAbsorbs" && !has("writeOff")) {
      out.push({ ...base, kind: "writeOff", from: "vidare", to: "loss" });
    }
  }
  return out;
}

export type ClaimBalance = {
  /** What Vidare paid out for this ride. */
  vidareOutSEK: number;
  /** What came back (from SL or the user). */
  vidareInSEK: number;
  /** Written off as a loss. */
  lossSEK: number;
  /** Still expected from SL. */
  receivableSEK: number;
  /** vidareIn - vidareOut (negative = Vidare is out of pocket). */
  netSEK: number;
};

const OPEN: ClaimStatus[] = ["submitted", "underReview", "approved"];

export function claimBalance(
  entries: LedgerDraft[],
  claim: { status: ClaimStatus; claimedSEK: number } | null,
): ClaimBalance {
  let vidareOutSEK = 0;
  let vidareInSEK = 0;
  let lossSEK = 0;
  for (const e of entries) {
    if (e.kind === "writeOff") lossSEK += e.amountSEK;
    else if (e.kind === "writeOffReversal") lossSEK -= e.amountSEK;
    else if (e.from === "vidare") vidareOutSEK += e.amountSEK;
    else if (e.to === "vidare") vidareInSEK += e.amountSEK;
  }
  const receivableSEK = claim && OPEN.includes(claim.status) ? claim.claimedSEK : 0;
  return { vidareOutSEK, vidareInSEK, lossSEK, receivableSEK, netSEK: vidareInSEK - vidareOutSEK };
}
