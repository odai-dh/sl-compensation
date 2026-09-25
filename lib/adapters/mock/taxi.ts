import { TaxiUnavailableError, type TaxiAdapter, type TaxiQuote } from "@/lib/adapters/types";
import { offsetKm, roadDistanceKm } from "@/lib/core/geo";
import { DEMO_TIMELINE, fastForwardOffsetSec, rideSnapshot } from "@/lib/core/ride-machine";
import { DRIVERS, TAXI_COMPANY } from "@/lib/mock-data/people";
import type { MockState } from "@/lib/server/store";

type Deps = { state: () => MockState; now: () => number; id: (prefix: string) => string };

/** Mock fixed-price tariff: 45 kr start + 14 kr/km. */
export const TARIFF = { startSEK: 45, perKmSEK: 14 };
/** Short city hops crawl, longer rides get onto the motorway. */
const avgSpeedKmh = (km: number) => Math.min(70, 25 + km * 0.6);
const QUOTE_TTL_MS = 10 * 60_000;

export function mockFare(distanceKm: number): number {
  return Math.round(TARIFF.startSEK + TARIFF.perKmSEK * distanceKm);
}

export function createMockTaxiAdapter({ state, now, id }: Deps): TaxiAdapter {
  const requireBooking = (bookingId: string) => {
    const b = state().bookings[bookingId];
    if (!b) throw new Error(`Unknown booking ${bookingId}`);
    return b;
  };

  return {
    async getQuote(from, to) {
      if (!state().taxiAvailable) throw new TaxiUnavailableError();
      const distanceKm = Math.max(1, roadDistanceKm(from.position, to.position));
      const createdAt = now();
      const quote: TaxiQuote = {
        id: id("quo"),
        provider: TAXI_COMPANY.name,
        from,
        to,
        distanceKm,
        fareSEK: mockFare(distanceKm),
        pickupEtaMin: 3 + (Math.round(distanceKm) % 4),
        tripDurationMin: Math.max(5, Math.round((distanceKm / avgSpeedKmh(distanceKm)) * 60)),
        createdAt: new Date(createdAt).toISOString(),
        expiresAt: new Date(createdAt + QUOTE_TTL_MS).toISOString(),
      };
      state().quotes[quote.id] = quote;
      return quote;
    },

    async book(quoteId) {
      if (!state().taxiAvailable) throw new TaxiUnavailableError();
      const quote = state().quotes[quoteId];
      if (!quote) throw new Error(`Unknown quote ${quoteId}`);
      if (new Date(quote.expiresAt).getTime() < now()) throw new Error("Quote expired");
      const count = Object.keys(state().bookings).length;
      const driver = DRIVERS[count % DRIVERS.length];
      const bookedAtMs = now();
      const booking = {
        id: id("bok"),
        quote,
        driver,
        // Driver starts ~1.5 km away, from a varying direction.
        driverStart: offsetKm(quote.from.position, 1.5, (count * 97) % 360),
        bookedAt: new Date(bookedAtMs).toISOString(),
      };
      state().bookings[booking.id] = { booking, bookedAtMs, cancelled: false };
      return booking;
    },

    async getRideStatus(bookingId) {
      const { booking, bookedAtMs, cancelled } = requireBooking(bookingId);
      const snap = rideSnapshot({
        bookedAt: bookedAtMs,
        now: now(),
        timeline: DEMO_TIMELINE,
        driverStart: booking.driverStart,
        origin: booking.quote.from.position,
        destination: booking.quote.to.position,
        pickupEtaMin: booking.quote.pickupEtaMin,
        tripDurationMin: booking.quote.tripDurationMin,
        cancelled,
      });
      return {
        ...snap,
        bookingId,
        driver: booking.driver,
        pickupAtIso: new Date(snap.pickedUpAt).toISOString(),
        completesAtIso: new Date(snap.completesAt).toISOString(),
      };
    },

    async fastForward(bookingId, to) {
      const b = requireBooking(bookingId);
      const target = now() - fastForwardOffsetSec(DEMO_TIMELINE, to) * 1000;
      // Only ever move forward in time.
      b.bookedAtMs = Math.min(b.bookedAtMs, target);
    },

    async setAvailability(available) {
      state().taxiAvailable = available;
    },

    async isAvailable() {
      return state().taxiAvailable;
    },
  };
}
