"use client";

import { Bus, ChevronRight, Ship, TrainFront, TramFront } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRE_ANNOUNCED_DAYS } from "@/lib/core/sl-rules";
import type { TransportMode } from "@/lib/core/types";
import { useFormat } from "@/lib/client/format";
import { useLang, useT } from "@/lib/i18n";
import type { DisruptionView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export const MODE_ICON: Record<TransportMode, typeof TrainFront> = {
  metro: TrainFront,
  commuterRail: TrainFront,
  bus: Bus,
  tram: TramFront,
  lightRail: TramFront,
  ferry: Ship,
};

export function isPlanned(announcedAt: string) {
  return Date.now() - new Date(announcedAt).getTime() >= PRE_ANNOUNCED_DAYS * 86_400_000;
}

export function DisruptionCard({ d, onSelect, selected }: { d: DisruptionView; onSelect?: () => void; selected?: boolean }) {
  const t = useT();
  const lang = useLang();
  const f = useFormat();
  const Icon = MODE_ICON[d.mode];
  const planned = isPlanned(d.announcedAt);
  const Comp = onSelect ? "button" : "div";
  return (
    <Comp
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      aria-pressed={onSelect && selected !== undefined ? selected : undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors",
        onSelect && "hover:bg-muted active:scale-[0.99]",
        selected && "border-primary bg-primary-soft ring-1 ring-primary",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-soft text-warning">
        <Icon className="size-5" aria-hidden />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-semibold leading-snug">{d.title[lang]}</p>
        <p className="text-xs text-muted-foreground">
          {d.cause[lang]} · {t("home.announced", { when: f.relative(d.announcedAt) })}
          {d.distanceKm !== null && ` · ${t("common.km", { n: d.distanceKm.toLocaleString(lang === "sv" ? "sv-SE" : "en-GB") })}`}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="warning">{t("home.delay", { n: d.expectedDelayMinutes })}</Badge>
          <Badge variant="muted">{t(`mode.${d.mode}`)}</Badge>
          {planned && <Badge variant="muted">{t("home.planned")}</Badge>}
        </div>
      </div>
      {onSelect && selected === undefined && <ChevronRight className="mt-2 size-5 shrink-0 text-muted-foreground" aria-hidden />}
    </Comp>
  );
}
