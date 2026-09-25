# Vidare – project brief

You are building a clickable hackathon demo of a web app called "Vidare".

## The problem
When SL traffic (Stockholm public transport) breaks down, travellers get stranded. By Swedish law
(Lag 2015:953) and SL's own terms, if you risk arriving more than 20 minutes late you may take a taxi
and SL reimburses up to 1 480 SEK. Most people don't know this. Those who do often won't risk paying
several hundred SEK upfront and waiting weeks for the refund.

## The product
Vidare removes that friction. The user taps "I'm stranded", Vidare checks eligibility against SL's
rules, orders and PAYS for the taxi, and later files the compensation claim with SL on the user's
behalf using a power of attorney (fullmakt) the user signed once with BankID. SL pays Vidare.
The user pays nothing, unless the taxi costs more than the cap or the claim is rejected due to
the user's own fault (see Business rules).

## Scope of THIS version
A polished, clickable DEMO. Everything external is MOCKED behind clean interfaces:
- SL disruption data (mock feed; real source later = Trafiklab SL Deviations + realtime APIs)
- Taxi booking (mock provider with quotes, driver, live ETA)
- Payments (mock card + payout ledger)
- BankID signing (mock flow with a realistic QR/"open BankID" screen)
- SL claim submission (mock claims API with status transitions)
Each mock sits behind a TypeScript interface in /lib/adapters so a real implementation can replace it
without touching the UI. A SwiftUI iOS app will come later, so keep all business logic in pure,
framework-free TypeScript modules under /lib/core and expose it through Next.js route handlers
(/app/api/...) that an iOS client could call.

## Stack
- Next.js (latest, App Router), TypeScript strict, Tailwind CSS, shadcn/ui, Framer Motion
- Zustand for client state; mock persistence in an in-memory store on the server (seeded on boot)
- Map: react-leaflet with OpenStreetMap tiles (no API key)
- Zod for all API input/output validation
- Vitest for unit tests of /lib/core
- Mobile-first layout (the demo is shown on a phone-sized viewport), light + dark mode
- UI language: English with a Swedish toggle (i18n via a simple dictionary, sv + en)

## SL rules (source: sl.se/kundservice/forseningsersattning + SL allmänna villkor §4, as of 2026-09-25)
Put this exact object in /lib/core/sl-rules.ts and never hard-code these numbers elsewhere:

{
  "maxPayoutPerOccasion": 1480,            // SEK, = 2.5% of prisbasbelopp, changes yearly
  "minDelayMinutes": 20,                    // must RISK > 20 min delay at FINAL destination
  "refundTiers": [                          // ticket-refund route (not used when a taxi is claimed)
    { "minDelay": 20, "maxDelay": 39, "percent": 50 },
    { "minDelay": 40, "maxDelay": 59, "percent": 75 },
    { "minDelay": 60, "maxDelay": null, "percent": 100 }
  ],
  "ownCarRatePerMil": 25,
  "shortestRouteOnly": true,
  "sharedRideIncreasesCap": false,
  "refundAndTaxiExclusive": true,           // can never claim both for the same delay
  "deadlines": { "complaintMonths": 3, "claimAfterComplaintYears": 3, "reconsiderationWeeks": 3 },
  "noCompensationIf": [
    "disruption announced on sl.se >= 3 days before departure",
    "consequential costs (missed flights, lost income, appointments)",
    "tips",
    "claimant owns the taxi company",
    "journey fully on non-SL operators",
    "journey entirely within Uppsala county (claim from UL instead)"
  ],
  "scope": { "region": "Stockholm County", "crossBorderCommuterRail": ["Gnesta", "Bålsta", "Uppsala"] },
  "claimRequires": ["name", "personnummer", "address", "trip details", "ticket info",
                    "original taxi receipt with time, route and tip", "bank account for payout"]
}

## Business rules (Vidare's own policy, keep in /lib/core/policy.ts, all configurable)
- Vidare pays the taxi up to maxPayoutPerOccasion. If the quote is higher, the user sees the
  difference upfront and must accept paying it (charged to their card on file).
- Taxi must go by the shortest route to the user's FINAL destination; no tips are covered.
- Before the first ride the user must: verify identity (mock BankID), sign the fullmakt
  (mock BankID signature), add a card as guarantee, and register their SL ticket type.
- Claim rejected because of user fault (no valid ticket, false info) → user's card is charged the
  taxi cost. Claim rejected for any other reason → Vidare absorbs the loss.
- One ride per disruption per user. Rate-limit and flag users with unusually many claims
  (SL itself asks frequent claimants for extra proof).
- Demo fee model: show a "Vidare fee: 0 kr" line in the receipt, with a config value for later.

## Engineering rules
- /lib/core must be pure and fully unit tested; no React, no fetch.
- Every adapter has a Mock implementation and an interface; UI never imports a mock directly.
- No real personal data. Seed data uses obviously fake names and personnummer (e.g. 19900101-0000).
- Keep components small; co-locate screen components under /app/(screens).
- After each task: run lint, typecheck and tests, and fix what fails.

## Repo notes (added during build)
- The rules object in `lib/core/sl-rules.ts` was cross-checked against the "SL Förseningsersättning –
  Compensation Rules Reference" (sl.se, read 2026-09-25). SL applies the threshold as "at least 20 minutes"
  (20–39 min → 50 %), so the engine treats 20 min as eligible and 19 min as not eligible.
- Commands: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm test`.
- Hidden demo admin: `/admin`. One-click demo: "Start demo" on the welcome screen.

@AGENTS.md
