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

- **Showcase website:** http://localhost:3000 – a scroll-driven 3D story with the real app in a phone.
  Press **P** to present, **Jury mode** to auto-play the demo. `?static=1` forces the illustrated (no-3D)
  version, `?debug=1` shows an FPS meter.
- **App:** http://localhost:3000/app in a phone-sized window. Tap **Start demo** to skip onboarding, or go
  through it (BankID mock takes ~3 s). `/app?embed=1` is the embed mode the website uses.
- **Demo admin:** http://localhost:3000/admin (trigger disruptions, move claims, see the ledger, reset).
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

## Deploy to Netlify

1. Push the repo, then in Netlify: **Add new site → Import an existing project** and pick it. `netlify.toml`
   sets the build command and Node 22; Netlify's Next.js runtime is detected automatically.
2. Optional: set `NEXT_PUBLIC_SITE_URL` (your final domain) so the share image gets an absolute URL. Without
   it the site uses Netlify's `URL` / `DEPLOY_PRIME_URL`.
3. **After the first deploy, open `https://<your-site>/api/health`.** It must answer `"storage":"netlify-blobs"`.
   If it says `"memory"` (HTTP 503), Netlify Blobs isn't available to the functions and demo data would not
   survive between requests – don't present from that deploy.
4. Then run the checklist in `DEMO.md` once on the live URL, on the projector laptop.

How state works there: every visitor gets a private sandbox (an id in `localStorage`, sent as
`x-vidare-sandbox`), stored in Netlify Blobs. One jury member pressing "Reset demo" never affects another.
A sandbox is rebuilt after 12 hours so the seeded "announced 12 minutes ago" disruptions stay fresh.
The `/admin` page and `/api/admin/*` routes are open on purpose (the website's "skip to the payout" and
Jury mode use them); they only ever change the caller's own sandbox.

## Docs

- [CLAUDE.md](CLAUDE.md) – project brief and rules
- [DEMO.md](DEMO.md) – 3-minute pitch script with the admin actions
- [ARCHITECTURE.md](ARCHITECTURE.md) – layers, adapters, what becomes real in production, API for the iOS app

Stack: Next.js 16 (App Router), TypeScript strict, Tailwind CSS 4, shadcn/ui-style components, Framer Motion,
Zustand, Zod, react-leaflet + OpenStreetMap, Vitest. Website: three.js via React Three Fiber + drei +
postprocessing, GSAP ScrollTrigger + SplitText, Lenis, Web Audio API.

The team names on the website are placeholders – edit `lib/site/content.ts`. When you deploy, set
`NEXT_PUBLIC_SITE_URL` so the Open Graph image (`public/og.png`) gets an absolute URL.
