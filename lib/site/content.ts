/** Copy for the showcase site. Every number comes from SL's rules or Vidare's policy, never typed in here. */
import { VIDARE_POLICY } from "@/lib/core/policy";
import { PRE_ANNOUNCED_DAYS, SL_CLAIM_FORM_URL, SL_RULES } from "@/lib/core/sl-rules";

const kr = (n: number) => `${n.toLocaleString("sv-SE")} kr`;
const CAP = kr(SL_RULES.maxPayoutPerOccasion);
const MIN = SL_RULES.minDelayMinutes;

const refundTiers = SL_RULES.refundTiers
  .map((t) => (t.maxDelay === null ? `${t.percent} % from ${t.minDelay} minutes` : `${t.percent} % for ${t.minDelay}–${t.maxDelay} minutes`))
  .join(", ");

export type Faq = { q: string; a: string; link?: { href: string; label: string } };

export const FAQ: Faq[] = [
  {
    q: "When can I take a taxi?",
    a: `When SL traffic is delayed or cancelled and you risk arriving at least ${MIN} minutes late at your final destination. Swedish law (Lag 2015:953) and SL’s own terms then let you take a taxi, and SL pays up to ${CAP} per occasion.`,
  },
  {
    q: "What does it cost me?",
    a: `Nothing, as long as the ride costs up to ${CAP}: Vidare pays the driver and gets the money back from SL. If a quote is higher, you see the difference before you order and only pay that part. Tips aren’t covered – SL doesn’t pay them either. Vidare’s fee: ${kr(VIDARE_POLICY.vidareFeeSEK)}.`,
  },
  {
    q: "What do I need to get started?",
    a: "A few things, once: confirm who you are with BankID, sign a power of attorney (fullmakt) so Vidare can claim from SL for you, add a card as a guarantee, and tell us which SL ticket you travel on.",
  },
  {
    q: "Where does the taxi take me?",
    a: `Straight to your final destination, by the shortest route – that’s what SL pays for. Sharing the ride doesn’t raise the ${CAP} limit.`,
  },
  {
    q: "What if SL says no?",
    a: "If the claim is rejected because of something on your side – no valid ticket, or information that wasn’t true – the taxi is charged to your card. For any other reason, Vidare takes the loss.",
  },
  {
    q: "When doesn’t it apply?",
    a: `When the disruption was announced on sl.se at least ${PRE_ANNOUNCED_DAYS} days before you travelled, when your whole journey was with other operators than SL, or when it was entirely within Uppsala county (claim from UL instead). Knock-on costs, like a missed flight or lost income, are never covered.`,
  },
  {
    q: "What if I don’t take a taxi?",
    a: `You can get part of your ticket back instead: ${refundTiers} of a single ticket’s price (period tickets get a fixed amount per trip). You can’t get both a refund and a taxi for the same delay.`,
  },
  {
    q: "Can I claim from SL myself?",
    a: `Yes – apply on SL’s own form within ${SL_RULES.deadlines.complaintMonths} months. You pay the taxi yourself first and wait for SL to pay you back. Vidare is there so you don’t have to.`,
    link: { href: SL_CLAIM_FORM_URL, label: "SL’s page on delay compensation" },
  },
  {
    q: "Can I use Vidare today?",
    a: "Not yet – this is a concept demo. The app runs on made-up data: no real taxis are ordered, no money moves and no claims reach SL.",
  },
];

export const CLOSING_LINE = "Nobody should have to choose between getting home and getting paid back.";
