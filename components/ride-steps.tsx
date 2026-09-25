"use client";

import { Check } from "lucide-react";
import { RIDE_FLOW, type RideStatus } from "@/lib/core/ride-machine";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RideSteps({ status }: { status: RideStatus }) {
  const t = useT();
  const current = RIDE_FLOW.indexOf(status as (typeof RIDE_FLOW)[number]);
  return (
    <ol className="flex flex-col gap-0" aria-label={t("ride.title")}>
      {RIDE_FLOW.map((s, i) => {
        const done = i < current || status === "completed";
        const active = i === current && status !== "completed";
        return (
          <li key={s} className="flex items-stretch gap-3" aria-current={active ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border-2 text-xs transition-colors",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-card",
                  !done && !active && "border-input bg-card",
                )}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : active ? <span className="size-2 animate-pulse rounded-full bg-primary" /> : null}
              </span>
              {i < RIDE_FLOW.length - 1 && <span className={cn("w-0.5 flex-1", done ? "bg-primary" : "bg-input")} />}
            </div>
            <p className={cn("pb-4 text-sm", active ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground")}>
              {t(`ride.status.${s}`)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
