# Architecture

```
app/(site)              Showcase website at "/" (scroll story + live demo)
components/site/…       Website DOM (chapters, Try it, cursor, sound…) and three/ (the 3D world)
lib/site/…              Website state (Zustand), pure story math, sound engine, content
lib/embed/events.ts     Typed postMessage protocol between the website and the embedded app
app/(screens)/app/…     Phone UI at /app (React client components, one folder per screen)
app/admin               Hidden demo admin + ledger
app/api/…               Route handlers = the public API (web today, SwiftUI app tomorrow)
lib/schemas.ts          Zod schemas for every request and response
lib/server/services.ts  Orchestration: calls adapters + core, owns Vidare's own data
lib/server/store.ts     In-memory store (seeded on boot by lib/server/seed.ts)
lib/adapters/types.ts   Adapter interfaces
lib/adapters/mock/*     Mock implementations
lib/adapters/index.ts   Registry – the only file that picks an implementation
lib/core/*              Pure business logic, no React, no fetch, fully unit tested
lib/i18n/*              en/sv dictionaries, fullmakt text
lib/client/*            Browser-side: Zustand store, typed API client, hooks
```

Dependency direction: `UI → lib/client/api → /app/api → services → adapters + core`. The UI never imports
an adapter or a mock; route handlers never contain business rules.

## Core (`lib/core`)

| Module | What it does |
| --- | --- |
| `sl-rules.ts` | SL's rules as one typed object (cap 1 480 kr, 20 min, refund tiers, deadlines, exclusions, claim requirements). The only place these numbers live – UI strings get them through `{cap}`, `{min}` … placeholders. |
| `policy.ts` | Vidare's own configurable policy: cover up to the cap, fee (0 kr), one ride per disruption, fraud thresholds, who pays on rejection, onboarding steps. |
| `eligibility.ts` | `checkEligibility(input) → { eligible, route, reasons, expectedDelayMinutes, refundPercent, taxiCapSEK, blockedBy }`. Implements the Uppsala-county rule, non-SL operators, 3-day pre-announcement, the 20-minute threshold at the final destination, valid ticket, taxi/refund exclusivity, own taxi company, trip already over. |
| `quote.ts` | Splits a fare into "Vidare pays" and "you pay" using the cap. |
| `ride-machine.ts` | Time-based ride status machine: searching → driverAssigned → arriving → inProgress → completed, with the car interpolated along a straight line. |
| `claim-machine.ts` | Claim status machine: submitted → underReview → approved \| rejected → paidOut (rejected → underReview for omprövning within 3 weeks). Deadlines. |
| `settlement.ts` | Ledger entries for booking and for each decision; per-claim balance and receivables. |
| `risk.ts`, `onboarding.ts`, `claim-builder.ts` | Rate limiting / flagging, onboarding gate, the exact payload sent to SL (one field per `claimRequires` item). |

## Adapters: mock today, real tomorrow

| Interface | Mock | Production |
| --- | --- | --- |
| `SLDisruptionAdapter` | 5 seeded Stockholm disruptions + admin-triggered ones | **Trafiklab**: *SL Deviations API* (announcements, with publish time → pre-announcement rule) plus *SL Transport / GTFS Regional Realtime* for live delays at the traveller's final stop. |
| `TaxiAdapter` | Fixed price 45 kr + 14 kr/km, simulated driver and ETA | A **taxi partner's business API** (booking, fixed-price quotes, live position webhooks, digital receipts invoiced to Vidare). |
| `PaymentAdapter` | Test cards and an in-memory ledger | **Stripe or Adyen**: card saved with a SetupIntent (SCA once), off-session charges for the excess above the cap or user-fault rejections; ledger in Postgres with double-entry bookkeeping. |
| `BankIDAdapter` | 3-second auth/sign with a rotating fake QR | **BankID RP API v6** via a provider such as **Signicat, Criipto or Freja eID** (animated QR, autostart token, collect). Sign returns a verifiable signature over the fullmakt. |
| `SLClaimsAdapter` | Claims with admin-forced statuses | Filing with **SL under the fullmakt**. SL's web form assumes the traveller's own BankID and account, so this needs an agreement with SL (API, bulk upload or a manual back office) – the biggest open question. |

Swapping an implementation means editing `lib/adapters/index.ts` only.

## Main flows

**Stranded → taxi**
1. `POST /api/eligibility` builds the trip (origin stop, final destination, line from the disruption) and runs `checkEligibility` with the user's registered ticket and prior claims.
2. `POST /api/taxi/quote` returns the fixed-price quote and the split.
3. `POST /api/rides` re-checks everything on the server (onboarding, fullmakt, fraud limits, one ride per disruption, eligibility, quote matches the trip, excess accepted), charges the user's excess first, books the taxi, then pays it.
4. `GET /api/rides/:id` is polled for live status. On completion the receipt is created and the SL claim is filed automatically (idempotent).

**Money**

