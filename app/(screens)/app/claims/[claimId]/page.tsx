"use client";

import { CalendarClock, FileCheck2, LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ClaimStatusBadge, ClaimTimeline } from "@/components/claim-status";
import { ReceiptCard } from "@/components/receipt-card";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton, useErrorMessage } from "@/components/state-views";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/client/api";
import { useFormat } from "@/lib/client/format";
import { useFetch } from "@/lib/client/hooks";
import { daysUntil } from "@/lib/core/claim-machine";
import { REQUIREMENT_FIELDS } from "@/lib/core/claim-builder";
import { SL_RULES } from "@/lib/core/sl-rules";
import { TICKET_TYPES } from "@/lib/core/tickets";
import { useLang, useT, type DictKey } from "@/lib/i18n";
import type { ClaimView } from "@/lib/schemas";

function requirementValue(claim: ClaimView, field: keyof ClaimView["payload"], lang: "en" | "sv", f: ReturnType<typeof useFormat>) {
  const p = claim.payload;
  switch (field) {
    case "tripDetails":
      return `${p.tripDetails.date}: ${p.tripDetails.from} → ${p.tripDetails.to}, ${p.tripDetails.line}. ${p.tripDetails.disruption} (+${p.tripDetails.expectedDelayMinutes} min)`;
    case "ticketInfo": {
      const label = TICKET_TYPES.find((tt) => tt.type === p.ticketInfo.type)?.[lang] ?? p.ticketInfo.type;
      return `${label} · ${p.ticketInfo.validAtTimeOfDelay ? "✓" : "✗"}`;
    }
    case "taxiReceipt":
      return `${p.taxiReceipt.receiptNo} · ${f.time(p.taxiReceipt.pickupAt)}–${f.time(p.taxiReceipt.dropoffAt)} · ${f.kr(p.taxiReceipt.fareSEK)} · tip ${f.kr(p.taxiReceipt.tipSEK)}`;
    case "payoutAccount":
      return `${p.payoutAccount.holder}, ${p.payoutAccount.clearing} ${p.payoutAccount.account}`;
    default:
      return String(p[field]);
  }
}

export default function ClaimDetailScreen() {
  const t = useT();
  const lang = useLang();
  const f = useFormat();
  const errorMessage = useErrorMessage();
  const userId = useRequireUser();
  const { claimId } = useParams<{ claimId: string }>();
  const claim = useFetch(() => api.claim(claimId), claimId, 4000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const c = claim.data;

  const reconsider = async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await api.requestReconsideration(claimId, userId);
      await claim.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : null);
    } finally {
      setBusy(false);
    }
  };

  const outcome =
    c?.status === "paidOut"
      ? { variant: "success" as const, text: t("claims.outcome.paidOut", { amount: c.claimedSEK }) }
      : c?.status === "rejected"
        ? {
            variant: c.rejectionReason === "userFault" ? ("danger" as const) : ("warning" as const),
            text: t(c.rejectionReason === "userFault" ? "claims.outcome.userFault" : "claims.outcome.other"),
          }
        : { variant: "default" as const, text: t("claims.outcome.pending") };

  return (
    <Screen title={c?.slReference ?? t("claims.title")} back="/app/claims">
      {claim.error && !c ? (
        <ErrorState error={claim.error} onRetry={claim.reload} />
      ) : !c ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("claims.claimed")}</p>
              <p className="text-3xl font-bold tabular-nums">{f.kr(c.claimedSEK)}</p>
            </div>
            <ClaimStatusBadge status={c.status} />
          </div>

          <Alert variant={outcome.variant}>{outcome.text}</Alert>

          <Card>
            <CardHeader>
              <CardTitle>{t("claims.timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ClaimTimeline claim={c} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-primary" aria-hidden /> {t("claims.deadlines")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>{t("claims.complaintDeadline", { date: f.date(c.complaintDeadline) })}</p>
              <p className="text-muted-foreground">
                {t("claims.filedInTime", { days: daysUntil(new Date(c.complaintDeadline), new Date(c.submittedAt)) })}
              </p>
              {c.reconsiderationDeadline &&
                (c.canRequestReconsideration ? (
                  <>
                    <p>{t("claims.reconsideration", { date: f.date(c.reconsiderationDeadline) })}</p>
                    <Button variant="outline" onClick={reconsider} disabled={busy}>
                      {busy && <LoaderCircle className="animate-spin" aria-hidden />}
                      {t("claims.requestReconsideration")}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">{t("claims.reconsiderationClosed", { date: f.date(c.reconsiderationDeadline) })}</p>
                ))}
              {error && (
                <Alert variant="danger" role="alert">
                  {errorMessage(error)}
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" aria-hidden /> {t("claims.dataSent")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t("claims.onBehalf", { agent: c.payload.onBehalfOf.agent })}</p>
            </CardHeader>
            <CardContent>
              <dl className="flex flex-col divide-y text-sm">
                {SL_RULES.claimRequires.map((req) => (
                  <div key={req} className="flex flex-col gap-0.5 py-2">
                    <dt className="text-xs font-medium text-muted-foreground">{t(`claims.field.${req}` as DictKey)}</dt>
                    <dd className="break-words">{requirementValue(c, REQUIREMENT_FIELDS[req], lang, f)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("claims.receipt")}</h3>
            <ReceiptCard receipt={c.payload.taxiReceipt} />
          </section>
        </div>
      )}
    </Screen>
  );
}
