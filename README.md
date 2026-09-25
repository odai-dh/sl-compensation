# Vidare – taxi when SL leaves you stranded

A clickable hackathon demo. When SL traffic breaks down and you risk arriving more than 20 minutes late,
Swedish law (Lag 2015:953) lets you take a taxi and SL reimburses up to 1 480 kr. Vidare checks
eligibility, orders and **pays** the taxi, and files the claim with SL for you under a BankID-signed
power of attorney. SL pays Vidare; you pay nothing.

Everything external (SL, taxi, payments, BankID, SL claims) is **mocked** behind TypeScript interfaces.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

- Open http://localhost:3000 in a phone-sized window (or DevTools device mode).
- Tap **Start demo** on the welcome screen to skip onboarding, or go through it (BankID mock takes ~3 s).
- Demo admin: http://localhost:3000/admin (trigger disruptions, move claims, see the ledger, reset).
- Demo card: `4242 4242 4242 4242`. `4000 0000 0000 0002` is declined; `4000 0000 0000 0341` saves but fails at payment.

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Dev server                          |
| `npm run build`     | Production build                    |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | `tsc --noEmit`                      |
| `npm test`          | Vitest unit tests for `lib/core` and the mock adapters |
| `npm run check`     | All three checks                    |

## Docs

- [CLAUDE.md](CLAUDE.md) – project brief and rules
- [DEMO.md](DEMO.md) – 3-minute pitch script with the admin actions
- [ARCHITECTURE.md](ARCHITECTURE.md) – layers, adapters, what becomes real in production, API for the iOS app

Stack: Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, shadcn/ui-style components, Framer Motion,
Zustand, Zod, react-leaflet + OpenStreetMap, Vitest.
