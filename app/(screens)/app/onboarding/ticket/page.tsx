"use client";

import { motion } from "framer-motion";
import { CircleCheck, LoaderCircle, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/state-views";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, ApiError } from "@/lib/client/api";
import { useFetch, useQueryParam, useUser } from "@/lib/client/hooks";
import { TICKET_TYPES } from "@/lib/core/tickets";
import type { PriceCategory, TicketType } from "@/lib/core/types";
import { useLang, useT } from "@/lib/i18n";
import type { UserView } from "@/lib/schemas";

export default function TicketScreen() {
  const editing = useQueryParam("edit") !== null;
  const userId = useRequireUser();
  const { data: user } = useUser();
  if (!userId || !user) {
    return (
      <Screen back={editing ? "/app/profile" : "/app"}>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  return <TicketForm key={user.id} user={user} userId={userId} editing={editing} />;
}

function TicketForm({ user, userId, editing }: { user: UserView; userId: string; editing: boolean }) {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const places = useFetch(() => api.places(), "places");
  const [type, setType] = useState<TicketType>(user.ticket?.type ?? "30d");
  const [category, setCategory] = useState<PriceCategory>(user.ticket?.priceCategory ?? "adult");
  const [home, setHome] = useState(user.homePlace?.id ?? "");
  const [work, setWork] = useState(user.workPlace?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile(userId, {
        ticket: { type, priceCategory: category },
        homePlaceId: home || null,
        workPlaceId: work || null,
      });
      if (editing) {
        router.replace("/app/profile");
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/app/home"), 1400);
    } catch (err) {
      setError(err instanceof ApiError ? err : null);
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
          <CircleCheck className="size-20 text-success" aria-hidden />
        </motion.div>
        <h2 className="text-2xl font-bold">{t("ticket.ready")}</h2>
        <p className="text-muted-foreground">{t("ticket.readyBody")}</p>
      </div>
    );
  }

  return (
    <Screen back={editing ? "/app/profile" : "/app"}>
      {!editing && <OnboardingProgress step={4} />}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <Ticket className="size-10 text-primary" aria-hidden />
          <h2 className="text-2xl font-bold tracking-tight">{t("ticket.title")}</h2>
          <p className="text-muted-foreground">{t("ticket.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ticket-type">{t("ticket.type")}</Label>
          <Select id="ticket-type" value={type} onChange={(e) => setType(e.target.value as TicketType)}>
            {TICKET_TYPES.map((tt) => (
              <option key={tt.type} value={tt.type}>
                {tt[lang]}
              </option>
            ))}
          </Select>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("ticket.category")}</legend>
          <div className="grid grid-cols-1 gap-2">
            {(["adult", "reduced"] as const).map((c) => (
              <label key={c} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-card px-4 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="category" value={c} checked={category === c} onChange={() => setCategory(c)} className="size-4 accent-[var(--primary)]" />
                <span className="text-sm font-medium">{t(c === "adult" ? "ticket.adult" : "ticket.reduced")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium">
            {t("ticket.addresses")} <span className="font-normal text-muted-foreground">({t("common.optional")})</span>
          </legend>
          {places.error && <ErrorState error={places.error} onRetry={places.reload} />}
          {(
            [
              ["home", home, setHome, "ticket.home"],
              ["work", work, setWork, "ticket.work"],
            ] as const
          ).map(([key, value, set, label]) => (
            <div key={key} className="flex flex-col gap-2">
              <Label htmlFor={`place-${key}`}>{t(label)}</Label>
              <Select id={`place-${key}`} value={value} onChange={(e) => set(e.target.value)} disabled={!places.data}>
                <option value="">{t("ticket.none")}</option>
                {places.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </fieldset>
        {error && <ErrorState error={error} />}
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <LoaderCircle className="animate-spin" aria-hidden />}
          {editing ? t("common.done") : t("ticket.finish")}
        </Button>
      </form>
    </Screen>
  );
}
