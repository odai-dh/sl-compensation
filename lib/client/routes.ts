import type { OnboardingStep } from "@/lib/core/policy";

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  identity: "/app/onboarding/bankid",
  fullmakt: "/app/onboarding/fullmakt",
  card: "/app/onboarding/card",
  ticket: "/app/onboarding/ticket",
};

/** Where to go after an onboarding step: the next missing step, or home. */
export function nextRoute(user: { missingSteps: OnboardingStep[] }): string {
  const next = user.missingSteps[0];
  return next ? STEP_ROUTES[next] : "/app/home";
}
