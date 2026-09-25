import { SL_RULES } from "./sl-rules";

/**
 * Vidare's own business policy. Everything here is configurable; SL's numbers come from sl-rules.ts.
 */
export const VIDARE_POLICY = {
  /** Vidare fronts the taxi up to SL's cap; anything above is charged to the user's card. */
  coverCapSEK: SL_RULES.maxPayoutPerOccasion,
  /** Tips are never covered (SL does not reimburse them either). */
  coverTips: false,
  /** Demo fee model: shown as a line on every receipt. */
  vidareFeeSEK: 0,
  /** One taxi per disruption per user. */
  maxRidesPerDisruption: 1,
  /** Users with more claims than this in the window get flagged for extra proof. */
  flagAfterClaimsInWindow: 3,
  /** Hard stop: above this many claims in the window, new rides are blocked pending review. */
  blockAfterClaimsInWindow: 6,
  claimWindowDays: 30,
  /** Who pays when SL rejects a claim. */
  rejection: {
    userFault: "chargeUser",
    other: "vidareAbsorbs",
  },
  /** Steps a user must finish before the first ride. */
  onboardingSteps: ["identity", "fullmakt", "card", "ticket"],
} as const;

export type VidarePolicy = typeof VIDARE_POLICY;
export type OnboardingStep = VidarePolicy["onboardingSteps"][number];
export type RejectionReason = keyof VidarePolicy["rejection"];