| Event | Ledger |
| --- | --- |
| Ride booked | Vidare → taxi (up to cap); user → taxi (excess, if any) |
| SL pays out | SL → Vidare |
| Rejected, user fault | user → Vidare (card charged) |
| Rejected, other reason | Vidare → loss (write-off) |
| Paid after reconsideration | reverses the charge or write-off |

## API for the SwiftUI app

All endpoints return `{ ok: true, data } | { ok: false, error: { code, message, details? } }` and are
validated with the Zod schemas in `lib/schemas.ts` (mirror them as `Codable` structs).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/disruptions?lat&lng` | Active disruptions, nearest first |
| GET | `/api/places?q` | Address search |
| POST | `/api/bankid/auth` · GET `/api/bankid/:orderRef` · POST `…/cancel` | BankID sign-in |
| GET / PATCH | `/api/users/:id` | Profile, ticket, saved places, onboarding status, risk |
| POST | `/api/users/:id/card` | Save card |
| POST / DELETE | `/api/users/:id/fullmakt` · GET `…/fullmakt/:orderRef` | Sign (BankID) / revoke the power of attorney |
| POST | `/api/eligibility` | Verdict |
| POST | `/api/taxi/quote` | Price + split |
| POST | `/api/rides` · GET `/api/rides/:id` | Order and follow a ride |
| GET | `/api/users/:id/rides`, `/api/users/:id/claims` | History |
| GET | `/api/claims/:id` · POST `…/reconsideration` | Claim detail, omprövning |
| GET | `/api/ledger` | Vidare's money in/out (admin) |
| * | `/api/admin/*`, `/api/demo/start` | Demo only |

The iOS app reuses the whole API, the Zod contracts (as `Codable` models), the i18n keys and the
eligibility reasons (the API returns keys, the client renders them). Business logic stays on the server,
so iOS never re-implements SL's rules.

## Before this is a real product

- **Auth**: the demo passes `userId` in the URL/body. Production needs sessions/tokens from the BankID login, and the admin routes must be removed or protected.
- **Persistence**: replace the in-memory store with Postgres; add idempotency keys on booking and payment calls; webhooks instead of polling.
- **Personal data**: personnummer and receipts are sensitive – encryption at rest, retention rules, DPIA.
- **Open questions** (see CLAUDE.md): will SL accept third-party claims under fullmakt and pay a third party; do digital taxi receipts count as originals; which taxi partner; revenue model; capital to front up to 1 480 kr per ride.

## Showcase website

- **One canvas.** `SiteCanvas` renders a single fixed R3F canvas behind the page. It is loaded with
  `next/dynamic` (`ssr: false`), falls back to an illustrated SVG version when WebGL is missing, the context is
  lost, `PerformanceMonitor` gives up, or `?static=1` is set. Rendering pauses while the tab is hidden.
- **One source of truth.** Scroll position becomes `storyT` (section index + progress) in the site store.
  `sceneAt(storyT, demo)` and `cameraT(storyT)` in `lib/site/story.ts` are pure and unit tested; the 3D
  components read them every frame and the chapter text is a paused GSAP timeline seeked to `storyT`.
- **Live demo bridge.** The app emits events derived from its own API responses (`lib/client/embed.ts`) only
  when embedded; the site validates them with Zod and checks `event.origin` and `event.source`. The site sends
  `resetDemo`, `runJury`, `stopJury` and `cursor`. Jury mode (`lib/client/jury.ts`) drives the real app screens
  and the demo admin API.
- **Performance.** Buildings, pillars, lamps and lane markings are instanced; rain is a single GPU-animated
  line-segment buffer; geometry and materials are disposed on unmount; the iframe loads lazily; mobile gets
  fewer buildings, no reflections and no postprocessing.

## State, sandboxes and deployment

The demo has no database, but it must behave on a serverless host where every request may land on a
different instance. So state is never kept in a module variable:

- `lib/server/sandbox.ts` – `withSandbox(id, fn)` loads the visitor's snapshot, runs `fn` on a private copy
  (via `AsyncLocalStorage`, see `getStore()` in `lib/server/store.ts`), and writes it back only if something
  changed **and nobody else wrote meanwhile** (compare-and-swap). On a collision the request re-runs on fresh
  data, so simultaneous polls can't file the same SL claim twice. If `fn` throws, all its changes are dropped.
- `lib/server/persistence.ts` – `StoreBackend` (read + compare-and-swap write). Netlify Blobs on Netlify
  (strong consistency, `onlyIfMatch`/`onlyIfNew`), an in-memory copy everywhere else. Only a "Blobs not
  configured" error selects the fallback; any other Blobs failure is surfaced.
- `lib/server/http.ts` – `handle()` reads `x-vidare-sandbox` (no header → one shared public sandbox) and
  wraps every route in `withSandbox`. Responses are `Cache-Control: no-store`.
- `lib/client/sandbox.ts` – the id lives in `localStorage`; the website and its iframe share it.
- `GET /api/health` – reports which backend is active; use it after every deploy.

To go beyond a demo: replace `StoreBackend` with Postgres (rows instead of one JSON blob), keep the
"one request = one transaction" shape, and add real authentication instead of a sandbox id.
