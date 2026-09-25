"use client";

import { FileSignature } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BankIdPanel } from "@/components/bankid-panel";
import { FullmaktDocument } from "@/components/fullmakt-document";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useUser } from "@/lib/client/hooks";
import { nextRoute } from "@/lib/client/routes";
import { useLang, useT } from "@/lib/i18n";
import type { BankIdPollView, UserView } from "@/lib/schemas";

export default function FullmaktScreen() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const userId = useRequireUser();
  const { data: loaded } = useUser();
  const [signedUser, setSignedUser] = useState<UserView | null>(null);
  const user = signedUser ?? loaded;
  const active = user?.fullmakt && !user.fullmakt.revokedAt;

  const start = useCallback(() => api.startFullmaktSign(userId!, lang), [userId, lang]);
  const poll = useCallback((ref: string) => api.pollFullmaktSign(userId!, ref), [userId]);
  const onComplete = useCallback((r: BankIdPollView) => r.user && setSignedUser(r.user), []);

  return (
    <Screen
      back="/app"
      footer={
        active && user ? (
          <Button size="lg" className="w-full" onClick={() => router.replace(nextRoute(user))}>
            {t("common.continue")}
          </Button>
        ) : undefined
      }
    >
      <OnboardingProgress step={2} />
      <div className="mb-4 flex flex-col gap-3">
        <FileSignature className="size-10 text-primary" aria-hidden />
        <h2 className="text-2xl font-bold tracking-tight">{t("fullmakt.title")}</h2>
        <p className="text-muted-foreground">{t("fullmakt.subtitle")}</p>
      </div>
      {!user ? (
        <ListSkeleton rows={2} />
      ) : active ? (
        <FullmaktDocument user={user} />
      ) : (
        <div className="flex flex-col gap-5">
          <FullmaktDocument scrollable />
          <p className="-mt-3 text-center text-xs text-muted-foreground">{t("fullmakt.readAll")}</p>
          <BankIdPanel
            start={start}
            poll={poll}
            cancel={api.cancelBankId}
            onComplete={onComplete}
            actionLabel={t("fullmakt.sign")}
            pendingLabel={t("bankid.signing")}
          />
        </div>
      )}
    </Screen>
  );
}
