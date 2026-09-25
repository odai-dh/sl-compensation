/** Copy and lists for the showcase site. Edit the team here. */

export const TEAM: { name: string; role: string }[] = [
  // TODO: replace with the real team before the pitch.
  { name: "Team member 1", role: "Product & pitch" },
  { name: "Team member 2", role: "Design" },
  { name: "Team member 3", role: "Engineering" },
];

export const TECH = [
  "Next.js 16",
  "TypeScript",
  "React Three Fiber",
  "three.js",
  "GSAP ScrollTrigger",
  "Lenis",
  "Tailwind CSS",
  "Zod",
  "Zustand",
  "Web Audio API",
  "Vitest",
];

export const OPEN_QUESTIONS = [
  {
    q: "Will SL accept claims filed under a fullmakt?",
    a: "SL's form assumes the traveller's own BankID and bank account. We need SL to accept a third party filing and receiving the payout.",
  },
  {
    q: "Do digital taxi receipts count as originals?",
    a: "SL requires original receipts with time, route and tip. A receipt sent straight from the taxi partner should qualify – to be confirmed.",
  },
  {
    q: "Which taxi partner?",
    a: "We need a business API with fixed-price quotes, live position and invoicing to Vidare.",
  },
];

export const CLOSING_LINE = "Nobody should have to choose between getting home and getting paid back.";
