"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, CarTaxiFront, FastForward, Star } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { useRequireUser } from "@/components/require-user";
import { RideSteps } from "@/components/ride-steps";
import { Screen } from "@/components/screen";
import { ErrorState } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client/api";
import { useFetch } from "@/lib/client/hooks";
import { useT } from "@/lib/i18n";

const NEXT = { searching: "arriving", driverAssigned: "arriving", arriving: "inProgress", inProgress: "completed" } as const;

export default function LiveRideScreen() {
  const t = useT();
  const router = useRouter();
  useRequireUser();
  const { rideId } = useParams<{ rideId: string }>();
  const [completed, setCompleted] = useState(false);
  const ride = useFetch(() => api.ride(rideId), rideId, completed ? undefined : 1000);
  const r = ride.data;
  if (r?.status === "completed" && !completed) setCompleted(true);

  // The ride is gone (the demo world was rebuilt): don't leave a frozen screen behind.
  const rideGone = ride.error?.status === 404;
  useEffect(() => {
    if (rideGone) router.replace("/app/home");
  }, [rideGone, router]);

  // On arrival: a little buzz, then the receipt.
  useEffect(() => {
    if (!completed) return;
    navigator.vibrate?.([20, 60, 20]);
    const timer = setTimeout(() => router.push(`/app/ride/${rideId}/receipt`), 2200);
    return () => clearTimeout(timer);
  }, [completed, rideId, router]);

  if (ride.error && !r) {
    return (
      <Screen title={t("ride.title")} back="/app/home">
        <ErrorState error={ride.error} onRetry={ride.reload} />
      </Screen>
    );
  }

  const headline = !r
    ? ""
    : r.status === "searching"
      ? t("ride.status.searching")
      : r.status === "driverAssigned" || r.status === "arriving"
        ? t("ride.pickupIn", { n: r.etaPickupMin })
        : r.status === "inProgress"
          ? t("ride.arriveIn", { n: r.etaArrivalMin })
          : r.status === "completed"
            ? t("ride.arrived")
            : t("ride.status.cancelled");

  const skip = r && r.status in NEXT ? NEXT[r.status as keyof typeof NEXT] : null;

  return (
    <Screen
      title={t("ride.title")}
      back="/app/home"
      footer={
        r?.status === "completed" ? (
          <Button size="lg" className="w-full" onClick={() => router.push(`/app/ride/${rideId}/receipt`)}>
            {t("ride.viewReceipt")}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <MapView
          className="h-64"
          origin={r?.trip.origin.position}
          destination={r?.trip.destination.position}
          car={r?.carPosition}
          fitTo={r ? [r.driverStart] : []}
        />

        {!r ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={headline}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-2xl font-bold tracking-tight"
                  aria-live="polite"
                >
                  {headline}
                </motion.h2>
              </AnimatePresence>
              {skip && (
                <Button size="sm" variant="ghost" onClick={() => api.admin.fastForward(rideId, skip).then(ride.reload)} title="Demo">
                  <FastForward aria-hidden /> {t("demo.skipAhead")}
                </Button>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <motion.div className="h-full bg-primary" animate={{ width: `${Math.round(r.progress * 100)}%` }} transition={{ ease: "linear", duration: 0.9 }} />
            </div>

            {r.status !== "searching" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                  {r.driver.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t("ride.driver")}</p>
                  <p className="font-semibold">{r.driver.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3.5 fill-current text-warning" aria-hidden /> {r.driver.rating} · {r.driver.car}
                  </p>
                </div>
                <span className="rounded-md border-2 border-foreground px-2 py-1 font-mono text-sm font-bold">{r.driver.reg}</span>
              </motion.div>
            )}

            <p className="flex items-center gap-2 rounded-md bg-success-soft p-3 text-sm font-medium text-success">
              <BadgeCheck className="size-5 shrink-0" aria-hidden />
              {t("ride.paidBy")}
            </p>

            <div className="rounded-lg border bg-card p-4">
              <RideSteps status={r.status} />
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CarTaxiFront className="size-4" aria-hidden />
                {r.trip.origin.name} → {r.trip.destination.name}
              </p>
            </div>
          </>
        )}
      </div>
    </Screen>
  );
}
