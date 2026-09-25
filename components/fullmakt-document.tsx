"use client";

import { BadgeCheck } from "lucide-react";
import { useFormat } from "@/lib/client/format";
import { useLang, useT } from "@/lib/i18n";
import { FULLMAKT } from "@/lib/i18n/fullmakt";
import type { UserView } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/** The fullmakt text, plus the signature block once signed. */
export function FullmaktDocument({
  user,
  className,
  scrollable = false,
}: {
  user?: UserView | null;
  className?: string;
  scrollable?: boolean;
}) {
  const t = useT();
  const lang = useLang();
  const f = useFormat();
  const doc = FULLMAKT[lang];
  const signed = user?.fullmakt;
  return (
    <article
      tabIndex={scrollable ? 0 : undefined}
      aria-label={doc.title}
      className={cn("rounded-lg border bg-card p-4 text-sm", scrollable && "max-h-[42vh] overflow-y-auto", className)}
    >
      <h3 className="mb-3 text-base font-semibold">{doc.title}</h3>
      <div className="flex flex-col gap-3">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h4 className="font-semibold">{s.heading}</h4>
            <p className="text-muted-foreground">{s.body}</p>
          </section>
        ))}
      </div>
      {signed && user && (
        <div className="mt-4 rounded-md border-2 border-dashed border-primary/40 bg-primary-soft p-3 text-primary-soft-foreground">
          <p className="flex items-center gap-1.5 font-semibold">
            <BadgeCheck className="size-5" aria-hidden />
            {signed.revokedAt ? t("fullmakt.revoked", { date: f.dateTime(signed.revokedAt) }) : t("fullmakt.signedAt", { date: f.dateTime(signed.signedAt) })}
          </p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt>{t("claims.field.name")}</dt>
            <dd className="font-medium">{user.name}</dd>
            <dt>{t("claims.field.personnummer")}</dt>
            <dd className="font-mono">{user.personnummer}</dd>
            <dt>{t("fullmakt.version")}</dt>
            <dd className="font-mono">{signed.version}</dd>
            <dt>{t("fullmakt.documentHash")}</dt>
            <dd className="break-all font-mono">{signed.documentHash}</dd>
            <dt>{t("fullmakt.signature")}</dt>
            <dd className="break-all font-mono">{signed.signature}</dd>
          </dl>
        </div>
      )}
    </article>
  );
}
