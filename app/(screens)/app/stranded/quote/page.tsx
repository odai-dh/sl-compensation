"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CarTaxiFront, CircleAlert, Clock, CreditCard, LoaderCircle, Navigation, Route } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, useErrorMessage } from "@/components/state-views";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/client/api";
import { useFormat } from "@/lib/client/format";
import { useApp } from "@/lib/client/store";
import { useT } from "@/lib/i18n";
import type { QuoteResponse } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export default function QuoteScreen() {
  const t = useT();
  const f = useFormat();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const userId = useRequireUser();
  const eligibility = useApp((s) => s.eligibility);
  const draft = useApp((s) => s.draft);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<ApiError | null>(null);
  const [acceptExcess, setAcceptExcess] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trip = eligibility?.trip;

  const [quoteKey, setQuoteKey] = useState(0);
  const fetchQuote = useCallback(() => {
    setQuoteError(null);
    setQuote(null);
    setQuoteKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (userId && (!eligibility || eligibility.result.route !== "taxi")) router.replace("/app/stranded");
  }, [userId, eligibility, router]);

  useEffect(() => {
    if (!userId || !trip) return;
    let alive = true;
    api
      .quote({ userId, originPlaceId: trip.origin.id, destinationPlaceId: trip.destination.id })
      .then((q) => alive && setQuote(q))
      .catch((e) => alive && setQuoteError(e instanceof ApiError ? e : new ApiError("UNKNOWN", String(e), 0)));
    return () => {
      alive = false;
    };
  }, [userId, trip, quoteKey]);

  const order = async () => {
    if (!userId || !quote || !eligibility?.disruption || !trip) return;
    setOrdering(true);
    setOrderError(null);
    setNotice(null);
    try {
      const ride = await api.bookRide({
        userId,
        quoteId: quote.quote.id,
        disruptionId: eligibility.disruption.id,
        originPlaceId: trip.origin.id,
        destinationPlaceId: trip.destination.id,
        ticketValid: draft.ticketValid,
        acceptExcess,
      });
      navigator.vibrate?.([10, 40, 10]);
      router.push(`/app/ride/${ride.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("UNKNOWN", String(e), 0);
      if (err.code === "QUOTE_EXPIRED" || err.code === "QUOTE_NOT_FOUND") {
        setNotice(t("quote.expired"));
        fetchQuote();
      } else {
        setOrderError(err);
      }
      setOrdering(false);
    }
  };

  const noTaxis = quoteError?.code === "NO_TAXIS" || orderError?.code === "NO_TAXIS";
  const paymentFailed = orderError?.code === "PAYMENT_FAILED";
  const split = quote?.split;
  const needsAccept = !!split && split.userPaysSEK > 0;

  if (noTaxis) {
    return (
      <Screen title={t("quote.title")} back="/app/stranded/check">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-warning-soft text-warning">
            <CarTaxiFront className="size-10" aria-hidden />
          </div>
          <h2 className="text-xl font-bold">{t("quote.noTaxis")}</h2>
          <p className="text-muted-foreground">{t("quote.noTaxisBody")}</p>
          <Button
            className="w-full"
            onClick={() => {
              setOrderError(null);
              fetchQuote();
            }}
          >
            {t("common.retry")}
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen
      title={t("quote.title")}
      back="/app/stranded/check"
      footer={
        <Button size="lg" className="w-full" disabled={!quote || ordering || (needsAccept && !acceptExcess)} onClick={order}>
          {ordering ? <LoaderCircle className="animate-spin" aria-hidden /> : <CarTaxiFront aria-hidden />}
          {ordering ? t("quote.ordering") : t("quote.order")}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <MapView className="h-52" origin={trip?.origin.position} destination={trip?.destination.position} />
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{trip?.origin.name}</span>
          <span aria-hidden>→</span>
          <span className="truncate">{trip?.destination.name}</span>
        </p>

        {quoteError ? (
          <ErrorState error={quoteError} onRetry={fetchQuote} />
        ) : !quote || !split ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t("quote.loading")}
            </p>
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-primary-soft p-4 text-primary-soft-foreground">
                  <p className="text-xs font-medium">{t("quote.vidarePays")}</p>
                  <p className="text-3xl font-bold tabular-nums">{f.kr(split.vidarePaysSEK)}</p>
                </div>
                <div className={cn("rounded-lg p-4", split.userPaysSEK > 0 ? "bg-warning-soft text-warning" : "bg-muted")}>
                  <p className="text-xs font-medium">{t("quote.youPay")}</p>
                  <p className="text-3xl font-bold tabular-nums">{f.kr(split.userPaysSEK)}</p>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2 rounded-lg border bg-card p-3 text-center">
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden /> {t("quote.pickup")}
                  </dt>
                  <dd className="font-semibold">{t("common.min", { n: quote.quote.pickupEtaMin })}</dd>
                </div>
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Navigation className="size-3.5" aria-hidden /> {t("quote.duration")}
                  </dt>
                  <dd className="font-semibold">{t("common.min", { n: quote.quote.tripDurationMin })}</dd>
                </div>
                <div>
                  <dt className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Route className="size-3.5" aria-hidden /> {t("quote.distance")}
                  </dt>
                  <dd className="font-semibold">{t("common.km", { n: quote.quote.distanceKm })}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quote.fixedPrice")} · {quote.quote.provider}
                </span>
                <span className="font-semibold tabular-nums">{f.kr(split.fareSEK)}</span>
              </div>

              {needsAccept && (
                <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-soft p-4 text-sm text-warning">
                  <p className="flex gap-2">
                    <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                    {t("quote.overCap", { amount: split.userPaysSEK })}
                  </p>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={acceptExcess}
                      onChange={(e) => setAcceptExcess(e.target.checked)}
                      className="size-5 accent-[var(--primary)]"
                    />
                    {t("quote.acceptExcess", { amount: split.userPaysSEK })}
                  </label>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{t("quote.shortest")}</p>
            </motion.div>
          </AnimatePresence>
        )}

        {notice && <Alert variant="muted">{notice}</Alert>}
        {paymentFailed && (
          <Alert variant="danger" role="alert" className="flex-col">
            <p className="font-semibold">{t("quote.paymentFailed")}</p>
            <p>{t("quote.paymentFailedBody")}</p>
            <Button size="sm" variant="outline" asChild className="self-start">
              <Link href="/app/onboarding/card?return=/app/stranded/quote">
                <CreditCard aria-hidden /> {t("quote.updateCard")}
              </Link>
            </Button>
          </Alert>
        )}
        {orderError && !paymentFailed && (
          <Alert variant="danger" role="alert">
            {errorMessage(orderError)}
          </Alert>
        )}
      </div>
    </Screen>
  );
}
