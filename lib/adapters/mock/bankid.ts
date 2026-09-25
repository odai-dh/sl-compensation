import type { BankIDAdapter, BankIdPoll } from "@/lib/adapters/types";
import { DEMO_PERSON } from "@/lib/mock-data/people";
import type { MockState } from "@/lib/server/store";

type Deps = { state: () => MockState; now: () => number; id: (prefix: string) => string };

/** The mock completes after this long, like a user opening the app and entering their code. */
export const BANKID_MOCK_DURATION_MS = 3000;

/** Tiny non-cryptographic hash, enough to show a stable "document hash" in the demo. */
export function demoHash(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).toUpperCase();
}

export function createMockBankIdAdapter({ state, now, id }: Deps): BankIDAdapter {
  const start = (kind: "auth" | "sign", extra: { documentHash?: string; personnummer?: string } = {}) => {
    const orderRef = id(`bid${kind}`);
    const startedAtMs = now();
    state().bankid[orderRef] = { kind, startedAtMs, status: "pending", ...extra };
    return { orderRef, autoStartToken: `mock-${orderRef}`, kind, startedAt: new Date(startedAtMs).toISOString() };
  };

  const view = (orderRef: string): BankIdPoll => {
    const o = state().bankid[orderRef];
    if (!o) throw new Error(`Unknown BankID order ${orderRef}`);
    const elapsed = now() - o.startedAtMs;
    if (o.status === "pending" && elapsed >= BANKID_MOCK_DURATION_MS) {
      o.status = "complete";
      o.completion = {
        ...DEMO_PERSON,
        ...(o.kind === "sign"
          ? { documentHash: o.documentHash, signature: `MOCKSIG-${demoHash(`${orderRef}:${o.documentHash}`)}` }
          : {}),
      };
    }
    const hintCode =
      o.status === "pending"
        ? elapsed > BANKID_MOCK_DURATION_MS / 2
          ? "userSign"
          : "outstandingTransaction"
        : o.status === "cancelled"
          ? "userCancel"
          : null;
    return {
      orderRef,
      status: o.status,
      hintCode,
      // Real BankID rotates the QR every second; we mimic that.
      qrData: `bankid.${orderRef}.${Math.floor(elapsed / 1000)}.${demoHash(orderRef + Math.floor(elapsed / 1000))}`,
      completion: o.completion,
    };
  };

  return {
    async startAuth() {
      return start("auth");
    },
    async startSign(document, personnummer) {
      return start("sign", { documentHash: demoHash(document.title + "\n" + document.text), personnummer });
    },
    async poll(orderRef) {
      return view(orderRef);
    },
    async cancel(orderRef) {
      const o = state().bankid[orderRef];
      if (o && o.status === "pending") o.status = "cancelled";
      return view(orderRef);
    },
  };
}
