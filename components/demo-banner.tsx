"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export function DemoBanner() {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-2 bg-foreground px-4 py-1.5 text-xs font-medium text-background">
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" aria-hidden />
        {t("demo.banner")}
      </span>
      <Link href="/admin" className="shrink-0 underline underline-offset-2">
        {t("demo.admin")}
      </Link>
    </div>
  );
}
