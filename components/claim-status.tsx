"use client";

import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClaimStatus } from "@/lib/core/claim-machine";
import { useFormat } from "@/lib/client/format";
import { useT } from "@/lib/i18n";
import type { ClaimView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const VARIANT: Record<ClaimStatus, "default" | "muted" | "success" | "danger" | "warning"> = {
  submitted: "muted",
  underReview: "warning",
  approved: "default",
  rejected: "danger",
  paidOut: "success",
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const t = useT();
  return <Badge variant={VARIANT[status]}>{t(`claims.status.${status}`)}</Badge>;
}

/** Filed → Under review → Approved → Paid to Vidare (or Rejected). */
export function ClaimTimeline({ claim }: { claim: ClaimView }) {
  const t = useT();
  const f = useFormat();
  const latest = (s: ClaimStatus) => [...claim.history].reverse().find((h) => h.status === s);
  const rejectedNow = claim.status === "rejected";
  const steps: ClaimStatus[] = ["submitted", "underReview", rejectedNow ? "rejected" : "approved", "paidOut"];
  const order: Record<ClaimStatus, number> = { submitted: 0, underReview: 1, approved: 2, rejected: 2, paidOut: 3 };
  const currentIndex = order[claim.status];

  return (
    <ol className="flex flex-col" aria-label={t("claims.timeline")}>
      {steps.map((s, i) => {
        const reached = i <= currentIndex && !(rejectedNow && s === "paidOut");
        const event = reached ? latest(s) : undefined;
        const isRejected = s === "rejected";
        return (
          <li key={s} className="flex gap-3" aria-current={i === currentIndex ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2",
                  reached && !isRejected && "border-primary bg-primary text-primary-foreground",
                  reached && isRejected && "border-danger bg-danger text-white dark:text-black",
                  !reached && "border-input bg-card",
                )}
              >
                {reached && (isRejected ? <X className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />)}
              </span>
              {i < steps.length - 1 && <span className={cn("min-h-6 w-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-input")} />}
            </div>
            <div className="pb-5">
              <p className={cn("text-sm font-semibold", !reached && "text-muted-foreground")}>{t(`claims.status.${s}`)}</p>
              {event && <p className="text-xs text-muted-foreground">{f.dateTime(event.at)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
