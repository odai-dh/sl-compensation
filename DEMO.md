# Demo script – 3 minutes, with the website

**Setup (before you go on stage)**

- Run the production build locally – it's smoother and doesn't need the venue wifi:
  `npm run build && npm start`, then open http://localhost:3000 full screen (F11) on the presenting laptop.
- Optional second window: http://localhost:3000/admin (only needed for the extras at the bottom).
- Check it on the real projector: if the 3D stutters, use http://localhost:3000/?static=1 (illustrated version –
  the live demo still works).
- Press **P** for presentation mode: header and side dots hide, **→ / ←** jump between chapters.
- Sound is off by default. Turn it on (top right) if the room has speakers – rain, a brake squeal, a taxi door,
  a chime on payout.

---

### 0:00 – Chapter 1 · "17:42. On your way home." (20 s)

> "Stockholm, a rainy autumn evening. You're on the Red line, heading home."

Point at the live counter (*travellers stranded right now – demo data*). Drag the **evening → midnight** slider
once: the sky darkens and the streetlights brighten. Press **→**.

### 0:20 – Chapter 2 · "Then the train stops." (25 s)

The train brakes, the signal turns red, the rain gets heavier; the delay clock ticks past **+20 min** and turns red.

> "Signal fault. 35 minutes. Most people just wait – or pay for a taxi themselves and forget about it."

### 0:45 – Chapter 3 · "You have a right…" (25 s)

The numbers count up: **20 min** and **1 480 kr** (read live from the rules file).

> "Swedish law says: if SL risks making you more than 20 minutes late, take a taxi – SL pays up to 1 480 kronor.
> But who fronts 1 480 kronor and waits weeks to get it back?"

### 1:10 – Chapter 4 · "Vidare takes it from here." (20 s)

The phone rises, the taxi pulls up under the streetlight, picks the traveller up and drives off.

> "One tap. Vidare checks SL's rules and orders a taxi that's already paid."

### 1:30 – Chapter 5 · "SL pays us. You pay nothing." (15 s)

> "You sign a power of attorney once with BankID. We pay the taxi, file the claim, SL pays us back."

### 1:45 – Try it · the real app (60 s)

Press **→** to land on the live demo. The phone is the real app, already signed in.

1. Tap **I'm stranded** → pick **Home** as the destination → **Check if I'm covered** → *You're covered*. *In the city behind it, the signal turns
   red and the train stops.*
2. **See taxi price** → *Vidare pays 354 kr, you pay 0 kr* → **Order taxi**. *The taxi drives in from the left,
   picks you up under the streetlight and heads off – in step with the ride in the phone.* Tap **Skip ahead**
   in the phone to speed it up.
3. On the receipt: *Claim filed with SL automatically*. On the website, press
   **SL takes weeks – skip to the payout**. *Amber burst, "Paid by SL · 354 kr", the checklist completes.*

> "That's it. The traveller got home and paid nothing. SL paid Vidare."

**Backup:** if anything goes wrong, or you're nervous: press **Jury mode**. It plays the whole flow by itself in
about a minute – press **Reset demo** first if you already clicked around.

### 2:45 – Close (15 s)

Scroll to the end (**→**): team, tech, the open questions.

> "Nobody should have to choose between getting home and getting paid back."

---

## Backup: app-only script (no website)

**Setup (before you go on stage)**

- `npm run dev`, then open two windows:
  - **Phone**: http://localhost:3000/app in a phone-sized window (Chrome DevTools → iPhone 14, or a real phone on the same network). On desktop the app renders inside a phone frame.
  - **Admin**: http://localhost:3000/admin on the laptop screen, **Scenario** tab.
- In admin press **Reset demo data**, then on the phone go to the welcome screen.
- Language: EN by default; the EN/SV toggle is top right on every screen.

The numbers below are deterministic: T-Centralen → Norsborg always quotes **354 kr**.

---

#### 0:00 – The problem (30 s) · *phone: welcome screen*

