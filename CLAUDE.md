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
- Website: `/`. App: `/app` (one-click "Start demo" on its welcome screen). Hidden demo admin: `/admin`.

## Deployment rules (Netlify, serverless)
- Never keep demo state in a module-level variable: requests land on different instances. All server state
  lives in the per-visitor sandbox (`lib/server/sandbox.ts`), reached through `getStore()`, which only works
  inside `withSandbox()`. Route handlers get this for free by using `handle()`.
- Every client `fetch` to `/api` must go through `lib/client/api.ts` (it adds the `x-vidare-sandbox` header).
- API responses are private: keep `Cache-Control: no-store`.
- After deploying, `/api/health` must report `"storage":"netlify-blobs"`.
- Don't `pkill -f`/match processes by command text in shell helpers (it kills your own shell); use ports.

## Showcase website
A cinematic, scroll-driven 3D website for the hackathon jury, wrapped around the real app.

- **Routing:** the website is `/` (`app/(site)`); the app lives at `/app/...` (`app/(screens)/app`); the demo admin
  stays at `/admin`. Embed mode: `/app?embed=1` (or any time the app runs in an iframe) hides the browser-only
  chrome, adds room for the phone's status bar and fits a 390×844 viewport.
- **Prompt 7 – foundation:** one fixed R3F `<SiteCanvas/>` behind the page (dynamic import, `ssr:false`,
  `<Suspense>`, `AdaptiveDpr` + `PerformanceMonitor`). A Zustand scene store (`lib/site/store.ts`) holds
  `storyT`/`scrollProgress`, `currentChapter` and demo events so DOM and 3D read the same state. Lenis smooth
  scroll is wired to GSAP ScrollTrigger. The world (`components/site/three`) is procedural: instanced seeded city
  with a window shader, raised track on pillars, a 4-carriage train, a taxi, GPU rain, a wet reflective street,
  bloom + vignette + grain.
- **Prompt 8 – scroll story:** five chapters (on your way home → the train stops → your right → Vidare takes
  over → SL pays us). The camera flies a Catmull-Rom spline through stations; every visual is a pure function of
  `storyT` (`lib/site/story.ts`, unit tested), and the chapter text is one paused GSAP timeline seeked to `storyT`,
  so any scroll speed or direction gives the same frame. Exception: the train is a small simulation
  (`lib/site/train.ts`, shared by the 3D scene and the fallback) – the story only sets its goal (run/stop), so it
  never reverses or jumps in view. Numbers come from `lib/core/sl-rules.ts`. Side dots
  navigate chapters. Mobile uses a simpler camera path, fewer buildings and no postprocessing.
- **Prompt 9 – live demo:** the "Try it" section shows `/app?embed=1` in a CSS phone. Typed, Zod-validated,
  origin-checked `postMessage` events (`lib/embed/events.ts`): app → site `disruptionDetected`,
  `eligibilityChecked`, `taxiOrdered`, `rideStatusChanged`, `rideCompleted`, `claimStatusChanged` (+ `ready`,
  `route`, `pointer`); site → app `resetDemo`, `runJury`, `stopJury`, `cursor`. The app derives events from its
  API traffic (`lib/client/embed.ts`), only in embed mode. The 3D world reacts (train stops, taxi drives in step
  with the ride, amber burst + toast on payout) and a checklist ticks. **Jury mode** plays the whole flow.
- **Prompt 10 – details:** custom cursor (taxi over the phone), magnetic buttons, tilt cards, evening→midnight
  slider, Web Audio sound design (off by default), live "stranded right now" counter (demo data), intro loader,
  "sl" easter egg, final section with team (edit `lib/site/content.ts`), tech badges and open questions.
- **Prompt 11 – polish:** tab-hidden pause, instancing, disposal, lazy iframe, `?debug=1` FPS meter, illustrated
  fallback for no-WebGL/slow devices (`?static=1` forces it), reduced-motion (no flying, no particles),
  real-DOM text with heading order, OG image, favicon, presentation mode (`P`, arrows).

### Art direction
- Mood: Stockholm on a late autumn evening. Deep blue-black night, wet streets, warm sodium streetlights,
  one accent colour for Vidare (warm amber/taxi-yellow `#ffb020`), and a cold signal red (`#ff3b3b`) for the
  disruption.
- Style: stylised low-poly, not photoreal. Everything procedural from primitives and custom geometry; no
  downloaded models, textures or fonts with unclear licences.
- Typography: Unbounded (display) and Inter (text), both Google Fonts under SIL OFL, self-hosted from the
  Fontsource npm packages with `next/font/local` so builds and the pitch need no network.
- Never use SL's logo, name styling or brand colours. SL is mentioned in text only; the footer says
  "Hackathon concept. Not affiliated with SL."

@AGENTS.md
