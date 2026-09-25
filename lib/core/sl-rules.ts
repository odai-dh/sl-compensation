/**
 * SL delay-compensation rules (förseningsersättning).
 *
 * Source: sl.se/kundservice/forseningsersattning + SL allmänna villkor §4, as of 2026-09-25.
 * Legal basis: Lag (2015:953) om kollektivtrafikresenärers rättigheter.
 *
 * This is the single source of truth for SL's numbers. Never hard-code them elsewhere.
 * maxPayoutPerOccasion = 2.5 % of prisbasbelopp and changes every January.
 */
export const SL_RULES = {
  maxPayoutPerOccasion: 1480, // SEK, = 2.5% of prisbasbelopp, changes yearly
  minDelayMinutes: 20, // must RISK a delay of at least this many minutes at the FINAL destination
  refundTiers: [
    // ticket-refund route (not used when a taxi is claimed)
    { minDelay: 20, maxDelay: 39, percent: 50 },
    { minDelay: 40, maxDelay: 59, percent: 75 },
    { minDelay: 60, maxDelay: null, percent: 100 },
  ],
  ownCarRatePerMil: 25,
  shortestRouteOnly: true,
  sharedRideIncreasesCap: false,
  refundAndTaxiExclusive: true, // can never claim both for the same delay
  deadlines: { complaintMonths: 3, claimAfterComplaintYears: 3, reconsiderationWeeks: 3 },
  noCompensationIf: [
    "disruption announced on sl.se >= 3 days before departure",
    "consequential costs (missed flights, lost income, appointments)",
    "tips",
    "claimant owns the taxi company",
    "journey fully on non-SL operators",
    "journey entirely within Uppsala county (claim from UL instead)",
  ],
  scope: { region: "Stockholm County", crossBorderCommuterRail: ["Gnesta", "Bålsta", "Uppsala"] },
  claimRequires: [
    "name",
    "personnummer",
    "address",
    "trip details",
    "ticket info",
    "original taxi receipt with time, route and tip",
    "bank account for payout",
  ],
} as const;

export type SLRules = typeof SL_RULES;
export type NoCompensationRule = SLRules["noCompensationIf"][number];
export type ClaimRequirement = SLRules["claimRequires"][number];
export type RefundTier = SLRules["refundTiers"][number];

/** How many days before departure an announcement makes a disruption "planned" (tre dygn). */
export const PRE_ANNOUNCED_DAYS = 3;

/**
 * Ticket-refund amounts (SEK per trip) for period tickets bought after 8 Jan 2025, from the
 * "Avdrag på biljettpriset vid försening" tables. Single/pay-as-you-go tickets are refunded as a
 * percentage of the price actually paid instead. Keyed by ticket type and price category.
 */
export const PERIOD_TICKET_REFUNDS_SEK: Record<
  string,
  { adult: [number, number, number]; reduced: [number, number, number] }
> = {
  "24h": { adult: [20, 30, 40], reduced: [12, 18, 24] },
  "72h": { adult: [18, 27, 36], reduced: [11, 17, 22] },
  "7d": { adult: [12, 18, 24], reduced: [7, 11, 15] },
  "30d": { adult: [12, 18, 24], reduced: [7, 11, 14] },
  month: { adult: [12, 18, 24], reduced: [7, 11, 14] },
  "90d": { adult: [11, 17, 23], reduced: [7, 10, 14] },
  year: { adult: [12, 18, 24], reduced: [7, 11, 15] },
};

export const SL_CUSTOMER_SERVICE_PHONE = "08-600 10 00";
export const SL_CLAIM_FORM_URL = "https://sl.se/kundservice/forseningsersattning";
