import type { RejectionReason } from "./policy";
import { SL_RULES, type SLRules } from "./sl-rules";

export const CLAIM_STATUSES = ["submitted", "underReview", "approved", "rejected", "paidOut"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** submitted → underReview → approved | rejected → paidOut. A rejection can be reconsidered (omprövning). */
const TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  submitted: ["underReview"],
  underReview: ["approved", "rejected"],
  approved: ["paidOut"],
  rejected: ["underReview"],
  paidOut: [],
};

export type ClaimStatusEvent = {
  status: ClaimStatus;
  at: string; // ISO
  note?: string;
};

export type ClaimState = {
  status: ClaimStatus;
  history: ClaimStatusEvent[];
  rejectionReason?: RejectionReason;
  decidedAt?: string;
};

export class ClaimTransitionError extends Error {
  constructor(
    public readonly from: ClaimStatus,
    public readonly to: ClaimStatus,
    message?: string,
  ) {
    super(message ?? `Cannot move a claim from ${from} to ${to}`);
    this.name = "ClaimTransitionError";
  }
}

export function canTransition(from: ClaimStatus, to: ClaimStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isFinal(status: ClaimStatus): boolean {
  return status === "paidOut";
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** The complaint (reklamation) must reach SL within 3 months of the delayed trip. */
export function complaintDeadline(tripDate: Date, rules: SLRules = SL_RULES): Date {
  return addMonths(tripDate, rules.deadlines.complaintMonths);
}

/** Reconsideration (omprövning) must be requested within 3 weeks of SL's decision. */
export function reconsiderationDeadline(decidedAt: Date, rules: SLRules = SL_RULES): Date {
  return new Date(decidedAt.getTime() + rules.deadlines.reconsiderationWeeks * WEEK_MS);
}

export function daysUntil(deadline: Date, now: Date): number {
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

/** Applies one transition. Throws ClaimTransitionError if it is not allowed. */
export function transition(
  state: ClaimState,
  to: ClaimStatus,
  at: Date,
  opts: { rejectionReason?: RejectionReason; note?: string } = {},
  rules: SLRules = SL_RULES,
): ClaimState {
  if (!canTransition(state.status, to)) {
    throw new ClaimTransitionError(state.status, to);
  }
  if (state.status === "rejected" && to === "underReview") {
    if (!state.decidedAt || at > reconsiderationDeadline(new Date(state.decidedAt), rules)) {
      throw new ClaimTransitionError(state.status, to, "The 3-week reconsideration window has passed");
    }
  }
  if (to === "rejected" && !opts.rejectionReason) {
    throw new ClaimTransitionError(state.status, to, "A rejection needs a reason (userFault | other)");
  }
  const decided = to === "approved" || to === "rejected";
  return {
    status: to,
    history: [...state.history, { status: to, at: at.toISOString(), note: opts.note }],
    rejectionReason: to === "rejected" ? opts.rejectionReason : to === "underReview" ? undefined : state.rejectionReason,
    decidedAt: decided ? at.toISOString() : state.decidedAt,
  };
}

/**
 * Shortest chain of allowed transitions from `from` to `to` (excluding `from`).
 * Used by the demo admin to "force" a claim to any status. Returns null if unreachable.
 */
export function pathTo(from: ClaimStatus, to: ClaimStatus): ClaimStatus[] | null {
  if (from === to) return [];
  const queue: { status: ClaimStatus; path: ClaimStatus[] }[] = [{ status: from, path: [] }];
  const seen = new Set<ClaimStatus>([from]);
  while (queue.length) {
    const { status, path } = queue.shift()!;
    for (const next of TRANSITIONS[status]) {
      if (seen.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath;
      seen.add(next);
      queue.push({ status: next, path: nextPath });
    }
  }
  return null;
}
