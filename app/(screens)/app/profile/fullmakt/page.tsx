"use client";

import Link from "next/link";
import { useState } from "react";
import { FullmaktDocument } from "@/components/fullmakt-document";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useUser } from "@/lib/client/hooks";
import { useT } from "@/lib/i18n";

export default function FullmaktViewScreen() {
  const t = useT();
  const userId = useRequireUser();
  const { data: user, error, reload } = useUser();
  const [confirming, setConfirming] = useState(false);
  const active = user?.fullmakt && !user.fullmakt.revokedAt;

  return (
    <Screen
      title={t("fullmakt.title")}
      back="/app/profile"
      footer={
        user &&
        (active ? (
          confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{t("fullmakt.revokeConfirm")}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setConfirming(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    if (userId) await api.revokeFullmakt(userId);
                    setConfirming(false);
                    await reload();
                  }}
                >
                  {t("fullmakt.revoke")}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full text-danger" onClick={() => setConfirming(true)}>
              {t("fullmakt.revoke")}
            </Button>
          )
        ) : (
          <Button className="w-full" asChild>
            <Link href="/app/onboarding/fullmakt">{t("fullmakt.signAgain")}</Link>
          </Button>
        ))
      }
    >
      {error ? <ErrorState error={error} onRetry={reload} /> : !user ? <ListSkeleton rows={3} /> : <FullmaktDocument user={user} />}
    </Screen>
  );
}
