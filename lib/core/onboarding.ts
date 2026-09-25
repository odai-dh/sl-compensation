import { VIDARE_POLICY, type OnboardingStep } from "./policy";

export type OnboardingFacts = {
  identityVerified: boolean;
  fullmaktSigned: boolean;
  hasCard: boolean;
  hasTicket: boolean;
};

const DONE: Record<OnboardingStep, (f: OnboardingFacts) => boolean> = {
  identity: (f) => f.identityVerified,
  fullmakt: (f) => f.fullmaktSigned,
  card: (f) => f.hasCard,
  ticket: (f) => f.hasTicket,
};

/** Steps still missing before the user may order a first ride, in policy order. */
export function missingOnboardingSteps(facts: OnboardingFacts): OnboardingStep[] {
  return VIDARE_POLICY.onboardingSteps.filter((step) => !DONE[step](facts));
}

export function isOnboarded(facts: OnboardingFacts): boolean {
  return missingOnboardingSteps(facts).length === 0;
}
