"use client";

import { CreditCard, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { useRequireUser } from "@/components/require-user";
import { Screen } from "@/components/screen";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/client/api";
import { useQueryParam } from "@/lib/client/hooks";
import { nextRoute } from "@/lib/client/routes";
import { useT, type DictKey } from "@/lib/i18n";
import { hasKey } from "@/lib/i18n/translate";

function formatCardNumber(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function CardScreen() {
  const t = useT();
  const router = useRouter();
  const userId = useRequireUser();
  const [number, setNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/30");
  const [cvc, setCvc] = useState("123");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = useQueryParam("return");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const m = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) {
      setError(t("card.invalidExpiry"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const user = await api.addCard(userId, {
        number: number.replace(/\s/g, ""),
        expMonth: Number(m[1]),
        expYear: 2000 + Number(m[2]),
        cvc,
      });
      router.replace(returnTo ?? nextRoute(user));
    } catch (err) {
      const key = err instanceof ApiError ? `card.error.${err.code}` : "";
      setError(hasKey(key) ? t(key as DictKey) : err instanceof Error ? err.message : t("common.error"));
      setSaving(false);
    }
  };

  return (
    <Screen back={returnTo ?? "/app"}>
      {!returnTo && <OnboardingProgress step={3} />}
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-3">
          <CreditCard className="size-10 text-primary" aria-hidden />
          <h2 className="text-2xl font-bold tracking-tight">{t("card.title")}</h2>
          <p className="text-muted-foreground">{t("card.subtitle")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cc-number">{t("card.number")}</Label>
          <Input
            id="cc-number"
            inputMode="numeric"
            autoComplete="cc-number"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            aria-invalid={!!error}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cc-exp">{t("card.expiry")}</Label>
            <Input id="cc-exp" inputMode="numeric" autoComplete="cc-exp" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cc-cvc">{t("card.cvc")}</Label>
            <Input id="cc-cvc" inputMode="numeric" autoComplete="cc-csc" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
        </div>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        <Alert variant="muted" className="text-xs text-muted-foreground">
          {t("card.demoHint")}
        </Alert>
        <Button type="submit" size="lg" disabled={saving}>
          {saving && <LoaderCircle className="animate-spin" aria-hidden />}
          {t("card.add")}
        </Button>
      </form>
    </Screen>
  );
}
