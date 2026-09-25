"use client";

import { motion } from "framer-motion";
import { CarTaxiFront, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisruptionCard, isPlanned } from "@/components/disruption-card";
import { LangToggle } from "@/components/lang-toggle";
import { RideCard } from "@/components/ride-card";
import { useRequireUser } from "@/components/require-user";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/state-views";
import { TabBar } from "@/components/tab-bar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/client/api";
import { useFetch, useUser } from "@/lib/client/hooks";
import { nextRoute } from "@/lib/client/routes";
import { currentLocation, LOCATIONS, useApp } from "@/lib/client/store";
import { useT } from "@/lib/i18n";

export default function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const userId = useRequireUser();
  const { data: user } = useUser();
  const locationId = useApp((s) => s.locationId);
  const setLocation = useApp((s) => s.setLocation);
  const resetFlow = useApp((s) => s.resetFlow);
  const setDraft = useApp((s) => s.setDraft);
  const loc = currentLocation(locationId);

  const disruptions = useFetch(() => api.disruptions(loc), `dis-${locationId}`, 10_000);
  const rides = useFetch(userId ? () => api.rides(userId) : null, `rides-${userId}`, 5_000);
  const places = useFetch(() => api.places(), "places");
  const placeName = places.data?.find((p) => p.id === locationId)?.name ?? "…";

  const nearest = disruptions.data?.find((d) => !isPlanned(d.announcedAt)) ?? disruptions.data?.[0] ?? null;

  const strand = (disruptionId: string | null) => {
    resetFlow();
    setDraft({ disruptionId });
    router.push("/stranded");
  };

  const cycleLocation = () => {
    const i = LOCATIONS.findIndex((l) => l.id === locationId);
    setLocation(LOCATIONS[(i + 1) % LOCATIONS.length].id);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {user ? (
              <h1 className="text-2xl font-bold tracking-tight">{t("home.hello", { name: user.name.split(" ")[0] })}</h1>
            ) : (
              <Skeleton className="h-8 w-40" />
            )}
            <button
              type="button"
              onClick={cycleLocation}
              className="flex items-center gap-1 self-start rounded-full py-1 text-sm text-muted-foreground hover:text-foreground"
              title="Demo: change location"
            >
              <MapPin className="size-4" aria-hidden />
              {t("home.location", { place: placeName })}
            </button>
          </div>
          <LangToggle />
        </header>

        {user && !user.onboarded && (
          <Alert variant="warning" className="items-center justify-between">
            <span>{t("home.setupNeeded")}</span>
            <Button size="sm" variant="outline" asChild>
              <Link href={nextRoute(user)}>{t("home.setupCta")}</Link>
            </Button>
          </Alert>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(15);
            strand(nearest?.id ?? null);
          }}
          className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[1.75rem] bg-primary px-6 py-9 text-primary-foreground shadow-lg"
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 m-auto size-40 rounded-full bg-primary-foreground/10"
            animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="relative flex size-16 items-center justify-center rounded-full bg-primary-foreground/15">
            <CarTaxiFront className="size-9" aria-hidden />
          </span>
          <span className="relative text-2xl font-bold">{t("home.stranded")}</span>
          <span className="relative text-sm opacity-90">{t("home.strandedHint")}</span>
        </motion.button>

        <section className="flex flex-col gap-3" aria-labelledby="near-heading">
          <h2 id="near-heading" className="text-lg font-semibold">
            {t("home.near")}
          </h2>
          {disruptions.loading && !disruptions.data ? (
            <ListSkeleton rows={2} />
          ) : disruptions.error ? (
            <ErrorState error={disruptions.error} onRetry={disruptions.reload} />
          ) : disruptions.data?.length ? (
            disruptions.data.slice(0, 4).map((d) => <DisruptionCard key={d.id} d={d} onSelect={() => strand(d.id)} />)
          ) : (
            <EmptyState>{t("home.noDisruptions")}</EmptyState>
          )}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="rides-heading">
          <h2 id="rides-heading" className="text-lg font-semibold">
            {t("home.recent")}
          </h2>
          {rides.loading && !rides.data ? (
            <ListSkeleton rows={1} />
          ) : rides.error ? (
            <ErrorState error={rides.error} onRetry={rides.reload} />
          ) : rides.data?.length ? (
            rides.data.map((r) => <RideCard key={r.id} ride={r} />)
          ) : (
            <EmptyState icon={CarTaxiFront}>{t("home.noRides")}</EmptyState>
          )}
        </section>
      </div>
      <TabBar />
    </>
  );
}
