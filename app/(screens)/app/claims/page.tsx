"use client";

import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claim-status";
import { LangToggle } from "@/components/lang-toggle";
import { useRequireUser } from "@/components/require-user";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-views";
import { TabBar } from "@/components/tab-bar";
import { api } from "@/lib/client/api";
import { useFormat } from "@/lib/client/format";
import { useFetch } from "@/lib/client/hooks";
import { useT } from "@/lib/i18n";

export default function ClaimsScreen() {
  const t = useT();
  const f = useFormat();
  const userId = useRequireUser();
  const claims = useFetch(userId ? () => api.claims(userId) : null, `claims-${userId}`, 4000);

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 pt-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("claims.title")}</h1>
          <LangToggle />
        </header>
        {claims.loading && !claims.data ? (
          <ListSkeleton rows={3} />
        ) : claims.error ? (
          <ErrorState error={claims.error} onRetry={claims.reload} />
        ) : !claims.data?.length ? (
          <EmptyState icon={FileText}>{t("claims.empty")}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {claims.data.map((c) => (
              <li key={c.id}>
                <Link href={`/app/claims/${c.id}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">
                      {c.payload.tripDetails.from} → {c.payload.tripDetails.to}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {f.date(c.submittedAt)} · {c.slReference}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums">{f.kr(c.claimedSEK)}</span>
                    <ClaimStatusBadge status={c.status} />
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <TabBar />
    </>
  );
}
