"use client";

import { BadgeCheck, ChevronRight, CreditCard, FileSignature, FlaskConical, LogOut, MapPin, Ticket, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LangToggle } from "@/components/lang-toggle";
import { useRequireUser } from "@/components/require-user";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { TabBar } from "@/components/tab-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/client/hooks";
import { useApp } from "@/lib/client/store";
import { TICKET_TYPES } from "@/lib/core/tickets";
import { useLang, useT } from "@/lib/i18n";

function Row({ href, icon: Icon, label, value, badge }: { href: string; icon: typeof Ticket; label: string; value: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted">
      <Icon className="size-5 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {badge}
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
    </Link>
  );
}

export default function ProfileScreen() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  useRequireUser();
  const { data: user, error, reload } = useUser();
  const signOut = useApp((s) => s.signOut);
  const fm = user?.fullmakt;
  const fmActive = fm && !fm.revokedAt;

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
          <LangToggle />
        </header>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !user ? (
          <ListSkeleton rows={4} />
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </div>
              <div className="min-w-0">
                <p className="font-semibold">{user.name}</p>
                <p className="font-mono text-sm text-muted-foreground">{user.personnummer}</p>
                <p className="flex items-center gap-1 text-xs text-success">
                  <BadgeCheck className="size-3.5" aria-hidden /> {t("profile.verified")}
                </p>
              </div>
            </div>

            {user.risk.flagged && (
              <Alert variant="warning">
                <TriangleAlert aria-hidden /> {t("profile.flagged")}
              </Alert>
            )}

            <div className="divide-y overflow-hidden rounded-lg border bg-card">
              <Row
                href="/app/profile/fullmakt"
                icon={FileSignature}
                label={t("profile.fullmakt")}
                value={fm ? fm.version : t("profile.notSigned")}
                badge={<Badge variant={fmActive ? "success" : "danger"}>{fmActive ? t("profile.active") : t("profile.notSigned")}</Badge>}
              />
              <Row
                href="/app/onboarding/ticket?edit=1"
                icon={Ticket}
                label={t("profile.ticket")}
                value={TICKET_TYPES.find((tt) => tt.type === user.ticket?.type)?.[lang] ?? t("ticket.none")}
              />
              <Row
                href="/app/onboarding/card?return=/app/profile"
                icon={CreditCard}
                label={t("profile.card")}
                value={user.card ? t("card.saved", { brand: user.card.brand, last4: user.card.last4 }) : t("ticket.none")}
              />
              <Row
                href="/app/onboarding/ticket?edit=1"
                icon={MapPin}
                label={t("profile.places")}
                value={[user.homePlace?.name, user.workPlace?.name].filter(Boolean).join(" · ") || t("ticket.none")}
              />
            </div>

            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold">{t("profile.settings")}</h2>
              <ThemeToggle />
            </section>

            <div className="flex flex-col gap-2">
              <Button variant="outline" asChild>
                <Link href="/admin">
                  <FlaskConical aria-hidden /> {t("demo.admin")}
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  signOut();
                  router.replace("/app/welcome");
                }}
              >
                <LogOut aria-hidden /> {t("profile.signOut")}
              </Button>
            </div>
          </>
        )}
      </div>
      <TabBar />
    </>
  );
}
