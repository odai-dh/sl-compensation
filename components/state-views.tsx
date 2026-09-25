"use client";

import { CircleAlert, Inbox } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiError } from "@/lib/client/api";
import { hasKey } from "@/lib/i18n/translate";
import { useT } from "@/lib/i18n";

export function EmptyState({ icon: Icon = Inbox, children }: { icon?: typeof Inbox; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
      <Icon className="size-8" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

/** Human message for an API error, in the current language. */
export function useErrorMessage() {
  const t = useT();
  return (error: ApiError | null) => {
    if (!error) return "";
    const key = `error.${error.code}`;
    return hasKey(key) ? t(key) : error.message || t("common.error");
  };
}

export function ErrorState({ error, onRetry }: { error: ApiError | null; onRetry?: () => void }) {
  const t = useT();
  const message = useErrorMessage();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg bg-danger-soft px-6 py-8 text-center text-sm text-danger">
      <CircleAlert className="size-8" aria-hidden />
      <p className="font-medium">{message(error) || t("common.error")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
