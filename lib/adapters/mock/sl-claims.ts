import type { SLClaimsAdapter } from "@/lib/adapters/types";
import { pathTo, transition } from "@/lib/core/claim-machine";
import { missingRequirements } from "@/lib/core/claim-builder";
import type { MockState } from "@/lib/server/store";

type Deps = { state: () => MockState; now: () => number; id: (prefix: string) => string };

/** SL "acknowledges" a claim and starts reviewing it after this long. */
export const AUTO_REVIEW_AFTER_MS = 8000;

export function createMockSLClaimsAdapter({ state, now, id }: Deps): SLClaimsAdapter {
  const requireClaim = (claimId: string) => {
    const c = state().slClaims[claimId];
    if (!c) throw new Error(`Unknown claim ${claimId}`);
    return c;
  };

  return {
    async submitClaim(payload) {
      const missing = missingRequirements(payload);
      if (missing.length) throw new Error(`Claim incomplete: ${missing.join(", ")}`);
      const at = now();
      const claimId = id("clm");
      const slReference = `SL-${new Date(at).getUTCFullYear()}-${String(Object.keys(state().slClaims).length + 1042).padStart(6, "0")}`;
      const record = {
        payload,
        slReference,
        submittedAtMs: at,
        state: {
          status: "submitted" as const,
          history: [{ status: "submitted" as const, at: new Date(at).toISOString(), note: slReference }],
        },
      };
      state().slClaims[claimId] = record;
      return { id: claimId, slReference, state: record.state };
    },

    async getClaimStatus(claimId) {
      const c = requireClaim(claimId);
      if (c.state.status === "submitted" && now() - c.submittedAtMs >= AUTO_REVIEW_AFTER_MS) {
        c.state = transition(c.state, "underReview", new Date(c.submittedAtMs + AUTO_REVIEW_AFTER_MS));
      }
      return c.state;
    },

    async forceStatus(claimId, status, opts = {}) {
      const c = requireClaim(claimId);
      const path = pathTo(c.state.status, status);
      if (path === null) throw new Error(`Cannot move claim from ${c.state.status} to ${status}`);
      let next = c.state;
      for (const step of path) {
        next = transition(next, step, new Date(now()), step === status ? opts : {});
      }
      c.state = next;
      return c.state;
    },
  };
}
