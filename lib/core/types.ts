/** Shared domain types. Pure data – no framework imports. */

export type LatLng = { lat: number; lng: number };

export type County = "Stockholm" | "Uppsala" | "Södermanland" | "Other";

export type Place = {
  id: string;
  name: string;
  address: string;
  county: County;
  position: LatLng;
};

export type TransportMode = "metro" | "commuterRail" | "bus" | "tram" | "lightRail" | "ferry";

export type Operator = "SL" | "UL" | "other";

export type Disruption = {
  id: string;
  title: { en: string; sv: string };
  cause: { en: string; sv: string };
  mode: TransportMode;
  /** Display name of the affected line, e.g. "Red line (T13/T14)". */
  lineName: string;
  affectedLines: string[];
  /** Stop names on the affected stretch, in order. */
  affectedStops: string[];
  /** Where the disruption is, for "near you". */
  position: LatLng;
  county: County;
  operator: Operator;
  /** When the disruption was first published on sl.se (ISO). */
  announcedAt: string;
  /** Expected extra delay at the traveller's final destination, in minutes. */
  expectedDelayMinutes: number;
  active: boolean;
};

export type TicketType =
  | "reskassa"
  | "betalkort"
  | "appSingle"
  | "24h"
  | "72h"
  | "7d"
  | "30d"
  | "month"
  | "90d"
  | "year";

export type PriceCategory = "adult" | "reduced";

export type Ticket = {
  type: TicketType;
  priceCategory: PriceCategory;
  /** Whether the user had a valid ticket at the time of the delay. */
  valid: boolean;
};

export type Trip = {
  origin: Place;
  destination: Place;
  mode: TransportMode;
  line: string;
  operator: Operator;
  /** ISO timestamps. */
  scheduledDeparture: string;
  scheduledArrival: string;
};

export type Route = "taxi" | "ticketRefund" | "none";

export type Money = number; // whole SEK
