import type { Disruption, Place, Ticket, Trip } from "@/lib/core/types";

export const NOW = new Date("2026-09-25T07:30:00Z");

export const place = (id: string, county: Place["county"] = "Stockholm"): Place => ({
  id,
  name: id,
  address: `${id} 1`,
  county,
  position: { lat: 59.33, lng: 18.06 },
});

export function makeDisruption(overrides: Partial<Disruption> = {}): Disruption {
  return {
    id: "d-red",
    title: { en: "Signal fault", sv: "Signalfel" },
    cause: { en: "Signal fault", sv: "Signalfel" },
    mode: "metro",
    lineName: "Red line",
    affectedLines: ["13", "14"],
    affectedStops: ["T-Centralen", "Gamla stan", "Slussen"],
    position: { lat: 59.33, lng: 18.06 },
    county: "Stockholm",
    operator: "SL",
    announcedAt: new Date(NOW.getTime() - 10 * 60_000).toISOString(),
    expectedDelayMinutes: 35,
    active: true,
    ...overrides,
  };
}

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    origin: place("T-Centralen"),
    destination: place("Liljeholmen"),
    mode: "metro",
    line: "13",
    operator: "SL",
    scheduledDeparture: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
    scheduledArrival: new Date(NOW.getTime() + 15 * 60_000).toISOString(),
    ...overrides,
  };
}

export const validTicket: Ticket = { type: "30d", priceCategory: "adult", valid: true };
