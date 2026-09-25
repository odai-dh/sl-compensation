"use client";

import { Briefcase, House, MapPin, Search, Ticket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DisruptionCard } from "@/components/disruption-card";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/client/api";
import { useFetch, useUser } from "@/lib/client/hooks";
import { currentLocation, useApp } from "@/lib/client/store";
import { haversineKm } from "@/lib/core/geo";
import { TICKET_TYPES } from "@/lib/core/tickets";
import { useLang, useT } from "@/lib/i18n";
import type { Place } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export default function StrandedScreen() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  useRequireUser();
  const { data: user } = useUser();
  const draft = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const setEligibility = useApp((s) => s.setEligibility);
  const loc = currentLocation(useApp((s) => s.locationId));

  const disruptions = useFetch(() => api.disruptions(loc), "stranded-dis");
  const places = useFetch(() => api.places(), "places");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const disruption = disruptions.data?.find((d) => d.id === draft.disruptionId) ?? null;

  // Stops you can be at: the stretch of the chosen disruption, or anywhere.
  const stops = useMemo<Place[]>(() => {
    const all = places.data ?? [];
    if (!disruption) return all;
    return disruption.affectedStops
      .map((name) => all.find((p) => p.name === name))
      .filter((p): p is Place => !!p);
  }, [disruption, places.data]);

  // Prefill the stop closest to the user.
  useEffect(() => {
    if (!stops.length) return;
    if (draft.originPlaceId && stops.some((s) => s.id === draft.originPlaceId)) return;
    const nearest = [...stops].sort((a, b) => haversineKm(loc, a.position) - haversineKm(loc, b.position))[0];
    setDraft({ originPlaceId: nearest.id });
  }, [stops, draft.originPlaceId, loc, setDraft]);

  const destination = places.data?.find((p) => p.id === draft.destinationPlaceId) ?? null;
  const results = (places.data ?? [])
    .filter((p) => p.id !== draft.originPlaceId)
    .filter((p) => !query || `${p.name} ${p.address}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const saved = [
    { key: "home", icon: House, label: t("ticket.home"), place: user?.homePlace },
    { key: "work", icon: Briefcase, label: t("ticket.work"), place: user?.workPlace },
  ].filter((s) => s.place);

  const ready = !!draft.originPlaceId && !!draft.destinationPlaceId && draft.originPlaceId !== draft.destinationPlaceId;
  const ticketLabel = TICKET_TYPES.find((tt) => tt.type === user?.ticket?.type)?.[lang];

  return (
    <Screen
      title={t("stranded.title")}
      back="/home"
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={!ready}
          onClick={() => {
            setEligibility(null);
            router.push("/stranded/check");
          }}
        >
          {ready ? t("stranded.check") : t("stranded.pickDestination")}
        </Button>
      }
    >
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-3" aria-labelledby="line-h">
          <h2 id="line-h" className="font-semibold">
            {t("stranded.disruption")}
          </h2>
          {disruptions.error ? (
            <ErrorState error={disruptions.error} onRetry={disruptions.reload} />
          ) : !disruptions.data ? (
            <ListSkeleton rows={2} />
          ) : (
            <div className="flex flex-col gap-2">
              {disruptions.data.map((d) => (
                <DisruptionCard
                  key={d.id}
                  d={d}
                  selected={draft.disruptionId === d.id}
                  onSelect={() => setDraft({ disruptionId: d.id, originPlaceId: null })}
                />
              ))}
              <button
                type="button"
                aria-pressed={draft.disruptionId === null}
                onClick={() => setDraft({ disruptionId: null })}
                className={cn(
                  "rounded-lg border border-dashed p-3 text-left text-sm font-medium",
                  draft.disruptionId === null && "border-primary bg-primary-soft",
                )}
              >
                {t("stranded.otherLine")}
              </button>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <Label htmlFor="stop" className="font-semibold">
            {t("stranded.stop")}
          </Label>
          <Select
            id="stop"
            value={draft.originPlaceId ?? ""}
            onChange={(e) => setDraft({ originPlaceId: e.target.value })}
            disabled={!stops.length}
          >
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="dest-h">
          <div>
            <h2 id="dest-h" className="font-semibold">
              {t("stranded.destination")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("stranded.destinationHint")}</p>
          </div>
          {destination && !searching ? (
            <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary-soft p-3">
              <MapPin className="size-5 text-primary" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{destination.name}</p>
                <p className="truncate text-xs text-muted-foreground">{destination.address}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSearching(true)}>
                {t("common.change")}
              </Button>
            </div>
          ) : (
            <>
              {saved.length > 0 && (
                <div className="flex gap-2">
                  {saved.map(({ key, icon: Icon, label, place }) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setDraft({ destinationPlaceId: place!.id });
                        setSearching(false);
                      }}
                    >
                      <Icon aria-hidden /> {label}
                      <span className="truncate text-xs font-normal text-muted-foreground">{place!.name}</span>
                    </Button>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  aria-label={t("stranded.search")}
                  placeholder={t("stranded.search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {query && (
                  <button type="button" aria-label={t("common.close")} onClick={() => setQuery("")} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full hover:bg-muted">
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <ul className="flex flex-col divide-y rounded-lg border bg-card" aria-label={t("stranded.destination")}>
                {!places.data ? (
                  <li className="p-3">
                    <ListSkeleton rows={2} />
                  </li>
                ) : results.length ? (
                  results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft({ destinationPlaceId: p.id });
                          setSearching(false);
                          setQuery("");
                        }}
                        className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                      >
                        <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{p.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{p.address}</span>
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="p-3 text-sm text-muted-foreground">{t("stranded.noResults")}</li>
                )}
              </ul>
            </>
          )}
        </section>

        <section className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <Ticket className="mt-0.5 size-5 text-primary" aria-hidden />
            <div>
              <p id="ticket-valid" className="text-sm font-medium">
                {t("stranded.ticketValid")}
              </p>
              {ticketLabel && <p className="text-xs text-muted-foreground">{t("stranded.ticketRegistered", { ticket: ticketLabel })}</p>}
            </div>
          </div>
          <Switch aria-labelledby="ticket-valid" checked={draft.ticketValid} onCheckedChange={(v) => setDraft({ ticketValid: v })} />
        </section>
      </div>
    </Screen>
  );
}
