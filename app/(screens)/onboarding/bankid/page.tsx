"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { BankIdPanel } from "@/components/bankid-panel";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { Screen } from "@/components/screen";
import { api } from "@/lib/client/api";
import { nextRoute } from "@/lib/client/routes";
import { useApp } from "@/lib/client/store";
import { useT } from "@/lib/i18n";
import type { BankIdPollView } from "@/lib/schemas";

export default function BankIdScreen() {
  const t = useT();
  const router = useRouter();
  const setUserId = useApp((s) => s.setUserId);

  const onComplete = useCallback(
    (result: BankIdPollView) => {
      if (!result.user) return;
      setUserId(result.user.id);
      router.replace(nextRoute(result.user));
    },
    [router, setUserId],
  );

  return (
    <Screen back="/welcome">
      <OnboardingProgress step={1} />
      <div className="mb-8 flex flex-col gap-3">
        <ShieldCheck className="size-10 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold tracking-tight">{t("bankid.title")}</h2>
        <p className="text-muted-foreground">{t("bankid.subtitle")}</p>
      </div>
      <BankIdPanel
        start={api.startAuth}
        poll={api.pollAuth}
        cancel={api.cancelBankId}
        onComplete={onComplete}
        actionLabel={t("bankid.title")}
      />
    </Screen>
  );
}