> "Stockholm, 07:40. The Red line stops with a signal fault. By law, if SL makes you more than 20 minutes late,
> you may take a taxi and SL pays up to 1 480 kronor. Almost nobody does it. You have to know the rule, put
> 400 kronor on your own card, keep the receipt and fill in a form – then wait weeks."

Swipe through the three cards: *Train stopped? You have the right to a taxi. → We pay it for you. → We handle SL.*

#### 0:30 – Stranded (30 s) · *phone*

Tap **Start demo**. (It signs in a user who has already done onboarding with BankID, signed the fullmakt, added a card and registered a 30-day ticket. Mention it: "one-time setup, two BankID taps".)

> "Here's Demo. Vidare already sees the Red line signal fault one kilometre away."

Tap the big **I'm stranded** button. Everything is prefilled: Red line, T-Centralen, destination **Home (Norsborg)**, valid ticket. Tap **Check if I'm covered**.

> "Vidare runs SL's rules: disruption not announced in advance, 35 minutes expected delay at the *final* destination, valid ticket. You're covered."

#### 1:00 – Taxi (45 s) · *phone*

Tap **See taxi price**.

> "Fixed price 354 kronor. Vidare pays 354. You pay zero. Shortest route to your final destination, tips not covered – exactly SL's rules."

Tap **Order taxi**. Show the live ride: driver card, the car moving on the map, ETA counting down, status steps.

**Admin action:** *Scenario → Live rides →* **completed** (or tap **Skip ahead** twice on the phone).

#### 1:45 – Claim (30 s) · *phone*

The receipt appears: time, route, fare, tip 0 kr, *Paid by you 0 kr*, and **Claim filed with SL automatically** with an SL reference.

Tap **Follow the claim**: show **Data sent to SL** – every field SL requires (name, personnummer, address, trip, ticket, original receipt with time/route/tip, payout account), filed by Vidare under the power of attorney. Point at the 3-month deadline.

#### 2:15 – Paid (30 s) · *admin*

**Admin action:** *Claims tab →* on the Demo Demosson claim press **Approve**, then **Pay out**.

The phone's timeline moves: *Filed → Under review → Approved → Paid to Vidare*. Open the **Ledger** tab:

> "Vidare paid the taxi 354 kronor, SL paid Vidare 354 kronor. Net zero, the traveller paid nothing, and it all
> happened while they were on their way home."

#### 2:45 – Close (15 s)

> "Vidare turns a right nobody uses into one tap. Next: talk to SL about third-party claims under fullmakt, and sign a taxi partner."

---

### Optional extras (if you get questions)

| Question | Show it |
| --- | --- |
| "What if the taxi costs more than the cap?" | Home → **Commuter rail stopped** → stop *Södertälje centrum*, destination *Norrtälje*. Quote: Vidare pays 1 480 kr, **you pay 154 kr**, with an explicit accept checkbox. |
| "Who pays if SL says no?" | Admin → Claims → **Reject – user fault** (user's card is charged) vs **Reject – other** (Vidare absorbs the loss). The ledger lines show it. On the phone the claim offers **Request reconsideration** for 3 weeks. |
| "Can people game it?" | Try ordering a second taxi for the same disruption → *one ride per disruption*. Admin → Users shows claims per 30 days and flags frequent claimants. |
| "What about planned works?" | Home → **Green line: planned track work** (announced 4 days ago) → *Not covered: announced 3 or more days in advance*. |
| "Uppsala?" | On Home, tap *Near …* until it says *Knivsta*; pick **Commuter rail delays Knivsta–Uppsala C**, destination *Uppsala C* → *claim from UL, not SL*. |
| "No taxis?" | Admin → Scenario → turn **Taxis available** off, then order → *No taxis available right now*. |
| "New disruption live?" | Admin → **Trigger a disruption** (e.g. Blue line power failure) → it appears on the phone within 10 s. |
| "BankID?" | Profile → Power of attorney → shows the signed document, hash and signature; revoke it and the next order is blocked until re-signed. |
