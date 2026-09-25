import "server-only";
import { getStore, newId, now } from "@/lib/server/store";
import { createMockBankIdAdapter } from "./mock/bankid";
import { createMockDisruptionAdapter } from "./mock/disruptions";
import { createMockPaymentAdapter } from "./mock/payments";
import { createMockSLClaimsAdapter } from "./mock/sl-claims";
import { createMockTaxiAdapter } from "./mock/taxi";
import type { Adapters } from "./types";

export type * from "./types";

/**
 * The adapter registry. This is the only place that knows which implementation is used.
 * Swap a mock for a real implementation here (e.g. based on an env var) and nothing else changes.
 */
export function getAdapters(): Adapters {
  const g = globalThis as unknown as { __vidareAdapters?: Adapters };
  if (!g.__vidareAdapters) {
    const deps = { state: () => getStore().mock, now, id: newId };
    g.__vidareAdapters = {
      disruptions: createMockDisruptionAdapter(deps),
      taxi: createMockTaxiAdapter(deps),
      payments: createMockPaymentAdapter(deps),
      bankid: createMockBankIdAdapter(deps),
      claims: createMockSLClaimsAdapter(deps),
    };
  }
  return g.__vidareAdapters;
}
