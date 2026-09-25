import { PaymentError, type LedgerEntry, type PaymentAdapter } from "@/lib/adapters/types";
import type { LedgerDraft } from "@/lib/core/settlement";
import type { MockState } from "@/lib/server/store";

type Deps = { state: () => MockState; now: () => number; id: (prefix: string) => string };

/** Stripe-style test cards. */
export const TEST_CARDS = {
  ok: "4242424242424242",
  declined: "4000000000000002",
  /** Attaches fine, but every charge fails – for the "payment failed" demo state. */
  chargeFails: "4000000000000341",
};

export function createMockPaymentAdapter({ state, now, id }: Deps): PaymentAdapter {
  const write = (userId: string, draft: LedgerDraft): LedgerEntry => {
    const entry: LedgerEntry = { ...draft, id: id("led"), at: new Date(now()).toISOString(), userId };
    state().ledger.push(entry);
    return entry;
  };

  return {
    async addCard(userId, card) {
      const digits = card.number.replace(/\s+/g, "");
      if (digits === TEST_CARDS.declined) throw new PaymentError("card_declined", "The card was declined");
      if (digits !== TEST_CARDS.ok && digits !== TEST_CARDS.chargeFails) {
        throw new PaymentError("invalid_card", "Use the demo card 4242 4242 4242 4242");
      }
      const expiry = new Date(Date.UTC(card.expYear, card.expMonth, 1));
      if (expiry.getTime() < now()) throw new PaymentError("invalid_card", "The card has expired");
      const saved = {
        id: id("card"),
        brand: "Visa",
        last4: digits.slice(-4),
        expMonth: card.expMonth,
        expYear: card.expYear,
        chargeFails: digits === TEST_CARDS.chargeFails,
      };
      state().cards[userId] = saved;
      const { chargeFails: _omit, ...publicCard } = saved;
      void _omit;
      return publicCard;
    },

    async getCard(userId) {
      const c = state().cards[userId];
      if (!c) return null;
      const { chargeFails: _omit, ...publicCard } = c;
      void _omit;
      return publicCard;
    },

    async chargeUser(userId, draft) {
      const card = state().cards[userId];
      if (!card) throw new PaymentError("no_card", "No card on file");
      if (card.chargeFails) throw new PaymentError("charge_failed", "The payment could not be completed");
      return write(userId, draft);
    },

    async payTaxi(userId, draft) {
      return write(userId, draft);
    },

    async record(userId, draft) {
      return write(userId, draft);
    },

    async ledger(filter = {}) {
      return state().ledger.filter(
        (e) => (!filter.userId || e.userId === filter.userId) && (!filter.rideId || e.rideId === filter.rideId),
      );
    },
  };
}
