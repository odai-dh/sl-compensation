"use client";

import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function OnboardingProgress({ step, total = 4 }: { step: number; total?: number }) {
  const t = useT();
  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">{t("onboarding.step", { n: step, total })}</p>
    </div>
  );
}
