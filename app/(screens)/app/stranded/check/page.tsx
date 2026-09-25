"use client";

import { motion } from "framer-motion";
import { CircleCheck, CircleSlash, ExternalLink, Info, Phone, ReceiptText, Route } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/client/api";
import { useApp } from "@/lib/client/store";
import { SL_CLAIM_FORM_URL, SL_CUSTOMER_SERVICE_PHONE } from "@/lib/core/sl-rules";
import { useLang, useT, type DictKey } from "@/lib/i18n";
import { hasKey } from "@/lib/i18n/translate";

export default function CheckScreen() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const userId = useRequireUser();
  const draft = useApp((s) => s.draft);
  const eligibility = useApp((s) => s.eligibility);
  const setEligibility = useApp((s) => s.setEligibility);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId || eligibility) return;
    if (!draft.originPlaceId || !draft.destinationPlaceId) {
      router.replace("/app/stranded");
      return;
    }
    let alive = true;
    const started = Date.now();
    api
      .eligibility({
        userId,
        disruptionId: draft.disruptionId,
        originPlaceId: draft.originPlaceId,
        destinationPlaceId: draft.destinationPlaceId,
        ticketValid: draft.ticketValid,
      })
      .then(async (res) => {
        // Give the verdict a beat so it feels considered, not random.
        await new Promise((r) => setTimeout(r, Math.max(0, 700 - (Date.now() - started))));
        if (alive) setEligibility(res);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e : new ApiError("UNKNOWN", String(e), 0)));
    return () => {
      alive = false;
    };
  }, [userId, eligibility, draft, router, setEligibility, attempt]);

  if (error) {
    return (
      <Screen title={t("check.title")} back="/app/stranded">
        <ErrorState
          error={error}
          onRetry={() => {
            setError(null);
            setAttempt((a) => a + 1);
          }}
        />
      </Screen>
    );
  }

  if (!eligibility) {
    return (
      <Screen title={t("check.title")} back="/app/stranded">
        <div className="flex flex-col items-center gap-4 py-10" aria-busy="true" aria-live="polite">
          <Skeleton className="size-20 rounded-full" />
          <p className="text-sm text-muted-foreground">{t("check.checking")}</p>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Screen>
    );
  }

  const { result, disruption } = eligibility;
  const title = disruption?.title[lang] ?? "";
  const reasons = result.reasons.filter((r): r is DictKey => hasKey(`reason.${r}`)).map((r) => `reason.${r}` as DictKey);

  const verdict =
    result.route === "taxi"
      ? {
          icon: CircleCheck,
          tone: "text-success bg-success-soft",
          heading: t("check.covered"),
          sentence: t("check.coveredSentence", { disruption: title, delay: result.expectedDelayMinutes }),
        }
      : result.route === "ticketRefund"
        ? {
            icon: ReceiptText,
            tone: "text-warning bg-warning-soft",
            heading: t("check.refund"),
            sentence: t("check.refundSentence", {
              disruption: title,
              delay: result.expectedDelayMinutes,
              percent: result.refundPercent,
            }),
          }
        : {
            icon: CircleSlash,
            tone: "text-danger bg-danger-soft",
            heading: t("check.notCovered"),
            sentence: reasons[0] ? t(reasons[0]) : "",
          };

  return (
    <Screen
      title={t("check.title")}
      back="/app/stranded"
      footer={
        result.route === "taxi" ? (
          <Button size="lg" className="w-full" onClick={() => router.push("/app/stranded/quote")}>
            {t("check.getQuote")}
          </Button>
        ) : result.route === "ticketRefund" ? (
          <Button size="lg" className="w-full" asChild>
            <a href={SL_CLAIM_FORM_URL} target="_blank" rel="noreferrer">
              {t("check.refundCta")} <ExternalLink aria-hidden />
            </a>
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="w-full" onClick={() => router.push("/app/stranded")}>
            {t("common.back")}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 pt-4 text-center"
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className={`flex size-20 items-center justify-center rounded-full ${verdict.tone}`}
          >
            <verdict.icon className="size-10" aria-hidden />
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight">{verdict.heading}</h2>
          <p className="text-lg" aria-live="polite">
            {verdict.sentence}
          </p>
        </motion.div>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Info className="size-4 text-primary" aria-hidden />
              {t("check.rules")}
            </h3>
            <ul className="flex flex-col gap-2 text-sm">
              {(result.route === "none" ? reasons.slice(1) : reasons).map((r) => (
                <li key={r} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  {t(r)}
                </li>
              ))}
              {result.route === "taxi" && (
                <li className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  {t("check.capInfo")}
                </li>
              )}
              {result.route !== "taxi" && (
                <li className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  {t("check.refundTiers")}
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {result.route !== "taxi" && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("check.alternatives")}</h3>
            <Button variant="outline" asChild className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left">
              <a href="https://sl.se/reseplanering" target="_blank" rel="noreferrer">
                <Route aria-hidden /> {t("check.altPlanner")}
              </a>
            </Button>
            <Button variant="outline" asChild className="h-auto min-h-12 justify-start whitespace-normal py-3 text-left">
              <a href={`tel:${SL_CUSTOMER_SERVICE_PHONE.replace(/\D/g, "")}`}>
                <Phone aria-hidden /> {t("check.altCall")} · {SL_CUSTOMER_SERVICE_PHONE}
              </a>
            </Button>
          </section>
        )}
      </div>
    </Screen>
  );
}
