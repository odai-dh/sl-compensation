"use client";

import { CarTaxiFront, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useFormat } from "@/lib/client/format";
import { useT } from "@/lib/i18n";
import type { RideView } from "@/lib/schemas";

export function RideCard({ ride }: { ride: RideView }) {
  const t = useT();
  const f = useFormat();
  const live = ride.status !== "completed" && ride.status !== "cancelled";
  return (
    <Link
      href={live ? `/ride/${ride.id}` : `/ride/${ride.id}/receipt`}
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
        <CarTaxiFront className="size-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">
          {ride.trip.origin.name} → {ride.trip.destination.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {f.dateTime(ride.createdAt)} · {f.kr(ride.split.fareSEK)}
        </p>
        <div className="mt-1">
          {live ? (
            <Badge>{t(`ride.status.${ride.status}`)}</Badge>
          ) : (
            <Badge variant="success">
              {t("receipt.youPaid")}: {f.kr(ride.split.userPaysSEK)}
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
