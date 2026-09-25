"use client";

import { useCallback, useMemo } from "react";
import { useLang, useT } from "@/lib/i18n";
import { formatKr } from "@/lib/i18n/translate";

export function useFormat() {
  const lang = useLang();
  const t = useT();
  const locale = lang === "sv" ? "sv-SE" : "en-GB";
  const kr = useCallback((n: number) => formatKr(n, lang), [lang]);
  return useMemo(
    () => ({
      kr,
      date: (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }),
      time: (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
      dateTime: (iso: string) =>
        new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      relative: (iso: string) => {
        const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
        if (mins < 1) return t("time.justNow");
        if (mins < 60) return t("time.minutesAgo", { n: mins });
        if (mins < 48 * 60) return t("time.hoursAgo", { n: Math.round(mins / 60) });
        return t("time.daysAgo", { n: Math.round(mins / 1440) });
      },
    }),
    [kr, locale, t],
  );
}
